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
to the owner, and say in one sentence which part of it the change serves. A fix that seems to
conflict with it has been misread: ask the owner what he means before building. The file
changes only when the owner says the North Star itself has changed.

The mod is installed at user scope straight from this folder (see `~/.claude/settings.json`),
so an edit here reaches a live session after `/reload-plugins` or a restart, with no version
bump. Several agents may be working in this folder at once. The README is written for an
engineer reading the public repository; keep every claim in it something the code shows.
Installing elsewhere is `claude plugin marketplace add macollins27/owner-rep` then
`claude plugin install owner-rep@owner-rep`.

## Commands

```
claude plugin validate .      # manifest, hooks, and a report of every $ call and state key
claude plugin test .          # runs every *.test.ts(x); all 54 tests are in tests/rep.test.tsx
python3 tests/doctor/doctor.py  # plants each known defect in a throwaway copy; the suite must fail
tests/live/live.sh              # on demand: six real sessions in tmux, the strip captured to tests/live/captures
```

GitHub runs validate, test, the type check and the doctor on every push
(`.github/workflows/tests.yml`). Its type check uses `tests/ci/types/`, a pinned copy of the
declarations for the Claude Code build the workflow installs; move both together.
`tests/ci/declarations.sh` runs first there and fails the run when the installed build is
not the one stamped on the pinned copy's first line, so the two cannot drift apart unseen.

`claude plugin test` has no filter flag. Run the whole file; it takes well under a second.
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
  watch brief, the briefing brief, the checker brief), the parsers for the model's labelled
  answers (`parseWatch`, `parseBrief`, `parseCheck`), the check run's argv and read-only tool
  allowlist, and the cost arithmetic. Anything that can be unit-tested lives here.
- `hooks/register.tsx` is the engine side: hooks, state atoms, the store record, the band
  render, and the spawn of the check run. `hooks/hooks.json` names it as the only module.
- `types/index.d.ts` declares the mod's `PluginState` keys (`reading`, `now`, `note`, `brief`,
  `view`, `helperIds`) and the `Reading`/`Brief`/`Checked`/`Now`/`Note` shapes the render reads.

Three reads of increasing cost, all measured against the held reading:

1. **Watch**: `look()` runs on `turn.step` every `CHECK_EVERY` (8) model requests and on every
   `turn.complete`, via `$.model.fork` over the agent's cached conversation. It is never
   awaited by the hook that starts it. A flag becomes a "Heads up" note only when the view is
   `row` and the flag was not already shown. Typing past notes backs the watch off (`skipAfter`).
2. **Briefing**: `pressBrief()` on the Rep button, another fork, drawn as the card. The
   model's answer is labelled lines (`reading:`, `moved:`, `stands:`, `means:`, `left:`,
   `next:`, `message:` … `end`, `does:`); `parseBrief` splits them.
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
   marked holds, false, not shown or changed since. A newer press (`checkEpoch`) makes an
   older run stale, and `lastInstant` ties "Check it" to the card that is up. The check costs
   real money and runs only on a press; the card states the measured figure (`FIRST_CHECK_*`,
   then the last run).

**The reading** (`Reading` in `types/index.d.ts`, `takeReading` in `register.tsx`) is the
rep's own account of what the owner wants on the job in hand, up to `READING_SENTENCES`
sentences, never the owner's text. Every watch and briefing answer begins `reading: holds` or
a rebuilt reading with a `moved:` line naming the owner's message that made the old one
stale (`moved: new job …` closes the job). `takeReading` applies it: the first reading is
taken as is; after that a revision is taken only when the look that proposed it saw more of
`rec.owner` than the reading was built from (`from`), so the agent's words can never move it,
whatever the model says, and a look that lands late cannot take a newer look's place; a
new job pushes the old reading's first sentence onto `rec.past` and starts the job's message
range (`since`) after the old one. The model is shown only the job's messages and the closed
readings of earlier jobs. The card shows `revisedLine` under the head; the row shows
`firstSentence`. A correction keeps that first sentence, the result: `keepResult` puts the
held first sentence back when the rebuilt text's differs, and only a new job or a cause
beginning `replaced` (`isReplaced`) takes the text whole, so a message that bounds the next
step cannot shrink the result to itself (15 Oct 2026). There is no stored parts list: the model reads the open parts from the
reading and the job's messages at each look, so one thing is held and revised, not two.

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` key `sessions` holds a `Rec` per session id (the reading, the
earlier jobs' readings, the owner's recent prompts, flags already seen, other mods' notes,
spend counters), capped at `SESSIONS_MAX` newest. `loadRec`/`saveRec` are the only way in and
out.

The owner's own messages are the only input that can steer the rep. `prompt.submit` records
each prompt into `rec.owner`; a prompt that is the card's own message, sent through "Put
message in prompt", is recorded with `SENT_MARK` so the model weighs it as the rep's draft
and never as the owner's words; a prompt beginning `Owner rep` and a colon (`noteTyped`) is a
note to the rep: it is recorded marked `(to the rep)`, a look starts at once, and the prompt
is dropped so the agent never sees it. "Tell the rep" fills the prompt box with the prefix.
The rep never sends anything itself: "Put message in prompt" fills the prompt box and the
owner presses Enter.

The `AbovePrompt` band is a strip shared with other mods ("You should know" among them) and
this mod draws first. Rules the render enforces: whatever is beneath is kept under the row;
while another mod draws something (`drawsSomething`), the rep's own note waits and the row's
buttons lose their digits, so only one set of digit hotkeys is ever on screen; the briefing
takes the strip alone. Buttons use bare digits for hotkeys because from the prompt box only a
digit presses a band button. A keyboard chord for the Rep button once rode on an unrelated
engine action; it could not be proven and was removed on 14 Oct 2026. Do not bring it back
without a binding that is shown working.

Session handoffs are files in `plans/handoffs/`, shown on the handoff dashboard.
