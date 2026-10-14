#!/bin/sh
# Fails when the Claude Code build on this machine is not the build that wrote the pinned
# declarations in tests/ci/types, so the type check never passes against a stale copy.
# The engine stamps its build on the first line of claude-code/index.d.ts when it writes
# the three folders together; the workflow installs one pinned build; the two must agree.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
file="$here/types/claude-code/index.d.ts"
pinned=$(sed -n '1s/^\/\/ Written by Claude Code \([0-9][0-9.]*\)\.$/\1/p' "$file")
installed=$(claude --version | sed -n 's/^\([0-9][0-9.]*\) (Claude Code).*$/\1/p')
[ -n "$pinned" ] || { echo "$file: no 'Written by Claude Code <build>.' first line"; exit 1; }
[ -n "$installed" ] || { echo "claude --version gave no build number"; exit 1; }
if [ "$pinned" = "$installed" ]; then
  echo "declarations: pinned by $pinned, installed $installed, the same build"
else
  echo "declarations: pinned by $pinned, installed $installed. The type check would run against a stale copy."
  echo "Replace tests/ci/types with the three folders build $installed writes (tests/ci/README.md)."
  exit 1
fi
