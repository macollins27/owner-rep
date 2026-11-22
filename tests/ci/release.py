#!/usr/bin/env python3
"""Keep the mod's version, changelog, tags and GitHub releases in step.

A marketplace install is pinned to the `version` in `.claude-plugin/plugin.json`: until that
string changes, `claude plugin update` copies nothing new. So every change to what the mod
loads ships under a new version, and every version on main gets its tags and its release.

  release.py check BASE HEAD   a pull request: when HEAD changes what the mod loads since it
                               left BASE, its version must be above BASE's and CHANGELOG.md
                               must have a heading for it.
  release.py publish [--dry-run]
                               a push to main: every version from 0.8.0 up on main's
                               first-parent line that lacks them gets tags v<version> and
                               owner-rep--v<version> on the first commit that carries it and a
                               GitHub release with its changelog section; only the highest
                               version tagged is marked Latest. Then, when what the mod loads
                               changed since HEAD's version was first carried, fail: a change
                               reached main without a version of its own.

Run from the repository root. `publish` needs `gh` signed in with permission to write.
"""
import json
import re
import subprocess
import sys
import tempfile

MANIFEST = '.claude-plugin/plugin.json'
MARKETPLACE = '.claude-plugin/marketplace.json'
NAME = 'owner-rep'

# Paths a marketplace install copies but the mod never loads: the tests, the documents, the
# workflows and the private archive. Every other path is what the mod loads (its hooks, its
# types, its manifest), so a change to one needs a version of its own.
NOT_LOADED = re.compile(r'^(tests/|docs/|\.github/|archive/|[^/]+\.md$|llms\.txt$|LICENSE$|\.gitignore$|\.gitattributes$|tsconfig\.json$)')


def git(*args):
    return subprocess.run(['git', *args], check=True, capture_output=True, text=True).stdout.strip()


def show(ref, path):
    return git('show', f'{ref}:{path}')


def version_at(ref):
    return json.loads(show(ref, MANIFEST)).get('version', '')


def parse(v):
    m = re.fullmatch(r'(\d+)\.(\d+)\.(\d+)', v)
    if not m:
        raise SystemExit(f'{MANIFEST} has version "{v}", not three numbers like 0.8.0')
    return tuple(int(x) for x in m.groups())


def loaded_changes(old, new):
    # --no-renames: a loaded file moved into docs/ is a loaded file removed.
    names = git('diff', '--name-only', '--no-renames', old, new).splitlines()
    return [n for n in names if n and not NOT_LOADED.match(n)]


def notes(changelog, version):
    """The changelog section under `## <version> (date)`, without its heading, or None when
    there is no such heading or nothing under it."""
    m = re.search(rf'^## {re.escape(version)} \([^)\n]*\)[^\n]*\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
    return (m.group(1).strip() or None) if m else None


def marketplace_agrees(ref, version):
    entries = [p for p in json.loads(show(ref, MARKETPLACE)).get('plugins', []) if p.get('name') == NAME]
    return all(p.get('version', version) == version for p in entries)


def check(base, head):
    start = git('merge-base', base, head)
    changed = loaded_changes(start, head)
    old, new = version_at(base), version_at(head)
    if not changed and old == new:
        print(f'Nothing the mod loads changed and the version is still {new}: no release needed.')
        return 0
    problems = []
    if parse(new) <= parse(old):
        shown = ', '.join(changed[:8]) + (' and more' if len(changed) > 8 else '')
        problems.append(
            f'This changes what the mod loads ({shown}) but {MANIFEST} says {new}, not above '
            f"{base.removeprefix('origin/')}'s {old}. Raise it (the last number for a fix, the middle one for a change in "
            "what the rep does or says), or take the next free number if another pull request "
            'took yours.')
    if notes(show(head, 'CHANGELOG.md'), new) is None:
        problems.append(f'CHANGELOG.md has no "## {new} (day month year)" heading with lines under it.')
    if not marketplace_agrees(head, new):
        problems.append(f'{MARKETPLACE} gives {NAME} a version other than {new}.')
    for p in problems:
        print(f'::error::{p}')
    if problems:
        return 1
    print(f'Version {old} -> {new}, with its changelog section: ready to release on merge.')
    return 0


def tag_exists(tag):
    return subprocess.run(['git', 'rev-parse', '-q', '--verify', f'refs/tags/{tag}'],
                          capture_output=True).returncode == 0


def release_exists(tag):
    return subprocess.run(['gh', 'release', 'view', tag], capture_output=True).returncode == 0


# Versions below this were tagged and released by hand on 21 Nov 2026; publish keeps every
# version from here up whole.
FIRST_AUTOMATED = (0, 8, 0)


def first_commits():
    """Each version from FIRST_AUTOMATED up on main's first-parent line, oldest first, with the
    first commit that carries it. Every run reads the whole line, so a run GitHub dropped from
    its queue, or one that failed partway, leaves nothing behind for the next."""
    found = {}
    for sha in git('rev-list', '--first-parent', 'HEAD').split():
        try:
            v = version_at(sha)
            pv = parse(v)
        except (subprocess.CalledProcessError, SystemExit, ValueError):
            continue  # a commit whose manifest cannot be read carries no version
        if pv < FIRST_AUTOMATED:
            break
        found[v] = sha  # walking newest to oldest, so the last write is the first commit
    return sorted(found.items(), key=lambda item: parse(item[0]))


def highest_tag():
    tagged = [parse(t[1:]) for t in git('tag', '-l', 'v*').split()
              if re.fullmatch(r'v\d+\.\d+\.\d+', t)]
    return max(tagged, default=(0, 0, 0))


def publish(dry_run):
    """Give every version on main its tags and its release, then fail when what the mod loads
    changed since HEAD's version was first carried, a change with no version of its own."""
    version = version_at('HEAD')
    parse(version)
    plan = []
    for v, sha in first_commits():
        tag = f'v{v}'
        at = git('rev-list', '-n1', tag) if tag_exists(tag) else sha
        tags = [t for t in (tag, f'{NAME}--v{v}') if not tag_exists(t)]
        if tags or not release_exists(tag):
            body = notes(show(at, 'CHANGELOG.md'), v)
            if body is None:
                print(f'::error::CHANGELOG.md at {at[:7]} has no "## {v} (...)" section to publish as the release notes.')
                return 1
            if not marketplace_agrees(at, v):
                print(f'::error::{MARKETPLACE} at {at[:7]} gives {NAME} a version other than {v}.')
                return 1
            plan.append((v, at, tags, body))
    # Latest goes only to the highest version tagged, planned, or on main now: a re-run of an
    # old job, with a newer version on main still untagged, cannot take Latest from it.
    try:
        on_main = [parse(version_at('origin/main'))]
    except (subprocess.CalledProcessError, SystemExit, ValueError):
        on_main = []
    top = max([highest_tag(), parse(version)] + on_main + [parse(v) for v, *_ in plan])
    for v, at, tags, body in plan:
        latest = parse(v) == top
        print(f'Release {v} at {at[:7]}: '
              f'{"tags " + " and ".join(tags) if tags else "tags already there"}, '
              f'notes {len(body)} characters{", marked Latest" if latest else ""}.')
        if dry_run:
            print(body)
            continue
        for t in tags:
            git('tag', '-a', t, '-m', f'Owner Rep {v}', at)
        if tags:
            git('push', 'origin', *[f'refs/tags/{t}' for t in tags])
        if release_exists(f'v{v}'):
            continue
        with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False) as f:
            f.write(body + '\n')
        subprocess.run(['gh', 'release', 'create', f'v{v}', '--verify-tag', '--title', f'Owner Rep {v}',
                        '--notes-file', f.name, f'--latest={"true" if latest else "false"}'], check=True)
    # Only HEAD's version is checked: once a newer version is on main, a change that slipped
    # into an older one's span ships with the newer one, so there is nothing left to flag.
    tag = f'v{version}'
    since = tag if tag_exists(tag) else dict((v, a) for v, a, *_ in plan).get(version)
    changed = loaded_changes(since, 'HEAD') if since else []
    if changed:
        print(f'::error::{version} was first released at {git("rev-parse", "--short", since)}, and what '
              f'the mod loads changed since ({", ".join(changed[:8])}). Those changes reach no one '
              f'who installed it until {MANIFEST} has a new version. Open a pull request that '
              'raises it and adds its changelog section.')
        return 1
    if not plan:
        print(f'Every version from {".".join(map(str, FIRST_AUTOMATED))} on main has its tags and '
              'release, and nothing the mod loads changed since: nothing to do.')
    return 0


def main(argv):
    if len(argv) == 3 and argv[0] == 'check':
        return check(argv[1], argv[2])
    if argv and argv[0] == 'publish' and set(argv[1:]) <= {'--dry-run'}:
        return publish('--dry-run' in argv[1:])
    print(__doc__, file=sys.stderr)
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
