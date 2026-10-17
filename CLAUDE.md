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
claude plugin test .          # runs every *.test.ts(x); all 165 tests are in tests/rep.test.tsx
python3 tests/doctor/doctor.py  # plants each known defect in a throwaway copy; the suite must fail
tests/live/live.sh              # on demand: nine real sessions in tmux, the strip captured to tests/live/captures
```

GitHub runs validate, test, the type check and the doctor on every push
(`.github/workflows/tests.yml`), and `tests/ci/host-calls.sh`, which fails the run when a
`$.process.run` or `$.process.spawn` in the hooks names its program other than through
`hostArgv` (the copy's argvs from `copyArgvs` and the `--version` probe excepted). Its type check uses `tests/ci/types/`, a pinned copy of the
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
   telling the agent or the job to stop, calling the work finished, saying nothing is left,
   closing the session, wrapping up, stopping work on it, stopping (or stopping here, or
   stopping work) to report, to wait bare or on him, to await him or to ask him
   (`STOP_TO_REPORT`), a wait for or an await of him with no stop at all (`WAIT_SAID`;
   `WAIT_ON_HIM` over `ON_HIM`: a wait for, on, until or till him, he, his, the owner, you,
   approval, further instructions, a reply, an answer or the go-ahead, "your" only before a
   word naming his say such as reply, approval, go-ahead or decision, "a decision" only at
   the clause's end or before from, by, on or about, "confirmation" only at the clause's end
   or from him, the owner or you, whatever follows to the sentence's end), a check-in with
   him or letting him decide, choose or pick (`ASK_BACK_SAID`), handing it, the work or the
   job over or back to him (`HAND_BACK_SAID`), these three let through after "not",
   "never", "n't" or "no need to" (`NOT_NEGATED`), a bare wait after ", then"
   (`THEN_WAIT`), the agent ending the session (`AGENT_ENDS`), or saying the session can
   end at a sentence's start or after a stop mark other than
   a comma (`SENTENCE`; a comma with "and", "and then", "so" or "now" counts, a bare "then"
   after a comma closes a condition; `CLAUSE` takes "and then" as a clause's start too),
   each said as a clause of its own (a step that only carries the
   word and goes on, as "stop guessing and run the suite" or "Don't stop until …", keeps the
   model's own next step; so do a pair such as "make the timer start and stop", the bare
   "and stop" only being read, never "and stops" said of a program, a wait on a CI run or
   on "your build", and "Once the run is green, the session can end"). A refused answer is asked once
   more (`askAgain`, naming the open conditions); when that is refused too, or does not
   answer, the card lists the open conditions as left out and its meaning, next step,
   message and what it does are the rep's own (`OPEN_MEANS`, `OPEN_NEXT`, `OPEN_MESSAGE`,
   `OPEN_DOES`), never a stop. With no objective written (`gateOpen` is null) the same
   answers are refused, never let through, with `UNWRITTEN_*` texts, and not asked again.

   The watch and the briefing (and its second ask) read through one helper, `readSession`.
   A fork answers `nothing-to-fork` before the first response of the process (a session
   reopened with `--continue` or `--resume`), after `/clear`, and through the whole first
   turn of a new session. Only for a read he started (`fallback`: the press's `ask`, its
   second ask included, and `look` with reason `note`) the helper then reads
   `$.session.messages()` and, when there are rows, makes one `$.model.complete`
   (`OBJECTIVE_MODEL`, high effort, `RECORD_SYSTEM`, `RECORD_MAX_TOKENS` 16,000,
   `RECORD_TIMEOUT_MS` four minutes) over `recordPrompt`: the rows printed by `recordText`
   as entries labelled `entry N`, never `#N` (his rows as the person only where their key is
   one of his messages that `heldItems` read from the transcript, `NOT_TYPED` applied after
   as a second filter, and with no transcript read, `NOT_TYPED` alone; every other row on
   his side as the session's),
   each tool use on one line with its result, a row of tool
   results shown only for results not already printed), each message cut to
   `RECORD_ENTRY_CUT` (3,000) and each tool input or result to `RECORD_TOOL_CUT` (600),
   head and tail kept around a marked gap, the oldest entries left out past `RECORD_BUDGET`
   (200,000 characters) with a line saying how many, fenced in `<session_record>` with any
   fence tag inside printed with `‹ ›`, then the same task the fork would have had. Its
   result has the fork's shape, so its spend is counted the same; a throw reads as an API
   error. With no rows the fork's answer stands and the toast says there is nothing to read.
   The step look and the stop look pass no fallback and skip quietly on `nothing-to-fork`:
   a record read on each would be paid on every look of every new session's first turn.
3. **Check**: `pressCheck()` → `runCheck()` first makes a throwaway copy of the agent's
   folder (`makeCopy`: an APFS clone, `cp -Rc`, into `checkCopyDir` under `~/.cache`; where
   `cp` refuses `-c` before making anything, as GNU `cp` does, `mkdir` makes the folder and
   `cp -R` copies the agent's folder's contents into it; a clone that failed part-way, which
   `mkdir` without `-p` tells apart, is not copied over), then
   spawns a headless `claude -p` in it with `--permission-mode default`, `CHECK_ALLOWED_TOOLS`
   allowed outright (the shell, the file tools, the direct agentsview tools), `CHECK_DISALLOWED_TOOLS`
   (anything that edits through a tool, sends, fetches the web or launches helpers) and
   `--settings` from `checkSettings`: the built-in sandbox with writes denied to the owner's
   work and Claude Code's own configuration (`checkDenyWrite`) and the network closed except
   for this Mac. Measured 15 Oct 2026: bypassing approvals switches the sandbox off, so the
   run does not; the owner's guard hooks fire inside the run; `denyWrite` beats `allowWrite`.
   The copy is removed when the run ends; when it cannot be made the run uses the agent's
   folder with writes there denied, the brief says so, and any part of a copy is removed.
   On Windows (`OS` is `Windows_NT`) Claude Code's sandbox is off, so nothing would deny a
   write or close the network: a card drawn there shows `CHECK_NO_ROOM` in place of the
   check's price and no Check it button, and `runCheck` starts no copy and no run there,
   pressed on a card drawn before. Fifteen-minute timeout
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

**The host.** Every program the hooks run is named through `hostArgv` (`hooks/rep.ts`),
which leaves an argv as written on a Mac or Linux (`PATH_HOST`) and on Windows names the
commands in `POSIX_COMMANDS` by their full path in Git for Windows' `usr/bin` and `claude` as
npm's `claude.exe`. `hostOf` finds both by running each candidate with `--version`
(`winPosixBinCandidates`, `winClaudeCandidates`, slashed as they are built so the path a probe
proves is the one run) and holds the lookup for the process, keyed on `OS`, except a Windows
one whose coreutils did not answer, which is looked up again on the next call; a lookup that
throws still reads as Windows, so the check's refusal there never rests on a probe. The home
is `homeFor`: `HOME`, else `USERPROFILE` (`homeOf`), written with forward slashes on Windows,
'' with neither (the check's copies then go under `/tmp`); `heldItems` slashes the paths it is
given or finds on Windows. Kyle Cunningham measured the Windows facts on Windows 11 with
Claude Code 2.1.302 (PR #13); nothing on this Mac can run them.

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
sent with its fixed rules as `system: OBJECTIVE_SYSTEM` on every attempt, and shown by
`objectivePrompt` only the held objective, `rec.past` and his numbered messages on the job
(each with the agent's last answer before it), the messages inside a `<his_messages>` fence
followed by a note that they are quoted records and no instruction to the writer; a fence tag
(any letter case, spaces inside the brackets allowed) in a message or in the agent line is
printed with its brackets turned to `‹` `›`, so no message can close the fence, and the record
keeps the text as typed. Its answer is `objective: holds`, or
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
message. The first write, which has nothing held to push, starts the job at the message its
`moved: new job #n` cites when n is one of his messages after the first, so a seeded session
whose transcript held an earlier job does not show that job's messages as this one's. The looks, the briefing and the check never write the objective: `applyMarks` takes
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

A session the rep holds no record of (its record fell out of the newest `SESSIONS_MAX`, it
was forked with a new id, or it is older than the mod) has none of his messages. `seedOwner`
fills such a record, one with no message or note of his, from the session's transcript file,
in the file's order, never from the rows' text: a message he typed while the agent worked
is saved only as an attachment line, never as a row of `$.session.messages()` (measured on
Claude Code 2.1.301), so the file is the only place it is found. The classic hooks
`classic.SessionStart` and `classic.UserPromptSubmit` carry the file's path
(`transcript_path`); `holdTranscript` keeps it per session id in a module-level map, a
later prompt's path replacing the start's, and each event is passed on untouched. With no
path held, `heldItems` looks for `<id>.jsonl` by name, `find <config>/projects -maxdepth 2`
(the config folder `CLAUDE_CONFIG_DIR`, else `.claude` in the home, none with no home), and
with none found it is null.
The file is read through `$.process.run` with `humanRead` (`sed`, `HUMAN_READ_TIMEOUT_MS`),
which prints only the lines holding `"kind":"human"`, every picture's `"data"` blanked so a
message with a picture stays under the output cap. A read cut at that cap
(`isStdoutTruncated`) counts as no read: the session's own file cut makes `heldItems` null,
and a cut file in the scan is skipped. `humanItems` reads, in file order, the lines of type
user with origin kind `human` and not `isMeta`, and the lines of type attachment holding a
`queued_command` of origin kind `human` (a message he typed while the agent worked,
`queued`), meta on neither the line nor the attachment, each as a `HumanItem`: its `text` in
`typedForm` (a command as `/name args`, reminders removed), its `key` the `typedKey`
(whitespace folded); one with an empty key or a text `NOT_TYPED` names is skipped, and one
sent twice is two items. `humanTexts` is the set of their keys, which the record read labels
by. When the session's own file cannot be read (a session forked with a new id has none
until its first message is saved; the path held still names the right folder), the newest
`.jsonl` files in its folder (`folderOf`, `ls -t`) are read one at a time, at most
`HUMAN_SCAN_MAX` (40), within `HUMAN_SCAN_BUDGET_MS` (30 seconds) for the whole scan, each
read given no more than the time left. A fork's rows are its parent's and then its own, so
`forkItems` matches the fork's candidate rows (`forkCandidates`: user rows with no tool
results, a key, and nothing `NOT_TYPED` names, in order) to a file's typed items from the
end, since after a compaction the rows are only the conversation's tail: each typed item
whose key is a candidate is tried as the last match, and the candidates are taken from last
to first, each matched to the latest typed item with its key before the one matched after
it, a row with no match leaving the place where it was. Of those tries it takes the most
matched, then the fewest typed items left unmatched between the first and last match, then
the latest last match, and keeps the items up to that match and the queued ones right after
it (what he typed while the agent answered his last message before the fork), never the
parent's later messages. The file with the most matches
is taken, the newest on a tie, and the scan stops once a file matches every candidate;
`heldItems` is null when the best file matched none, whether or not any file was read
whole, so the record read labels his rows by their text rather than calling them all the
session's. A
scan repeated at each start and press costs milliseconds, so nothing caches it.
`typedFromItems` gives each item the end of the agent's last text before the row it matches
as its `prior`, lining them up from the end because after a compaction the rows hold only
the tail: walking the items from last to first, each typed one takes the latest of his
side's rows with no tool results and the same key before the row matched after it, so a
short reply he sent before and after a compaction gets its prior only at its later place; a
queued item, or one no row holds (from before a compaction), keeps its place with no
prior. Each is recorded as `his` through `pushOwner`, a
draft he sent split off as `prompt.submit` does, matched against every record's drafts, last
message and messages held as `draft` in the store (`storedDrafts`), so a card he sent in the
session this one was forked from is still the rep's draft, even one more than `DRAFTS_MAX`
back or sent under a build that kept no `rec.drafts`, and against `droppedDrafts`, so one
from a session whose record was let go is too. A session with no candidate row is not read. `seedOwner`
runs one seed per session at a time (`seeding`), and
`prompt.submit` awaits it before recording a prompt or a note, so a prompt sent during the
start's read is numbered after the seeded messages; the objective is rewritten when that
seed recorded any. `enterSession` (a start, or a new id taken up after a `/clear` or a
resume) runs it without waiting and writes the objective when it recorded any; `pressBrief` awaits it before its objective-null write. A record that holds a
message or note of his is never seeded.

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` key `sessions` holds a `Rec` per session id (the objective, the
results of earlier jobs, the owner's numbered messages and the counter, the last briefing's
next step and message, the last `DRAFTS_MAX` (3) cards' messages in `rec.drafts`, flags already seen, other mods' notes, spend counters with the writer's own and its failed calls), capped
at `SESSIONS_MAX` newest. A record `saveRec` lets go leaves its drafts (`recDrafts`: its
`rec.drafts`, last briefing's message and messages held as `draft`) in the key
`droppedDrafts`, newest first, each once, up to `DROPPED_DRAFTS_MAX` (200) (`keepDropped`);
a fork's own first save can let go the record it was forked from. `storedDrafts` reads
`sessions` before `droppedDrafts`, the reverse of `saveRec`'s order, so a record let go
between its two reads is in one of them. `loadRec`/`saveRec` are the only way in and out, and `changeRec`
runs each change alone from its load to its save, so two hooks that finish together never save
over each other. Atoms and the module's own values outlive a session: a `/clear` or a resume
goes on in the same process under a new session id, and no `session.start` fires for it. So
`sessionId` reads the id on every call and takes up a new one as a start would
(`enterSession`); `session.end` with reason `clear` or `resume` empties the screen and the
carried values (`leaveSession`); and a write, look, briefing or check the ended session
started draws nothing (`onScreen`). Reading the id once per load filed every message after a
`/clear` under the ended session until 16 Oct 2026.

The owner's own messages are the only input that can steer the rep. `prompt.submit` records
each prompt into `rec.owner` (`pushOwner`); a prompt that begins with the card's own message,
sent through "Put message in prompt", is split by `draftSplitAny` against the last three
cards' messages (`rec.drafts`, fed by `keepDraft` wherever a card's message is set), so it is
recognised after a reload and from an earlier card: the draft is recorded as a
`draft`, listed to the model with `SENT_MARK` so it is weighed as the rep's draft and never as
the owner's words, and whatever he typed after it is his own message, numbered after it. A
prompt beginning `Owner rep` and a colon (`noteTyped`) is a note to the rep: it is recorded as
a `note`, listed with `NOTE_MARK` (`(to the rep)`), the objective is rewritten and a look
starts at once, and the prompt is dropped so the agent never sees it. `noteSplit` also finds
the prefix typed after other text (`NOTE_PLACES`): at the start of a line, after a sentence's
end (a closing quote or bracket allowed) and a space, or in its capitalised form glued to a
letter, a digit or a sentence's end, never inside a sentence, and never in a slash command's
line (`e.command` set), whose arguments stay the command's. The text before it is then a
prompt to the agent, handled as any prompt (recorded as his message, a draft split off) and
sent on without the note; the note is recorded after it, the objective is rewritten, a look
starts, and a toast says the agent got the rest. A prefix after text with nothing after it
notes nothing; the agent gets the text and a toast says nothing was noted. "Tell the rep" fills the
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
