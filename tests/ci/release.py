#!/usr/bin/env python3
"""Keep the mod's version, changelog, tags and GitHub releases in step.

A marketplace install is pinned to the `version` in `.claude-plugin/plugin.json`: until that
string changes, `claude plugin update` copies nothing new. So every change to what the mod
loads ships under a new version, and every version on main gets its tags and its release.

  release.py check BASE HEAD   a pull request: when HEAD changes what the mod loads since it
                               left BASE, its version must be above BASE's and CHANGELOG.md
                               must have a heading for it.
  release.py publish [--dry-run]
                               a push to main: when HEAD's version has no tag, tag HEAD
                               v<version> and owner-rep--v<version> and publish the GitHub
                               release with that version's changelog section. When the tag
                               exists and what the mod loads changed since it, fail: a change
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
    names = git('diff', '--name-only', old, new).splitlines()
    return [n for n in names if n and not NOT_LOADED.match(n)]


def notes(changelog, version):
    """The changelog section under `## <version> (`, without its heading, or None."""
    m = re.search(rf'^## {re.escape(version)} \(.*?\)\s*$\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
    return m.group(1).strip() if m else None


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
            f"main's {old}. Raise it (the last number for a fix, the middle one for a change in "
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


def publish(dry_run):
    version = version_at('HEAD')
    parse(version)
    tag = f'v{version}'
    if tag_exists(tag):
        changed = loaded_changes(tag, 'HEAD')
        if changed:
            print(f'::error::{tag} is already released, and what the mod loads changed since '
                  f'({", ".join(changed[:8])}). Those changes reach no one who installed it '
                  f'until {MANIFEST} has a new version. Open a pull request that raises it and '
                  'adds its changelog section.')
            return 1
        print(f'{tag} is released and nothing the mod loads changed since: nothing to do.')
        return 0
    body = notes(show('HEAD', 'CHANGELOG.md'), version)
    if body is None:
        print(f'::error::CHANGELOG.md has no "## {version} (...)" section to publish as the release notes.')
        return 1
    if not marketplace_agrees('HEAD', version):
        print(f'::error::{MARKETPLACE} gives {NAME} a version other than {version}.')
        return 1
    head = git('rev-parse', 'HEAD')
    tags = [tag, f'{NAME}--v{version}']
    print(f'Release {version} at {head[:7]}: tags {" and ".join(tags)}, notes {len(body)} characters.')
    if dry_run:
        print(body)
        return 0
    for t in tags:
        if not tag_exists(t):
            git('tag', '-a', t, '-m', f'Owner Rep {version}', head)
    git('push', 'origin', *[f'refs/tags/{t}' for t in tags])
    with tempfile.NamedTemporaryFile('w', suffix='.md', delete=False) as f:
        f.write(body + '\n')
    subprocess.run(['gh', 'release', 'create', tag, '--verify-tag', '--title', f'Owner Rep {version}',
                    '--notes-file', f.name, '--latest'], check=True)
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
