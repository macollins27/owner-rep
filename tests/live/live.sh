#!/bin/zsh
# The live layer: real Claude Code sessions in tmux, the strip captured from the screen.
# Proves the build the owner runs calls the rep's hooks; the test kit cannot. On demand only:
# each scenario is a real session and a model call, about a minute.
#
#     tests/live/live.sh            # every scenario, 1 to 14 (13 comes with the plan-screen
#                                   # scenario; until then it is reported as not in this build)
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
# stay on screen at each, the judgment's parts are drawn from 44, and nothing is cut at 80.
# Scenario 14 shows the agent's turn as the owner saw it: the text the rep saved under each of
# his messages (the turns that message answered, taken from the stream as it reached the
# screen) is the transcript's text for those turns, character for character, through a plan
# with a command, a reply typed mid-turn, two interrupts, a background task's turn, /compact, a
# helper, and a reload between turns that starts the mod again, after which the next message
# still holds the turn before it whole, from the saved record; it also prints what the engine
# sends as agentId on the main loop (see turn_capture). Exit 0 when every scenario run showed what it should.
#
# The sessions run in a scratch folder under the system temp directory, in bypass mode, with
# the nested-session variables unset (set, claude falls into print mode and exits). The mod
# loads from this checkout (--plugin-dir), with the copy installed at user scope switched off
# for the session, so the build under test is this folder's and the sessions' records go to
# the store of a mod loaded that way (owner-rep_inline-*.json), never to the installed mod's,
# which keeps only its newest records and would let the owner's own sessions go for these.
set -u
HERE=${0:A:h}
ROOT=${HERE:h:h}
CAPS=$HERE/captures
S=owner-rep-live
STRIP_RE='Owner rep ·|Brief me|Tell the rep|Fine, close|Put message|Check it|Heads up'
want=("$@")
[[ ${#want} -eq 0 ]] && want=(1 2 3 4 5 6 7 8 9 10 11 12 13 14)
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
    "env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_CODE_SESSION_ATTENDED claude --plugin-dir '$ROOT' --settings '{\"enabledPlugins\":{\"owner-rep@owner-rep\":false}}' $* --permission-mode bypassPermissions"
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
  stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/owner-rep_inline-*.json(Nom))
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

# Scenario 14: the agent's turn as he saw it. A second, throwaway mod loads beside the rep and
# logs what the engine sends on every prompt.submit, turn.start, turn.step and turn.complete:
# each text chunk, each stop chunk, how each step ended and what it returned, and, for agentId,
# only whether the key is there ('agentId' in e) and typeof its value, so an absent value is
# never shown as null. One session then runs, all text invented: a short plan, one command and
# a closing line; a reply asked for after a call to the advisor (two text blocks, when the
# model gives them); a long list with a reply typed while it streams; a list cut by Escape; a
# command cut by Escape; a background command whose notification starts a turn; /compact; a
# helper started with the Agent tool; and, between turns, a line added to a file of each mod
# and /reload-plugins, which starts a mod's module again only when its files changed (typed
# while a turn runs, it waits for the turn's end). The rep runs from a copy of the checkout's
# .claude-plugin, hooks and types, so that change never touches the checkout. Each turn
# is followed by a message of the owner's, which is what saves it as a body. Afterwards the
# rep's record of that one session (src.body.text and turns of each message, read from the
# owner-rep_inline-*.json store; nothing else in the store is printed) is set against the
# session's transcript and the log, and the whole comparison is written to
# captures/14-turn-capture.txt with the screen at the end.
turn_capture() {
  local T14 M14=0 ok verdicts line name i
  T14=$(mktemp -d -t owner-rep-live-14)
  mkdir -p $T14/log/.claude-plugin $T14/log/hooks $T14/logs
  print -r -- '{ "name": "live-turn-log", "version": "0.0.1", "description": "Throwaway logger for live scenario 14." }' > $T14/log/.claude-plugin/plugin.json
  print -r -- '{ "modules": ["./register.ts"] }' > $T14/log/hooks/hooks.json
  sed "s|@LOGDIR@|$T14/logs|" > $T14/log/hooks/register.ts <<'TS'
import type { Register } from 'claude-code'

const LOGDIR = '@LOGDIR@'
const t0 = Date.now()
const events: Record<string, unknown>[] = []
let sid = ''
let writing: Promise<void> = Promise.resolve()

// agentId as the engine sent it: whether the key is there, and typeof its value.
const raw = (e: object) => {
  const v = (e as { agentId?: unknown }).agentId
  return { has: 'agentId' in e, type: typeof v, agent: typeof v === 'string' ? v : '' }
}
const word = (v: unknown) => (v === null ? 'null' : v === undefined ? 'undefined' : String(v))

function flush($: any): Promise<void> {
  writing = writing
    .then(async () => {
      if (sid === '') {
        try { sid = await $.session.id() } catch { sid = 'unknown' }
      }
      await $.fs.write(`${LOGDIR}/${sid}-${t0}.jsonl`, events.map(x => JSON.stringify(x)).join('\n') + '\n')
    })
    .catch(() => undefined)
  return writing
}

export const register: Register = on => {
  on('prompt.submit', async ($: any, e: any, next: any) => {
    events.push({ ev: 'submit', at: Date.now(), hasTurn: typeof e.turnId === 'string', turnId: typeof e.turnId === 'string' ? e.turnId : '', origin: word(e.origin?.kind), text: String(e.text).slice(0, 60) })
    await flush($)
    return next(e)
  })
  on('turn.start', async ($: any, e: any, next: any) => {
    events.push({ ev: 'start', at: Date.now(), turnId: e.turnId, ...raw(e), text: typeof e.text === 'string' ? e.text.slice(0, 40) : word(e.text) })
    await flush($)
    return next(e)
  })
  on('turn.step', async function* ($: any, e: any, next: any): any {
    const base = { turnId: e.turnId, step: e.index, ...raw(e) }
    events.push({ ev: 'begin', at: Date.now(), ...base })
    let ended = 'stopped from above'
    let answer: unknown = null
    let stopReason: unknown = 'none'
    const it = next(e)
    const see = (r: any) => {
      if (r.done !== true) {
        const c = r.value
        if (c.kind === 'text') events.push({ ev: 'text', at: Date.now(), turnId: e.turnId, step: e.index, agent: base.agent, index: c.index, text: c.text })
        else if (c.kind === 'stop') events.push({ ev: 'stopchunk', at: Date.now(), turnId: e.turnId, step: e.index, agent: base.agent, stopReason: word(c.stopReason) })
      }
      return r
    }
    const tap: any = { next: (...a: any[]) => it.next(...a).then(see), [Symbol.asyncIterator]() { return tap } }
    if (it.return) tap.return = (v: any) => it.return(v).then(see)
    if (it.throw) tap.throw = (err: any) => it.throw(err).then(see)
    try {
      const r = yield* tap
      ended = 'returned'
      answer = r?.answer
      stopReason = r?.stopReason
      return r
    } catch (err) {
      ended = 'threw'
      throw err
    } finally {
      events.push({ ev: 'end', at: Date.now(), turnId: e.turnId, step: e.index, agent: base.agent, ended, answer: typeof answer === 'string' ? answer : word(answer), stopReason: word(stopReason) })
      await flush($)
    }
  })
  on('turn.complete', async ($: any, e: any, next: any) => {
    events.push({ ev: 'complete', at: Date.now(), turnId: e.turnId, ...raw(e), isAborted: e.isAborted, reason: word(e.reason), answer: typeof e.answer === 'string' ? e.answer : word(e.answer) })
    await flush($)
    return next(e)
  })
}
TS
  cat > $T14/check.py <<'PY'
import datetime, glob, json, os, sys
from collections import OrderedDict

mode, logdir = sys.argv[1], sys.argv[2]
cfg = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")

def logs():
    fs = glob.glob(os.path.join(logdir, "*.jsonl"))
    return sorted(fs, key=lambda f: int(os.path.basename(f).rsplit("-", 1)[1].split(".")[0]))

def session_id():
    ids = {os.path.basename(f).rsplit("-", 1)[0] for f in logs()}
    return sorted(ids)[0] if len(ids) == 1 else None

def record(sid):
    # Only this session's record is read from the store; nothing else in it is printed.
    files = glob.glob(os.path.join(cfg, "plugins", "store", "owner-rep_inline-*.json"))
    for f in sorted(files, key=os.path.getmtime, reverse=True):
        try:
            s = json.load(open(f)).get("sessions", {})
        except (OSError, ValueError):
            continue
        if sid in s:
            return s[sid]
    return None

if mode == "sid":
    print(session_id() or "")
    sys.exit(0)
if mode == "snap":
    sid = session_id()
    r = record(sid) if sid else None
    json.dump((r or {}).get("owner", []), open(sys.argv[3], "w"))
    sys.exit(0)

before_path, typed_path, out_path = sys.argv[3], sys.argv[4], sys.argv[5]
out = open(out_path, "w")
def say(s=""):
    out.write(s + "\n")
verdicts = []
def verdict(name, ok, why):
    verdicts.append((name, ok))
    say(f"  {'shown' if ok else 'NOT SHOWN'}: {name}")
    for w in why:
        say(f"    {w}")

def ends(s, n=60):
    s = s.replace("\n", "\\n")
    return s if len(s) <= 2 * n + 5 else f"{s[:n]} ... {s[-n:]}"
def first_diff(a, b):
    for i, (x, y) in enumerate(zip(a, b)):
        if x != y:
            return i
    return min(len(a), len(b)) if len(a) != len(b) else -1
join = lambda blocks: "\n\n".join(b for b in blocks if b != "")
short = lambda t: (t or "")[:8]

sid = session_id()
say(f"session {sid}")
files = logs()
say(f"log files (one per load of the logging mod; a reload starts a new one): {len(files)}")
events = []
for fi, f in enumerate(files):
    for li, l in enumerate(open(f)):
        if l.strip():
            e = json.loads(l)
            e["_f"], e["_i"] = fi, li
            events.append(e)
events.sort(key=lambda e: (e["at"], e["_f"], e["_i"]))

# agentId as sent
say("\n== agentId on turn.start and turn.step, as the engine sent it ('agentId' in e, typeof e.agentId)")
seen = OrderedDict()
for e in events:
    if e["ev"] in ("start", "begin", "complete"):
        k = (e["ev"], e["has"], e["type"])
        seen[k] = seen.get(k, 0) + 1
for (ev, has, typ), c in seen.items():
    say(f"  {ev:9} 'agentId' in e: {str(has).lower():5}  typeof: {typ:9}  events: {c}")

# steps
steps = OrderedDict()
for e in events:
    key = (e.get("agent", ""), e.get("turnId"), e.get("step"))
    if e["ev"] == "begin":
        steps[key] = {"blocks": OrderedDict(), "stops": [], "end": None, "file": e["_f"], "at": e["at"]}
    elif e["ev"] in ("text", "stopchunk", "end") and key in steps:
        s = steps[key]
        if e["ev"] == "text":
            s["blocks"][e["index"]] = s["blocks"].get(e["index"], "") + e["text"]
        elif e["ev"] == "stopchunk":
            s["stops"].append(e["stopReason"])
        else:
            s["end"] = e
main_steps = [(k, s) for k, s in steps.items() if k[0] == ""]
sub_steps = [(k, s) for k, s in steps.items() if k[0] != ""]
def step_blocks(s):
    return [s["blocks"][i] for i in sorted(s["blocks"])]

# transcript
trs = glob.glob(os.path.join(cfg, "projects", "*", f"{sid}.jsonl")) if sid else []
tr = trs[0] if trs else None
msgs = OrderedDict()
if tr:
    for l in open(tr):
        try:
            r = json.loads(l)
        except ValueError:
            continue
        if r.get("type") != "assistant" or r.get("isSidechain"):
            continue
        m = r.get("message") or {}
        d = msgs.setdefault(m.get("id"), {"blocks": [], "stop": None, "model": m.get("model")})
        d["stop"] = m.get("stop_reason")
        for b in m.get("content") or []:
            if isinstance(b, dict) and b.get("type") == "text":
                d["blocks"].append(b.get("text", ""))
sub_texts = []
if tr:
    for f in glob.glob(os.path.join(tr[: -len(".jsonl")], "subagents", "*.jsonl")):
        for l in open(f):
            try:
                r = json.loads(l)
            except ValueError:
                continue
            if r.get("type") == "assistant":
                for b in (r.get("message") or {}).get("content") or []:
                    if isinstance(b, dict) and b.get("type") == "text" and b.get("text"):
                        sub_texts.append(b["text"])
for k, s in sub_steps:
    t = join(step_blocks(s))
    if t:
        sub_texts.append(t)
say(f"\ntranscript: {tr.replace(os.path.expanduser('~'), '~') if tr else 'NOT FOUND'}")
say(f"  {len(msgs)} assistant messages on the main loop; {len(sub_texts)} text pieces from helpers (their transcripts and their steps)")

# each main-loop step against its transcript message, in order
say("\n== each main-loop step's text chunks against the transcript (one step = one API message)")
mlist = list(msgs.items())
p = 0
matched = {}
for k, s in main_steps:
    blocks = [b for b in step_blocks(s) if b != ""]
    end = s["end"] or {}
    m_id = None
    if blocks:
        for q in range(p, len(mlist)):
            if [b for b in mlist[q][1]["blocks"] if b != ""] == blocks:
                m_id, p = mlist[q][0], q + 1
                break
    matched[k] = m_id
    joined = "".join(blocks)
    ans = end.get("answer")
    facts = []
    if len(blocks) > 1:
        facts.append(f"answer == blocks joined with one line break: {ans == chr(10).join(blocks)}")
    facts.append(f"answer == chunks: {ans == joined}")
    say(f"  turn {short(k[1])} step {k[2]}: {len(blocks)} text block(s), {len(joined)} chars; "
        f"{'equal to transcript message ' + str(m_id)[:16] if m_id else ('no text' if not blocks else 'MATCHES NO TRANSCRIPT MESSAGE')}; "
        f"stop chunks {s['stops'] or 'none'}; ended {end.get('ended', 'no end logged')}, stopReason {end.get('stopReason', '-')}; " + "; ".join(facts))
two_blocks = [k for k, s in main_steps if len([b for b in step_blocks(s) if b]) > 1]
used = set(v for v in matched.values() if v)
unseen = [mid for mid, m in mlist if [b for b in m["blocks"] if b] and mid not in used]
for mid in unseen:
    say(f"  transcript message {str(mid)[:16]} with text matched no step: {ends(join(msgs[mid]['blocks']))}")

# turns
say("\n== main-loop turns, in the order they ended")
turns = OrderedDict()
for e in events:
    if e.get("agent", "") != "" or e["ev"] not in ("start", "begin", "complete"):
        continue
    t = turns.setdefault(e["turnId"], {"start": None, "complete": None, "files": set(), "steps": []})
    t["files"].add(e["_f"])
    if e["ev"] == "start":
        t["start"] = e
    elif e["ev"] == "complete":
        t["complete"] = e
for k, s in main_steps:
    turns[k[1]]["steps"].append((k, s))
order = sorted(turns, key=lambda tid: (turns[tid]["complete"] or {"at": 1e18})["at"])
for tid in order:
    t = turns[tid]
    ss = sorted(t["steps"], key=lambda ks: ks[0][2])
    t["log"] = join([b for _, s in ss for b in step_blocks(s)])
    t["tr"] = None if any([b for b in step_blocks(s) if b] and not matched[k] for k, s in ss) else join([b for k, s in ss if matched[k] for b in msgs[matched[k]]["blocks"]])
    c = t["complete"] or {}
    last = join(step_blocks(ss[-1][1])) if ss else ""
    st = (t["start"] or {}).get("text")
    say(f"  turn {short(tid)}: started {'with ' + json.dumps(st)[:50] if t['start'] else 'unseen'}; {len(ss)} step(s); "
        f"{len(t['log'])} chars streamed, transcript {len(t['tr']) if t['tr'] is not None else 'UNKNOWN'}, equal {t['tr'] == t['log']}; "
        f"aborted {c.get('isAborted')}; turn.complete.answer {len(c.get('answer') or '')} chars, == last step's text {c.get('answer') == last}"
        + (f"; seen by {len(t['files'])} loads of the logging mod" if len(t["files"]) > 1 else ""))

# the rep's record
rec = record(sid) if sid else None
owner = sorted([m for m in (rec or {}).get("owner", []) if isinstance(m, dict)], key=lambda m: m.get("n", 0))
say(f"\n== the rep's record of this session: {len(owner)} messages; pending turns not yet answered: {len((rec or {}).get('pending') or [])}")
for m in owner:
    body = ((m.get("src") or {}).get("body") or {})
    say(f"  #{m.get('n')} {m.get('kind')}: {ends(m.get('text', ''), 40)}")
    if body or m.get("turns") or m.get("incomplete"):
        say(f"     body {body.get('chars')} chars, kept {body.get('where')}{', incomplete: ' + m['incomplete'] if m.get('incomplete') else ''}")
        for sp in m.get("turns") or []:
            extra = "".join(f", {x}: {sp[x]}" for x in ("note", "incomplete", "merged") if x in sp)
            say(f"       turn by {sp.get('by')} [{sp.get('from')}, {sp.get('to')}){extra}: {ends((body.get('text') or '')[sp.get('from', 0):sp.get('to', 0)], 40)}")

# spans against turns
say("\n== each turn in a body against the transcript's text for that turn")
flat = []
for m in owner:
    text = ((m.get("src") or {}).get("body") or {}).get("text")
    for j, sp in enumerate(m.get("turns") or []):
        flat.append((m.get("n"), j, sp, (text or "")[sp.get("from", 0):sp.get("to", 0)] if text is not None else None))
L = [tid for tid in order if turns[tid]["complete"]]
i = 0
problems, found, split, reloaded_spans = [], {}, None, []
for n, j, sp, sl in flat:
    want = lambda tid: turns[tid]["tr"] if turns[tid]["tr"] is not None else turns[tid]["log"]
    if sl is None:
        problems.append(f"#{n} turn {j}: its body's text could not be read")
        continue
    hit = None
    if "did not see this turn from its start" in (sp.get("incomplete") or ""):
        for q in range(i, len(L)):
            if sl == "" or want(L[q]).endswith(sl):
                hit = q
                break
        if hit is not None:
            reloaded_spans.append((n, L[hit]))
        else:
            problems.append(f"#{n} turn {j} (by {sp.get('by')}, incomplete): is the end of no main-loop turn: {ends(sl, 40)}")
    elif sp.get("note") == "typed-into":
        for q in range(i, len(L)):
            if sl != "" and want(L[q]).startswith(sl):
                hit = q
                break
        if hit is not None:
            split = (L[hit], len(sl), n)
    elif split is not None and j == 0:
        tid, cut, _ = split
        rest = want(tid)[cut:]
        rest = rest[2:] if rest.startswith("\n\n") else rest
        hit = L.index(tid) if sl == rest else None
        if hit is None:
            problems.append(f"#{n} turn {j}: should hold the rest of turn {short(tid)} after #{split[2]}; differs at {first_diff(sl, rest)} ({ends(sl, 40)} | {ends(rest, 40)})")
        split = None
    else:
        for q in range(i, len(L)):
            if want(L[q]) == sl:
                hit = q
                break
        if hit is None and i < len(L):
            problems.append(f"#{n} turn {j} (by {sp.get('by')}): matches no turn; against the next turn {short(L[i])} it differs at {first_diff(sl, want(L[i]))}: {ends(sl, 40)} | {ends(want(L[i]), 40)}")
    if hit is None:
        continue
    for q in range(i, hit):
        if turns[L[q]]["log"] != "" and L[q] not in found:
            problems.append(f"turn {short(L[q])} ({len(turns[L[q]]['log'])} chars) is in no body")
    found.setdefault(L[hit], []).append((n, j, sp))
    exact = turns[L[hit]]["tr"] is not None
    say(f"  #{n} turn {j} by {sp.get('by')}{', ' + sp['note'] if sp.get('note') else ''}{', incomplete' if sp.get('incomplete') else ''}: "
        f"turn {short(L[hit])}, {len(sl)} chars, {'equal to the transcript' if exact else 'equal to the log (the transcript does not hold this turn)'}")
    if not exact:
        problems.append(f"turn {short(L[hit])}: the transcript holds no text for a step of it")
    i = hit if sp.get("note") == "typed-into" else hit + 1
last_n = owner[-1]["n"] if owner else 0
for p_ in problems:
    say(f"  PROBLEM: {p_}")

say("\n== verdicts")
compared = [tid for tid in found if not any("did not see" in (sp.get("incomplete") or "") for _, _, sp in found[tid])]
verdict("every turn seen from its start is, character for character, the transcript's text blocks joined with blank lines",
        len(compared) >= 6 and not problems,
        [f"{len(compared)} turns compared in bodies; {len(problems)} problems"])

subs = [e for e in events if e["ev"] == "submit" and e.get("hasTurn")]
typed_at = None
try:
    typed_at = int(open(typed_path).read().strip())
except (OSError, ValueError):
    pass
why = []
for e in subs:
    before = [x for x in events if x["ev"] == "text" and x.get("agent", "") == "" and x["turnId"] == e["turnId"] and (x["at"], x["_f"], x["_i"]) < (e["at"], e["_f"], e["_i"])]
    lag = f"{e['at'] - typed_at if typed_at else '?'} ms after Enter was pressed on the typed reply" if e["origin"] == "composer" else "delivered by the engine, not typed"
    why.append(f"prompt.submit with turnId {short(e['turnId'])}, origin {e['origin']}, {lag}; "
               f"{sum(len(x['text']) for x in before)} chars of that turn had streamed: {json.dumps(e['text'][:40])}")
if not subs:
    why.append("no prompt.submit carried a turnId: the typed reply reached the session only after the turn it was typed into had ended")
ok_split = False
for tid, hits in found.items():
    typed = [h for h in hits if h[2].get("note") == "typed-into"]
    if typed:
        n, j, sp = typed[0]
        cut = sp["to"] - sp["from"]
        why.append(f"#{n} holds the first {cut} of the {len(turns[tid]['log'])} chars of turn {short(tid)}; the rest is in #{', #'.join(str(h[0]) for h in hits if h is not typed[0]) or ' no message'}")
        ok_split = 0 < cut < len(turns[tid]["log"]) and len(hits) >= 2
verdict("the reply typed while the agent worked holds the text up to the moment it was sent, and the next message's body the rest", ok_split, why)

ab = [tid for tid in L if (turns[tid]["complete"] or {}).get("isAborted")]
why, ok_ab = [], len(ab) >= 2
for tid in ab:
    hits = found.get(tid, [])
    good = bool(hits) and all(h[2].get("note") == "interrupted" for h in hits)
    ok_ab = ok_ab and good
    why.append(f"turn {short(tid)}: interrupted, {len(turns[tid]['log'])} chars streamed, turn.complete.answer {len((turns[tid]['complete'] or {}).get('answer') or '')} chars; "
               + (f"in #{hits[0][0]}, noted {hits[0][2].get('note')}" if hits else "in no body"))
verdict("the interrupted turns hold what streamed", ok_ab, why)

nt = [tid for tid in L if str(((turns[tid]["start"] or {}).get("text")) or "").lstrip().startswith("<task-notification>")]
why = [f"turn {short(tid)} began with a task notification; in a body labelled {[h[2].get('by') for h in found.get(tid, [])] or 'nowhere'}" for tid in nt]
verdict("the turn a task notification started is labelled so", bool(nt) and all(found.get(tid) and all(h[2].get("by") == "notification" for h in found[tid]) for tid in nt), why or ["no turn began with a task notification"])

try:
    before = json.load(open(before_path))
except (OSError, ValueError):
    before = []
after = {m.get("n"): m for m in owner}
withbody = [m for m in before if isinstance(m, dict) and (m.get("src") or {}).get("body")]
changed = [m.get("n") for m in withbody if (after.get(m.get("n")) or {}).get("src") != m.get("src") or (after.get(m.get("n")) or {}).get("turns") != m.get("turns")]
verdict("the compaction changed no saved body", bool(withbody) and not changed,
        [f"{len(withbody)} bodies saved before /compact; changed or gone after it: {changed or 'none'}"])

# A reload between turns, with a file of each mod changed first: both modules start again, so the
# rep's next message can have the turn that ended before the reload only from its saved record.
why = []
try:
    sent = int(open(os.path.join(os.path.dirname(typed_path), "reload-at")).read().strip())
except (OSError, ValueError):
    sent = None
ran = []
if tr:
    for l in open(tr):
        try:
            r = json.loads(l)
        except ValueError:
            continue
        c = (r.get("message") or {}).get("content")
        if r.get("type") == "user" and isinstance(c, str) and "<command-name>/reload-plugins" in c and r.get("timestamp"):
            ran.append(int(datetime.datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00")).timestamp() * 1000))
ok_rl = False
if not ran:
    why.append("the transcript records no /reload-plugins")
else:
    a0 = ran[0]
    during = [tid for tid in L if (turns[tid]["start"] or {"at": 1e18})["at"] <= a0 <= turns[tid]["complete"]["at"]]
    prev = [tid for tid in L if turns[tid]["complete"]["at"] < a0]
    nxt = [tid for tid in L if (turns[tid]["start"] or {"at": 0})["at"] > a0]
    why.append(f"/reload-plugins ran {a0 - sent if sent else '?'} ms after it was sent, "
               + (f"during turn {short(during[0])}" if during else f"between turns, {a0 - turns[prev[-1]]['complete']['at'] if prev else '?'} ms after turn {short(prev[-1]) if prev else '-'} ended"))
    why.append(f"the logging mod wrote {len(files)} log file(s): its module started {len(files)} time(s)")
    T = prev[-1] if prev else None
    after_sub = [e for e in events if e["ev"] == "submit" and e.get("origin") == "composer" and e["at"] > a0]
    m_next = None
    if after_sub:
        head = after_sub[0]["text"][:40]
        m_next = next((m for m in owner if str(m.get("text", "")).startswith(head)), None)
    hits = found.get(T, []) if T else []
    if T:
        why.append(f"turn {short(T)}, the last before the reload ({len(turns[T]['log'])} chars, seen by load {sorted(turns[T]['files'])} of the logging mod): "
                   + (", ".join(f"in #{h[0]}" + (f", {h[2].get('note')}" if h[2].get("note") else "") + (f", incomplete: {h[2].get('incomplete')}" if h[2].get("incomplete") else "") for h in hits) or "in no body"))
    if m_next is not None:
        why.append(f"the first message after the reload is #{m_next.get('n')}" + (f", incomplete: {m_next.get('incomplete')}" if m_next.get("incomplete") else ""))
    else:
        why.append("no message of the owner's after the reload was found in the record")
    ok_rl = (not during and len(files) >= 2 and T is not None and len(turns[T]["files"]) == 1
             and bool(nxt) and all(min(turns[t]["files"]) >= 1 for t in nxt)
             and m_next is not None and not m_next.get("incomplete")
             and len(hits) == 1 and hits[0][0] == m_next.get("n")
             and not hits[0][2].get("incomplete") and not hits[0][2].get("note"))
verdict("after a reload between turns that starts the mods again, the next message's body holds the turn before it whole, from the saved record", ok_rl, why)

bodies = [((m.get("src") or {}).get("body") or {}).get("text") or "" for m in owner]
leaks = [t for t in sub_texts if len(t) >= 15 and any(t in b for b in bodies)]
main_tr = "\n".join(join(m["blocks"]) for m in msgs.values())
# the main-loop turns around the helper: those running while it streamed, and the notification
# turns after it. Its text can only leak into their bodies, so those bodies must exist to judge.
h_at = [e["at"] for e in events if e.get("agent", "") != ""]
near = [tid for tid in L if h_at and (
    any((turns[tid]["start"] or {"at": 1e18})["at"] <= a <= turns[tid]["complete"]["at"] for a in h_at)
    or (tid in nt and (turns[tid]["start"] or {"at": 0})["at"] >= min(h_at)))]
verdict("no helper's text is in any body", bool(sub_steps) and bool(near) and all(tid in found for tid in near) and not leaks,
        [f"{len(sub_steps)} helper steps seen; {len(leaks)} helper texts found in a body" + (" (also in the main transcript)" if any(t in main_tr for t in leaks) else "")]
        + [f"turn {short(tid)}, running beside the helper or reporting it: " + (f"in #{found[tid][0][0]}" if tid in found else "in no body") for tid in near]
        + [ends(t, 40) for t in leaks])

objs = [k for k in seen if k[0] in ("start", "begin") and k[2] == "object"]
verdict("agentId on main-loop turn.start and turn.step is absent or undefined, never null",
        not objs and any(k[2] == "string" for k in seen) and any(k[2] == "undefined" for k in seen),
        [f"{k[0]}: 'agentId' in e {k[1]}, typeof {k[2]}" for k in seen if k[0] != "complete"])

say("\n== notes (not judged)")
say(f"  two text blocks in one response: {'seen, turn ' + ', '.join(short(k[1]) + ' step ' + str(k[2]) for k in two_blocks) if two_blocks else 'not given by the model in this run'}")
for e in events:
    if e["ev"] == "submit":
        say(f"  prompt.submit: origin {e['origin']}, turnId {short(e['turnId']) or 'none'}: {json.dumps(e['text'][:50])}")
out.close()
for name, ok in verdicts:
    print(f"{'0' if ok else '1'}\t{name}")
PY
  # The rep runs from a copy of what a session reads of this checkout, so the run can change one
  # of its files before /reload-plugins without touching the checkout.
  mkdir -p $T14/rep
  cp -c -R $ROOT/.claude-plugin $ROOT/hooks $ROOT/types $T14/rep/ 2>/dev/null || cp -R $ROOT/.claude-plugin $ROOT/hooks $ROOT/types $T14/rep/
  rm -rf "${T14:?}/rep/.claude-plugin/types"
  local ROOT=$T14/rep
  start '' --plugin-dir $T14/log || { rm -rf "${T14:?}"; stop; return 1; }
  # count EV: the logged main-loop events of that kind, over every load of the logging mod.
  t14_count() { cat /dev/null $T14/logs/*.jsonl(N) | grep "\"ev\":\"$1\"" | grep -c '"agent":""'; }
  # settled SECS: a main-loop turn has started since the last settle, and every started turn
  # has ended, for five seconds in a row.
  t14_settled() {
    local secs=$1 calm=0 s c
    for i in $(seq 1 $secs); do
      s=$(t14_count start); c=$(t14_count complete)
      if (( s > M14 && s == c )); then calm=$((calm+1)); (( calm >= 5 )) && { M14=$s; return 0; }; else calm=0; fi
      sleep 1
    done
    M14=$(t14_count start)
    echo "  no main-loop turn settled in ${secs}s"
    return 1
  }
  # tool_step SECS: a main-loop step that ends on a tool call has ended since this was called.
  t14_tool_step() {
    local n0 secs=$1
    n0=$(cat /dev/null $T14/logs/*.jsonl(N) | grep '"ev":"end"' | grep '"agent":""' | grep -c '"stopReason":"tool_use"')
    for i in $(seq 1 $secs); do
      (( $(cat /dev/null $T14/logs/*.jsonl(N) | grep '"ev":"end"' | grep '"agent":""' | grep -c '"stopReason":"tool_use"') > n0 )) && return 0
      sleep 1
    done
    return 1
  }
  send 'Write a three-step plan, as a short numbered list, for adding a script that prints hello to this folder. Then run the shell command echo plan-ready and nothing else, and after it end with one short line saying the plan is ready. Do not create any file.'
  t14_settled 180
  send 'Before you answer, call the advisor tool once and ask it whether a hello script needs tests. Then tell me in two sentences what it said. Do not create any file.'
  t14_settled 240
  send 'Write a list of 25 tips for keeping a houseplant alive, two sentences each, starting each tip with the word Tip, its number and a colon. After the list, run the shell command ping -c 5 127.0.0.1 in the foreground, then end with one short line.'
  wait_for 'Tip 4:' 120
  python3 -c 'import time; print(int(time.time() * 1000))' > $T14/typed-at
  send 'Typed while you worked: after the list, add one sentence about pots.'
  t14_settled 300
  send 'Write a list of 30 facts about the moon, one sentence each, starting each fact with the word Fact, its number and a colon.'
  wait_for 'Fact 4:' 120
  tmux send-keys -t $S Escape
  t14_settled 60
  sleep 2
  send 'Write one sentence saying you will wait, then run the shell command python3 -c "import time; time.sleep(40)" in the foreground.'
  t14_tool_step 120
  sleep 5
  tmux send-keys -t $S Escape
  t14_settled 60
  sleep 2
  send 'Start the shell command sleep 15; echo background-finished as a background command, then reply with the single word started. When it finishes, reply with the single word finished.'
  t14_settled 120
  for i in $(seq 1 90); do
    cat /dev/null $T14/logs/*.jsonl(N) | grep '"ev":"start"' | grep '"agent":""' | grep -q 'task-notification' && break
    sleep 1
  done
  t14_settled 120
  sleep 5
  python3 -I $T14/check.py snap $T14/logs $T14/before.json
  send '/compact'
  wait_for 'Compacted|compacted' 240
  sleep 5
  M14=$(t14_count start)
  send 'Use the Agent tool to have a helper write one sentence about a red kite, the bird. Do not repeat or summarise what it wrote; once it returns, reply with the single word received.'
  t14_settled 240
  send 'Run the shell command ping -c 20 127.0.0.1 in the foreground, then write two sentences about the sea.'
  t14_settled 180
  sleep 3
  # Between turns, a file of each mod changes, so /reload-plugins starts both modules again (a
  # reload leaves a mod whose files are unchanged running). The rep then has only its saved
  # record to give the next message the turn that ended before the reload.
  print -r -- '// changed before /reload-plugins by live scenario 14' >> $T14/rep/hooks/register.tsx
  print -r -- '// changed before /reload-plugins by live scenario 14' >> $T14/log/hooks/register.ts
  python3 -c 'import time; print(int(time.time() * 1000))' > $T14/reload-at
  send '/reload-plugins'
  wait_for 'Reloaded:' 60
  sleep 3
  send 'Reply with the single word done and nothing else.'
  t14_settled 120
  sleep 8
  pane | sed "s/${USER:-user}/user/g" > $T14/pane.txt
  stop
  verdicts=$(python3 -I $T14/check.py check $T14/logs $T14/before.json $T14/typed-at $T14/report.txt)
  {
    echo "owner rep live · scenario 14 · $(date '+%Y-%m-%d %H:%M') · $(claude --version 2>/dev/null)"
    cat $T14/report.txt
    echo
    echo "== the screen at the end"
    cat $T14/pane.txt
  } | sed "s/${USER:-user}/user/g" > $CAPS/14-turn-capture.txt
  echo "  saved captures/14-turn-capture.txt"
  ok=0
  while IFS=$'\t' read -r line name; do
    [[ -z $line ]] && continue
    verdict "$name" $line
    [[ $line -ne 0 ]] && ok=1
  done <<< "$verdicts"
  [[ -z $verdicts ]] && { echo "  the comparison did not run"; ok=1; }
  rm -rf "${T14:?}"
  [[ -n $LIVE_DIR && $LIVE_DIR == *owner-rep-live* ]] && rm -rf "${LIVE_DIR:?}"
  return $ok
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
      stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/owner-rep_inline-*.json(Nom))
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
      stores=("${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/store/owner-rep_inline-*.json(Nom))
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
    14)
      echo "14 the agent's turn as he saw it: the text each message of the owner's answers, as the rep saved it, against the transcript's, through a plan with a command, two text blocks, a reply typed mid-turn, two interrupts, a background task, /compact, a helper and /reload-plugins"
      turn_capture || bad=$((bad+1)) ;;
    *)
      echo "$n: no such scenario in this build"
      bad=1 ;;
  esac
  [[ $bad -gt 0 ]] && fails=$((fails+1))
done
echo "$(( ${#want} - fails )) of ${#want} scenarios shown, $fails not."
exit $(( fails > 0 ))
