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
| The reading is kept when the answer says it holds; the row shows its first sentence | `rule: the reading is kept…` | `reading-rewritten-each-look`, `row-shows-whole-reading` |
| The agent's words never move the reading; the owner's do, with the cause on the card | `rule: the agent's words never move…` | `agent-moves-reading`, `revision-cause-dropped` |
| A note to the rep is dropped before the agent sees it and cleared from the box, listed as said to the rep, read at once | `rule: a note to the rep…` | `note-reaches-agent`, `note-never-read`, `note-left-in-box` |
| A new job closes the old reading; the earlier job's messages leave the brief | `rule: a new job closes…` | `earlier-job-leaks` |
| A look that lands late cannot take a newer look's place, in either order | `rule: a look that lands late…` (two tests) | `late-look-wins` |
| The revision line outlasts the parts that restate the agent's work when the card folds | `fitCard folds the body…` | `revised-line-folds-first` |
| Tell the rep puts the prefix in the prompt box | `rule: Tell the rep puts…` | `tell-prefix-dropped` |
| While the rep reads, the row says so and a second press starts no second read | `rule: while the rep reads…` | `reading-state-unmarked` |
| The checked card folds its lists to counts on a small band | `rule: the checked card folds…` | `checked-lists-never-fold` |
| When the checked card folds, the claims that hold become a count before the failed ones go | `rule: when the checked card folds…` | `holds-outlive-failures` |
| Rows are counted as the band wraps them, at words, so a card that fits by its count fits on screen | `rowsOf counts rows…` | `rows-counted-by-cells` |
| A card with anything left out never also says the work is going well | `a card with anything left out…` | `well-with-left` |
| The briefs say a chore left for the owner is the agent's unfinished work, never his next step | `the briefs say a chore…` | `chore-to-owner` |
| The watch looks every `CHECK_EVERY` model requests, through `turn.step` | `rule: the watch looks every…` | `step-look-dropped` |

Three things the kit taught while writing these. The engine strips a refusal cause that a
hook writes itself on `prompt.fill`, so a test can make the box refuse but cannot make it say
why; the "dialog" wording is reachable only from the engine. A look the hook starts without awaiting has
not finished when the engine call resolves; draw the strip (`$.ui.mount` then `unmount`)
between two stops so each look settles, as a session's redraw does. And a test's `on` may
register an event once: a test that needs to read the store back answers `store.get` and
`store.set` itself instead of calling `mock.store`.

The `turn.step` test drives the kit's streaming call: `$.turn.step(input)` returns the
stream, a `turn.step` hook beneath answers it with an `async function*` returning the step's
result, and the test reads the stream to its end before asserting.

The doctor earned its place twice more on 14 Oct 2026: the first race test matched the words
"(to the rep)" anywhere in the brief, which the brief's own instructions contain, so both
looks were taken for the one that saw the note and the late-look defect survived; and the
stop's look was reading the record after the note had been recorded, so there was no race
to test. The test now starts the stop's look before the note is sent and matches the listed
note line.

The doctor also earned its place here: the first version of the stale-check test passed with
its defect planted, because the held check answered with text that was not a result, so the
stale answer had nothing to write. The doctor reported it as survived and the test was fixed.

**Status.** 45 tests: the parsers, the status words (including the variable-first command, read
through the mounted strip), the note to the rep, the checker's prompt and tools, the row on
both surfaces, the briefing card, the going-well card, another mod's tree beneath, the model-
failure toast, the nineteen sequence rules above, the card folding to a small band, the brief
carrying the whole-ask rule and the session's size as a figure, the helper count, the prompt
box's refusals, the check's three failure paths, the word-wrapped row count, the checked card
keeping its failed claims as it folds, and the session end saving the record. Thirty-four
doctor entries, all caught.

## Layer 2: a real session

**Problem.** Layer 1 proves the code does what it says when the engine calls it. It cannot
prove that the build the owner runs calls it, with the fields the code expects.

**Design.** A script under `tests/live/` that starts a fresh `claude` session in tmux in a
scratch folder, accepts the trust prompt, sends a prompt, captures the screen on a loop and
asserts on the captured text. The nested-session environment variables (`CLAUDECODE`,
`CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`, the messaging socket and token) must be
unset or `claude` falls into print mode and exits. Scenarios, one capture each:

1. Idle: the row draws with the placeholder reading and "idle".
2. A shell command that begins by setting a variable: the status is "running <program>" and
   no character of the command appears in the strip.
3. `Owner rep: ...` typed as a prompt after a first exchange: the agent never answers it, the
   prompt box is emptied, and the rep's row changes from the placeholder to a reading,
   because the note starts a look. The first live runs of this scenario on 14 Oct 2026 found
   two faults: the engine leaves a dropped prompt in the box, so the digit pressed next in
   scenario 6 landed in the box as text (the rep now empties the box once the drop has
   landed; a fill made during the submit is undone by the drop); and a look from a stop
   that landed after the note's look had started took the note's place, because the guard
   counted the messages that had arrived rather than the messages each look saw (each look
   now carries what it saw, and the fold keeps the revision line until the card is nearly
   bare).
4. The Rep button pressed mid-turn: the briefing card appears with its buttons.
5. The session stopped: the status is "stopped, waiting on you" with the mark.
6. The whole ask: a first message asking for much, a second asking for a step, then a note to
   the rep that changes what matters most, then Brief me; the card lists the open work
   against the reading, says when and why the reading was revised, drafts a message, and
   gives the conversation's size as a figure on its buttons row.

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
rerun showed the buttons' row inside the window and the digit closing the card. On 14 Oct
2026 a session run for the README's pictures, at 200 columns and 60 rows, found the same
fault's remainder: the row count took cells, the band wraps at words, and a long paragraph
took one row more than counted, so a card of exactly the band's rows by the count scrolled by
two on screen, and the digit for the check went into the prompt box. `rowsOf` now counts at
words (the `rowsOf counts rows…` test, doctor entry `rows-counted-by-cells`); the proof on
screen is the README's briefing picture, taken at that size after the fix with the buttons in
view. The same session showed the paid check's findings folding to a bare count on an ordinary
band, so the fold now counts the holding claims first and keeps the failed ones listed. The kit
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
- `note-reaches-agent`: an `Owner rep:` prompt is passed through to the agent.
- `digits-doubled`: the row keeps its digit hotkeys while another mod draws.

The doctor makes a throwaway worktree of the mod, applies one defect, runs
`claude plugin test`, and expects at least one failure. A defect that survives is a gap in
the suite, and the doctor names it and the sentence. It never touches the main checkout,
because the owner's live sessions load the mod from there and a planted defect would reach
them. It can also run the layer 2 script against a defect to prove the live check bites.

Every fixed bug adds a defect to the list, starting with `strip-shows-command`. Run the
doctor before any claim that the tests pass. A patch is a diff with context lines, so it
stops applying when the lines around its edit move; the doctor reports that by name, and the
patch is remade with the same edit from a committed tree (`git diff`, then `git checkout` of
the file). Never make one from an uncommitted tree: the checkout would wipe the work.

**Status.** Built: `tests/doctor/doctor.py`, with `defects.json` and one patch per defect in
`tests/doctor/defects/`. Run it with `python3 tests/doctor/doctor.py`; it exits 1 when the
clean suite fails or a defect survives, and stops before planting when the clean suite is
not clean. Thirty-two entries, all caught: `strip-shows-command`, one or two per sequence
rule above, `card-overflows-band`, `size-figure-dropped`, `whole-ask-rule-dropped`, and one
per remaining hook path (`helper-not-counted`, `box-text-overwritten`, `fill-refusal-ignored`,
`check-timeout-unreported`, `check-failure-swallowed`, `end-not-saved`). A throwaway entry no test looks at was planted on 14 Oct
2026 to show the survivor path reports and exits 1; it was not kept.

## Order of work

1. ~~The doctor, with `strip-shows-command` as its one entry.~~ Done 14 Oct 2026.
2. ~~The layer 1 sequence-rule tests, with a doctor entry for each.~~ Done 14 Oct 2026.
3. ~~The layer 2 script with the five scenarios.~~ Done 14 Oct 2026; scenario 4 red.
4. ~~Lay the briefing card out to fit the band's `maxRows`.~~ Done 14 Oct 2026; scenario 4
   green, kit test and doctor entry in place.
5. ~~A run on GitHub of the validation, the tests, the type check and the doctor on every
   push.~~ Done 14 Oct 2026: `.github/workflows/tests.yml`, with the declarations pinned in
   `tests/ci/` for the type check.
6. ~~The held reading: the rep's own account of what the owner wants, kept for the job,
   moved only by the owner's words, with the note to the rep in place of the goal pin; the
   three states still untested (the reading state, the checked card folded, the
   every-`CHECK_EVERY` look).~~ Done 14 Oct 2026, with a test and a doctor entry per rule
   and live scenarios 3 and 6 reshaped around the note.
7. ~~A step in the GitHub run that fails when the installed Claude Code build is not the
   build that wrote the pinned declarations, so an API change cannot pass a type check
   against a stale copy.~~ Done 14 Oct 2026: `tests/ci/declarations.sh`, run before the
   type check; shown red on its branch against the pin from 2.1.296 while the run
   installed 2.1.300, then green once the pin moved to 2.1.300. It is a step of the run,
   not a rule of the mod, so the doctor does not plant against it; the red run is its proof.
8. Keep growing the defect list as bugs are fixed.
