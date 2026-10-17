#!/bin/sh
# Fails when a hook runs a program by a name that does not go through hostArgv, the one
# place a command is named for the host it runs on: on Windows Git's coreutils answer only
# by their full path, and a bare name finds nothing. A call passes when its argv is
# hostArgv(...), one of the copy's two argvs (copyArgvs builds both through hostArgv), or
# the probe in `answers`, which runs a full path it was given. A call whose argv starts on
# a later line is reported too, so write the argv on the call's own line.
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
bad=$(grep -nE '\$\.process\.(run|spawn)\(' "$root"/hooks/*.ts "$root"/hooks/*.tsx |
  grep -vE '\$\.process\.run\(hostArgv\(|\$\.process\.spawn\(\{ argv: hostArgv\(|\$\.process\.run\((clone|plain), |\$\.process\.run\(\[\.\.\.argv, '"'"'--version'"'"'\]' || true)
if [ -n "$bad" ]; then
  echo "host calls: a hook runs a program by a name that does not go through hostArgv, so on Windows it finds nothing:"
  echo "$bad"
  exit 1
fi
echo "host calls: every program the hooks run is named through hostArgv"
