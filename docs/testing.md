# Testing the owner rep

This is the design for how the rep is tested: three layers of tests, each proving something
the layer beneath cannot, and a doctor that plants known defects to prove the tests bite. It
is a plan with a status line per part. Build it in the order given at the end, and keep the
status lines true as parts land.

## Why three layers

The rep has three kinds of code and each fails in its own way:

- Pure functions in `hooks/rep.ts`: prompts, parsers, the status words, cost arithmetic.
  They fail when an input shape was not thought of. The command that begins by setting a
  variable, which drew shell syntax in the strip on 14 Oct 2026, was one of these.
- Hook bodies in `hooks/register.tsx`: what happens on a prompt, a tool call, a turn step, a
  turn end, a button press. They fail when the sequence is wrong: a flag shown twice, a stale
  check overwriting a newer card, a note shown while another mod draws.
- The engine wiring: whether Claude Code actually calls those hooks, with the fields the
  code expects, in the build the owner runs. The mods API is early access and changes between
  releases, so this fails silently when a release renames a field or stops raising an event.

A test at one layer proves nothing about the others. The suite today (14 tests in
`tests/rep.test.tsx`) covers the first layer well, the second only where the test kit
happens to reach a hook, and the third not at all.

## Layer 1: hook logic without the engine

**Problem.** A hook's body is written inside its `on(...)` call, so the only way to run it is
through the engine or the test kit's engine stand-in. On 14 Oct 2026 the kit's `$.tool.call`
did not reach the mod's `tool.call` hook at all, so the strip could not be tested through it.

**Design.** Each hook body becomes a named, exported function that takes the event and a
small session object (the handful of `$` calls it uses: read and write an atom, load and save
the record, fork the model, toast). The `on(...)` call becomes one line that hands over. A
test then calls the function directly with a hand-made event and a fake session, and asserts
on what the fake session was asked to do and on the state left behind.

The session object is the seam. Keep it small and typed in `types/index.d.ts`; a hook that
needs a new `$` call adds it there, so the fake stays honest.

**What it buys.** Every sequence rule can be tested: a flag already shown is not shown again,
typing past a note backs the watch off, a newer check press makes an older run stale, a
`turn.complete` while a check runs does not clear the card, an `Owner rep goal:` prompt is
dropped and pinned. None of these are testable today.

**Status.** Not started.

## Layer 2: the drawn strip

**Problem.** The render reads atoms. The existing tests reach some states by submitting a
prompt or pressing the Rep button, but cannot reach the status states (running a command,
asking you, stopped), a note, a stale card, or a check in progress.

**Design.** A test-only way to set the atoms before `$.ui.mount`, then assertions on the
mounted tree with `find`/`findAll`. One test per state the render has a branch for. The
digit-hotkey rule (only one set of digits on screen while another mod draws) and the "briefing
takes the strip alone" rule are rendering rules and belong here.

**Status.** Partly covered: the row, the briefing card, the going-well card, another mod's
tree beneath, and the model-failure toast have tests. Status words, notes, the reading state,
the checked card and the stale card do not.

## Layer 3: a real session

**Problem.** Layers 1 and 2 prove the code does what it says. They cannot prove the engine
calls it. Only a real session can.

**Design.** A script under `tests/live/` that starts a fresh `claude` session in tmux in a
scratch folder, accepts the trust prompt, sends a prompt, captures the screen on a loop and
asserts on the captured text. The nested-session environment variables (`CLAUDECODE`,
`CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`, the messaging socket and token) must be
unset or `claude` falls into print mode and exits. Scenarios, one capture each:

1. Idle: the row draws with the placeholder goal and "idle".
2. A shell command that begins by setting a variable: the status is "running <program>" and
   no character of the command appears in the strip.
3. `Owner rep goal: ...` typed as a prompt: the goal is pinned and the agent never answers it.
4. The Rep button pressed mid-turn: the briefing card appears with its buttons.
5. The session stopped: the status is "stopped, waiting on you" with the mark.

It runs on demand, not under `claude plugin test`, because each scenario costs a model call
and about a minute. Its output is the captured screens, kept beside the script, so a reader
can see what the strip showed.

**Status.** The capture method is proven (scenario 2 was run by hand on 14 Oct 2026 and
showed "running agentsview"); no script is checked in yet.

## The doctor

**Problem.** A test suite that passes proves nothing unless it is known to fail when the code
is wrong. An agent that edits a test until it passes, or a refactor that silently stops a test
from exercising its target, leaves a green suite that guards nothing.

**Design.** Mutation testing, written by hand so each defect is legible. A file lists named
defects. Each one is a small patch to the mod plus one plain sentence saying what it breaks,
for example:

- `strip-shows-command`: the shell status returns the command's first two words again.
- `flag-shown-twice`: the watch forgets which flags it has shown.
- `stale-check-wins`: an older check run overwrites a newer card.
- `goal-reaches-agent`: an `Owner rep goal:` prompt is passed through to the agent.
- `digits-doubled`: the row keeps its digit hotkeys while another mod draws.

The doctor makes a throwaway worktree of the mod, applies one defect, runs
`claude plugin test`, and expects at least one failure. A defect that survives is a gap in
the suite, and the doctor names it and the sentence. It never touches the main checkout,
because the owner's live sessions load the mod from there and a planted defect would reach
them. It can also run the layer 3 script against a defect to prove the live check bites.

Every fixed bug adds a defect to the list, starting with `strip-shows-command`. Run the
doctor before any claim that the tests pass.

**Status.** Not started.

## Order of work

1. The doctor, with `strip-shows-command` as its one entry. It needs no refactor and shows at
   once how much the current suite proves.
2. The layer 1 split of `hooks/register.tsx`, with a test per sequence rule above and a
   doctor entry for each.
3. The layer 3 script with the five scenarios.
4. Layer 2 state tests for the states not yet covered.
5. Keep growing the defect list as bugs are fixed.

## Open question

The test kit's own notes say a test's `$.tool.call` runs beneath every mod's `tool.call`
hook, and in Claude Code 2.1.300 it did not reach this mod's. Either the kit routes
differently from its notes or this mod registers the hook in a way the kit does not see. One
short check against the plugin-authoring material settles it; if it is a kit defect it should
be reported, since a working kit would make part of layer 1 unnecessary.
