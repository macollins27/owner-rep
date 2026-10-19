#!/bin/zsh
# The side-by-side: two builds of the rep run on the same two real sessions, the card of each
# captured, so a change to the brief or the gate is judged on what the owner would see.
# Each run forks a real session (--resume <session> --fork-session, a fresh session id), so the
# parent's transcript is never written; the script prints each parent file's checksum before and
# after and they must match. The fork's records go to the store of a mod loaded with --plugin-dir
# (owner-rep_inline-*.json), never the installed mod's. Four real sessions, each with several
# model calls and the 300 s wait for the card: it costs real money and about fifteen minutes.
#
#     tests/live/compare.sh OLD_DIR NEW_DIR [MODEL]     # MODEL defaults to claude-opus-5-5
#
# Per run: wait for the row, send a no-op prompt so a fork has a request to start from, wait 60 s
# for the objective write, save the screen before, press 1, wait for the card, save it. The
# captures and report.txt are in tests/live/compare/ (git-ignored). Exit 0 when all four cards
# were captured and the parents' files are unchanged.
set -u
HERE=${0:A:h}
OUT=$HERE/compare
S=owner-rep-cmp
SESSIONS=(47d52e80-3995-4aa7-bd2e-ba4fdaea25ed c37172aa-3461-40e9-9d5c-5dbb387e97bc)
PROJ=/Users/maxwellcollins/Developer/owner-rep
PROJECTS=${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects
# The parent's transcript file, wherever its project folder is (the second session was
# recorded under the agentsview project, not this one).
parent_of() { local f; f=("$PROJECTS"/*/$1.jsonl(N)); print -r -- ${f[1]:-}; }
if (( $# < 2 )); then echo "usage: compare.sh OLD_DIR NEW_DIR [MODEL]"; exit 2; fi
OLD=${1:A}; NEW=${2:A}; MODEL=${3:-claude-opus-5-5}
mkdir -p $OUT

pane() { tmux capture-pane -p -t $S 2>/dev/null; }
wait_for() {
  local re=$1 secs=$2 i
  for i in $(seq 1 $secs); do
    pane | grep -qE "$re" && return 0
    sleep 1
  done
  return 1
}
# run SESSION LABEL DIR: one fork with one build; 0 when the card was captured.
run() {
  local sess=$1 label=$2 dir=$3 id
  id=$(uuidgen | tr A-F a-f)
  tmux kill-session -t $S 2>/dev/null
  tmux new-session -d -s $S -x 170 -y 200 -c $PROJ \
    "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED claude --model $MODEL --resume $sess --fork-session --session-id $id --settings '{\"enabledPlugins\":{\"owner-rep@owner-rep\":false}}' --plugin-dir '$dir'"
  local ok=0
  if wait_for 'Brief me' 90; then
    sleep 3
    tmux send-keys -t $S -l 'Reply with the single word ok and nothing else.'; sleep 1; tmux send-keys -t $S Enter
    wait_for '^⏺ +[Oo]k' 180 || echo "  no ok from the agent in 180s ($sess $label)"
    sleep 60
    pane > $OUT/$sess-$label-before.txt
    tmux send-keys -t $S 1
    if wait_for 'Fine, close' 300; then
      sleep 3
      pane > $OUT/$sess-$label-card.txt
      ok=1
    else
      echo "  no card in 300s ($sess $label)"
    fi
  else
    echo "  the session did not draw the rep's row in 90s ($sess $label)"
  fi
  tmux send-keys -t $S Escape 2>/dev/null; sleep 0.5
  tmux send-keys -t $S -l '/exit' 2>/dev/null; sleep 1; tmux send-keys -t $S Enter 2>/dev/null; sleep 3
  tmux kill-session -t $S 2>/dev/null
  (( ok )) && echo "  captured $sess-$label-card.txt" && return 0
  return 1
}

sums_before=()
for s in $SESSIONS; do
  sums_before+=("$(shasum $(parent_of $s))")
done
echo "parent files before:"; printf '  %s\n' $sums_before

captured=0
for s in $SESSIONS; do
  for pair in "old:$OLD" "new:$NEW"; do
    echo "$s ${pair%%:*}"
    run $s ${pair%%:*} ${pair#*:} && captured=$((captured+1))
  done
done

sums_after=()
for s in $SESSIONS; do
  sums_after+=("$(shasum $(parent_of $s))")
done
echo "parent files after:"; printf '  %s\n' $sums_after
same=0
[[ "${sums_before[*]}" == "${sums_after[*]}" ]] && same=1
(( same )) && echo "parent files unchanged" || echo "PARENT FILES CHANGED"

{
  echo "owner rep compare · $(date '+%Y-%m-%d %H:%M') · model $MODEL"
  echo "old: $OLD"; echo "new: $NEW"
  for s in $SESSIONS; do
    for label in old new; do
      f=$OUT/$s-$label-card.txt
      echo; echo "== $s $label =="
      [[ -f $f ]] || { echo "  (no capture)"; continue; }
      # Left out: and its items (lines starting "- " right after it).
      grep -E '^\s*(Stands|Means|Next|Well):' $f | sed 's/^\s*/  /'
      awk '/^[[:space:]]*Left out:/{p=1; print "  " $0; next} p && /^[[:space:]]*- /{print "    " $0; next} {p=0}' $f
      echo "  message block:"
      awk '/╭/{p=1} p{print "    " $0} /╰/{p=0}' $f
      grep -E 'Owner rep: [0-9]+ look' $f | sed 's/^\s*/  /'
    done
  done
} > $OUT/report.txt
cat $OUT/report.txt
(( captured == 4 && same )) ; exit $?
