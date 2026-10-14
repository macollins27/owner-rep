# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Claude Code mod (plugin) called the owner rep. It oversees a coding agent on behalf of the
person who owns the work and does not read code, drawing one row above the prompt, speaking up
when the agent cuts a corner, and briefing the owner on a press. The README explains the
problem, the design decisions and the judging method; read it first when changing the rep's
behaviour rather than its plumbing.

The mod is installed at user scope straight from this folder (see `~/.claude/settings.json`),
so an edit here reaches a live session after `/reload-plugins` or a restart, with no version
bump. Several agents may be working in this folder at once. The README is written for an
engineer reading the public repository; keep every claim in it something the code shows.
Installing elsewhere is `claude plugin marketplace add macollins27/owner-rep` then
`claude plugin install owner-rep@owner-rep`.

## Commands

```
claude plugin validate .      # manifest, hooks, and a report of every $ call and state key
claude plugin test .          # runs every *.test.ts(x); all 14 tests are in tests/rep.test.tsx
```

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

Those declarations are from Claude Code 2.1.296 (13 Oct 2026); the mods API is early access
and changes between releases, so a newer build's declarations win when they exist. With the
copied folder, the two hook files type-check clean; `tests/rep.test.tsx` reports type errors
in the test-kit typings only, while the tests themselves pass. Do not commit anything tsc
emits: `.gitignore` drops `.claude-plugin/types/`, `node_modules/` and `*.js`, and stray
compiled `.js` files were once committed by mistake.

A snapshot of the mod at commit 59bb22c also sits in `~/.claude/plugins/cache/owner-rep/`,
left by the install step. It is not what sessions run: `claude plugin list` reports the mod
read from this folder.

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
- `types/index.d.ts` declares the mod's `PluginState` keys (`goal`, `isPinned`, `now`, `note`,
  `brief`, `view`, `helperIds`) and the `Brief`/`Checked`/`Now`/`Note` shapes the render reads.

Three reads of increasing cost, all measured against one goal sentence:

1. **Watch**: `look()` runs on `turn.step` every `CHECK_EVERY` (8) model requests and on every
   `turn.complete`, via `$.model.fork` over the agent's cached conversation. It is never
   awaited by the hook that starts it. A flag becomes a "Heads up" note only when the view is
   `row` and the flag was not already shown. Typing past notes backs the watch off (`skipAfter`).
2. **Briefing**: `pressBrief()` on the Rep button, another fork, drawn as the card. The
   model's answer is labelled lines (`goal:`, `stands:`, `means:`, `left:`, `next:`,
   `message:` … `end`, `does:`); `parseBrief` splits them.
3. **Check**: `pressCheck()` → `runCheck()` spawns a headless `claude -p` with
   `CHECK_ALLOWED_TOOLS` (read, search, agentsview, the project's own tests) and
   `CHECK_DISALLOWED_TOOLS` (anything that edits, sends or launches helpers), five-minute
   timeout, JSON output. Its answer rewrites the card, with each claim marked holds, false,
   not shown or changed since. A newer press (`checkEpoch`) makes an older run stale, and
   `lastInstant` ties "Check it" to the card that is up. The check costs real money and runs
   only on a press; the card states the measured figure (`FIRST_CHECK_*`, then the last run).

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` key `sessions` holds a `Rec` per session id (goal, pin, the owner's
recent prompts, flags already seen, other mods' notes, spend counters), capped at
`SESSIONS_MAX` newest. `loadRec`/`saveRec` are the only way in and out.

The owner's own messages are the only input that can steer the rep. `prompt.submit` records
each prompt into `rec.owner`; a prompt beginning `Owner rep goal:` pins or unpins the goal and
is dropped so the agent never sees it. The rep never sends anything itself: "Put message in
prompt" fills the prompt box and the owner presses Enter.

The `AbovePrompt` band is a strip shared with other mods ("You should know" among them) and
this mod draws first. Rules the render enforces: whatever is beneath is kept under the row;
while another mod draws something (`drawsSomething`), the rep's own note waits and the row's
buttons lose their digits, so only one set of digit hotkeys is ever on screen; the briefing
takes the strip alone. Buttons use bare digits for hotkeys because from the prompt box only a
digit presses a band button. A keyboard chord for the Rep button once rode on an unrelated
engine action; it could not be proven and was removed on 14 Oct 2026. Do not bring it back
without a binding that is shown working.

Session handoffs are files in `plans/handoffs/`, shown on the handoff dashboard.
