#!/bin/zsh
# The live layer: real Claude Code sessions in tmux, the strip captured from the screen.
# Proves the build the owner runs calls the rep's hooks; the test kit cannot. On demand only:
# each scenario is a real session and a model call, about a minute.
#
#     tests/live/live.sh            # all five scenarios
#     tests/live/live.sh 2 4        # only these
#
# Each scenario's whole screen is saved in tests/live/captures/<n>-<name>.txt, and the strip's
# lines are printed in the report. Exit 0 when every scenario run showed what it should.
#
# The sessions run in a scratch folder under the system temp directory, in bypass mode, with
# the nested-session variables unset (set, claude falls into print mode and exits). The mod
# loads from wherever it is installed at user scope, not from this checkout: run this after
# the change under test is in that folder.
set -u
HERE=${0:A:h}
CAPS=$HERE/captures
S=owner-rep-live
STRIP_RE='Owner rep ·|Brief me|Fix the goal|Fine, close|Put message|Check it|Heads up'
want=("$@")
[[ ${#want} -eq 0 ]] && want=(1 2 3 4 5 6)
fails=0
bad=0

pane() { tmux capture-pane -p -t $S 2>/dev/null }
strip() { pane | grep -E "$STRIP_RE" | sed 's/[[:space:]]*$//' }
# wait_for PATTERN SECONDS: polls the screen; 0 when the pattern appears.
wait_for() {
  local re=$1 secs=$2 i
  for i in $(seq 1 $secs); do
    pane | grep -qE "$re" && return 0
    sleep 1
  done
  return 1
}
send() { tmux send-keys -t $S -l "$1"; sleep 0.5; tmux send-keys -t $S Enter }

start() {
  tmux kill-session -t $S 2>/dev/null
  local dir=$(mktemp -d -t owner-rep-live)
  git -C $dir init -q
  tmux new-session -d -s $S -x 170 -y 44 -c $dir \
    "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED claude --permission-mode bypassPermissions"
  if wait_for 'Yes, I trust this folder' 20; then tmux send-keys -t $S Down; sleep 0.5; tmux send-keys -t $S Enter; fi
  wait_for 'Brief me' 40 || { echo "  the session did not draw the rep's row in 40s"; return 1 }
  sleep 2
}
stop() {
  tmux send-keys -t $S Escape 2>/dev/null; sleep 0.5
  tmux send-keys -t $S C-c 2>/dev/null; sleep 0.5; tmux send-keys -t $S C-c 2>/dev/null; sleep 1
  tmux kill-session -t $S 2>/dev/null
}
# verdict NAME CONDITION-RESULT: prints and counts.
verdict() {
  local name=$1 ok=$2
  if [[ $ok -eq 0 ]]; then echo "  $name: shown"; else echo "  $name: NOT SHOWN"; bad=$((bad+1)); fi
}
save() { pane > $CAPS/$1.txt; echo "  saved captures/$1.txt"; strip | sed 's/^/  | /' }

echo "owner rep live · $(date '+%Y-%m-%d %H:%M')"
for n in $want; do
  bad=0
  case $n in
    1)
      echo "1 idle: the row draws with the placeholder goal and the idle status"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      save 1-idle
      strip | grep -q 'working out the result you want' ; verdict 'placeholder goal' $?
      strip | grep -qE '^\s*idle\s+1: Brief me' ; verdict 'idle status with digits' $?
      stop ;;
    2)
      echo "2 command: a shell chain that starts by setting a variable shows the program's name only"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      send 'Run exactly this one shell command and nothing else, then say done: export PATH="$HOME/.local/bin:$PATH"; LOGF=~/Library/Logs/agentsview/serve.launchd.log; mark=$(wc -c < /dev/null); agentsview sync >/dev/null 2>&1; sleep 45'
      wait_for '^\s*running ' 60
      save 2-command
      strip | grep -qE '^\s*running agentsview\s+1: Brief me' ; verdict 'running agentsview' $?
      strip | grep -qE 'PATH|LOGF|\$HOME|export' ; [[ $? -ne 0 ]]; verdict 'no command text in the strip' $?
      stop ;;
    3)
      echo "3 goal: an Owner rep goal: prompt pins the goal and the agent never answers it"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      send 'Owner rep goal: the strip reads plainly in every state'
      wait_for 'Owner rep · the strip reads plainly' 20
      sleep 8
      save 3-goal
      strip | grep -q 'Owner rep · the strip reads plainly in every state' ; verdict 'goal pinned in the head' $?
      # The engine's own line says the hook dropped the prompt; any other ⏺ line is the agent answering.
      pane | grep -E '^⏺' | grep -qv 'Prompt dropped by a hook' ; [[ $? -ne 0 ]]; verdict 'no answer from the agent, only the dropped-prompt line' $?
      strip | grep -qE '^\s*idle\s+1: Brief me' ; verdict 'still idle' $?
      stop ;;
    4)
      echo "4 briefing: the Rep button pressed mid-turn draws the card with its buttons"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      send 'Run exactly this one shell command and nothing else, then say done: sleep 90'
      wait_for '^\s*running sleep' 60
      tmux send-keys -t $S 1
      wait_for 'Fine, close|↓ [0-9]+ more' 90
      save 4-briefing
      pane | grep -qE '^\s*Stands:' ; verdict 'card body drawn' $?
      pane | grep -qE 'Put message in prompt|Check it' ; verdict 'card offers the message or the check' $?
      # The band shows at most maxRows rows and a bare digit presses only a button wholly inside
      # them (the engine's rule). A card taller than the band hides its buttons under "↓ N more",
      # and the owner's digit then types into the prompt box instead of pressing anything.
      pane | grep -q 'Fine, close' ; verdict 'card buttons inside the band window' $?
      tmux send-keys -t $S 2
      wait_for '1: Brief me' 15
      save 4-briefing-closed
      strip | grep -qE '1: Brief me' ; verdict 'digit 2 closed the card and the row is back' $?
      stop ;;
    5)
      echo "5 stopped: after the agent's turn ends the status says it is waiting, with the mark"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      send 'Reply with the single word done and nothing else.'
      wait_for '^\s*stopped, waiting on you' 60
      sleep 1
      save 5-stopped
      strip | grep -qE '^\s*stopped, waiting on you\s+1: Brief me' ; verdict 'stopped, waiting on you' $?
      pane | grep -q '◆ Owner rep' ; verdict 'the mark on the head' $?
      stop ;;
    6)
      echo "6 whole ask: after a first message that asks for much and a second that asks for a step, Brief me lists the open work and gives the size as a figure"
      start || { bad=1; fails=$((fails+1)); stop; continue }
      send 'This folder will be a public repository I show to employers, so it must read as serious engineering: a README, a test suite with as many tests as possible, and a run of those tests on GitHub on every push. Start with the README only: write a two-line README.md and stop.'
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      send 'Now add a LICENSE file with the single line MIT and stop.'
      sleep 3
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 2
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 120
      save 6-whole-ask
      pane | grep -qE '^\s*Left out:' ; verdict 'left-out list drawn' $?
      pane | grep -A3 -E '^\s*Left out:' | grep -qE '^\s*- ' ; verdict 'open work listed against the whole ask' $?
      pane | grep -A3 -E '^\s*Left out:' | grep -qiE 'test|github' ; verdict 'the tests or the GitHub run named as open' $?
      pane | grep -q 'Put message in prompt' ; verdict 'a message drafted' $?
      pane | grep -qE 'conversation at [0-9]+ percent of its window' ; verdict 'the size given as a figure' $?
      stop ;;
  esac
  [[ $bad -gt 0 ]] && fails=$((fails+1))
done
echo "$(( ${#want} - fails )) of ${#want} scenarios shown, $fails not."
exit $(( fails > 0 ))
