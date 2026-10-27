#!/usr/bin/env python3
"""The doctor: plants each known defect in a throwaway copy of the mod and checks that the
test suite fails. A suite that stays green with a defect planted guards nothing there.

    python3 tests/doctor/doctor.py            # every defect
    python3 tests/doctor/doctor.py NAME ...   # only these
    python3 tests/doctor/doctor.py --keep     # leave the copies behind for a look

Each defect is an entry in defects.json: a name, one sentence saying what it breaks, and a
patch in defects/ made from a real edit (`git diff > tests/doctor/defects/NAME.patch`). The
copies are made from the working folder as it stands, uncommitted edits included, so the
report is about the suite you have, not the last commit. The folder the mod is installed from
is never touched: a planted defect there would reach the owner's live sessions.

Exit code 0 when the clean suite passes and every defect is caught; 1 otherwise.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SKIP = {'.git', 'node_modules', '.claude-plugin/types/.cache'}


def copy_mod(into: Path) -> None:
    def ignore(folder: str, names: list[str]) -> set[str]:
        rel = Path(folder).resolve().relative_to(REPO)
        return {n for n in names if str(rel / n) in SKIP or n in SKIP}
    shutil.copytree(REPO, into, ignore=ignore, symlinks=True)


def run_suite(folder: Path) -> tuple[int, int, list[str], str]:
    # Through a file, not a pipe: a test that fails on a long brief prints more than the 128 KiB
    # a pipe keeps, which cut the summary off and made a caught defect read as one that survived.
    with tempfile.TemporaryFile('w+', errors='replace') as sink:
        subprocess.run(['claude', 'plugin', 'test', str(folder)], stdout=sink, stderr=subprocess.STDOUT, text=True)
        sink.seek(0)
        out = sink.read()
    passed = int(m.group(1)) if (m := re.search(r'^\s*(\d+) pass$', out, re.M)) else -1
    failed = int(m.group(1)) if (m := re.search(r'^\s*(\d+) fail$', out, re.M)) else -1
    failing = re.findall(r'^\(fail\) (.+?) \[', out, re.M)
    return passed, failed, failing, out


def apply_patch(folder: Path, patch: Path) -> str:
    r = subprocess.run(['git', 'apply', '--check', str(patch)], cwd=folder, capture_output=True, text=True)
    if r.returncode != 0:
        return (r.stderr or r.stdout).strip()
    subprocess.run(['git', 'apply', str(patch)], cwd=folder, check=True, capture_output=True)
    return ''


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('names', nargs='*', help='defects to plant; default all')
    ap.add_argument('--keep', action='store_true', help='leave the throwaway copies behind')
    ap.add_argument('--shard', metavar='K/N', help='plant only every Nth defect, starting at the Kth (1-based), so N machines can share the list')
    a = ap.parse_args()

    defects = json.loads((HERE / 'defects.json').read_text())
    if a.names:
        unknown = set(a.names) - {d['name'] for d in defects}
        if unknown:
            print(f'no such defect: {", ".join(sorted(unknown))}', file=sys.stderr)
            return 2
        defects = [d for d in defects if d['name'] in a.names]
    if a.shard:
        k, n = (int(x) for x in a.shard.split('/'))
        if not 1 <= k <= n:
            print(f'bad shard {a.shard}: K must be between 1 and N', file=sys.stderr)
            return 2
        defects = defects[k - 1::n]
        print(f'shard {k} of {n}: {len(defects)} defects')

    work = Path(tempfile.mkdtemp(prefix='owner-rep-doctor-'))
    stamp = dt.datetime.now().strftime('%Y-%m-%d %H:%M')
    print(f'owner rep doctor · {stamp} · {REPO}')
    bad = 0

    clean = work / 'clean'
    copy_mod(clean)
    p, f, failing, out = run_suite(clean)
    if p < 0 or f != 0:
        bad += 1
        print(f'suite with no defect: {p} pass, {f} fail — NOT CLEAN; the doctor needs a green suite to start from')
        for t in failing:
            print(f'    failing: {t}')
        if p < 0:
            print(out[-2000:])
        print('stopped: nothing planted, because a defect cannot be told from the break already there.')
        shutil.rmtree(work, ignore_errors=True)
        return 1
    else:
        print(f'suite with no defect: {p} pass, {f} fail — ok')

    caught = survived = 0
    for d in defects:
        folder = work / d['name']
        copy_mod(folder)
        err = apply_patch(folder, HERE / 'defects' / d['patch'])
        if err:
            bad += 1
            print(f'{d["name"]}: patch does not apply — the defect needs remaking against the current code')
            print(f'    {err.splitlines()[0]}')
            continue
        p, f, failing, out = run_suite(folder)
        if f > 0:
            caught += 1
            print(f'{d["name"]}: {f} fail of {p + f} — caught')
        else:
            survived += 1
            bad += 1
            print(f'{d["name"]}: {p} pass, {f} fail — SURVIVED: no test notices this')
        print(f'    breaks: {d["breaks"]}')
        for t in failing:
            print(f'    failing: {t}')

    print(f'{caught} caught, {survived} survived, {len(defects)} planted.')
    if a.keep:
        print(f'copies kept in {work}')
    else:
        shutil.rmtree(work, ignore_errors=True)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
