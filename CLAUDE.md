# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Claude Code mod (plugin) called the owner rep. It oversees a coding agent on behalf of the
person who owns the work and does not read code, drawing one row above the prompt, speaking up
when the agent cuts a corner, and briefing the owner on a press. The README explains the
problem, the design decisions and the judging method; read it first when changing the rep's
behaviour rather than its plumbing.

`NORTH_STAR.md` at the root says what the rep is for: it builds a true picture of the
session's objective from the owner's words, keeps that objective open until it is completed,
judges the agent against it the whole time, and gives the owner the plain picture and the
message that keep the agent on it. That purpose has not changed since the mod was built and
does not change; every fix the owner asks for is a repair of that picture, never a new one.
Read it before any change to the rep's brief, its reading of the objective, or what it says
to the owner, and say in one sentence which part of it the change serves. The brief in
`hooks/rep.ts` is built from it, never the reverse; where they differ, the North Star wins.
A fix that seems to conflict with it has been misread: ask the owner what he means before
building. The file changes only when the owner says the North Star itself has changed.
`docs/north-star-history.md` records every repair (what was not delivered, what changed,
what was shown) and the sources, by session and message, for every sentence of the North
Star; read it before fixing, and add each repair to it. Both files, and `archive/`, are
kept out of the public repository (ignored, like `plans/`), so they live only on this Mac:
read them from the folder, never expect them on GitHub.

The mod is installed at user scope straight from this folder (see `~/.claude/settings.json`),
so an edit here reaches a live session after `/reload-plugins` or a restart, with no version
bump. Several agents may be working in this folder at once. The README is written for an
engineer reading the public repository; keep every claim in it something the code shows.
Installing elsewhere is `claude plugin marketplace add macollins27/owner-rep` then
`claude plugin install owner-rep@owner-rep`.

## Commands

```
claude plugin validate .      # manifest, hooks, and a report of every $ call and state key
claude plugin test .          # runs every *.test.ts(x); all 100 tests are in tests/rep.test.tsx
python3 tests/doctor/doctor.py  # plants each known defect in a throwaway copy; the suite must fail
tests/live/live.sh              # on demand: seven real sessions in tmux, the strip captured to tests/live/captures
```

GitHub runs validate, test, the type check and the doctor on every push
(`.github/workflows/tests.yml`). Its type check uses `tests/ci/types/`, a pinned copy of the
declarations for the Claude Code build the workflow installs; move both together.
`tests/ci/declarations.sh` runs first there and fails the run when the installed build is
not the one stamped on the pinned copy's first line, so the two cannot drift apart unseen.

`claude plugin test` has no filter flag. Run the whole file; it takes a few seconds.
`claude plugin validate` reports one expected warning, that a root `CLAUDE.md` is not shipped
as plugin context. That is intended: this file is for work on the repository.

Type-check with `~/Library/pnpm/tsc -p . --noEmit`. `tsconfig.json` extends
`.claude-plugin/types/tsconfig.json`, a folder of declaration files for the mods API that
Claude Code writes into a mod's *development copy* under `~/.claude/dev-mods/<session id>/`,
not into this folder, and not when a session merely loads the installed mod. The building
session's copy is at `~/.claude/dev-mods/02eea29b-b8e0-44e5-b4b8-b6903870fe8a/owner-rep/`.
If `.claude-plugin/types/` is missing here, copy it from there:

```
cp -R ~/.claude/dev-mods/02eea29b-b8e0-44e5-b4b8-b6903870fe8a/owner-rep/.claude-plugin/types .claude-plugin/types
```

Those declarations are from Claude Code 2.1.300 (14 Oct 2026); the mods API is early access
and changes between releases, so a newer build's declarations win when they exist. With the
copied folder, the two hook files and the test file type-check clean. A tool the typings do
not list (an MCP tool, `Grep`) is called from a test with `as never`. Do not commit anything tsc
emits: `.gitignore` drops `.claude-plugin/types/`, `node_modules/` and `*.js`, and stray
compiled `.js` files were once committed by mistake.

A snapshot of the mod at commit 59bb22c also sits in `~/.claude/plugins/cache/owner-rep/`,
left by the install step. It is not what sessions run: `claude plugin list` reports the mod
read from this folder.

The testing design, two layers and a defect-planting doctor, is in `docs/testing.md` with a
status line per part; read it before adding tests, and keep its status lines true.

The kit's `$.tool.call`, `$.prompt.submit` and the other engine calls run through this mod's
hooks as a session does, so a hook's effect is tested by making the call and reading the
strip or the store afterwards. Await the call before mounting: a call left unawaited has not
started when the next line runs, and the strip still shows the state before it (this was
mistaken for the kit not reaching the hook on 14 Oct 2026).

Tests import their kit from `claude-code/testing`; `$.model.fork` and the band render are
stubbed there, and the check step is tested through `checkArgv`/`checkPrompt`/`parseCheck`,
never by spawning a real run.

## Architecture

Two modules, deliberately split:

- `hooks/rep.ts` is pure functions and constants, no `$`. It holds the rep's prompts (the
  watch brief, the briefing brief, the objective writer's prompt, the checker brief), the
  parsers for the model's labelled answers (`parseWatch`, `parseBrief`, `parseObjective`,
  `parseCheck`), the objective's rules that need no engine (`trimOwner`, `draftSplit`, `keepDraft`,
  `mergeConditions`, `gateVerdict`, `objectiveText`), the check run's argv and read-only tool
  allowlist, and the cost arithmetic. Anything that can be unit-tested lives here.
- `hooks/register.tsx` is the engine side: hooks, state atoms, the store record, the band
  render, and the spawn of the check run. `hooks/hooks.json` names it as the only module.
- `types/index.d.ts` declares the mod's `PluginState` keys (`reading`, `now`, `note`, `brief`,
  `view`, `helperIds`) and the `Objective`/`Condition`/`Brief`/`Checked`/`Now`/`Note` shapes
  the render reads. The `reading` key holds the objective under a shape tag (`objective-1`),
  so what an older build wrote there reads as absent.

Three reads of increasing cost, all measured against the held objective, which a fourth
call writes (below):

1. **Watch**: `look()` runs on `turn.step` every `CHECK_EVERY` (8) model requests and on every
   `turn.complete`, via `$.model.fork` over the agent's cached conversation. It is never
   awaited by the hook that starts it. Its answer is `state:`, `flag:`, `why:`, `shown:` and
   `closed:`; it marks conditions and never writes the objective. A flag becomes a "Heads up"
   note only when the view is `row` and the flag was not already shown. Typing past notes
   backs the watch off (`skipAfter`).
2. **Briefing**: `pressBrief()` on the Rep button, another fork, drawn as the card. The
   model's answer is labelled lines (`verdict:`, `shown:`, `closed:`, `well:`, `stands:`,
   `means:`, `left:`, `next:`, `message:` … `end`, `does:`); `parseBrief` splits them,
   `applyMarks` takes the marks, and `gateVerdict` refuses, while a condition is open, a
   verdict other than `continue` (a `stop`, or none given, which `verdictOf` reads as
   `missing`, never as continue), a `well:` line, or a `next:` that `STOP_NEXT` reads as
   telling the agent or the job to stop, calling the work finished, saying nothing is left
   or closing the session, each said as a clause of its own (a step that only carries the
   word and goes on, as "stop guessing and run the suite" or "Don't stop until …", keeps the
   model's own next step). A refused answer is asked once
   more (`askAgain`, naming the open conditions); when that is refused too, or does not
   answer, the card lists the open conditions as left out and its meaning, next step,
   message and what it does are the rep's own (`OPEN_MEANS`, `OPEN_NEXT`, `OPEN_MESSAGE`,
   `OPEN_DOES`), never a stop. With no objective written (`gateOpen` is null) the same
   answers are refused, never let through, with `UNWRITTEN_*` texts, and not asked again.
3. **Check**: `pressCheck()` → `runCheck()` first makes a throwaway copy of the agent's
   folder (`makeCopy`: an APFS clone, `cp -Rc`, into `checkCopyDir` under `~/.cache`), then
   spawns a headless `claude -p` in it with `--permission-mode default`, `CHECK_ALLOWED_TOOLS`
   allowed outright (the shell, the file tools, the direct agentsview tools), `CHECK_DISALLOWED_TOOLS`
   (anything that edits through a tool, sends, fetches the web or launches helpers) and
   `--settings` from `checkSettings`: the built-in sandbox with writes denied to the owner's
   work and Claude Code's own configuration (`checkDenyWrite`) and the network closed except
   for this Mac. Measured 15 Oct 2026: bypassing approvals switches the sandbox off, so the
   run does not; the owner's guard hooks fire inside the run; `denyWrite` beats `allowWrite`.
   The copy is removed when the run ends; when it cannot be made the run uses the agent's
   folder with writes there denied, and the brief says so. Fifteen-minute timeout
   (`CHECK_TIMEOUT_MS`), 120 turns, JSON output; `permission_denials` in the output is the
   refusal count, shown on the checked card (`refusedLine`) and on the next card's price line
   (`checkCostText`); the right number is zero. Its answer rewrites the card, with each claim
   marked holds, false, not shown or changed since; it is given the conditions held open and
   those held shown with where (`CheckArgs.shown`), its `shown:` and `closed:` lines move
   them, a `reopen:` line puts one held shown back to not shown and marks it `reopened`
   (after that only a check's own `shown:` line moves it shown again, and the looks, the
   briefings, the writer and the next check are shown what the check found beside it), and
   its verdict passes the same gate, so a check never says stop while a condition is open. The briefing's going-well
   line does not survive a check that found a claim false or left something out. A newer press (`checkEpoch`) makes an
   older run stale, and `lastInstant` ties "Check it" to the card that is up; a stale run's
   answer, inside the record's lock, counts its spend and nothing else (no marks, no
   `lastBrief`, no draft), so the card on record stays the newer one. The check costs
   real money and runs only on a press; the card states the measured figure (`FIRST_CHECK_*`,
   then the last run).

**The objective** (`Objective` in `hooks/rep.ts`, declared again in `types/index.d.ts`) is the
rep's own account of what the owner wants on the job in hand, never the owner's text, held in
parts: `result`, `purpose`, `done` (a list of `Condition`s, each `open`, `not-shown`, `shown`
or `closed`, with `by` saying where it was shown or which message of his closed it) and
`step`; with `since` (the number of the job's first message), `from` (the last message number
the write that built it was shown), `movedAt`, `cause`, `revisions` and up to `VERSIONS_MAX`
earlier `versions`. Only `rebuildObjective` writes it: on each message of his and each note,
never on a draft, and on a session start or a press when none is held. `writeObjective` runs
one write per session at a time; a request during a write joins it (`again`), and a message
saved after the write was shown its messages is written next. A due write is up to
`1 + OBJECTIVE_RETRIES` attempts (the retries at `OBJECTIVE_RETRY_EFFORT`, `max`, with their own cap and
time; none after a throw or an `aborted`; a `holds` with nothing held fails the attempt as
`holds-with-none`), and only a write whose every attempt failed is counted. A write that throws or comes
back unanswered, or answers with nothing `parseObjective` can read (a reply cut off at its
cap looks like that), leaves the objective as it was and adds one to `rec.objectiveFailed`,
which the card's price line (`spentText`) names only when above zero. The writer is a plain
`$.model.complete` call (`OBJECTIVE_MODEL`, high effort, `OBJECTIVE_MAX_TOKENS` and
`OBJECTIVE_TIMEOUT_MS`, set from one measured write), never a fork of the conversation,
shown by `objectivePrompt` only his numbered messages on the job (each with the agent's last
answer before it), the held objective and `rec.past`. Its answer is `objective: holds`, or
`objective: moved` with `moved:`, `result:`, `for:`, `done:`, `step:` and `dropped:`
(`parseObjective`); `moved: new job …` closes the job. `takeObjective` applies it: the first
objective is taken as it stands; after that a write is taken only when it saw a message of his
or a note past `from` (`hisFrom` never counts a draft), so neither the agent's words nor the
rep's drafts can move it and a write that lands late cannot take a newer one's place. A
correction takes the result, purpose and step whole and runs the conditions through
`mergeConditions`, which keeps every held condition the writer leaves out unless `dropped:`
cites the number of a message of his new since the held objective was built (past `from`),
and never raises a state: a held condition keeps its state, where and `reopened` mark unless
the writer closes it, and a new one proposed shown starts open;
`honest` turns a `shown` the writer adds (of the conversation it sees only the agent's last
words before each of his messages, marked as the agent's) and a `closed` that cites no such
message back to open. A condition
listed twice, or with a state mark copied into its text, is kept once (`parseObjective`,
`mergeConditions`). A new job pushes
the old result onto `rec.past` and starts the job (`since`, `rec.jobStart`) at its first new
message. The looks, the briefing and the check never write the objective: `applyMarks` takes
their `shown:` lines when they name where, their `closed:` lines only when the number is a
message of his on the job sent after `from` (one the objective was built from had its say
when it was written), and the check's `reopen:` lines when they say what shows otherwise; a look's or a briefing's
`shown:` line does not move a condition marked `reopened` (only the check's does, the fourth
argument). A new job's conditions start with no mark. A draft moves only `step`, set to the draft's `firstSentence` in
`prompt.submit`. The card shows `revisedLine` under the head and `objectiveText` as its
reading; the row shows `result`.

Owner messages are `OwnerMsg`s: `n`, `kind` (`his`, `note` or `draft`), `text` (cut to
`HIS_CUT`, 6,000 characters, for his messages and notes, the writer's only input, and to
`OWNER_CUT`, 1,200, for a draft), and `prior`, the end of the agent's last answer before it
(`fitTail` to `PRIOR_CUT`, 400, keeping the end, where the question a short reply answers
usually is). `rec.counter` gives every message its number, drafts
included, so the guards compare numbers, never list lengths, and `trimOwner` keeps the job's
messages whole up to `JOB_MAX` (200) and `OWNER_MAX` (40) from before it. `loadRec` migrates
older records: a list of strings becomes numbered messages (`migrateOwner`, which reads the
old marks), and a record with a `reading` and no `objective` gets `objective: null`, its old
text in `rec.stale` (kept as the first version when the objective is written) and
`rec.jobStart` at the old job's first message; the next start, press or message writes it.

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` key `sessions` holds a `Rec` per session id (the objective, the
results of earlier jobs, the owner's numbered messages and the counter, the last briefing's
next step and message, the last `DRAFTS_MAX` (3) cards' messages in `rec.drafts`, flags already seen, other mods' notes, spend counters with the writer's own and its failed calls), capped
at `SESSIONS_MAX` newest. `loadRec`/`saveRec` are the only way in and out, and `changeRec`
runs each change alone from its load to its save, so two hooks that finish together never save
over each other.

The owner's own messages are the only input that can steer the rep. `prompt.submit` records
each prompt into `rec.owner` (`pushOwner`); a prompt that begins with the card's own message,
sent through "Put message in prompt", is split by `draftSplitAny` against the last three
cards' messages (`rec.drafts`, fed by `keepDraft` wherever a card's message is set), so it is
recognised after a reload and from an earlier card: the draft is recorded as a
`draft`, listed to the model with `SENT_MARK` so it is weighed as the rep's draft and never as
the owner's words, and whatever he typed after it is his own message, numbered after it. A
prompt beginning `Owner rep` and a colon (`noteTyped`) is a note to the rep: it is recorded as
a `note`, listed with `NOTE_MARK` (`(to the rep)`), the objective is rewritten and a look
starts at once, and the prompt is dropped so the agent never sees it. "Tell the rep" fills the
prompt box with the prefix. The rep never sends anything itself: "Put message in prompt" fills
the prompt box and the owner presses Enter.

The `AbovePrompt` band is a strip shared with other mods ("You should know" among them) and
this mod draws first. Rules the render enforces: whatever is beneath is kept under the row;
while another mod draws something (`drawsSomething`), the rep's own note waits and the row's
buttons lose their digits, so only one set of digit hotkeys is ever on screen; the briefing
takes the strip alone. Buttons use bare digits for hotkeys because from the prompt box only a
digit presses a band button. A keyboard chord for the Rep button once rode on an unrelated
engine action; it could not be proven and was removed on 14 Oct 2026. Do not bring it back
without a binding that is shown working.

Session handoffs are files in `plans/handoffs/`, shown on the handoff dashboard.
