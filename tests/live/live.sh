#!/bin/zsh
# The live layer: real Claude Code sessions in tmux, the strip captured from the screen.
# Proves the build the owner runs calls the rep's hooks; the test kit cannot. On demand only:
# each scenario is a real session and a model call, about a minute.
#
#     tests/live/live.sh            # all twelve scenarios
#     tests/live/live.sh 2 4        # only these
#
# Each scenario's whole screen is saved in tests/live/captures/<n>-<name>.txt, and the strip's
# lines are printed in the report. Scenario 9 also reads the rep's store file under
# ~/.claude/plugins/store/ (owner-rep_inline-*.json) to show what the reopened session
# recorded. Scenario 11 proves the card never offers a stop while a condition is open. How many
# reads the card took (the record's lastBrief.reads: 1 passed the gate first time, 2 asked once
# more, 3 refused twice and written in the rep's own words), what came of the own-words call
# (lastBrief.own: whole, cut when it answered but not whole, none when it did not answer,
# skipped when no call was made) with its reply's length (ownChars), and whether the fixed text
# was the last net are printed, not judged, because the model's first answer decides them.
# Scenario 12 resizes one session's window to 44, 24 and 80 rows with the card open: the buttons
# stay on screen at each, the judgment's parts are drawn from 44, and nothing is cut at 80. Exit
# 0 when every scenario run showed what it should.
#
# The sessions run in a scratch folder under the system temp directory, in bypass mode, with
# the nested-session variables unset (set, claude falls into print mode and exits). The mod
# loads from this checkout (--plugin-dir), with the copy installed at user scope switched off
# for the session, so the build under test is this folder's and the sessions' records go to
# the store of a mod loaded that way (owner-rep_inline-*.json), never to the installed mod's,
# which keeps only its newest records and would let the owner's own sessions go for these.
#
#     INSTALLED=1 tests/live/live.sh 11     # the installed copy, not this folder
#
# With INSTALLED=1 the sessions run the copy installed at user scope instead: no --plugin-dir
# and no setting that switches the installed copy off, and the steps that read the rep's store
# read the installed mod's (owner-rep_owner-rep-*.json). That store keeps only its newest 32
# records, so each session such a run starts lets the oldest of the owner's go; use it for one
# scenario at a time, to show what the installed build does. ROOT, the folder loaded with
# --plugin-dir, can be set from the environment; captures go beside the script, in captures/.
set -u
HERE=${0:A:h}
ROOT=${ROOT:-${HERE:h:h}}
CAPS=$HERE/captures
mkdir -p $CAPS
INSTALLED=${INSTALLED:-}
if [[ -n $INSTALLED ]]; then
  PLUGIN_ARGS=''
  STORE_NAME='owner-rep_owner-rep-*.json'
else
  PLUGIN_ARGS="--plugin-dir '$ROOT' --settings '{\"enabledPlugins\":{\"owner-rep@owner-rep\":false}}'"
  STORE_NAME='owner-rep_inline-*.json'
fi
S=owner-rep-live
STRIP_RE='Owner rep ·|Brief me|Tell the rep|Fine, close|Put message|Check it|Heads up'
want=("$@")
[[ ${#want} -eq 0 ]] && want=(1 2 3 4 5 6 7 8 9 10 11 12)
fails=0
bad=0
# The folder the last session was started in, so a scenario can reopen a session there.
LIVE_DIR=''

pane() { tmux capture-pane -p -t $S 2>/dev/null; }
strip() { pane | grep -E "$STRIP_RE" | sed 's/[[:space:]]*$//'; }
# wait_for PATTERN SECONDS: polls the screen; 0 when the pattern appears.
wait_for() {
  local re=$1 secs=$2 i
  for i in $(seq 1 $secs); do
    pane | grep -qE "$re" && return 0
    sleep 1
  done
  return 1
}
# send TEXT: types it and presses Enter. A long text can arrive as a paste, and an Enter right
# after a paste becomes a line break in the box; while the box still opens with the text, Enter
# is pressed again (the box is the last line that starts with the prompt mark).
send() {
  local head=${1[1,20]} i
  tmux send-keys -t $S -l "$1"; sleep 1; tmux send-keys -t $S Enter
  for i in 1 2 3; do
    sleep 1
    pane | grep -E '^❯' | tail -1 | grep -qF -- "$head" || return 0
    tmux send-keys -t $S Enter
  done
}

# start [DIR [ARG...]]: a session in a fresh scratch folder, or in DIR with these arguments
# added to claude's (scenario 9 reopens the last session there with --continue).
start() {
  tmux kill-session -t $S 2>/dev/null
  local dir=${1:-}
  (( $# > 0 )) && shift
  if [[ -z $dir ]]; then
    dir=$(mktemp -d -t owner-rep-live)
    git -C $dir init -q
  fi
  LIVE_DIR=$dir
  tmux new-session -d -s $S -x 170 -y 44 -c $dir \
    "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED claude $PLUGIN_ARGS $* --permission-mode bypassPermissions"
  if wait_for 'Yes, I trust this folder' 20; then tmux send-keys -t $S Down; sleep 0.5; tmux send-keys -t $S Enter; fi
  wait_for 'Brief me' 40 || { echo "  the session did not draw the rep's row in 40s"; return 1; }
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
# The status line can show the home folder's name; a saved capture shows `user` in its place.
save() { pane | sed "s/${USER:-user}/user/g" > $CAPS/$1.txt; echo "  saved captures/$1.txt"; strip | sed 's/^/  | /'; }

# heights_record FIELD: 0 when the last ten words of lastBrief.FIELD, in the newest record that
# holds scenario 12's first prompt, are in $card, read with the box's borders taken off and its
# rows joined.
heights_record() {
  local stores store
  stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/${~STORE_NAME}(Nom))
  store=${stores[1]:-}
  CARD=$card python3 -I - "$store" "$HEIGHTS_FIRST" "$1" <<'PY2'
import json, os, sys
store, first, field = sys.argv[1:4]
fold = lambda t: " ".join(str(t).replace("│", " ").split())
card = fold(os.environ.get("CARD", ""))
try:
    recs = [r for r in json.load(open(store)).get("sessions", {}).values() if any(isinstance(m, dict) and fold(m.get("text", "")) == fold(first) for m in r.get("owner", []))]
except OSError:
    recs = []
if not recs:
    print("  no record holding the first prompt")
    sys.exit(1)
text = fold((max(recs, key=lambda r: r.get("at", 0)).get("lastBrief") or {}).get(field, ""))
tail = " ".join(text.split()[-10:])
print(f"  the {field} ends: {tail}")
sys.exit(0 if tail and tail in card else 1)
PY2
}
# heights_card ROWS: the checks of scenario 12 on the card drawn in a window of ROWS rows, from
# its head to its buttons. The band has at most half the window, the prompt's rows included, so
# about 5 rows at 24, 14 at 44 and 32 at 80. At every height the buttons are on screen and
# nothing scrolls; from 44 the count line and the three judgment parts are drawn; at 80 the
# card is whole, nothing in it cut and the message whole in its box.
heights_card() {
  local rows=$1
  card=$(pane | sed -n '/Owner rep ·/,/Fine, close/p' | sed 's/[│[:space:]]*$//')
  echo "  at $rows rows the card takes $(print -r -- "$card" | wc -l | tr -d ' ') rows:"
  print -r -- "$card" | grep -q 'Fine, close' ; verdict "$rows rows: the buttons on screen" $?
  pane | grep -qE '↓ [0-9]+ more' ; [[ $? -ne 0 ]]; verdict "$rows rows: nothing scrolled out of the band" $?
  print -r -- "$card" | grep -q 'Owner rep ·' ; verdict "$rows rows: the head drawn" $?
  (( rows < 44 )) && return
  print -r -- "$card" | grep -qE '^\s*Done means [0-9]+ thing' ; verdict "$rows rows: the count line drawn" $?
  print -r -- "$card" | grep -qE '^\s*Stands:' ; verdict "$rows rows: Stands drawn" $?
  print -r -- "$card" | grep -qE '^\s*Means:' ; verdict "$rows rows: Means drawn" $?
  print -r -- "$card" | grep -qE '^\s*Next:' ; verdict "$rows rows: Next drawn" $?
  (( rows < 80 )) && return
  print -r -- "$card" | grep -q '…$' ; [[ $? -ne 0 ]]; verdict "$rows rows: no line of the card cut" $?
  heights_record next ; verdict "$rows rows: Next whole, as the rep wrote it" $?
  heights_record message ; verdict "$rows rows: the whole message in the box" $?
}

echo "owner rep live · $(date '+%Y-%m-%d %H:%M')"
for n in $want; do
  bad=0
  case $n in
    1)
      echo "1 idle: the row draws with the placeholder goal and the idle status"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      save 1-idle
      strip | grep -q 'working out the result you want' ; verdict 'placeholder goal' $?
      strip | grep -qE '^\s*idle\s+1: Brief me' ; verdict 'idle status with digits' $?
      stop ;;
    2)
      echo "2 command: a shell chain that starts by setting a variable shows the program's name only"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'Run exactly this one shell command and nothing else, then say done: export PATH="$HOME/.local/bin:$PATH"; LOGF=~/Library/Logs/agentsview/serve.launchd.log; mark=$(wc -c < /dev/null); agentsview sync >/dev/null 2>&1; sleep 45'
      wait_for '^\s*running ' 60
      save 2-command
      strip | grep -qE '^\s*running agentsview\s+1: Brief me' ; verdict 'running agentsview' $?
      strip | grep -qE 'PATH|LOGF|\$HOME|export' ; [[ $? -ne 0 ]]; verdict 'no command text in the strip' $?
      stop ;;
    3)
      echo "3 note: an Owner rep: prompt never reaches the agent, and the rep reads again at once"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'Reply with the single word done and nothing else.'
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 60
      sleep 6
      answers=$(pane | grep -E '^⏺' | grep -vc 'Prompt dropped by a hook')
      send 'Owner rep: what I care about is a one-word answer and nothing added.'
      # The note starts a look; the head leaves the placeholder once the reading is written.
      wait_for 'Owner rep · [^w]' 60
      sleep 2
      save 3-note
      # The engine's own line says the hook dropped the prompt; any other new ⏺ line is the agent answering.
      [[ $(pane | grep -E '^⏺' | grep -vc 'Prompt dropped by a hook') -eq $answers ]] ; verdict 'no answer from the agent to the note, only the dropped-prompt line' $?
      pane | grep -q 'Prompt dropped by a hook' ; verdict 'the dropped-prompt line shown' $?
      # The note is cleared from the prompt box, so the next digit presses a button.
      pane | grep -q 'what I care about is a one-word answer' ; [[ $? -ne 0 ]]; verdict 'the prompt box emptied after the note' $?
      strip | grep -q 'working out the result you want' ; [[ $? -ne 0 ]]; verdict 'the head shows a reading, not the placeholder' $?
      strip | grep -qE '1: Brief me\s+2: Tell the rep' ; verdict 'row buttons with Tell the rep' $?
      stop ;;
    4)
      echo "4 briefing: the Rep button pressed mid-turn draws the card with its buttons"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
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
      # A command-like ask once came back empty from every objective write, leaving no objective.
      pane | grep -q 'working out the result you want' ; [[ $? -ne 0 ]]; verdict 'the card head shows the objective, not the placeholder' $?
      pane | grep -qE 'objective writes? failed' ; [[ $? -ne 0 ]]; verdict 'no failed objective write on the price line' $?
      tmux send-keys -t $S 2
      wait_for '1: Brief me' 15
      save 4-briefing-closed
      strip | grep -qE '1: Brief me' ; verdict 'digit 2 closed the card and the row is back' $?
      stop ;;
    5)
      echo "5 stopped: after the agent's turn ends the status says it is waiting, with the mark"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'Reply with the single word done and nothing else.'
      wait_for '^\s*stopped, waiting on you' 60
      sleep 1
      save 5-stopped
      strip | grep -qE '^\s*stopped, waiting on you\s+1: Brief me' ; verdict 'stopped, waiting on you' $?
      pane | grep -q '◆ Owner rep' ; verdict 'the mark on the head' $?
      stop ;;
    6)
      echo "6 whole ask: after a first message that asks for much and a second that asks for a step, Brief me lists the open work and gives the size as a figure"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'This folder will be a public repository I show to employers, so it must read as serious engineering: a README, a test suite with as many tests as possible, and a run of those tests on GitHub on every push. Start with the README only: write a two-line README.md and stop.'
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      send 'Now add a LICENSE file with the single line MIT and stop.'
      sleep 3
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 2
      send 'Owner rep: the licence can wait. What matters most to me is the test suite and the GitHub run; judge the work by those.'
      sleep 20
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 120
      save 6-whole-ask
      pane | grep -qE '^\s*Left out:' ; verdict 'left-out list drawn' $?
      pane | grep -A3 -E '^\s*Left out:' | grep -qE '^\s*- ' ; verdict 'open work listed against the reading' $?
      pane | grep -A3 -E '^\s*Left out:' | grep -qiE 'test|github' ; verdict 'the tests or the GitHub run named as open' $?
      pane | grep -qE 'Reading revised at|New job since' ; verdict 'the reading revised after the note, with its cause' $?
      pane | grep -q 'Put message in prompt' ; verdict 'a message drafted' $?
      pane | grep -qE 'conversation at [0-9]+ percent of its window' ; verdict 'the size given as a figure' $?
      pane | grep -q '4: Tell the rep' ; verdict 'the card offers Tell the rep' $?
      stop ;;
    7)
      echo "7 objective kept whole: a first ask with two conditions, the rep's draft sent through the card, then a message bounding the next step with 'only'; Brief me keeps the whole result, says the objective was revised, lists the open conditions and does not say stop"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'This folder will be a small public Python tool I hand to a colleague: wc.py prints how many words are in the text file named on its command line. Two things must be true before it is done: a README that explains how to run it, and a test file whose tests pass on GitHub on every push. Never create a repository online; I will add the remote myself. Start with the README only: write a two-line README.md and stop.'
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 20
      tmux send-keys -t $S 1
      wait_for 'Put message in prompt' 120
      head_before=$(strip | grep -E 'Owner rep' | head -1)
      tmux send-keys -t $S 1
      sleep 1
      tmux send-keys -t $S Enter
      sleep 3
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 240
      sleep 2
      send 'Now only tell me in one line why the README has two lines, nothing else.'
      sleep 3
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 30
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 120
      save 7-objective-whole
      head_after=$(strip | grep -E 'Owner rep' | head -1)
      echo "  head before the draft: $head_before"
      echo "  head after the correction: $head_after"
      print -r -- "$head_after" | grep -qiE 'tool|colleague|test|github' ; verdict 'the head still names the whole result, not the one-line answer' $?
      pane | grep -qE 'Reading revised at' ; verdict 'the card says the objective was revised' $?
      pane | grep -qE '^\s*Left out:' ; verdict 'left-out list drawn' $?
      pane | grep -A6 -E '^\s*Left out:' | grep -qiE 'test|github' ; verdict 'the tests or the GitHub run still listed as open' $?
      pane | grep -E '^\s*Next:' | grep -qiE '\bstop\b' ; [[ $? -ne 0 ]]; verdict 'Next does not say stop' $?
      pane | grep -q 'Put message in prompt' ; verdict 'a message drafted' $?
      stop ;;
    8)
      echo "8 finished: a one-word job the agent has done; Brief me says it is done, with nothing left out and no failed write"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'Reply with the single word done and nothing else.'
      wait_for '^\s*stopped, waiting on you' 60
      # The objective is written after the message; the head leaves the placeholder once it is held.
      wait_for 'Owner rep · [^w]' 120
      sleep 2
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 120
      save 8-finished
      # The head's mark is ◆ or ◇ depending on the state; the card starts at the head either way.
      card=$(pane | sed -n '/Owner rep ·/,$p')
      print -r -- "$card" | grep -q 'working out the result you want' ; [[ $? -ne 0 ]]; verdict 'the card head shows the objective, not the placeholder' $?
      print -r -- "$card" | grep -qE '^\s*Stands:' ; verdict 'card body drawn' $?
      print -r -- "$card" | grep -qE '^\s*Left out:' ; [[ $? -ne 0 ]]; verdict 'nothing listed as left out' $?
      # Judged on the card's own lines, not the objective in its head, which names the word done.
      print -r -- "$card" | grep -E '^\s*(Means|Next):' | grep -qiE 'finished|complete|nothing( more)? (is )?(left|waiting|to do)|followed your instruction' ; verdict 'the card says the job is done' $?
      print -r -- "$card" | grep -qE 'objective writes? failed' ; [[ $? -ne 0 ]]; verdict 'no failed objective write on the price line' $?
      stop ;;
    9)
      echo "9 reopened: a session reopened with --continue and pressed before anything is sent in it; Brief me reads the session and draws the card with the objective, and a message typed while the first turn ran a twenty-second ping is recorded as the owner's"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      # Claude Code refuses a foreground sleep, so the first turn runs a ping of twenty packets
      # instead, about twenty seconds in the foreground.
      first='Run the shell command ping -c 20 127.0.0.1 in the foreground, then reply with the single word done and nothing else.'
      queued='Typed while you worked: after done, add the word queued on its own line.'
      send $first
      # The second message is typed while the ping runs, so Claude Code queues it and saves it
      # as a queued command, not as a user line, and it is never a row of the session.
      sleep 8
      send $queued
      wait_for '^\s*stopped, waiting on you' 120
      sleep 2
      send '/exit'
      sleep 3
      # The rep's store, as the mod's $.store writes it for a mod loaded with --plugin-dir (the
      # file name carries a hash; the newest such file is the one the first session just wrote),
      # and the session ids it holds before the fork, so the fork's record is the new one.
      stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/${~STORE_NAME}(Nom))
      store=${stores[1]:-}
      ids_before=$(mktemp -t owner-rep-live-ids)
      [[ -n $store ]] && python3 -I -c 'import json, sys; print("\n".join(json.load(open(sys.argv[1])).get("sessions", {}).keys()))' $store > $ids_before
      # The same folder, the same unset variables and flags; --fork-session gives the reopened
      # session a new id, so the rep holds no record of it and must read the session itself.
      start $LIVE_DIR --continue --fork-session || { bad=1; fails=$((fails+1)); stop; continue; }
      tmux send-keys -t $S 1
      # The toast for nothing to read shows for a few seconds and then goes, so the screen is read
      # every half second while the card is awaited, and the toast counts if it ever appeared.
      saw_nothing=1
      for i in $(seq 1 600); do
        pane | grep -q 'nothing to read yet' && saw_nothing=0
        pane | grep -q 'Fine, close' && break
        sleep 0.5
      done
      save 9-reopened
      card=$(pane | sed -n '/Owner rep ·/,$p')
      print -r -- "$card" | grep -qE '^\s*Stands:' ; verdict 'card body drawn' $?
      [[ $saw_nothing -ne 0 ]] ; verdict 'no "nothing to read yet" in the pane at any time' $?
      print -r -- "$card" | grep -q 'working out the result you want' ; [[ $? -ne 0 ]]; verdict 'the card head shows the objective, not the placeholder' $?
      print -r -- "$card" | grep -qE 'objective writes? failed' ; [[ $? -ne 0 ]]; verdict 'no failed objective write on the price line' $?
      # The fork's record: the newest record under a session id new since the fork started that
      # holds the first prompt. It must hold the queued message as the owner's (kind his), which only the
      # queued command's line in the transcript holds.
      sleep 2
      if [[ -z $store ]]; then
        echo "  no owner-rep store file under ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/store"
        false
      else
        python3 -I - $store $ids_before $first $queued <<'PY'
import json, sys
store, before, first, queued = sys.argv[1:5]
fold = lambda t: " ".join(str(t).split())
old = set(open(before).read().split())
recs = [(k, r) for k, r in json.load(open(store)).get("sessions", {}).items() if k not in old]
forks = [(k, r) for k, r in recs if any(isinstance(m, dict) and fold(m.get("text", "")) == fold(first) for m in r.get("owner", []))]
if not forks:
    print("  no new record holding the first prompt")
    sys.exit(1)
k, r = max(forks, key=lambda kr: kr[1].get("at", 0))
print(f"  the fork's record {k}:")
for m in r.get("owner", []):
    if isinstance(m, dict):
        print(f"  | #{m.get('n')} {m.get('kind')}: {fold(m.get('text', ''))[:80]}")
sys.exit(0 if any(isinstance(m, dict) and m.get("kind") == "his" and fold(queued) in fold(m.get("text", "")) for m in r.get("owner", [])) else 1)
PY
      fi
      verdict "the queued message recorded as the owner's in the fork's record" $?
      rm -f $ids_before
      stop ;;
    10)
      echo "10 heads-up: a claim the agent never showed draws the Heads up above the row, which stays with its status and both buttons"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      send 'Do not run any command or open any file. Reply with exactly this sentence and nothing else: I ran the whole test suite and every test passes, so the work is finished.'
      wait_for '^\s*stopped, waiting on you' 90
      sleep 2
      # A note to the rep rewrites the objective and starts a look at once; the look then sees
      # a claim of tests passed that nothing in the session shows.
      send 'Owner rep: what I care about is that the tests really ran and passed, shown in the session, not the agent saying so.'
      wait_for 'Heads up ·' 180
      sleep 2
      save 10-heads-up
      strip | grep -q 'Heads up ·' ; verdict 'the Heads up line drawn' $?
      [[ $(strip | grep -n 'Heads up ·' | head -1 | cut -d: -f1) -lt $(strip | grep -n 'Owner rep ·' | head -1 | cut -d: -f1) ]] ; verdict 'the row drawn beneath the note' $?
      strip | grep -qE '1: Brief me\s+2: Fine\s+0: Later' ; verdict 'the note buttons with digits' $?
      strip | grep -qE 'stopped, waiting on you\s+Brief me\s+Tell the rep' ; verdict 'the row status with both buttons for the mouse' $?
      stop ;;
    11)
      echo "11 refused stop: a one-word job with a condition for later that the conversation cannot show, the agent having answered; Brief me never says stop, and the record shows how many reads the card took (reads 1, 2 or 3)"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      first='Reply with the single word done and nothing else. One more thing for later, not now: this must end up installed on my laptop too, and I will tell you when.'
      send $first
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 3
      sleep 20
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 240
      save 11-refused-stop
      card=$(pane | sed -n '/Owner rep ·/,$p')
      print -r -- "$card" | grep -E '^\s*Next:' | sed 's/^\s*/  /'
      print -r -- "$card" | grep -E '^\s*Next:' | grep -qE '^\s*Next: (Stop|The agent (can|should) stop|Nothing (is|more) (left|for the agent))' ; [[ $? -ne 0 ]]; verdict 'Next does not open with a stop' $?
      print -r -- "$card" | grep -E '^\s*Next:' | grep -qi 'job is finished' ; [[ $? -ne 0 ]]; verdict 'Next does not call the job finished' $?
      print -r -- "$card" | grep -A4 -E '^\s*Left out:' | grep -qE '^\s*- ' ; verdict 'left-out list present with an item' $?
      # The record: the newest record in the newest store holding the first prompt.
      sleep 2
      stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/${~STORE_NAME}(Nom))
      store=${stores[1]:-}
      if [[ -z $store ]]; then
        echo "  no owner-rep store file under ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/store"
        false
      else
        python3 -I - $store $first <<'PY'
import json, sys
store, first = sys.argv[1:3]
fold = lambda t: " ".join(str(t).split())
recs = [(k, r) for k, r in json.load(open(store)).get("sessions", {}).items() if any(isinstance(m, dict) and fold(m.get("text", "")) == fold(first) for m in r.get("owner", []))]
if not recs:
    print("  no record holding the first prompt")
    sys.exit(1)
k, r = max(recs, key=lambda kr: kr[1].get("at", 0))
nxt = (r.get("lastBrief") or {}).get("next", "")
print(f"  the record {k}:")
lb = r.get('lastBrief') or {}
print(f"  reads: {lb.get('reads')}  own: {lb.get('own')}  ownChars: {lb.get('ownChars')}")
print(f"  the fixed text was the last net: {fold(nxt).startswith('The job is still open:')}")
PY
      fi
      verdict 'the record read' $?
      stop ;;
    12)
      echo "12 three heights: Brief me on a session with an objective, the card captured in a window of 44, 24 and 80 rows; the buttons stay on screen at every height, the count line and the judgment's parts are drawn from 44, and nothing is cut at 80"
      start || { bad=1; fails=$((fails+1)); stop; continue; }
      HEIGHTS_FIRST='This folder will be a public repository I show to employers, so it must read as serious engineering: a README, a test suite with as many tests as possible, and a run of those tests on GitHub on every push. Start with the README only: write a two-line README.md and stop.'
      send $HEIGHTS_FIRST
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      send 'Now add a LICENSE file with the single line MIT and stop.'
      sleep 3
      wait_for '^\s*stopped, waiting on you|^\s*asking you' 120
      sleep 20
      tmux send-keys -t $S 1
      wait_for 'Fine, close' 240
      save 12-height-44
      heights_card 44
      tmux resize-window -t $S -y 24; sleep 3
      save 12-height-24
      heights_card 24
      tmux resize-window -t $S -y 80; sleep 3
      save 12-height-80
      heights_card 80
      stop ;;
  esac
  [[ $bad -gt 0 ]] && fails=$((fails+1))
done
echo "$(( ${#want} - fails )) of ${#want} scenarios shown, $fails not."
exit $(( fails > 0 ))
