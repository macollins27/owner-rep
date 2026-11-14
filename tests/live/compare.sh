#!/bin/zsh
# The side-by-side: two builds of the rep run on the same real sessions, the card of each
# captured, so a change to the brief or the gate is judged on what the owner would see.
# Each run forks a real session (--resume <session> --fork-session, a fresh session id), so the
# parent's transcript is never written; the script prints each parent file's checksum before and
# after and they must match. The fork's records go to the store of a mod loaded with --plugin-dir
# (owner-rep_inline-*.json), never the installed mod's. Two real sessions per session named,
# each with several model calls and the 300 s wait for the card: with two sessions named it
# costs real money and about fifteen minutes, and Check it adds up to ten minutes and about
# 1.5 million tokens per fork.
#
#     MODEL=<model> [CHECK=1] [TMUX_NAME=<name>] tests/live/compare.sh OLD_DIR NEW_DIR SESSION_ID [SESSION_ID ...]
#
# Each session is forked from its own folder, the first "cwd" its transcript records, so any
# number of sessions from different folders can be named in one run. MODEL defaults to
# claude-opus-5-5; TMUX_NAME, the tmux session the forks run in, to owner-rep-cmp.
# Per run: start the clock at tmux new-session, wait for the row, send nothing (a press with
# nothing to fork reads the session's own record, so the card judges the parent's job, not a
# prompt of ours), wait until the row's head leaves the placeholder, which means the objective
# is written (up to 180 s more; the seconds from the start are printed), save the screen before,
# press 1, wait for the card (up to 300 s), save it, and print the seconds from the press. With
# CHECK=1 also press 3, wait up to 600 s for the checked card, save it at 170x200, resize the
# window to 170x24, save it again, and print the check's seconds from the press. The captures
# and report.txt, which carries every time, are in tests/live/compare/ (git-ignored). Exit 0
# when every expected capture was made (sessions x 2 builds x 1, or x 3 with CHECK=1) and the
# parents' files are unchanged.
set -u
HERE=${0:A:h}
OUT=$HERE/compare
S=${TMUX_NAME:-owner-rep-cmp}
CHECK=${CHECK:-0}
PROJECTS=${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects
# The parent's transcript file, wherever its project folder is (a session can be recorded
# under another project and still be found by --resume).
parent_of() { local f; f=("$PROJECTS"/*/$1.jsonl(N)); print -r -- ${f[1]:-}; }
# folder_of SESSION: the first folder the parent's transcript records, the one it was started in.
folder_of() {
  local f; f=$(parent_of $1)
  [[ -n $f ]] || return 1
  grep -m1 -o '"cwd":"[^"]*"' $f | sed 's/^"cwd":"//; s/"$//'
}
if (( $# < 3 )); then echo "usage: MODEL=<model> [CHECK=1] [TMUX_NAME=<name>] compare.sh OLD_DIR NEW_DIR SESSION_ID [SESSION_ID ...]"; exit 2; fi
OLD=${1:A}; NEW=${2:A}; SESSIONS=(${@:3}); MODEL=${MODEL:-claude-opus-5-5}
mkdir -p $OUT

# Targets are exact (=name): a bare name falls back to a prefix match and could reach another
# tmux session whose name starts with this one.
pane() { tmux capture-pane -p -t "=$S:" 2>/dev/null; }
keys() { tmux send-keys -t "=$S:" "$@" 2>/dev/null; }
wait_for() {
  local re=$1 secs=$2 i
  for i in $(seq 1 $secs); do
    pane | grep -qE "$re" && return 0
    sleep 1
  done
  return 1
}
# wait_for_head SECONDS: 0 once the row's head no longer says the objective is being worked out.
wait_for_head() {
  local i head
  for i in $(seq 1 $1); do
    head=$(pane | grep 'Owner rep ·' | tail -1)
    [[ -n $head && $head != *'working out the result you want'* ]] && return 0
    sleep 1
  done
  return 1
}
# wait_for_check SECONDS: 0 once the checked card's heading shows; 1 when the check ended
# without it (its "Checking" line came and went, or never came in 30 s) or the time ran out.
wait_for_check() {
  local i p seen=0
  for i in $(seq 1 $1); do
    p=$(pane)
    [[ $p == *'Checked against the record and the files:'* ]] && return 0
    if [[ $p == *'Checking the record and the files'* ]]; then seen=1
    elif (( seen || i > 30 )); then return 1; fi
    sleep 1
  done
  return 1
}
# Each fork's times, one line per fork, for the report.
typeset -A TIMES
# run SESSION LABEL DIR: one fork with one build; adds to captured each capture it made.
run() {
  local sess=$1 label=$2 dir=$3 id folder
  local base=$OUT/$sess-$label t_obj='-' t_card='-' t_check='-'
  rm -f $base-before.txt $base-card.txt $base-check.txt $base-check-24.txt
  folder=$(folder_of $sess)
  if [[ -z $folder || ! -d $folder ]]; then
    echo "  the session's folder ${folder:-(none recorded)} is not there ($sess $label)"
    TIMES[$sess-$label]="no folder"
    return
  fi
  id=$(uuidgen | tr A-F a-f)
  tmux kill-session -t "=$S" 2>/dev/null
  local t0=$SECONDS
  tmux new-session -d -s $S -x 170 -y 200 -c $folder \
    "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED claude --model $MODEL --resume $sess --fork-session --session-id $id --settings '{\"enabledPlugins\":{\"owner-rep@owner-rep\":false}}' --plugin-dir '$dir'"
  if wait_for 'Brief me' 90; then
    if wait_for_head 180; then t_obj=$((SECONDS - t0)); echo "  objective written $t_obj s after the session started ($sess $label)"
    else t_obj="none after $((SECONDS - t0))"; echo "  the head still shows the placeholder $((SECONDS - t0)) s after the session started ($sess $label)"; fi
    pane > $base-before.txt
    local t1=$SECONDS
    keys 1
    if wait_for 'Fine, close' 300; then
      t_card=$((SECONDS - t1))
      echo "  card $t_card s after pressing 1 ($sess $label)"
      sleep 3
      pane > $base-card.txt
      captured=$((captured+1))
      echo "  captured $sess-$label-card.txt"
      if (( CHECK )) && ! grep -q 'Check it' $base-card.txt; then
        echo "  the card has no Check it button ($sess $label)"
        t_check="no button"
      elif (( CHECK )); then
        local t2=$SECONDS
        keys 3
        if wait_for_check 600; then
          t_check=$((SECONDS - t2))
          echo "  checked card $t_check s after pressing 3 ($sess $label)"
          sleep 3
          pane > $base-check.txt
          captured=$((captured+1))
          echo "  captured $sess-$label-check.txt"
          tmux resize-window -t "=$S:" -x 170 -y 24 2>/dev/null
          sleep 2
          pane > $base-check-24.txt
          captured=$((captured+1))
          echo "  captured $sess-$label-check-24.txt"
        else
          echo "  no checked card $((SECONDS - t2)) s after pressing 3 ($sess $label)"
          pane > $base-check.txt
          t_check="none after $((SECONDS - t2))"
        fi
      fi
    else
      echo "  no card in 300s ($sess $label)"
    fi
  else
    echo "  the session did not draw the rep's row in 90s ($sess $label)"
  fi
  TIMES[$sess-$label]="objective ${t_obj} s from the start · card ${t_card} s from pressing 1"
  (( CHECK )) && TIMES[$sess-$label]+=" · checked card ${t_check} s from pressing 3"
  keys Escape; sleep 0.5
  keys -l '/exit'; sleep 1; keys Enter; sleep 3
  tmux kill-session -t "=$S" 2>/dev/null
}

trap 'tmux kill-session -t "=$S" 2>/dev/null; exit 130' INT TERM
# sum_of SESSION: the parent file's checksum; stops the script when the file is not found.
sum_of() {
  local f; f=$(parent_of $1)
  [[ -n $f ]] || { echo "parent file of session $1 not found under $PROJECTS" >&2; exit 2; }
  shasum $f
}
sums_before=()
for s in $SESSIONS; do
  sums_before+=("$(sum_of $s)")
done
echo "parent files before:"; printf '  %s\n' $sums_before

captured=0
for s in $SESSIONS; do
  for pair in "old:$OLD" "new:$NEW"; do
    echo "$s ${pair%%:*}"
    run $s ${pair%%:*} ${pair#*:}
  done
done

sums_after=()
for s in $SESSIONS; do
  sums_after+=("$(sum_of $s)")
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
      echo "  ${TIMES[$s-$label]:-not run}"
      [[ -f $f ]] || { echo "  (no capture)"; continue; }
      # Left out: and its items (lines starting "- " right after it).
      grep -E '^\s*(Stands|Means|Next|Well):' $f | sed 's/^\s*/  /'
      awk '/^[[:space:]]*Left out:/{p=1; print "  " $0; next} p && /^[[:space:]]*- /{print "    " $0; next} {p=0}' $f
      echo "  message block:"
      awk '/╭/{p=1} p{print "    " $0} /╰/{p=0}' $f
      grep -E 'Owner rep: [0-9]+ look' $f | sed 's/^\s*/  /'
      c=$OUT/$s-$label-check.txt
      if (( CHECK )) && [[ -f $c ]]; then
        if grep -q 'Checked against the record and the files:' $c; then
          echo "  checked:"
          awk '/Checked against the record and the files:/{p=1} p && (/^[[:space:]]*$/ || /╭/){p=0} p{print "    " $0}' $c
        else
          # The note the card gave in place of a checked card.
          echo "  no checked card:"
          grep -E '^[[:space:]]*The check ' $c | sed 's/^/  /'
        fi
      fi
    done
  done
} > $OUT/report.txt
cat $OUT/report.txt
expected=$(( ${#SESSIONS} * 2 * (CHECK ? 3 : 1) ))
echo "captured $captured of $expected"
(( captured == expected && same )) ; exit $?
