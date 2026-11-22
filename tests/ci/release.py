#!/usr/bin/env python3
"""Keep the mod's version, changelog, tags and GitHub releases in step.

A marketplace install is pinned to the `version` in `.claude-plugin/plugin.json`: until that
string changes, `claude plugin update` copies nothing new. So every change to what the mod
loads ships under a new version, and every version on main gets its tags and its release.

  release.py check BASE HEAD   a pull request: when HEAD changes what the mod loads since it
                               left BASE, its version must be above BASE's and CHANGELOG.md
                               must have a heading for it.
  release.py publish [--dry-run]
                               a push to main: every version above the newest tag, in order,
                               gets tags v<version> and owner-rep--v<version> on the first
                               main commit that carries it and a GitHub release with its
                               changelog section, the newest marked Latest. A tag whose
                               release is missing gets its release. When HEAD's version is
                               already tagged and what the mod loads changed since, fail: a
                               change reached main without a version of its own.

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


def first_commits():
    """Each version on main's first-parent line since the newest tagged one, oldest first,
    with the first commit that carries it. Walking the line rather than reading HEAD alone
    means a run GitHub dropped from the queue, or one that failed, leaves no version behind."""
    tagged = [parse(t[1:]) for t in git('tag', '-l', 'v*').split()
              if re.fullmatch(r'v\d+\.\d+\.\d+', t)]
    newest = max(tagged, default=(0, 0, 0))
    found = {}
    for sha in git('rev-list', '--first-parent', 'HEAD').split():
        try:
            v = version_at(sha)
            pv = parse(v)
        except (subprocess.CalledProcessError, SystemExit, ValueError):
            break
        if pv <= newest:
            break
        found[v] = sha  # walking newest to oldest, so the last write is the first commit
    return sorted(found.items(), key=lambda item: parse(item[0]))


def publish(dry_run):
    version = version_at('HEAD')
    parse(version)
    tag = f'v{version}'
    todo = first_commits()
    if not todo and tag_exists(tag):
        changed = loaded_changes(tag, 'HEAD')
        if changed:
            print(f'::error::{tag} is already released, and what the mod loads changed since '
                  f'({", ".join(changed[:8])}). Those changes reach no one who installed it '
                  f'until {MANIFEST} has a new version. Open a pull request that raises it and '
                  'adds its changelog section.')
            return 1
        if release_exists(tag):
            print(f'{tag} is released and nothing the mod loads changed since: nothing to do.')
            return 0
        todo = [(version, git('rev-list', '-n1', tag))]
    for v, sha in todo:
        body = notes(show(sha, 'CHANGELOG.md'), v)
        if body is None:
            print(f'::error::CHANGELOG.md at {sha[:7]} has no "## {v} (...)" section to publish as the release notes.')
            return 1
        if not marketplace_agrees(sha, v):
            print(f'::error::{MARKETPLACE} at {sha[:7]} gives {NAME} a version other than {v}.')
            return 1
    for v, sha in todo:
        tags = [f'v{v}', f'{NAME}--v{v}']
        latest = v == version
        body = notes(show(sha, 'CHANGELOG.md'), v)
        print(f'Release {v} at {sha[:7]}: tags {" and ".join(tags)}, notes {len(body)} characters'
              f'{", marked Latest" if latest else ""}.')
        if dry_run:
            print(body)
            continue
        for t in tags:
            if not tag_exists(t):
                git('tag', '-a', t, '-m', f'Owner Rep {v}', sha)
        git('push', 'origin', *[f'refs/tags/{t}' for t in tags])
        if release_exists(tags[0]):
            continue
        with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False) as f:
            f.write(body + '\n')
        subprocess.run(['gh', 'release', 'create', tags[0], '--verify-tag', '--title', f'Owner Rep {v}',
                        '--notes-file', f.name, f'--latest={"true" if latest else "false"}'], check=True)
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
