#!/usr/bin/env python3
"""The store guard of live scenario 15: that scenario runs on the installed mod, whose store
keeps only its newest 32 records, so a run could push out one of the owner's. This saves the
store before the run, puts it right after, and reads the run's own record and capture.

    store_guard.py backup <dir>                         copy the store to <dir>, name it in <dir>/store.path
    store_guard.py show <session id> <launch epoch> <out file>   print how the card was read, write its message
    store_guard.py whole <message file> <capture file>  0 only when the whole message is in the card's box
    store_guard.py restore <dir> <session id>...        take the run's records out, put back what was pushed out
    store_guard.py --self-test                          all of this on a made-up store in a throwaway folder

`STORE` in the environment names the store for backup and show; otherwise it is the newest file
matching `STORE_NAME` (default the installed mod's) in Claude Code's plugin store. Restore lands
on the file named in <dir>/store.path. Run --self-test, never the commands, when proving this
file: only a live run points it at a real store.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Callable

RETRIES = 5
DROPPED_DRAFTS_MAX = 200  # hooks/rep.ts


class Refused(Exception):
    pass


def newest_store() -> Path:
    if os.environ.get('STORE'):
        return Path(os.environ['STORE'])
    home = Path(os.environ.get('CLAUDE_CONFIG_DIR') or Path.home() / '.claude')
    found = sorted((home / 'plugins' / 'store').glob(os.environ.get('STORE_NAME') or 'owner-rep_owner-rep-*.json'),
                   key=lambda p: p.stat().st_mtime, reverse=True)
    if not found:
        raise Refused(f'no store found under {home}')
    return found[0]


def load(path: Path) -> dict:
    try:
        got = json.loads(path.read_text())
    except (OSError, ValueError) as e:
        raise Refused(f'cannot read the store {path}: {e}')
    if not isinstance(got, dict):
        raise Refused(f'{path} does not hold a store')
    return got


def backup(folder: Path, store: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    kept = folder / 'store.backup.json'
    if kept.exists():
        raise Refused(f'{kept} is already there, from an earlier run: use a new folder')
    load(store)
    shutil.copy2(store, kept)
    (folder / 'store.path').write_text(str(store))


def show(store: Path, sid: str, launched: int, out: Path) -> dict:
    rec = load(store).get('sessions', {}).get(sid)
    if not isinstance(rec, dict):
        raise Refused(f'no record {sid} in {store}')
    brief = rec.get('lastBrief')
    if not isinstance(brief, dict):
        raise Refused(f'record {sid} holds no briefing')
    since = launched * 1000  # the record's times are milliseconds
    for name, at in (('record', rec.get('at')), ('briefing', brief.get('at'))):
        if not isinstance(at, (int, float)) or at < since:
            raise Refused(f"the {name}'s time {at} is before the launch {since}")
    message = brief.get('message')
    if not isinstance(message, str):
        raise Refused(f'record {sid} holds no message')
    out.write_text(message)
    return {'reads': brief.get('reads'), 'own': brief.get('own'), 'chars': len(message)}


BOX = '│╭╮╰╯'


def card_of(capture: str) -> list[str]:
    rows = capture.split('\n')
    heads = [i for i, r in enumerate(rows) if 'Owner rep ·' in r]
    for i in reversed(heads):
        ends = [j for j in range(i, len(rows)) if 'Fine, close' in rows[j]]
        if ends:
            return rows[i:ends[0] + 1]
    return []


def box_of(card: list[str]) -> str | None:
    tops = [i for i, r in enumerate(card) if '╭' in r]
    ends = [i for i, r in enumerate(card) if '╰' in r]
    if not tops or not ends or ends[-1] <= tops[0]:
        return None
    text = ' '.join(card[tops[0] + 1:ends[-1]])
    for mark in BOX:
        text = text.replace(mark, ' ')
    return text


def is_whole(message: str, capture: str) -> str | None:
    """None when the whole message is in the card's box and nothing in the card is cut, else why not."""
    if message.strip() == '':
        return 'the message is empty'
    card = card_of(capture)
    box = box_of(card)
    if box is None:
        return 'the capture holds no card with a message box'
    if any('…' in r for r in card):
        return 'a line of the card is cut'
    # A saved capture has the username replaced, and a word too long for its row is broken
    # across two, so every run of white space goes, not only line breaks.
    mine = message.replace(os.environ.get('USER') or 'user', 'user')
    if ''.join(mine.split()) not in ''.join(box.split()):
        return 'the message is not whole in the box'
    return None


def folded(text: str) -> str:
    return ' '.join(text.split()).lower()


def drafts_of(rec: object) -> list[str]:
    """What `recDrafts` in hooks/rep.ts keeps of a record, read the same way."""
    if not isinstance(rec, dict):
        return []
    out = [d for d in rec.get('drafts') or [] if isinstance(d, str)]
    brief = rec.get('lastBrief')
    if isinstance(brief, dict) and isinstance(brief.get('message'), str):
        out.append(brief['message'])
    for m in rec.get('owner') or []:
        if isinstance(m, dict) and m.get('kind') == 'draft' and isinstance(m.get('text'), str):
            out.append(m['text'])
    return out


def merged(now: dict, saved: dict, ids: list[str]) -> dict:
    """The store as it stands, without the run's records and with those it pushed out."""
    out = dict(now)
    sessions = dict(now.get('sessions') or {})
    for sid in ids:
        sessions.pop(sid, None)
    back = {k: v for k, v in (saved.get('sessions') or {}).items() if k not in sessions and k not in ids}
    sessions.update(back)
    out['sessions'] = sessions
    # A record let go leaves its drafts in droppedDrafts first (`saveRec`). One that comes back
    # holds them again, so those leave droppedDrafts, unless they were there before the run;
    # and what the list's cap pushed out to make room goes back on its end.
    had = [d for d in saved.get('droppedDrafts') or [] if isinstance(d, str)]
    was = {folded(d) for d in had}
    gone = {folded(d) for r in back.values() for d in drafts_of(r)} - was
    if 'droppedDrafts' in now or had:
        kept = [d for d in now.get('droppedDrafts') or [] if not isinstance(d, str) or folded(d) not in gone]
        held = {folded(d) for d in kept if isinstance(d, str)}
        if gone & {folded(d) for d in now.get('droppedDrafts') or [] if isinstance(d, str)}:
            kept += [d for d in had if folded(d) not in held][:DROPPED_DRAFTS_MAX - len(kept)]
        out['droppedDrafts'] = kept
    return out


def restore(folder: Path, ids: list[str], before_replace: Callable[[], None] = lambda: None) -> str:
    store = Path((folder / 'store.path').read_text().strip())
    saved = load(folder / 'store.backup.json')
    for _ in range(RETRIES):
        stamp = store.stat().st_mtime_ns
        now = load(store)
        want = merged(now, saved, ids)
        if want == now:
            return 'nothing to put right'
        fd, name = tempfile.mkstemp(dir=store.parent, prefix=store.name + '.')
        tmp = Path(name)
        try:
            with os.fdopen(fd, 'w') as f:
                json.dump(want, f)
            shutil.copymode(store, tmp)
            before_replace()
            if store.stat().st_mtime_ns != stamp:
                continue  # another session wrote while this one read: read it again
            os.replace(tmp, store)
            return 'restored'
        finally:
            tmp.unlink(missing_ok=True)
    raise Refused(f'the store kept changing through {RETRIES} tries: not restored')


def self_test() -> int:
    bad: list[str] = []

    def check(name: str, ok: bool) -> None:
        print(f"  {name}: {'ok' if ok else 'FAILED'}")
        if not ok:
            bad.append(name)

    def refused(fn: Callable[[], object]) -> bool:
        try:
            fn()
        except Refused:
            return True
        return False

    def rec(at: int, draft: str | None = None) -> dict:
        return {'at': at, 'lastBrief': {'at': at, 'message': draft or f'made up {at}', 'reads': 2, 'own': 'skipped'}}

    message = 'Run the test and paste what it printed.\n\nHold the publish step, and tell me what you will show.'

    def capture(*box: str) -> str:
        rows = ['╭──────╮', *[f'│ {r} │' for r in box], '╰──────╯'] if box else []
        return '\n'.join(['❯ earlier text', '◇ Owner rep · A small made-up job', '  Stands: nothing yet', *rows, '  The agent goes on', '  3: Check it   1: Put message in prompt   2: Fine, close', ''])

    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)

        full = capture('Run the test and paste what it', 'printed.', '', 'Hold the publish step, and tell me what you will show.')
        check('whole: the message whole in the box', is_whole(message, full) is None)
        check('whole: refuses a message cut', is_whole(message, capture('Run the test and paste what it', 'printed.')) is not None)
        check('whole: refuses a card with …', is_whole(message, full.replace('Stands: nothing yet', 'Stands: nothing y…')) is not None)
        check('whole: refuses an empty message', is_whole(' \n', full) is not None)
        check('whole: refuses a capture with no box', is_whole(message, capture()) is not None)
        check('whole: refuses a capture with no card', is_whole(message, 'no card here\n') is not None)
        check('whole: the message outside the box is not whole', is_whole('Stands: nothing yet', full) is not None)

        launched = 1_800_000_000
        store = tmp / 'store.json'
        store.write_text(json.dumps({
            'sessions': {'late': rec(launched * 1000 + 5), 'old': rec(launched * 1000 - 5),
                         'mixed': {**rec(launched * 1000 + 5), 'lastBrief': {**rec(1)['lastBrief'], 'at': launched * 1000 - 5}},
                         'none': {'at': launched * 1000 + 5}},
            'droppedDrafts': [], 'other': 1,
        }))
        out = tmp / 'message.txt'
        got = show(store, 'late', launched, out)
        check('show: reads, own and length', got == {'reads': 2, 'own': 'skipped', 'chars': len(out.read_text())})
        check('show: refuses a record from before the launch', refused(lambda: show(store, 'old', launched, out)))
        check('show: refuses a briefing from before the launch', refused(lambda: show(store, 'mixed', launched, out)))
        check('show: refuses a record with no briefing', refused(lambda: show(store, 'none', launched, out)))
        check('show: refuses an id not in the store', refused(lambda: show(store, 'nobody', launched, out)))

        def fresh(name: str, before: dict, after: dict) -> tuple[Path, Path]:
            folder = tmp / name
            s = tmp / f'{name}.json'
            s.write_text(json.dumps(before))
            backup(folder, s)
            s.write_text(json.dumps(after))
            return folder, s

        before = {'sessions': {'a': rec(1, 'draft of a'), 'b': rec(2)}, 'droppedDrafts': ['older draft'], 'other': 1}
        after = {'sessions': {'b': rec(2), 'run': rec(9), 'theirs': rec(8)}, 'droppedDrafts': ['draft of a', 'older draft'], 'other': 2}
        folder, s = fresh('one', before, after)
        check('backup: refuses a folder already used', refused(lambda: backup(folder, s)))
        check('backup: names the store', (folder / 'store.path').read_text() == str(s))
        restore(folder, ['run'])
        done = json.loads(s.read_text())
        check('restore: the run is gone', 'run' not in done['sessions'])
        check('restore: the record pushed out is back', done['sessions'].get('a') == rec(1, 'draft of a'))
        check("restore: another session's record stays", 'theirs' in done['sessions'])
        check('restore: what eviction added is taken out', done['droppedDrafts'] == ['older draft'])
        check('restore: a change to the rest of the store stays', done['other'] == 2)
        first = s.read_bytes()
        check('restore: twice changes nothing', restore(folder, ['run']) == 'nothing to put right' and s.read_bytes() == first)

        folder, s = fresh('kept', {'sessions': {'a': rec(1, 'same')}, 'droppedDrafts': ['same']}, {'sessions': {'run': rec(9)}, 'droppedDrafts': ['same']})
        restore(folder, ['run'])
        check('restore: a draft listed before the run stays listed', json.loads(s.read_text())['droppedDrafts'] == ['same'])

        cap = [f'draft {i}' for i in range(DROPPED_DRAFTS_MAX)]
        folder, s = fresh('cap', {'sessions': {'a': rec(1, 'new one')}, 'droppedDrafts': cap}, {'sessions': {'run': rec(9)}, 'droppedDrafts': ['new one', *cap[:-1]]})
        restore(folder, ['run'])
        check('restore: what the cap pushed out goes back', json.loads(s.read_text())['droppedDrafts'] == cap)

        folder, s = fresh('race', before, after)
        tries = {'n': 0}

        def another_session() -> None:
            tries['n'] += 1
            if tries['n'] == 1:
                now = json.loads(s.read_text())
                now['sessions']['late'] = rec(10)
                s.write_text(json.dumps(now))
                os.utime(s, ns=(1, 1))

        restore(folder, ['run'], another_session)
        done = json.loads(s.read_text())
        check('restore: a write mid-way is read again and kept', tries['n'] == 2 and 'late' in done['sessions'] and 'run' not in done['sessions'])

        folder, s = fresh('busy', before, after)
        ticks = {'n': 0}

        def always() -> None:
            ticks['n'] += 1
            os.utime(s, ns=(ticks['n'], ticks['n']))

        check('restore: a store that keeps changing is refused', refused(lambda: restore(folder, ['run'], always)))
        check('restore: tries five times', ticks['n'] == RETRIES)
        check('restore: left as it stood when refused', 'run' in json.loads(s.read_text())['sessions'])
        check('restore: leaves no temporary file', [p.name for p in tmp.iterdir() if p.name.startswith('busy.json.')] == [])

    print(f'{"all shown" if not bad else str(len(bad)) + " FAILED"}')
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    cmd, args = (argv[0], argv[1:]) if argv else ('', [])
    if cmd == '--self-test':
        return self_test()
    if cmd == 'backup' and len(args) == 1:
        backup(Path(args[0]), newest_store())
    elif cmd == 'show' and len(args) == 3:
        got = show(newest_store(), args[0], int(args[1]), Path(args[2]))
        print(f"  reads: {got['reads']}  own: {got['own']}  message: {got['chars']} characters")
    elif cmd == 'whole' and len(args) == 2:
        why = is_whole(Path(args[0]).read_text(), Path(args[1]).read_text())
        if why is not None:
            print(f'  {why}')
            return 1
    elif cmd == 'restore' and len(args) >= 2:
        print(f'  store: {restore(Path(args[0]), args[1:])}')
    else:
        print(__doc__, file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv[1:]))
    except Refused as e:
        print(f'  store guard: {e}', file=sys.stderr)
        sys.exit(1)
