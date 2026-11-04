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

One run makes two full copies, not one per defect: a reference that nothing runs in, and a
working copy each defect is planted in. After each defect only the files that differ from the
reference are put back, so a run of 403 defects no longer writes 403 copies of the mod into the
temporary folder (each copy is about 600 files, and every file written is an event macOS's
file-change service must record). `--keep` still gives every defect its own copy to look at.

Exit code 0 when the clean suite passes and every defect is caught; 1 otherwise.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import stat
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


def _tree(root: Path) -> dict[str, tuple]:
    """Every entry under root, root itself as '', by relative path: its kind and what decides
    whether it changed (permissions; for a link its target; for a file its size and link count).
    A root that is not a real folder, or a folder that cannot be read, raises."""
    def onerror(e: OSError) -> None:
        raise e
    st = root.lstat()
    if not stat.S_ISDIR(st.st_mode):
        raise OSError(f'{root} is no longer a folder')
    out: dict[str, tuple] = {'': ('dir', stat.S_IMODE(st.st_mode))}
    for folder, dirs, files in os.walk(root, onerror=onerror):
        for name in dirs + files:
            path = Path(folder) / name
            st = path.lstat()
            rel = str(path.relative_to(root))
            mode = stat.S_IMODE(st.st_mode)
            if stat.S_ISLNK(st.st_mode):
                out[rel] = ('link', os.readlink(path), mode, st.st_nlink)
            elif stat.S_ISDIR(st.st_mode):
                out[rel] = ('dir', mode)
            elif stat.S_ISREG(st.st_mode):
                out[rel] = ('file', st.st_size, mode, st.st_nlink)
            else:
                out[rel] = ('other', mode)     # a pipe, socket or device: never kept
        dirs[:] = [d for d in dirs if not (Path(folder) / d).is_symlink()]
    return out


def _same_bytes(a: Path, b: Path) -> bool:
    """Read both files whole; no cache and no trust in sizes or times."""
    with open(a, 'rb') as fa, open(b, 'rb') as fb:
        while True:
            x, y = fa.read(1 << 16), fb.read(1 << 16)
            if x != y:
                return False
            if not x:
                return True


def _open_up(root: Path) -> None:
    """Give the owner full access to every folder under root, so nothing a test locked can stop
    the reset or the removal. Folder permissions are put back from the reference afterwards.
    A folder that already has it is left alone, since every change is an event to record."""
    def ensure(path: Path) -> None:
        mode = stat.S_IMODE(path.lstat().st_mode)
        if mode & stat.S_IRWXU != stat.S_IRWXU:
            os.chmod(path, mode | stat.S_IRWXU)
    if root.is_symlink() or not root.is_dir():
        return
    ensure(root)
    for folder, dirs, _ in os.walk(root):
        for d in list(dirs):
            path = Path(folder) / d
            if path.is_symlink():
                dirs.remove(d)
            else:
                ensure(path)


def _dispose(root: Path) -> None:
    """Remove root whatever a test turned it into; raise if anything is left."""
    if not os.path.lexists(root):
        return
    if root.is_symlink() or not root.is_dir():
        root.unlink()
    else:
        try:
            _open_up(root)
        except OSError:
            pass
        shutil.rmtree(root, ignore_errors=True)
        if os.path.lexists(root):              # a locked (immutable) entry: unlock all, then retry
            for folder, dirs, files in os.walk(root):
                for name in dirs + files:
                    try:
                        os.chflags(Path(folder) / name, 0, follow_symlinks=False)
                    except OSError:
                        pass
            shutil.rmtree(root, ignore_errors=True)
    if os.path.lexists(root):
        raise OSError(f'could not remove {root}')


def _remove(path: Path, kind: str) -> None:
    shutil.rmtree(path) if kind == 'dir' else path.unlink()


def reset_to(folder: Path, ref: Path, ref_tree: dict[str, tuple]) -> bool:
    """Make folder match ref again by touching only what differs. True only when every entry
    now matches the reference in kind, permissions and bytes; any error counts as a failure."""
    try:
        _open_up(folder)
        now = _tree(folder)
        for rel in sorted(set(now) - set(ref_tree), key=len):
            path = folder / rel
            if os.path.lexists(path):          # else it was inside a folder already removed
                _remove(path, now[rel][0])
        for rel in sorted(ref_tree, key=len):
            if rel == '':
                continue
            want, have = ref_tree[rel], now.get(rel)
            src, dst = ref / rel, folder / rel
            if want[0] == 'dir':
                if have is None or have[0] != 'dir':
                    if have is not None:
                        _remove(dst, have[0])
                    dst.mkdir()
                continue
            if have == want and want[0] == 'link':
                continue
            if have is not None and have[0] == 'file' and want[0] == 'file' \
                    and have[1] == want[1] and have[3] == want[3] and _same_bytes(src, dst):
                if have[2] != want[2]:
                    os.chmod(dst, want[2])
                continue                       # same bytes; at most the permissions moved
            if have is not None:
                _remove(dst, have[0])
            if want[0] == 'link':
                os.symlink(want[1], dst)
                if stat.S_IMODE(dst.lstat().st_mode) != want[2]:
                    os.chmod(dst, want[2], follow_symlinks=False)
            else:
                shutil.copy2(src, dst)
        # Folder permissions last and deepest first, so locking a folder never blocks its children.
        for rel in sorted((r for r, w in ref_tree.items() if w[0] == 'dir'), key=len, reverse=True):
            path = folder / rel if rel else folder
            if stat.S_IMODE(path.lstat().st_mode) != ref_tree[rel][1]:
                os.chmod(path, ref_tree[rel][1])
        again = _tree(folder)
        return again == ref_tree and all(
            _same_bytes(ref / r, folder / r) for r, w in ref_tree.items() if w[0] == 'file')
    except OSError as e:
        print(f'    reset failed: {e}')
        return False


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

    # The reference is copied first and nothing ever runs in it; the suite may write in the
    # folder it runs in, so the clean run uses the working copy, which is reset afterwards.
    ref = work / 'reference'
    copy_mod(ref)
    ref_tree = _tree(ref)
    clean = work / 'mod'
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
        try:
            _dispose(work)
        except OSError:
            pass
        return 1
    else:
        print(f'suite with no defect: {p} pass, {f} fail — ok')

    caught = survived = spare = 0
    for d in defects:
        if a.keep:
            folder = work / d['name']
            copy_mod(folder)
        else:
            folder = clean
            if not reset_to(folder, ref, ref_tree):
                print(f'{d["name"]}: the working copy did not reset cleanly; using a fresh copy')
                try:
                    _dispose(folder)
                except OSError as e:
                    print(f'    {e}; the fresh copy goes beside it')
                    spare += 1
                    clean = folder = work / f'mod-{spare}'
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
        try:
            _dispose(work)
        except OSError as e:
            print(f'could not remove every throwaway copy: {e}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
