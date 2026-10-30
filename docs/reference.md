# Code reference

The rules of the code, named by the functions and constants that hold them. This is the
detailed companion to [How the owner rep works](how-it-works.md), written for whoever changes
the code, human or agent: read the part you are changing before you change it, and keep it
true when you do. Every name here is in [`hooks/rep.ts`](../hooks/rep.ts),
[`hooks/register.tsx`](../hooks/register.tsx) or [`types/index.d.ts`](../types/index.d.ts).

## Tests on GitHub

GitHub runs validate, `tests/ci/host-calls.sh`, `tests/ci/host-commands.mjs`, test and the
type check on Ubuntu, macOS and Windows with Claude Code 2.1.310, and validate, the two
host steps and the tests on Ubuntu with 2.1.286 (the first build with mods on by default) and the
newest release, on every push that touches more than prose and pictures (`paths-ignore` in
the workflow: the Markdown files, `docs/`, `llms.txt`, the licence, the issue forms and the
live captures get no run), and the doctor as eight Ubuntu
jobs at once, each planting every eighth defect (`doctor.py --shard K/8`), so the whole run
takes about a quarter of an hour where one machine took over one (`.github/workflows/tests.yml`). `host-calls.sh` fails the run when a
`$.process.run` or `$.process.spawn` in the hooks names its program other than through
`hostArgv` (the copy's argvs from `copyArgvs` and the `--version` probe excepted).
`node --experimental-strip-types tests/ci/host-commands.mjs` runs the transcript reads, the
check's questions and the copy's commands as the mod builds and wraps them (`hostArgv`, and
`wholeArgv` for the git questions alone; on Windows Git's coreutils, found as `lookUpHost`
finds them), against `tests/ci/fixtures/` and a scratch folder whose command folder holds a
link, and reads the answers with the mod's own parsers (`linkTargets` for the path links); on
Windows one of the check's questions that fails is printed as skipped, since the check does
not start there, and the copy's commands must still pass (`tests/ci/README.md`). The run's type check uses `tests/ci/types/`, a pinned copy of the
declarations for Claude Code 2.1.310, the build the declarations step and the type check
run on; move both together. On a push to main the `merged` job runs first: when the push is
a merge whose second parent holds the same files and has a passing `pull_request` run of the
workflow, it sets `tested` and the tests and the doctor are skipped, so the run passes on
that job alone; otherwise they run in full.
`tests/ci/declarations.sh` runs first there and fails the run when the installed build is
not the one stamped on the pinned copy's first line, so the two cannot drift apart unseen.

## Architecture

Two modules, deliberately split:

- `hooks/rep.ts` is pure functions and constants, no `$`. It holds the rep's prompts (the
  watch brief, the briefing brief, the objective writer's prompt, the own-words prompt, the
  checker brief), the parsers for the model's labelled answers (`parseWatch`, `parseBrief`,
  `parseOwnWords`, `parseObjective`, `parseCheck`), the objective's rules that need no engine (`trimOwner`,
  `draftSplit`, `keepDraft`, `mergeConditions`, `gateVerdict`, `takeOwnWords`,
  `objectiveText`), the check run's argv and read-only tool
  allowlist, and the cost arithmetic. Anything that can be unit-tested lives here.
- `hooks/register.tsx` is the engine side: hooks, state atoms, the store record, the band
  render, and the spawn of the check run. `hooks/hooks.json` names it as the only module.
- `types/index.d.ts` declares the mod's `PluginState` keys (`reading`, `now`, `note`, `brief`,
  `view`, `helperIds`, `lines`) and the `Objective`/`Condition`/`Brief`/`Checked`/`Now`/`Note` shapes
  the render reads. The `reading` key holds the objective under a shape tag (`objective-1`),
  so what an older build wrote there reads as absent.

Three reads of increasing cost, all measured against the held objective, which a fourth
call writes (below):

1. **Watch**: `look()` runs on `turn.step` every `CHECK_EVERY` (8) model requests and on every
   `turn.complete`, via `$.model.fork` over the agent's cached conversation. It is never
   awaited by the hook that starts it. Its answer is `state:`, `flag:`, `why:`, `shown:` and
   `closed:`; it marks conditions and never writes the objective. A flag becomes a "Heads up"
   note only when the view is `row` and the flag was not already shown. The note draws above
   the row, which stays beneath it with its head, its status and both its buttons for the
   mouse (the note's buttons carry the digits); from 13 to 23 Oct 2026 it took the row's place,
   a choice made with the you-should-know shape that no one asked for. Typing past notes
   backs the watch off (`skipAfter`).
2. **Briefing**: `pressBrief()` on the Rep button, another fork, drawn as the card. The
   model's answer is labelled lines (`verdict:`, `shown:`, `closed:`, `well:`, `stands:`,
   `means:`, `left:`, `next:`, `message:` … `end`, `does:`); `parseBrief` splits them,
   `applyMarks` takes the marks, and `gateVerdict` refuses, while a condition is open, a
   verdict other than `continue` (a `stop`, or none given, which `verdictOf` reads as
   `missing`, never as continue), a `well:` line, or a `next:` (`saysStop`) or a `message:`
   (`messageSaysStop`: true when any one sentence of the message, read as the
   paragraph on `withoutStopSentences` below says, trips, each read on a copy `toAgentVoice` turns to the third person,
   me, my and the capital I to the owner, the owner's and the owner, you and your to the agent and the agent's,
   the contractions and two-word forms shifted whole before them, with a straight or curly
   apostrophe: you're and you are to the agent is, you've and you have to the agent has,
   I'm and I am to the owner is, I'll to the owner will, I've to the owner has; so a wait on the owner's sign-off and
   "You're done." are caught and a wait until the agent has a log is not, and a few
   messages a reader would let through, such as a check-in with the owner before a step, are
   caught in the safe direction and rewritten by the own-words call) that
   `STOP_NEXT` (or, in a message only, `STOP_ONCE` below) reads as
   telling the agent or the job to stop (with "please" before the stop or not, `STOP_LEAD`),
   calling the work finished, saying nothing is left or no further work is needed,
   closing the session, wrapping up, stopping work on it, stopping (or stopping here, or
   stopping work) to report, to wait bare or on the owner, to await them or to ask them
   (`STOP_TO_REPORT`), a wait for or an await of them with no stop at all (`WAIT_SAID`;
   `WAIT_ON_HIM` over `ON_HIM`: a wait for, on, until or till `him`, `he`, `his`, the owner, you,
   approval, further instructions, a reply, an answer or the go-ahead, "your" only before a
   word naming their say such as reply, approval, go-ahead or decision, "a decision" only at
   the clause's end or before from, by, on or about, "confirmation" only at the clause's end
   or from them, the owner or you, whatever follows to the sentence's end), a check-in with
   them or letting them decide, choose or pick (`ASK_BACK_SAID`), handing anything over or
   back to them (whatever stands between "hand" and "over" or "back" within the clause),
   them taking it from here, or leaving it or the rest to them (`HAND_BACK_SAID`), these
   three let through after "not",
   "never", "n't" or "no need to" (`NOT_NEGATED`), a bare wait after ", then"
   (`THEN_WAIT`), the agent ending the session (`AGENT_ENDS`), or saying the session can
   end at a sentence's start or after a stop mark other than
   a comma (`SENTENCE`; a comma with "and", "and then", "so" or "now" counts, a bare "then"
   after a comma closes a condition; `CLAUSE` takes "and then" as a clause's start too),
   each said as a clause of its own (a step that only carries the
   word and goes on, as "stop guessing and run the suite", "Please stop guessing and run the
   suite" or "Don't stop until …", keeps the
   model's own next step; so do a pair such as "make the timer start and stop", the bare
   "and stop" only being read, never "and stops" said of a program, a wait on a CI run or
   on "your build", and "Once the run is green, the session can end"). The gate refuses part
   by part: the verdict becomes continue, the `well:` line goes, the open conditions are
   listed as left out, the meaning is always `OPEN_MEANS`, the next step is the rep's
   (`OPEN_NEXT`) only where it says stop or is empty, and the message is
   `withoutStopSentences(message)` (below): a message with no stop sentence stands as
   written, one with some stands without them, and only when that is `''` (nothing usable
   left, or the message empty) are the message and what it does the rep's (`OPEN_MESSAGE`,
   `OPEN_DOES`); beside a kept message a `does:` line `messageSaysStop` catches is
   `OPEN_DOES` alone. `replaced` names the parts given the rep's text, in the order `means`,
   `next`, `message`, so a kept message, cut or whole, is never listed. A refused
   answer is asked once more (`askAgain`, naming the open conditions), and that answer
   passes the same gate. When it is refused too, or does not answer, one plain
   `$.model.complete` (`OBJECTIVE_MODEL`, high effort, `OWN_WORDS_SYSTEM`: the ROLE's "Who
   you are" and "How you write to the owner" sections cut by `sectionOf`, which throws on a missing
   heading, and one line against reproducing a secret, a key, a password or personal data
   it is shown; `OWN_WORDS_MAX_TOKENS` 4,000, `OWN_WORDS_TIMEOUT_MS` two minutes) over
   `ownWordsPrompt` (the memory, the open conditions, what stands and what is left out)
   writes the replaced parts in the rep's own words. Its reply is read by `parseOwnWords`,
   which answers null unless the reply came back whole: `means:`, `next:`, `message:` and
   `does:` each once and in that order, the message closed by its `end` line before `does:`
   and not empty, and means, next and does each ending at a sentence mark (`.`, `!` or `?`,
   closing quotes or brackets allowed after it); the message's last line is not held to a
   sentence mark, since its `end` line and a whole `does:` line show it was not cut, and a
   whole message may end in a list item. `takeOwnWords` takes from a
   whole reply each part the gate replaced: the meaning and next step when not empty and not
   caught by `saysStop`, the message as `withoutStopSentences(own.message)` when that is not
   `''`, and its `does:` line only beside a taken message and only when `messageSaysStop`
   does not catch it; the fixed texts stand otherwise, and a reply not whole, or a call that
   throws or does not answer, leaves them all, never a stop. A message the gate kept is not
   in `replaced`, so the call (still made, since the meaning is always replaced) never writes
   over it. Two replies came back answered and cut
   mid-sentence live on 19 Oct 2026, with the cap at 4,000 tokens and at 16,000, for a cause
   not known (`docs/testing.md` scenario 11); the wholeness test keeps their half sentences
   off the card. Its spend counts with the looks, and it writes card parts only, never the
   objective. `lastBrief.reads` records the card's reads: 1, 2 with the second ask, 3 with
   the own-words call; `lastBrief.own` what came of that call (`whole`; `cut`, answered but
   not whole; `none`, not answered or thrown; `skipped`, no call made) and
   `lastBrief.ownChars` its reply's length (0 with none); a check's card keeps all three
   from the briefing it was pressed on. The chooser asks more of a message than the gate:
   `messageUsable(message)` is true when `withoutStopSentences(message)` is not `''` and
   what it gives is `usable` read bare (`usable(kept, true)`: each sentence with every
   bracket and double quote mark taken off, and a sentence of marks alone not usable), so a
   message of only praise, thanks, a question or a bare back-reference is not usable even
   with no stop sentence in it, and even when a bracket or quote spans its sentences
   (`Great work. (Thanks. Nice job.)`, split into `(Thanks.` and `Nice job.)`). The gate
   still keeps such a message whole, as C1 needs, and `withoutStopSentences` reads `usable`
   with only a wholly enclosing bracket or quote taken off, as before. Before the own-words call, `unusableReplaced(answer,
   replaced, open)` puts the last read's kept message that is not usable to `OPEN_MESSAGE`
   and `OPEN_DOES` and adds `'message'` to `replaced`, so the call writes it and the choice
   moves on. When the last read's message was replaced and the own-words call gave no usable
   one (`ownMessageTaken(replaced, own)`: `'message'` in `replaced`, a whole reply, and
   `messageUsable(own.message)`), `takeOwnWords` is not given the message to take, and
   `earlierMessage(answer, replaced, ownTaken,
   first)` puts read 1's message on the card, without its stop sentences, with read 1's gated
   `does:` line, provided read 1 kept its message (`'message'` not in `first.replaced`) and
   `messageUsable(first.answer.message)`; otherwise the card is unchanged. It is decided by the
   `replaced` lists, never by comparing a message with `OPEN_MESSAGE`, and runs only after
   the own-words call. So Brief me's message is, in this order: the last read's own message
   without its stop sentences (read 2's, or read 1's when the second ask did not answer), the
   own-words message without its stop sentences, read 1's without its stop sentences, and
   only then the fixed list (`OPEN_MESSAGE`). With no objective written (`gateOpen` is null) the same answers are
   refused, never let through, not asked again and given no own-words call; the meaning and
   next step are `UNWRITTEN_MEANS` and `UNWRITTEN_NEXT`, and the message follows the same
   rule as above with `UNWRITTEN_MESSAGE` and `UNWRITTEN_DOES` as its fixed texts, so a sound
   message stands; `replaced` is `means`, `next`, and `message` only when it was replaced.

   A message is read one sentence at a time. `sentencesOf(text)` gives each sentence as a
   span `{ start, end }` over the text itself, the whitespace between sentences in none of
   them: a sentence ends at `.`, `!` or `?` (a run of them, with any closing `"`, `'`, `”`,
   `’`, `)` or `]` after it) followed by whitespace or its line's end, whatever the case of
   the next letter, and at a line break; so a line ending in `:` is its own sentence, a list
   item (a line starting `- `, `* `, `• `, `1. ` or `2) `, indented or not) is its own with its
   marker on its first sentence, a sentence wholly in brackets is its own, and digits make no
   difference (`Show build 42. Then stop.` is two). A decimal point (`0.4`) is no end, and nor
   is a list marker at a line's start. Each sentence is read on its own (`sentenceSaysStop`),
   the sentence before it read the same way only to see whether it ends on a negated outward
   act (shape 4 below): its
   list marker and any brackets or double quotes wholly enclosing it taken off; every run of
   whitespace read as one space, so no run of spaces or tabs changes a verdict (`Wait for a
   reply from  me.` is caught as with one space; a line break never falls inside a sentence,
   since `sentencesOf` ends one there); quoted words (straight or curly double quotes) masked
   only as the object of the nearest reporting word before them (said, says, wrote, writes,
   called, calls, claimed, reported, told; `REPORTING`), with at most four words, commas and a
   colon between (`REPORTED_GAP`: `said "…"`, `wrote: "…"`); a "to" between (`says to`,
   `told the agent to`), or "as" up to three words before the reporting word (`do as the note
   says`), orders what the quote says, so that quote is read, and a reporting word further
   back masks nothing (`You said it passed, and the log reads "You can stop now."` is read);
   then `toAgentVoice`; then
   five shapes masked (`maskExempt`) that do not stop the agent while it could still move the
   work; then `STOP_NEXT` and `STOP_ONCE`. Each mask replaces only the words that make its
   shape with `x`, so the rest of the sentence is still read (`Before you stop, write the
   summary, then you're done.` is caught on "then the agent is done"); next steps are never
   masked. The five, on the third-person copy:
   1. A push to finish before the agent stops (`BEFORE_STOPS`: "before the agent stops", with
      can, may or should or not): `Two things before you stop.`
   2. A wait on someone other than the owner (`WAIT_ON_OTHER`): a wait for a, an or the reply,
      answer, response, decision, go-ahead, word, sign-off or instructions from anyone but the
      owner (him, her, them, he and his count as the owner): `Wait for a reply from the
      lead.` `Wait for a reply.`, with no "from", is still caught, and so is "from my lead".
      Its lookahead refuses a space after "from", and `ON_HIM`'s approval from or by someone
      else refuses one too, so a run of whitespace cannot backtrack past the owner, even on
      a next step, which is not folded (`Wait for approval from  him.` stays a stop).
   3. A stop on a blocker that tells the owner what stands in the way (`BLOCKER_IF` and
      `BLOCKER_TOLD`, both needed): the sentence opens with "if" and a condition, up to its
      first comma, naming a refusal or an absence (refuse, refuses, refused, rejects,
      rejected, missing, not found, does not exist, no X has been added, no … yet), and it
      tells the owner what, that, why or which (with exactly, plainly or clearly or not) or
      says so in the clause the condition opens (from that comma, past an optional "then",
      to the next comma, semicolon, colon or sentence mark, or to a word in `BLOCKER_ENDS`
      that starts an unconditional instruction: then, otherwise, else, but, in any case,
      either way, anyway, regardless, whatever happens; a bare "stop" and a comma may open
      the clause, so the report may follow the stop past a comma, with "and" or without);
      then the bare "stop" in that clause alone is masked: `If the guard refuses the push,
      stop and tell me exactly what it refused.`, `If the guard refuses the push, then stop
      and tell me what it refused.` and `If the guard refuses the push, stop, and tell me
      what it refused.` are kept. `If anything fails, stop and tell me.`, `If the remote is
      missing, stop.` and `If the push is refused, stop.` are still caught, and so is a stop
      in another clause (`If the remote is missing, tell me why; otherwise, you can stop
      now.`, `If the remote is missing, tell me why but in any case you can stop now.`). A
      negated condition (not, n't, never or no longer, and at most one word, just before the
      blocker word) names no refusal or absence, so `If the remote is not missing, stop and
      tell me why.` is caught; `not found`, `does not exist` and `doesn't exist` are blocker
      words themselves and still count.
   4. A wait on the owner's word before an outward act only the owner does toward the
      outside world, from a closed list (`OUTWARD_ACT`): submit, publish, pay, buy,
      purchase; send with an email, message, application, letter or invoice as its object
      (`send it` is no such act); sign with an agreement, contract, form, lease, offer, NDA
      or paperwork as its object, bare or after the, a, an, this, that, our, my or your and
      up to two more words (`signing the employment contract`, `signing our contract`; so
      `signing the release commit form` counts too, while `signing the release tag` does
      not); apply for or to; post publicly, online, or on or to social
      media. Signing off, and signing, applying or posting anything else (`signing off on
      the tests`, `applying the migration`), are the agent's work. Said as a wait for the
      owner's word, go-ahead, approval or sign-off on,
      before or to the act (`WAIT_BEFORE_ACT`: `Wait for my go-ahead before you send the
      email.`), or on a button only the owner presses toward the outside world, named after
      "on", in any case (`OWNER_BUTTON`: Submit, Send, Publish, Post, Pay, Sign, Apply,
      Approve, Purchase; `wait for my word on Submit`; any other word is no button, so `Wait
      for my word on Build.` and `Wait for my word on Merging.` are caught), or as
      the act said not to happen (`NEGATED_ACT`: not, never or n't before it, and the rest of
      its clause) with a wait on the owner as the clause directly after it, a semicolon, a
      comma, "and" or a sentence's end between and nothing else (`WAIT_AFTER_NEGATED` in one
      sentence; `NEGATED_LAST` on the sentence before and `WAIT_FIRST` opening this one), that
      has no object of its own, or whose only object refers back to the act (on that, on it,
      on this, for that) (`WAIT_ON_HIM_BARE`, ending its clause); its wait words are masked
      (`Do not publish it; wait for my word.`, `Do not publish it; wait for my word on
      that.`, `Do not publish it. Wait for my word.`). A wait before something else is read
      (`Do not publish the report; wait for my approval before running the tests.` is
      caught), and so is a wait after other work (`Do not publish the report; run the suite
      and wait for my approval.`, or a sentence between). Merging, pushing, deleting, deploying
      and installing are the agent's to do, so `Wait for my go-ahead before merging.` is
      still caught.
   5. A stop or hand-back asked about as the thing a cause led to (`CAUSE_ASKED`, masked last):
      "which" or "what" (not after "do", and never "whatever"), up to three words (`which
      instruction or habit`), a causing verb (let, lets, made, makes, allowed, allows, led,
      leads, caused, causes, told, tells, got, gets, permitted), the agent, any agent, another
      agent or agents as its object (`CAUSED`, two joined by "or" or "and", and an aside
      between commas after it), an optional "to", then stop or hand in any form; masked from
      "which" or "what" to the clause's end (a comma, semicolon, colon, sentence mark or a word
      in `BLOCKER_ENDS`). `Name which instruction let you, or any agent, stop ordered work and
      hand it back to me as a yes-or-no.`, `Find what made the agent stop early and fix it.`
      and `Say which rule lets agents hand work back to me, and remove it.` are kept. A stop in
      another clause or sentence is read: `Find what made you stop, then stop.`, `Find which
      rule made you stop and then you can stop now.`, and the second sentence of `Which rule
      lets you stop? You can stop now.` are caught, and so is `Do what lets you stop.`

   `STOP_ONCE` catches a stop once something is done, its subject
   a clause's start or the agent with can, may, should, could or is free to (`You can stop
   after that.`, `You can stop once the README is fixed.`, `Then stop when the suite is
   green.`), never a thing (`It stops when the timer fires.`), or a stop once, when, as soon
   as or after something following "and" or "then" anywhere in a clause with no not, never
   or n't before it (`Run the tests and then stop when they pass.`, `Run the tests and stop
   after that.`); next steps are not read by it.
   `withoutStopSentences(message: string): string`, exported and pure, is the message with
   every sentence that reading catches taken out: it returns the input itself when no
   sentence is caught (untidied, whitespace and all), and `''` for `''`. A removed sentence
   takes the spaces and tabs after it on its line; a list item's marker stays for the rest of
   its line; a line left empty, or holding only a marker, is dropped; a blank line beside a
   dropped line goes where it would stand first or make two in a row; trailing whitespace is
   trimmed on the lines a removal touched and at the end; nothing else changes, no sentence
   reworded, moved or reflowed. No bracket or double quote is left without its partner
   (`pairsOf` pairs `()`, `[]` and `“”`, each kind nested on its own, and straight `"` in
   turn): a mark in a removed sentence whose partner stands on kept text stays, an opening
   one against the kept text after it and a closing one against the kept text before it
   (`Run the suite. (You can stop now. Thanks.)` gives `Run the suite. (Thanks.)`), and a
   pair wholly in removed text goes with it. When what is left names nothing to do, show or fix
   (`usable`: no sentence in it, read with its runs of whitespace as one space, that holds a
   letter or a digit and is other than praise or thanks, a question or a bare back-reference,
   so `You can stop now. ...` gives `''`) it returns `''`. Praise or thanks (`PRAISE`) is a sentence made only of
   thanks, thank you, many thanks, much appreciated, well done, and good, great, nice,
   excellent, solid or perfect with work, job or progress after it or not, each with "so far",
   "so much", "again" or "too", or "on" or "for" and up to four words, joined by "and" or a
   comma (`Great work, thank you!`, `Good progress on the parser.`); a question ends in `?`;
   a bare back-reference (`BACK_REFERENCE`) is a verb with "that", "this", "it" or "so" as its
   object and at most one adverb (first, now, then, again, too, also, please), after an
   optional "then", "and" or "please" (`Do that first.`, `Then do so.`; not `Show why it
   failed.` or `Fix it in the parser.`). A statement of fact about the work counts as usable,
   since it is a finding (`The install is not shown.`). A caller that must not show a stop
   uses the result when it is not `''` and its own fixed text otherwise; `gateVerdict` and
   `takeOwnWords` do, and `ownMessageTaken`, `earlierMessage` and `unusableReplaced` do
   through `messageUsable`, which also holds a message with no stop sentence to `usable`. `sentencesOf` and
   `messageSaysStop` are exported beside it, and `messageSaysStop(text)` is true exactly when
   `withoutStopSentences(text)` would take a sentence out, since both read each sentence the
   same way, with the sentence before it (`stopSpans`, through `sentenceSaysStop`).

   The watch and the briefing (and its second ask) read through one helper, `readSession`.
   A fork answers `nothing-to-fork` before the first response of the process (a session
   reopened with `--continue` or `--resume`), after `/clear`, and through the whole first
   turn of a new session. Only for a read the owner started (`fallback`: the press's `ask`, its
   second ask included, and `look` with reason `note`) the helper then reads
   `$.session.messages()` and, when there are rows, makes one `$.model.complete`
   (`OBJECTIVE_MODEL`, high effort, `RECORD_SYSTEM`, `RECORD_MAX_TOKENS` 16,000,
   `RECORD_TIMEOUT_MS` four minutes) over `recordPrompt`: the rows printed by `recordText`
   as entries labelled `entry N`, never `#N` (the owner's rows as the person only where their key is
   one of the owner's messages that `heldItems` read from the transcript, `NOT_TYPED` applied after
   as a second filter, and with no transcript read, `NOT_TYPED` alone; every other row on
   the owner's side as the session's),
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

   **What the readers hold of the owner's messages and approved plans (Task 7).** `memoryFor`
   reads back, by fingerprint, the saved copy (`src.sent`) of every message of the job and each
   approval's `body` and `took` too, so a long message is in both readers whole up to
   `APPROVAL_READ_CAP`, and past it as its first `HIS_CUT` characters and its last `CLOSE_SHOW`
   with a line saying the rest was not read (`readerWords`). A draft is only its own words: alone,
   its saved copy; sent in one message with the owner's words after it (Task 5's `withDraft`), each
   part is its own share of the whole as the writer split it (`joinedSplit`, from the drafts the
   rep knows and the last briefing's message), or its text as kept; a draft never takes the
   owner's words and carries no power. A fingerprint this process has worked out is kept by its
   text (`fingerprint`, bounded by `FINGERPRINT_MEMO_CHARS`), so a text read back unchanged needs
   no second digest and a press is not slowed by a long message; a changed text is digested again.

   The approved plans go in a section of their own (`approvedBlock`, each plan in an
   `approved_plan` fence with what the owner took and the owner's whole reply), filled by
   `readerParts` within a budget: `WATCH_APPROVED_BUDGET` (40,000 characters) for the Heads up,
   `BRIEF_APPROVED_BUDGET` (80,000) for the briefing. A plan is never shown in part: one over the
   briefing's budget is shown to neither reader (`over`), one between the two to the briefing
   only; the briefing shows the newest plans that fit and names the rest as having no room
   (`noRoom`). The Heads up takes the plans in turn from the record's cursor `readerAt.watch`,
   saved after each answered look (`fill.cursor`) and wrapping to the start, so every plan is
   shown whole within a few looks; the briefing keeps no cursor. With no approval there is no
   section and the memory is as before Task 7.

   `WALK_RULE` has both readers walk each shown plan's steps against the record first and give
   each a state (done, claimed, underway, not reached, no sign while later work goes on, done
   before the summary, runs alongside, looks dropped, not assessed), a step with no sign while
   later work goes on counting as the owner's ask dropped. The Heads up writes the walk under
   `steps:` before `state:`; `parseWatch` reads that block as if it were not there, save that its
   lines ending `| not assessed` or `| looks dropped` become `notAssessed`, and `walkDropped` turns
   its `no sign` and `looks dropped` lines into `dropped`. `LIST_GAP_RULE`, in the Heads up alone,
   makes the one exception to staying quiet about a step left not assessed: where the agent's own
   full list of what it is building or doing to carry out an approved plan, or a summary of what
   is done and what remains of it, stands whole in the record and a step of that plan is not on
   it, the walk marks the step `looks dropped`, without calling it skipped or done. A left-out
   part inside the list, a list from before the approval, a list of one part of the work, a list
   called partial or a step the agent says comes later leaves it `not assessed`.

   `headsUp`, called by the look after the reader answers, decides what the owner sees. A step
   walked `no sign` or `looks dropped` takes the line, `A step of the plan you approved looks
   dropped: <step>.`, cut at `DROPPED_STEP_MAX` (160), whatever the reader's flag was about. The
   flag and its why move into the why after `Also:`, and further dropped steps after `Also looks
   dropped:`, so no concern is lost. This outranks even a flag about harm, whose words stay in the
   why. A step walked `not assessed` has no say, a flag that already speaks of the step keeps the
   reader's wording, and a step `seen` already speaks of is not raised again (`speaksOf`: a drop
   word and three of the step's words, or all of a shorter step's, so two near-identical steps
   dropped at separate looks read as one; the briefing still walks both). A flag that speaks of
   one dropped step keeps the line, and the others go under its why, at most `DROPPED_ALSO_MAX`
   (3) by name. A step counts only where the plans shown to this look hold at least
   `PLAN_WORDS_SHARE` (0.4) of its words, so a step no shown plan holds is never called part of
   one; words rather than exact text because readers reword steps. The walk's number is not
   checked, because readers write a step's own number there as often as the plan's message.
   `walkLine` reads both the walk's forms for `notAssessed` and for `dropped`, the mark being what
   follows the last `|`. `NOT_ASSESSED_RULE` and the lines of `boundaryCover` still hold, and the
   list
   can only raise the mark; it
   never moves the ask. The briefing walks to itself and names the steps
   it could not assess under `unassessed:` (`#n: step` lines), which `parseBrief` reads apart from
   `left:`. `recordText` keeps a compaction summary whole up to `RECORD_SUMMARY_CUT` (40,000)
   where any other row is cut at `RECORD_ENTRY_CUT`.

   What a reader could not do for an approval reaches the owner by one path, coverage (plan 6.4,
   Task 4b's templates): `readerGaps(fill, reader)` gives the plans not compared (too long for the
   briefing, or no room beside newer plans) and the Heads up's `tooLong` (over its budget, inside
   the briefing's); `notAssessedGaps` the steps a reader marked not assessed; `boundaryCover` the
   boundary's outcome (0c: the record shown starts after the approval, or where it sits could not
   be found); `joinGaps` merges them, each message once. A look sets them with `setLookGaps` for
   the row; a press passes its own as `CoverOpts.gaps` to the card through `withRecordLines`, and
   the briefing's prompt carries, among coverage's lines, the plans it cannot compare. An approval
   in the readers' memory whose plan is not shown prints coverage's line for it
   (`unshownLine`). The Heads up's too-long line is `ReaderGaps.tooLong`, shown by coverage only
   when no other line stands; it replaces the `last` parameter Task 7 first gave `recordLines`.
3. **Check**: `pressCheck()` → `runCheck()` first makes a throwaway copy of the agent's
   folder (`makeCopy`: an APFS clone, `cp -Rc`, into `checkCopyDir` under `~/.cache`; where
   `cp` refuses `-c` before making anything, as GNU `cp` does, `mkdir` makes the folder and
   `cp -R` copies the agent's folder's contents into it; a clone that failed part-way, which
   `mkdir` without `-p` tells apart, is not copied over), then
   spawns a headless `claude -p` in it with `--permission-mode default`, `CHECK_ALLOWED_TOOLS`
   allowed outright (the shell, the file tools, the direct agentsview tools), `CHECK_DISALLOWED_TOOLS`
   (anything that edits through a tool, sends, fetches the web or launches helpers) and
   `--settings` from `checkSettings`: the built-in sandbox with writes denied to the owner's
   work, Claude Code's whole configuration (`~/.claude`, `~/.claude.json`) and the main places
   in the home whose contents run later (`checkDenyWrite`: the shell's startup files,
   `SHELL_STARTUP`, and `.bash_aliases`; `.gitconfig`; `.npmrc`, `.yarnrc`, `.yarnrc.yml`,
   `.bunfig.toml`; `.tmux.conf`, `.vimrc`, `.vim`; `.aws`, `.kube`; Node's fallbacks in the
   home, `package.json`, `node_modules`, `.node_modules`, `.node_libraries`; `~/.npm/_npx`,
   where a user-scope MCP server started by `npx` runs from, never the rest of `~/.npm`;
   `~/.rustup/toolchains`, never the rest of `~/.rustup`; `~/Library/Python` and
   `~/.local/lib`; Claude Code's install; `~/Library/LaunchAgents`; and for each folder of
   `PATH` in the home, and each place in the home a `PATH` folder or a link in one (or in
   `~/.local/bin`) leads to, the install it belongs to, `installOf`, which looks one level
   past `Library/Application Support`, `Library/Caches`, `Library`, `.local/share`,
   `.local/state`, `.local` and `.cache`, the folder alone when that install would hold the
   copies, none when the folder would; the places links lead are asked before the run,
   outside the fence, by `pathLinks` (`pathLinksArgv`: `find` over each folder given as
   `<folder>/.`, matching that folder itself and the links in it, never the folders inside
   it, so a home on the path guards its links and not every folder in it, with
   `-exec readlink -f {} ;`, one name to each call as BusyBox's readlink takes, its exit
   code not read, a cut last line dropped by `linkTargets`, under
   `PATH_LINKS_TIMEOUT_MS`, 30 seconds; under two on a Mac); and every git repository
   the copy and the agent's folder reach (`gitRepos` asks four questions before the run,
   outside the fence, each on its own so that one which fails loses only what it alone
   would name: `gitUpArgv([copy, cwd])`, the `.git` in the copy, the agent's folder and
   every folder above either, `foldersUp`; `gitInsideArgv(copy)`, every `.git` inside the
   copy (`-prune`d, so none inside a `.git`) and where each link in it leads, unless
   `holdsCopiesOf(home, copy)`, when the copy is a folder holding the copies (the home);
   `gitUpArgv(links)`, the `.git` in each place those links lead to outside the copy and
   every folder above it, only when links are found; and `worktreesArgv(gits)`. Each goes
   through `wholeArgv` and `wholeAnswer`: an answer counts only when `find` printed its end
   mark (the exit below 128) and was not cut at the output's cap (4 MiB, about 35,000
   links), else it is null. Each prints the `.git` found, where it leads by `readlink -f`
   and its `gitdir:` line, read even when readlink fails, after a line break so a file with
   no break at its end cannot run into the next, under `GIT_FIND_TIMEOUT_MS`, 30 seconds
   per question, its exit code not read. The folders a link leads to are not searched
   inside, and a name holding a line break inside the copy is reported (`passedOver`) and
   makes the check say the repository could not be found. Timings of 17 Oct 2026: the
   question inside the copy takes 0.6 to 2 s for a project of 109,000 files and for one of
   63,000 files and 2,000 links, and a test folder of 3,000 links takes 0.2 s here, 1 s on
   Ubuntu 24.04 and 3 s on Alpine 3, the three answering the same.
   `gitDirsOf` names the folder holding each `.git`, where it leads, the folder its pointer
   names read from the folder holding the `.git` and from where it leads, cutting only the
   line's end as git does, and for a worktree the git folder above `worktrees/<name>` too,
   leaving out any place in the copy or the agent's folder; `gitLinksOf` names each place
   a link leads to; `outermost` leaves out any place inside another, which the other's
   guard covers; then `worktreesArgv` asks each
   git folder found (`gitFoldersOf`) for the `gitdir` file of each worktree it lists, and
   `worktreeDirsOf` names each worktree's folder, a relative entry read from the file's
   folder; the same answers on macOS, Ubuntu 24.04 and Alpine 3): a copy keeps the
   agent's `.git`, so a copy of a worktree or of a `.git` link
   reaches the real history, git in a copy with no `.git` of its own finds one above it,
   and with no copy the run works in a folder that may be a subfolder of its repository;
   reading through git still works, adding, committing and stashing are refused; where the
   host does not answer the link question, `pathLinks` gives null and the brief says the
   installs the links in the command folders lead to could not be found; where it does not
   answer a git question whole (a throw, a timeout, an answer cut at the output cap or
   without its end mark, or a name holding a line break), `gitRepos` marks its answer not
   whole (`whole: false`) and keeps what the other questions found, and the brief says not
   every repository, nor every place a link in the copy leads to, could be found, and to
   stage, commit and stash nothing; `CheckArgs.unanswered`), the brief naming the
   main ones, saying no list names every one, rather than saying all writes outside the copy
   are denied, and the network closed except
   for the local machine, with `failIfUnavailable` (the run refuses to start where the sandbox cannot)
   and `allowUnsandboxedCommands: false` (no command can ask to run outside it); an
   `enabledPlatforms` list is set nowhere, since Claude Code reads it only from managed
   settings (2.1.302). Measured 15 Oct 2026: bypassing approvals switches the sandbox off, so the
   run does not; the owner's guard hooks fire inside the run; `denyWrite` beats `allowWrite`.
   The copy is removed when the run ends; when it cannot be made the run uses the agent's
   folder with writes there denied, the brief says so and asks it to run only what writes
   nothing there, and any part of a copy is removed. A folder that holds the copies' folder
   (`holdsCopiesOf`: the home, `~/.cache`) is never copied, since the copy would hold
   itself; the run uses it as it uses a folder that could not be copied. The home is read
   by `homeOf` with any separator at its end dropped, so every path built from it and the
   fence's comparisons hold.
   On Windows (`windowsOs` says `Windows_NT`: `OS` is, or `SystemRoot` or `windir` holds a drive path, or the session's working folder is on a drive) Claude Code's sandbox is off, so nothing would deny a
   write or close the network: a card drawn there shows `CHECK_NO_ROOM` in place of the
   check's price and no Check it button, and `runCheck` starts no copy and no run there,
   pressed on a card drawn before. Where the sandbox cannot start, Claude Code prints
   `NO_FENCE_ERROR` with what is missing and exits; `noFenceNote` makes that the card's note,
   held for the process in `noFence` so each later card carries it and `runCheck` starts
   nothing, the note saying a restart of Claude Code clears it once the sandbox's missing
   piece is installed, and `checkBarred` keeps Check it off a card with either note. Before
   the run, `pnpm store path` is asked in the copy outside the fence (`pnpmStore`; in the
   agent's folder where no copy is made), with `--config.ignore-pnpmfile=true`,
   `--config.manage-package-manager-versions=false` and `--config.offline=true` on its
   command line (`PNPM_STORE_ARGV`: the project's `.pnpmfile.cjs` not loaded, no pinned
   pnpm installed and no config dependency downloaded, all of which a bare ask does
   outside the fence; the command line beats a project's `pnpm-workspace.yaml`, which
   beats the environment, so the project cannot turn any back on) and
   `COREPACK_ENABLE_NETWORK=0` in its environment (`COREPACK_ASK_ENV`: where pnpm comes
   through corepack, corepack fetches a pinned pnpm before pnpm reads its command line;
   with its network off it runs one it already holds and fetches none, measured with
   corepack 0.36.0), and the answer, its version folder
   taken off (`pnpmStoreDir`), passed to the run as `npm_config_store_dir`: inside the fence
   pnpm finds its store unwritable, moves it into a scratch folder, and an offline install
   there fails (measured 17 Oct 2026, pnpm 10). The three questions come before the run's clock
   starts, so the check's measured time is the run's own. Fifteen-minute timeout
   (`CHECK_TIMEOUT_MS`), 120 turns, JSON output; `permission_denials` in the output is the
   count of commands refused approval, shown on the checked card (`refusedLine`, which says
   commands the fence stopped are not counted) and on the next card's price line
   (`checkCostText`); the right number is zero. Its answer rewrites the card, with each claim
   marked holds, false, not shown or changed since; it is given the conditions held open and
   those held shown with where (`CheckArgs.shown`), its `shown:` and `closed:` lines move
   them, a `reopen:` line puts one held shown back to not shown and marks it `reopened`
   (after that only a check's own `shown:` line moves it shown again, and the looks, the
   briefings, the writer and the next check are shown what the check found beside it), and
   its verdict passes the same gate part by part, with no own-words call, so a check never says stop while a condition is open. The briefing's going-well
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
proves is the one run) and holds the lookup for the process, keyed on what `windowsOs` makes of `OS`, `SystemRoot`, `windir` and the working folder (Windows passes the first three to programs by default, but a launcher can drop them, so `OS` being `Windows_NT`, or a drive path in any of the last three, counts, and the working folder is the sign none can drop), except a Windows
one whose coreutils did not answer, which is looked up again on the next call; a lookup that
throws still reads as Windows, so the check's refusal there never rests on a probe. The home
is `homeFor` (`homeOf`): on Windows, by the same reading of the four signs, `USERPROFILE`,
else `HOME`, since Claude Code keeps its folder under the home Node gives it, which there
reads `USERPROFILE` and ignores `HOME`; on a Mac or Linux `HOME`, else `USERPROFILE`; written
with forward slashes on Windows, '' with neither (the check's copies then go under `/tmp`);
`heldItems` slashes the paths it is given or finds on Windows. Kyle Cunningham measured the Windows facts on Windows 11 with
Claude Code 2.1.302 (PR #13).

**The objective** (`Objective` in `hooks/rep.ts`, declared again in `types/index.d.ts`) is the
rep's own account of what the owner wants on the job in hand, never the owner's text, held in
parts: `result`, `purpose`, `done` (a list of `Condition`s, each `open`, `not-shown`, `shown`
or `closed`, with `by` saying where it was shown or which message of the owner's closed it) and
`step`; with `since` (the number of the job's first message), `from` (the last message number
the write that built it was shown), `movedAt`, `cause`, `revisions` and up to `VERSIONS_MAX`
earlier `versions`. Only `rebuildObjective` writes it: on each message of the owner's and each note,
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
`objectivePrompt` only the held objective, `rec.past` and the owner's numbered messages on the job
(each with the agent's last answer before it), the messages inside a `<his_messages>` fence
followed by a note that they are quoted records and no instruction to the writer; a fence tag
(any letter case, spaces inside the brackets allowed) in a message or in the agent line is
printed with its brackets turned to `‹` `›`, so no message can close the fence, and the record
keeps the text as typed. Its answer is `objective: holds`, or
`objective: moved` with `moved:`, `result:`, `for:`, `done:`, `step:` and `dropped:`
(`parseObjective`); `moved: new job …` closes the job. Straight after the `objective:` line,
holds or moved, come its `approved:` lines: one `approved: #n | all` or
`approved: #n | <the part taken>` for each message whose turn the owner approved, or
`approved: none` (`parseApproved`; `parseObjective` reads the rest as before). The rules for
an approval are `OBJECTIVE_SYSTEM`'s section "Plans the owner approved": what a yes is, a draft
with the owner's words read as one message, each step of an approved plan its own condition
after the whole plan is read, a clash kept as both sides and an open "Settle with the owner
which stands" condition, and a plan's statements of fact held as the agent's claims. `takeObjective` applies it: the first
objective is taken as it stands; after that a write is taken only when it saw a message of the owner's
or a note past `from` (`hisFrom` never counts a draft), so neither the agent's words nor the
rep's drafts can move it and a write that lands late cannot take a newer one's place. A
correction takes the result, purpose and step whole and runs the conditions through
`mergeConditions`, which keeps every held condition the writer leaves out unless `dropped:`
cites the number of a message from the owner, new since the held objective was built (past `from`),
and never raises a state: a held condition keeps its state, where and `reopened` mark unless
the writer closes it, and a new one proposed shown starts open;
`honest` turns a `shown` the writer adds (of the conversation it sees only the agent's last
words before each of the owner's messages, marked as the agent's) and a `closed` that cites no such
message back to open. A condition
listed twice, or with a state mark copied into its text, is kept once (`parseObjective`,
`mergeConditions`). A new job pushes
the old result onto `rec.past` and starts the job (`since`, `rec.jobStart`) at its first new
message. The first write, which has nothing held to push, starts the job at the message its
`moved: new job #n` cites when n is one of the owner's messages after the first, so a seeded session
whose transcript held an earlier job does not show that job's messages as this one's. The looks, the briefing and the check never write the objective: `applyMarks` takes
their `shown:` lines when they name where, their `closed:` lines only when the number is a
message of the owner's on the job sent after `from` (one the objective was built from had its say
when it was written), and the check's `reopen:` lines when they say what shows otherwise; a look's or a briefing's
`shown:` line does not move a condition marked `reopened` (only the check's does, the fourth
argument). A new job's conditions start with no mark. A draft moves only `step`, set to the draft's `firstSentence` in
`prompt.submit`. The card shows `revisedLine` under the head and `objectiveText` as its
reading; the row shows `result`.

Owner messages are `OwnerMsg`s: `n`, `kind` (`his`, `note` or `draft`), `text` (cut to
`HIS_CUT`, 6,000 characters, for the owner's messages and notes, the writer's only input, and to
`OWNER_CUT`, 1,200, for a draft), and `prior`, the end of the body under it, the agent's words
the message answered (`fitTail` to `PRIOR_CUT`, 400, keeping the end, where the question a short
reply answers usually is). A message whose stored `text` is not all of what was sent (over
`HIS_CUT`, or split into words for the agent and a note to the rep, or a draft with his words after it) keeps the whole as
`src.sent`, and `ownerWithPrior` prints that in place of `text` for the writer. `rec.counter` gives every message its number, drafts
included, so the guards compare numbers, never list lengths, and `trimOwner` keeps the job's
messages whole up to `JOB_MAX` (200) and `OWNER_MAX` (40) from before it. `loadRec` migrates
older records: a list of strings becomes numbered messages (`migrateOwner`, which reads the
old marks), and a record with a `reading` and no `objective` gets `objective: null`, its old
text in `rec.stale` (kept as the first version when the objective is written) and
`rec.jobStart` at the old job's first message; the next start, press or message writes it.

The turn the owner answered is captured from the stream, never read back. `turn.step` (main loop
only; a helper's step, with `agentId`, passes through) returns `yield* tapStep(next(e), keep)`:
`tapStep` (rep.ts) is an iterator whose `next`, `return` and `throw` are the inner stream's own,
each result shown to `keep` on its way up, so every chunk, return value and throw passes as under
`yield* next(e)`; only `text` chunks are kept (never thinking), by block (`addText`), and
`closeStep`, in a `finally`, moves the step's blocks in block order into the turn's. Blocks and
steps are joined with a blank line (`joinTurn`, `runningText`); the step's `answer` and
`turn.complete.answer` are never the text, since they drop or merge blocks. A turn's entry in
`live` is made at its main-loop `turn.start`, labelled `by` how it began (`notification` after a
task-notification submit or a start text that begins `<task-notification>`, `continuation` for an
empty start text, `owner` after a composer or bridge submit, else `other`; `lastOrigin`, set on
every submit, says which). A step with no entry (a reload mid-turn) makes one marked `incomplete`
(`the rep did not see this turn from its start`); a step whose index is not the one expected marks
it `a step of this turn was missed`; past `TURN_TEXT_MAX` (= `SOURCE_MAX`, 1,000,000 characters)
nothing more is kept and it is `longer than the rep keeps`. At `turn.complete`, before anything
is awaited, the turn joins `completedHere` and `saveTurn` saves its text (after what a message
typed into it took, `restOf`) as the source `t-<turnId>` and appends `{ turnId, by, src,
incomplete, note: 'interrupted' when aborted }` to the record's `pending` (at most `PENDING_MAX`,
50; past it the oldest is let go and `pendingDropped` counted); `saving` holds that save.

A composer or bridge submit fixes what it answers before its first `await` (`snapshot`): the turns
in `completedHere` then, and, when `e.turnId` names a running turn, what that turn had streamed
since anything was last taken (`taken` moves to the end, so the rest goes to the next message); a
`turnId` with no entry gives an empty cut marked `the turn running when the owner typed was not
watched from its start`. After `await saving`, inside the change that records the message,
`takeBody` (which reads each pending turn's text through `readRef`) takes from `pending` every turn that ended before the submit (in the snapshot, or not
in `completedHere` at all, as after a reload) and appends the cut (`bodyOf`): the body, its
`turns` spans (`{ by, from, to, note?, incomplete? }`, at most `TURNS_KEPT`, 20, the oldest merged
into one span that counts its turns by `merged`) and `incomplete` with the first reason (turns let
go first). The body is saved as `src.body` (`<n>-body`) on the owner's part (his message, or a
note sent alone); a draft part gets none, and a draft sent unchanged still takes the turns it
answered. A turn that ended after the submit stays pending for the next message. An empty, whole
body adds no field. `saveSource` fingerprints each source and holds it inline in the record
until the change saves it to its file (below); one over `SOURCE_MAX` is not kept and says why
in `lost` (`lostTooLong`). `leaveSession` clears `live`, `lastOrigin`, `saving`,
`completedHere` and the record lines.

**Saved sources and the store.** Each source (a turn's text, a message's `body`, `took`,
`rejected` or `sent`) is a `SourceRef`: `chars`, `sha` (`sha256`, the runtime's SHA-256 of
its UTF-8 bytes, 64 hex characters), `where` (`inline`, `file` or `memory`), `text` only while
inline, and `lost` with the reason when it cannot be read. Its file is
`<config>/owner-rep/sources/<session id>/<source id>.txt` (`sourcesRoot`; the config folder is
`CLAUDE_CONFIG_DIR`, else `.claude` in the home, read once a process by `rootOf`), the source id
`t-<turnId>` or `<n>-<part>` (`isSourceId`); only a session id of the uuid form has a folder
(`isSessionId`). In every `changeRec`, before the save, `placeSources` writes each source not
yet in a file: a file already there is never written over, and is checked against the
fingerprint where it is read. A write that fails or takes longer
than `SOURCE_WRITE_MS` (1,500 ms, `writeFile`) stops the writes for that change; what was not
written goes back inline while the record's inline texts stay within `INLINE_RECORD_BYTES`
(65,536) and every record's within `INLINE_STORE_BYTES` (524,288), and is held in the running
process past that (`where: 'memory'`, `memTexts`), each tried again at the next change.
`readRef` gives a reference's text for use: inline from the record, memory from `memTexts`
(else `LOST_RESTART`), a file only when what it reads has the reference's fingerprint (else
`LOST_DAMAGED`); the record never keeps a file's text. `readable` reads the named parts of a
list of messages and `markLost` marks in the record each found lost, only while it is the same
source (id and fingerprint). The objective writer reads the job's `sent` parts this way; the
readers (`memoryFor`) get the approvals kept past the trim with `sent`, `body` and `took` read
whole. The files a change drops (a turn taken into a body, a message the trim lets go) are
removed after a save that succeeds, and the folder of a record the store lets go goes in
`stored`; `removeFiles` runs one `rm -f` or `rm -rf` through `hostArgv`
(`REMOVE_TIMEOUT_MS`, 10 s) on only the paths `removablePath` allows: a folder named by a uuid
right under the sources folder, or a source or record file in one.

`changeRec` raises `rec.recRev` on every change that alters the saved record (`bareJson`
compared before and after) and `rec.objRev` when the objective changed. A save the store
refuses (`saveRec`) moves the record's inline texts to files, or to memory when the files
refuse them (`moveInline`), and tries again; refused still, `saveToFiles` writes the whole
record as parts of at most `FALLBACK_PART_BYTES` (3,000,000) UTF-8 bytes (`splitRecord`,
never inside a character), `record-<recRev>-<k>.json`, then last the list of them,
`record.json` (`{ recRev, parts: [{ name, bytes, sha }], why }`), and removes the older list's
other parts. The record is held in the process (`fullRecs`, which `loadRec` returns while it is
set) and `storeFull` says whether the files hold it (`memoryOnly` when a write failed). A
later save the store takes removes the list and its parts (`stored`).

A session's first `loadRec` in a process reconciles the store with its files once
(`reconcileOnce`, `reconcile`): a list (`parseManifest`, which takes only part names of the form
above) at or under the store's `recRev` is removed; a newer one is taken up when every part
reads back with its fingerprint (`pickRecord`, `parsedRec`, which checks the session id), and
`storeFull` is set again so the line shows after a restart; otherwise the store's record stands
with `rec.lossMark` (`{ lostRev, keptRev, after, why }`), `recRev` set past the lost copy's, and
the list renamed `record-lost-<lostRev>.json` with its parts kept. A loss for any reason but a
fingerprint that did not match (`isMismatch`) is taken up at a later start while the record
has not changed since the mark (`recRev` still `lostRev + 1`), its files then removed; a new job
clears the mark and removes its files. Sources held in memory by an earlier process are marked
`LOST_RESTART`.

An approval (`approvalOf`: the owner's message, note or plan-screen plan carrying `approved`,
never one that turned a plan down, never a draft) of the open job that falls outside the job's
newest `JOB_MAX` is kept by `trimKept`, pinned, up to `APPROVED_KEEP_MAX` (60) of the newest;
its stored text is cut to `PRIOR_CUT` with its whole words kept as `src.sent`. An older one is
not kept. `pushOwner` trims through `trimCounted`, which counts into `rec.uncovered`
(`{ job, count, recent }`, the last `UNCOVERED_RECENT` (10) entries `{ n, why, kind, screen?, row? }`,
each at most 140 bytes, its reason cut by `entryWhy`) every message of the job it drops that has a
coverage line or is an approval it could not keep; a new job clears it, and the old job's
approvals then leave with the rest of its messages, and their files with them.

What the owner is told when a plan or message was not read (plan 6.4) is `coverageLines`, and
`coverage` caps it at `COVER_LINES_MAX` (3): past that the third says how many more are not
checked, the entries `uncovered` let go of counted. In order: the lost copy (`lostRecordLine`);
then by message number each message of the job that `unresolvedRow` puts in one of the rows 1 to
12 (`rowLine`; `ReadState.mark` tells row 1, a wait set off by a mark, from row 2), each entry
`uncovered` holds (`droppedLine`; an approval with no row says it was not kept, `NOT_KEPT_WHY`),
and the readers' lines for an approval the record holds (`notComparedLine`, `notAssessedLine`,
passed as `CoverOpts.gaps`, a `ReaderGaps`); then a failed write (`failedWriteLine`) for each
message after the objective's `from` up to `rec.failedWrite.upTo` that no other line names; then
the store full (`storeFullLine`, kept in its own files or only until Claude Code restarts); the
plan too long for the Heads up (`headsUpTooLongLine`) last, only when no other line stands. Each
line carries `asserts`, true when it says without condition that the owner approved or accepted
a plan (`ROW_ASSERTS`); `planIn` says "accepted on the plan screen" only for a plan-screen plan
and "approved in message" only for the owner's message or note. A seeded copy that starts after
a compaction summary (`typedFromItems`'s `compacted`) records its first turn incomplete with
`COMPACTED_WHY`, so a message after it stands in row 6. The lines are the state key `lines`
(`rowCoverage`, with the gaps `setLookGaps` keeps per session), drawn under the row's head in
the row and note views; they are given to the briefing in place of its none line under the open
conditions (`memoryText`: with no objective, or with conditions open, the list is printed
instead and no line); and they go first in a card's left-out list by `withRecordLines`, which
also shows a stop as continue while a line stands, its meaning the first line and its next step
`RECORD_NEXT`. A message loses only the sentences that say stop, by `withoutStopSentences`, the
same removal the gate uses: every other sentence stays as written, and a message with none stands
whole. Only when nothing usable is left, or what is left still says stop, is the message
`RECORD_MESSAGE`; what it does is `RECORD_DOES` when it says stop itself or the message became
`RECORD_MESSAGE`.

A session the rep holds no record of (its record fell out of the newest `SESSIONS_MAX`, it
was forked with a new id, or it is older than the mod) has none of the owner's messages. `seedOwner`
fills such a record, one with no message or note of the owner's, from the session's transcript file,
in the file's order, never from the rows' text: a message the owner typed while the agent worked
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
`queued_command` of origin kind `human` (a message the owner typed while the agent worked,
`queued`), meta on neither the line nor the attachment, each as a `HumanItem`: its `text` in
`typedForm` (a command as `/name args`, reminders removed), its `key` the `typedKey`
(whitespace folded); one with an empty key or a text `NOT_TYPED` names is skipped, and one
sent twice is two items. `humanTexts` is the set of their keys, which the record read labels
by. A session's own file that begins at a summary is a copy: Claude Code 2.1.302 can save a
fork taken after a compaction as the parent's stretch since the summary, with none of what the owner
typed before it. `startFind` (`grep -n -o -m 1 -E`) prints the file's first compaction mark,
with the mark's line's one `"uuid"`, or line the owner typed, and `summaryStart` reads the summary's
id when the mark comes first. The newest other `.jsonl` files in the folder are then searched
for that line (`summaryLineFind`), within the limits below, and the first one holding any of
the owner's messages before it gives those (`humanReadBefore`), followed by the copy's own; a copy of
the copy, which holds the line with nothing before it, is passed over, and with no file
found the copy's own messages stand alone. When the session's own file cannot be read (a
session forked with a new id has none until its first message is saved; the path held still
names the right folder), the newest `.jsonl` files in its folder other than its own
(`folderOf`, `ls -t`) are read one at a time, at most
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
it (what the owner typed while the agent answered their last message before the fork), never the
parent's later messages. The file with the most matches
is taken, the newest on a tie, and the scan stops once a file matches every candidate;
`heldItems` is null when the best file matched none, whether or not any file was read
whole, so the record read labels the owner's rows by their text rather than calling them all the
session's. A
scan repeated at each start and press costs milliseconds, so nothing caches it.
`typedFromItems` gives each item the end of the agent's last text before the row it matches
as its `prior`, lining them up from the end because after a compaction the rows hold only
the tail: walking the items from last to first, each typed one takes the latest of the owner's
side's rows with no tool results and the same key before the row matched after it, so a
short reply the owner sent before and after a compaction gets its prior only at its later place; a
queued item, or one no row holds (from before a compaction), keeps its place with no
prior. Each is recorded as `his` through `pushOwner`, a
draft the owner sent split off as `prompt.submit` does, matched against every record's drafts, last
message and messages held as `draft` in the store (`storedDrafts`), so a card the owner sent in the
session this one was forked from is still the rep's draft, even one more than `DRAFTS_MAX`
back or sent under a build that kept no `rec.drafts`, and against `droppedDrafts`, so one
from a session whose record was let go is too. A session with no row is not read. One whose
rows hold no candidate (reopened or forked after a compaction the owner has typed nothing since,
so the summary and the agent's work are all its rows) is read all the same: its own file
whole, and in the scan, where nothing typed can be matched, the newest file holding the call
of its last tool result (`lastToolId`, found by `toolLineFind`, `grep -n -o -m 1 -F` on the
call's `"id"`, and `toolLineOf`) gives the items before that line (`humanReadBefore`, `sed`
stopping there), a cut read skipped; the call, not the result, because a fork taken while a
tool ran holds a result Claude Code marks interrupted, which its parent saves only later.
With no tool result either, nothing past its own file is read. `seedOwner`
runs one seed per session at a time (`seeding`), and
`prompt.submit` awaits it before recording a prompt or a note, so a prompt sent during the
start's read is numbered after the seeded messages; the objective is rewritten when that
seed recorded any. `enterSession` (a start, or a new id taken up after a `/clear` or a
resume) runs it without waiting and writes the objective when it recorded any; `pressBrief` awaits it before its objective-null write. A record that holds a
message or note of the owner's is never seeded.

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` key `sessions` holds a `Rec` per session id (the objective, the
results of earlier jobs, the owner's numbered messages and the counter, the last briefing's
next step and message, the last `DRAFTS_MAX` (3) cards' messages in `rec.drafts`, flags already seen, other mods' notes, spend counters with the writer's own and its failed calls), capped
at `SESSIONS_MAX` newest. A record that still loads as the blank one a session starts with
(`isBlankRec`: no message, objective, draft or spend) is never kept, since a missing record
loads the same: `session.end` saves every session's record, so before 17 Oct 2026 each
scripted `claude -p` run left a blank one that took a place from the owner's sessions. A record `saveRec` lets go leaves its drafts (`recDrafts`: its
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
the owner's words, and whatever the owner typed after it is their own message, numbered after it. When
he typed words after it (`pushDraft`, on the live path and when a session is read in by `seedOnce`),
both parts keep the whole message as sent in their own `src.sent` copy and his part names the draft
in `withDraft`, so the writer reads all of it and `takeApprovals` can move a mark on the draft to his
words; a draft sent alone keeps nothing more and makes no writer call. A message of his read in by
`seedOnce` that is longer than `HIS_CUT` keeps its whole as `src.sent` as the live path does, so one
over the cap or too long to save counts as not read in full (`wordsUnread`). A
prompt beginning `Owner rep` and a colon (`noteTyped`) is a note to the rep: it is recorded as
a `note`, listed with `NOTE_MARK` (`(to the rep)`), the objective is rewritten and a look
starts at once, and the prompt is dropped so the agent never sees it. `noteSplit` also finds
the prefix typed after other text (`NOTE_PLACES`): at the start of a line, after a sentence's
end (a closing quote or bracket allowed) and a space, or in its capitalised form glued to a
letter, a digit or a sentence's end, never inside a sentence, and never in a slash command's
line (`e.command` set), whose arguments stay the command's. The text before it is then a
prompt to the agent, handled as any prompt (recorded as the owner's message, a draft split off) and
sent on without the note; the note is recorded after it, the objective is rewritten, a look
starts, and a toast says the agent got the rest. A prefix after text with nothing after it
notes nothing; the agent gets the text and a toast says nothing was noted. "Tell the rep" fills the
prompt box with the prefix. The rep never sends anything itself: "Put message in prompt" fills
the prompt box and the owner presses Enter.

The `AbovePrompt` band is a strip shared with other mods ("You should know" among them) and
this mod draws first. Rules the render enforces: whatever is beneath is kept under the row;
while another mod draws something (`drawsSomething`), the rep's own note waits and the row's
buttons lose their digits, so only one set of digit hotkeys is ever on screen; the briefing
takes the strip alone; on the terminal each line has its width in columns and the card fills the band's rows in order of importance (`fillCard`: the head's result and one row of the message with the buttons under it first, then the judgment one row each, most telling first (stands, then the revision line from `revisedLine`, so a long message never crowds out that the reading moved), then the count line (`countLine`), then the judgment whole as the rows allow, then the message with the rows that remain, then the extras while they fit; on a band too short for the message's box between the head and the buttons the box goes and Put message in prompt, drawn while the brief has a message, carries it whole; rows counted by `cardRows` as the band wraps them), and on a surface whose band is a scrolling box in a proportional font (`sizesInColumns` false: Claude Code for VS Code, whose extension counts columns by a wide glyph and draws widths in `ch`) no line is given a width, so each fills the box, and the card is drawn whole. Buttons use bare digits for hotkeys because from the prompt box only a
digit presses a band button. A keyboard chord for the Rep button once rode on an unrelated
engine action; it could not be proven and was removed on 14 Oct 2026. Do not bring it back
without a binding that is shown working.
