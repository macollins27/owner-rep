# Owner rep

![tests](https://github.com/macollins27/owner-rep/actions/workflows/tests.yml/badge.svg)

A Claude Code mod that watches a coding agent on behalf of the person who owns the work,
and reports back in plain words: what the agent has really done, what it has left out, and
what to tell it next.

It is built for the owner who directs agents but does not read code. The agent's own report
is the only account they get, and it is the one account that cannot be taken on trust. The
rep reads the same conversation, takes nothing on the agent's word, and says so briefly.

![The briefing card, on a real session](docs/briefing.png)

## What it does

The rep draws one row above the prompt, in the same shape as Claude Code's built-in "You
should know" note: the result the owner wants, worked out from the owner's own messages, and
what the agent is doing right now, with a mark when the session needs a look (the agent has
stopped, is asking a question, or a plan is waiting for a yes). That status is plain words
built from the tool's name: a file's name for a read or an edit, the program's name for a
shell command, and never any text of the command itself.

Behind that row are three reads of increasing cost.

| Read | When | How | Cost |
|---|---|---|---|
| **Watch** | Every eighth model request of a turn, and at every stop | A fresh model instance over the agent's cached conversation, no tools | Mostly cache reads; never blocks the agent |
| **Briefing** | On a press (`1` or click) | Same mechanism, longer brief | One model call |
| **Check** | On a second press, only when chosen | A separate headless `claude -p` run with read-only tools, over the session record and the real files | Measured at about 210k fresh tokens plus 2.2M cache reads, about two minutes |

The **watch** stays silent unless it finds something with a cost to the owner: work dropped
or shrunk, a claim not shown, a test never run, the easy option taken in place of the right
one. Then one "Heads up" line appears, with the reason beneath it.

The **briefing** is a card: where the work really stands, what the agent's last message means,
what was left out, what should happen next, and a message to the agent, written and ready. One
press puts that message in the prompt box. Nothing is sent until the owner presses Enter. The
card is folded to fit the rows the band has, body first and buttons never, so the digit that
closes it or puts its message in the prompt always reaches a button on screen.

The **check** reads outside the conversation. It opens the session's full record through
agentsview, a local tool that indexes every coding-agent session on the machine, opens the files the agent claims to
have changed, runs the project's own tests, and rewrites the card with each claim marked
**holds**, **false**, **not shown**, or **changed since** the briefing was written.

![The card after a check, each claim marked](docs/checked.png)

## How it decides

The rep measures against a reading: its own account, in its own words, of what the owner
wants on the job in hand, up to four sentences, saying the result, what it is for, what
"done" has to show, and the step the session is on. It is never the owner's text. The owner
works by intent rather than exact wording, and a rep that only did what the client literally
said would not be a good one, so the reading includes what a serious owner plainly wants
without saying it. The owner's messages are weighed by kind when the reading is written:
reasons and complaints first, instructions next, and a "yes" to an agent's proposal last,
since that is the agent's idea with the owner's name on it.

The reading is kept, not rewritten. A session is a run of jobs: the owner opens one, the
agent works, the owner corrects it a few times, the job ends and the next begins. The reading
lasts for the job. At each look the model says whether it still holds; it moves only when one
of the owner's own messages makes it stale, and then it is rebuilt from everything the owner
said on that job and nothing from an earlier one. The agent's words can never move it, and
the code enforces that: a revision proposed when the owner has said nothing new is refused.
The card shows when and why the reading last moved, and the row shows its first sentence.

The owner never types the reading. To steer the rep they type a prompt beginning
`Owner rep:`; the rep takes the note, drops the prompt before the agent sees it, lists it to
the model as said to the rep with the highest weight, and reads again at once. "Tell the rep"
puts the prefix in the prompt box.

On top of the reading sit five expectations the rep applies without reciting: the whole
result is delivered; it is shown to work, not said to work; no known problem is left behind;
nothing was added that the result does not need; and it was done the way that is best for the
result, not the way that was easiest for the agent.

Nothing in a session except the owner's own messages can give the rep orders. Text an agent
wrote and the owner pasted is treated as an agent's claim. The full judging brief is in
[`hooks/rep.ts`](hooks/rep.ts).

## How it is built

Two modules, split on purpose.

- [`hooks/rep.ts`](hooks/rep.ts) holds everything that can be tested without an engine: the
  three prompts, the parsers for the model's labelled answers, the check run's argument list
  and tool allowlist, and the cost arithmetic. It has no engine calls.
- [`hooks/register.tsx`](hooks/register.tsx) is the engine side: hook registrations, state
  atoms, the per-session store record, the band render, and the spawn of the check run.
- [`types/index.d.ts`](types/index.d.ts) declares the mod's state keys and the shapes the
  render reads.

The watch and the briefing use `$.model.fork`, the same mechanism as Claude Code's built-in
"You should know" note: a fresh instance of the model over the agent's prompt-cached
conversation, so a read costs little and never slows the agent. The rep's independence comes
from its brief, which tells the model to treat everything the agent wrote as a claim, and,
for the check step, from reading outside the conversation altogether.

The check step spawns `claude -p` with `--output-format json`, a turn limit, a five-minute
timeout, an explicit allowlist (read, search, git log and diff, agentsview, and the common
test runners) and an explicit denylist (anything that edits, sends, fetches the web or
launches helpers). It runs with the installing user's permissions and cannot change a file.
A newer press makes an older run's answer stale, and the card is only rewritten by the run
that belongs to it.

State is in two places. Atoms hold the per-session UI state that drives the render. The
plugin store holds one record per session, capped at the 32 newest: the reading with when
and why it last moved, the first sentence of each earlier job's reading, the owner's recent
prompts and notes to the rep, flags already shown, notes other mods have shown, and spend
counters. Nothing leaves the machine except the model calls the session already makes.

The band above the prompt is a strip shared with other mods. The rep draws first and keeps
whatever is beneath it. While another mod's note is up, the rep's own note waits and its
buttons lose their digit hotkeys, so only one set of digits is ever on screen. From the
prompt box only a bare digit presses a band button, which is why every button carries one.

## Install

```
claude plugin marketplace add macollins27/owner-rep
claude plugin install owner-rep@owner-rep
```

Or from a local clone, with the folder's path in place of the GitHub name. Installed from a
folder, the mod runs from that folder: an edit reaches a session after `/reload-plugins` or a
restart. The check step reads the session record through `agentsview` when it is on the path, and
from the session's transcript file under `~/.claude/projects/` when it is not.

## Develop

```
claude plugin validate .      # manifest, hooks, and every engine call and state key
claude plugin test .          # 43 tests in tests/rep.test.tsx, under a second
python3 tests/doctor/doctor.py  # plants each known defect in a throwaway copy; the suite must fail
tests/live/live.sh              # on demand: six real sessions in tmux, the strip captured to tests/live/captures
```

GitHub runs the validation, the tests, the type check and the doctor on every push
(`.github/workflows/tests.yml`); the type check there uses a pinned copy of the API
declarations in `tests/ci/`.

```
tsc -p . --noEmit             # needs .claude-plugin/types/, see below
```

The tests cover the parsers, the row on both surfaces, the shared strip, the press, the held
reading and the note to the rep, and a press followed by a check on a stubbed run. The test kit stubs the model and the
band; no test spawns a real check.

Type-checking needs the mods API declarations, which Claude Code writes into a mod's
development copy under `~/.claude/dev-mods/` when it sets one up, not into this repository.
Copy that `.claude-plugin/types/` folder here (it is git-ignored) and `tsc` runs clean. The
declarations are the authority on the API, which is early access and changes between
releases.

Validation reports one expected warning: a `CLAUDE.md` at the plugin root is not shipped as
plugin context. It is there for people and agents working on this repository, not for users
of the mod.

## What it can reach

Like every Claude Code mod, it runs with the permissions of the person who installs it. Its
own calls read the prompt box, the session id and working directory, a small per-session
store, and the model through the session's own credentials. The check step starts a separate
Claude Code run that may read files, search, run the project's own tests and read agentsview;
it may not edit, send, or launch helpers. The rep never sends anything to an agent by itself.

## Decisions along the way

- **Build on a mechanism that already works.** The built-in note's cached-fork read is cheap
  and proven; the rep reuses it with a different brief rather than adding a side channel.
- **No side panel.** A clean row that is always there beats a panel that must be opened, and
  it has to share the strip politely with the mods already using it.
- **Digits, not letters.** The first version used letter hotkeys; the first live press showed
  that only digits reach a band button from the prompt box.
- **The reading is the rep's, and the owner talks to the rep through the prompt box.** No
  field to click into and no sentence for the owner to compose: a note typed behind a prefix
  in their own prompt is intercepted by the rep, and the rep rewrites its own reading. A
  first version let the owner pin a sentence word for word; it was removed on 14 Oct 2026,
  because a rep that only holds the builder to the client's literal words is not doing the
  job.
- **The check costs real money, so it runs only when chosen.** The card states the last
  measured cost beside the button.
- **The check runs outside the session.** A headless, read-only run, so the agent never
  hears from the rep and the owner gets no permission prompts.
- **Proven on real sessions.** Each route was pressed live by the owner before the next was
  built: the row, the briefing, the watch, the note to the rep, and two real checks on the session
  that built it. A keyboard chord for the Rep button could not be proven and was removed.

## Status

Built on 13 October 2026 in one session, by directing a Claude Code agent from a written
objective to an installed tool, with every part proven on screen before the next was started.
Validated and tested on Claude Code 2.1.296 and 2.1.299. The mods API is early access;
expect the declarations, and this mod with them, to move.

## Licence

[MIT](LICENSE).
