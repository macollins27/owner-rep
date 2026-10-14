# Testing the owner rep

This is the design for how the rep is tested: two layers of tests, each proving something
the other cannot, and a doctor that plants known defects to prove the tests bite. It is a
plan with a status line per part. Build it in the order given at the end, and keep the status
lines true as parts land.

## Why two layers

The rep's code fails in three ways:

- Pure functions in `hooks/rep.ts` (prompts, parsers, the status words, cost arithmetic)
  fail when an input shape was not thought of. The command that begins by setting a
  variable, which drew shell syntax in the strip on 14 Oct 2026, was one of these.
- Hook bodies in `hooks/register.tsx` (what happens on a prompt, a tool call, a turn step,
  a turn end, a button press) fail when the sequence is wrong: a flag shown twice, a stale
  check overwriting a newer card, a note shown while another mod draws.
- The engine wiring fails when a Claude Code release renames a field or stops raising an
  event. The mods API is early access and changes between releases, and this failure is
  silent: the hook is skipped and the strip quietly stops updating.

The first two are proved by the test kit; the third only by a real session.

## Layer 1: the test kit

`claude plugin test .` runs `tests/rep.test.tsx` against the engine itself. The test holds
the engine's `$` and an `on` whose hooks sit beneath the mod, standing for the engine. A call
such as `$.tool.call`, `$.prompt.submit` or `$.turn.complete` runs through the mod's hooks
as a session does, and `$.ui.mount` draws the strip through the mod's render hook, so a test
makes the call and then reads the strip, the store or a toast to see what the hook did.

This was settled by a run on 14 Oct 2026 (a probe mod with three hook styles, each reporting
through a toast, all three reached). An earlier attempt had mounted the strip before an
unawaited call had started, which looked like the kit not reaching the hook. Await every
engine call before asserting.

The sequence rules the hooks enforce, each with a test driven through the kit and a doctor
entry that proves the test bites (all added 14 Oct 2026):

| Rule | Test | Doctor entry |
| --- | --- | --- |
| A flag already shown is not shown again as a note | `rule: a flag already shown…` | `flag-shown-twice` |
| Typing past notes backs the watch off, after the free ones | `rule: typing past notes…` | `watch-never-backs-off` |
| A newer press makes an older check stale; its answer does not rewrite the card | `rule: a newer press…` | `stale-check-wins` |
| A stop while the card is up and a check runs leaves the card | `rule: a stop while the card is up…` | `flag-replaces-card` |
| The status names each kind of work; a stop or a question marks the row | `rule: the status names…` | `stop-never-marked` |
| The note waits while another mod draws beneath | `rule: the note waits…` | `note-over-other-mod` |
| The digit hotkeys leave the row while another mod draws, and come back | `rule: the digit hotkeys…` | `digits-doubled` |
| The store keeps only the newest `SESSIONS_MAX` sessions | `rule: the store keeps…` | `sessions-unbounded` |

Three things the kit taught while writing these. The engine strips a refusal cause that a
hook writes itself on `prompt.fill`, so a test can make the box refuse but cannot make it say
why; the "dialog" wording is reachable only from the engine. A look the hook starts without awaiting has
not finished when the engine call resolves; draw the strip (`$.ui.mount` then `unmount`)
between two stops so each look settles, as a session's redraw does. And a test's `on` may
register an event once: a test that needs to read the store back answers `store.get` and
`store.set` itself instead of calling `mock.store`.

The doctor also earned its place here: the first version of the stale-check test passed with
its defect planted, because the held check answered with text that was not a result, so the
stale answer had nothing to write. The doctor reported it as survived and the test was fixed.

**Status.** 35 tests: the parsers, the status words (including the variable-first command, read
through the mounted strip), the goal pin, the checker's prompt and tools, the row on both
surfaces, the briefing card, the going-well card, another mod's tree beneath, the model-failure
toast, the eight sequence rules above, and the card folding to a small band. Ten doctor
entries, all caught.

## Layer 2: a real session

**Problem.** Layer 1 proves the code does what it says when the engine calls it. It cannot
prove that the build the owner runs calls it, with the fields the code expects.

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
6. The whole ask: a first message asking for much, a second asking for a step, then Brief me;
   the card lists the open work against the sum of both messages, drafts a message, and gives
   the conversation's size as a figure on its buttons row.

It runs on demand, not under `claude plugin test`, because each scenario costs a model call
and about a minute. Its output is the captured screens, kept beside the script, so a reader
can see what the strip showed.

**Status.** Built: `tests/live/live.sh`, with the captures in `tests/live/captures/`. First
full run on 14 Oct 2026: scenarios 1, 2, 3 and 5 shown; scenario 4 found a defect. The card
drew, with its body and its message, but it was taller than the band's window, so its buttons
sat under the engine's "↓ 4 more" row, and a bare digit arms only a button wholly inside the
window (the engine's rule, stated on `AbovePrompt.maxRows` in the API declarations). The
owner's "2" went into the prompt box as text and the card stayed up. Fixed the same day:
`fitCard` folds the card's body to the band's rows, body first and buttons never, and the
rerun showed the buttons' row inside the window and the digit closing the card. The kit
test for it mounts the band with eight rows; the doctor entry is `card-overflows-band`.
Scenario 6 was added the same day after a card gave a green line for a finished step with the
job open and called a 48 percent session very long: the brief now carries the rule that the
owner's messages add up and gets the engine's own size figure, and the rerun showed the card
listing the untouched parts of the first message with a message drafted and "conversation at
5 percent of its window" on its buttons row.

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
them. It can also run the layer 2 script against a defect to prove the live check bites.

Every fixed bug adds a defect to the list, starting with `strip-shows-command`. Run the
doctor before any claim that the tests pass.

**Status.** Built: `tests/doctor/doctor.py`, with `defects.json` and one patch per defect in
`tests/doctor/defects/`. Run it with `python3 tests/doctor/doctor.py`; it exits 1 when the
clean suite fails or a defect survives, and stops before planting when the clean suite is
not clean. Nineteen entries, all caught: `strip-shows-command`, one per sequence rule above,
`card-overflows-band`, `size-figure-dropped`, `whole-ask-rule-dropped`, and one per remaining
hook path (`helper-not-counted`, `box-text-overwritten`, `fill-refusal-ignored`,
`goal-prefix-dropped`, `check-timeout-unreported`, `check-failure-swallowed`, `end-not-saved`). A throwaway entry no test looks at was planted on 14 Oct
2026 to show the survivor path reports and exits 1; it was not kept.

## Order of work

1. ~~The doctor, with `strip-shows-command` as its one entry.~~ Done 14 Oct 2026.
2. ~~The layer 1 sequence-rule tests, with a doctor entry for each.~~ Done 14 Oct 2026.
3. ~~The layer 2 script with the five scenarios.~~ Done 14 Oct 2026; scenario 4 red.
4. ~~Lay the briefing card out to fit the band's `maxRows`.~~ Done 14 Oct 2026; scenario 4
   green, kit test and doctor entry in place.
5. Keep growing the defect list as bugs are fixed.
