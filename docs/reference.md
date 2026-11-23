# Code reference

The rules of the code, named by the functions and constants that hold them. This is the
detailed companion to [How the owner rep works](how-it-works.md), written for whoever changes
the code, human or agent: read the part you are changing before you change it, and keep it
true when you do. Every name here is in [`hooks/rep.ts`](../hooks/rep.ts),
[`hooks/register.tsx`](../hooks/register.tsx) or [`types/index.d.ts`](../types/index.d.ts).

## Tests on GitHub

GitHub runs validate, `tests/ci/host-calls.sh`, `tests/ci/host-commands.mjs`, test and the
type check on Ubuntu, macOS and Windows with Claude Code 2.1.325, and validate, the two
host steps and the tests on Ubuntu with 2.1.286 (the first build with mods on by default), 2.1.310
(the last build whose band draws every mod in one chain) and the newest release, on every push and pull request that touches more than prose and pictures (the `merged`
job's `prose` step: when every changed path is a Markdown file, under `docs/`, `llms.txt`, the
licence, an issue form or a live capture, the tests and the doctor are skipped), and the doctor as sixteen Ubuntu
jobs at once, each planting every sixteenth defect (`doctor.py --shard K/16`), so the whole run
takes about three hours where eight jobs took four to six each and GitHub stops a job at six (`.github/workflows/tests.yml`). A new push to a pull request cancels that pull request's run still going (`concurrency`, grouped by the pull request's number); a push to main never cancels another, so each merge's run finishes. `host-calls.sh` fails the run when a
`$.process.run` or `$.process.spawn` in the hooks names its program other than through
`hostArgv` (the copy's argvs from `copyArgvs` and the `--version` probe excepted).
`node --experimental-strip-types tests/ci/host-commands.mjs` runs the transcript reads, the
check's questions and the copy's commands as the mod builds and wraps them (`hostArgv`, and
`wholeArgv` for the git questions alone; on Windows Git's coreutils, found as `lookUpHost`
finds them), against `tests/ci/fixtures/` and a scratch folder whose command folder holds a
link, and reads the answers with the mod's own parsers (`linkTargets` for the path links); on
Windows one of the check's questions that fails is printed as skipped, since the check does
not start there, and the copy's commands must still pass (`tests/ci/README.md`). The run's type check uses `tests/ci/types/`, a pinned copy of the
declarations for Claude Code 2.1.325, the build the declarations step and the type check
run on; move both together. The `merged` job runs first. On a push to main, when the push is
a merge whose second parent holds the same files and has a passing `pull_request` run of the
workflow, it sets `tested` and the tests and the doctor are skipped; otherwise they run in
full. The last job, `passed`, runs always and fails when the tests or the doctor failed or
were cancelled; main's ruleset requires it beside `version`, so, since every install reads
main (the marketplace entry's `source` is `./`), nothing merges there before its tests and
the doctor have passed or a prose-only change has rightly skipped them.
`tests/ci/declarations.sh` runs first there and fails the run when the installed build is
not the one stamped on the pinned copy's first line, so the two cannot drift apart unseen.

A second workflow, `.github/workflows/release.yml`, runs on every pull request and every push
to main, with no paths left out. Its rules are in `tests/ci/release.py`, and `CLAUDE.md`
under "Releases" says how to cut a version. On a pull request, `version` runs
`release.py check origin/<base> HEAD` against the pull request's merge with its base: when the
change touches any path the mod loads (every path but `tests/`, `docs/`, `.github/`,
`archive/`, the Markdown files, `llms.txt`, `LICENSE`, `.gitignore`, `.gitattributes` and
`tsconfig.json`), the manifest's `version` must be above the base's, three numbers, and
`CHANGELOG.md` must have a `## X.Y.Z (...)` section for it; a marketplace entry that names a
different version also fails it. On a push to main, `publish` runs `release.py publish`: it
reads main's first-parent line back to the first version below 0.8.0 (`FIRST_AUTOMATED`; the
versions before it were tagged and released by hand), skipping a commit whose manifest cannot
be read, and gives each version that lacks them, oldest first, the tags `vX.Y.Z` and
`owner-rep--vX.Y.Z` on the first commit carrying it (or the release at its existing tag) and
the GitHub release with that version's changelog section as its notes. Only the highest
version tagged is marked Latest, so a re-run of an old job cannot take Latest back, and a run
GitHub dropped from its queue, or one that failed partway, is made good by the next. Then,
when a loaded path changed since HEAD's version was first on main (its tag), the job fails,
since that change has no version of its own. Paths are compared with `--no-renames`, so a loaded file moved into `docs/` counts as
removed. `publish` alone has `contents: write`, and one runs at
a time. The ruleset on main requires `version` and the tests workflow's `passed` to pass, so a pull
request either fails cannot merge; the ruleset also keeps main from being deleted or overwritten.

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
   `turn.complete`, over the session's record (`readSession`, below). It is never
   awaited by the hook that starts it. Its answer is `state:`, `now:`, `flag:`, `why:`, `shown:`
   and `closed:`; it marks conditions and never writes the objective's result or conditions.
   `now:` is the step the agent is on as the record shows it (`WATCH_NOW_ASK`, `WATCH_NOW_LINE`);
   `parseWatch` keeps its first sentence, bold and code marks dropped, to `NOW_MAX` (200)
   characters, and reads "none", "nothing", "n/a", "unknown" or the template line as no step.
   `takeLook` writes a step it read over `objective.step`, the card's "Right now" line, until the
   next look or objective write; a look with no step leaves the last one (prompt group 5, G11 in
   the audit: the step the objective writer set went stale within the turn). A flag becomes a "Heads up"
   note only when the view is `row` and the flag was not already shown. The note draws above
   the row, which stays beneath it with its head, its status and both its buttons for the
   mouse (the note's buttons carry the digits); from 13 to 23 Oct 2026 it took the row's place,
   a choice made with the you-should-know shape that no one asked for. Typing past notes
   backs the watch off (`skipAfter`).
2. **Briefing**: `pressBrief()` on the Rep button, another record read, drawn as the card. The
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
   `next`, `message`, so a kept message, cut or whole, is never listed. An answer sound in
   every other way (verdict continue, no `well:`, no stop in `next:` or `message:`) whose
   message is empty or only white space is refused on the message alone while a condition is
   open: `replaced` is `['message']`, the message is `OPEN_MESSAGE`, the open conditions are
   listed as left out (`withOpen`), the meaning, next step and what stands stay the model's,
   and its `does:` line stays unless it is empty or `messageSaysStop` catches it, then
   `OPEN_DOES`, since that line describes the message. With every condition shown or closed
   an empty message stands, and with no objective written (`gateOpen` is null) it stands too,
   since nothing says what is open. `pressBrief` takes this refusal as any other: the second
   ask, whose `askAgain` names the empty message, then the own-words call, whose
   `ownWordsPrompt` names the empty message, then read 1's usable message, then
   `OPEN_MESSAGE`. `OPEN_MESSAGE` ends `…or say what stands in the way.` and holds no step for
   the owner. The watch, the briefing and its second ask are told once, in `REP_SYSTEM`'s "What
   reaches the owner" (`REP_REACHES`, from `DC_REACHES`), that the rep makes every call and the
   message carries it; that a call weighing on the owner gets one line under `left:` of what is
   at stake, the call and why; that any call resting on a fact only the owner knows names its
   assumption under `left:`; that the agent holds
   a step only where the owner's own words asked, a hold in a draft the owner sent unchanged
   being the rep's call made again; and that a guard's refusal stands, the message giving the
   agent no way around it. The message section names the rep's call on each weighty step
   exactly (`DC_MESSAGE`); `askAgain` points to "What reaches the owner" by name (`DC_ASK`). The
   own-words call takes the same section in `OWN_WORDS_SYSTEM`, and `ownWordsPrompt` points to
   it by name (`DC_OWN_Q`), which also has the new message carry each call `left:` gives as it
   stands, since `takeOwnWords` keeps the gated card's `left:` lines. The check reads the same section (`checkPrompt`). The held-step rule
   the check carried before 0.9.0 is history, `PRE_HELD_STEP_RULE`, kept for the replay.
   A Check card goes through the same gate and has no second ask or own-words call, so an
   instant read refused with the checker's message empty gets `OPEN_MESSAGE` when a condition
   is still open, an instant read that passed keeps its message when the checker leaves it
   empty and writes no "does:" either (a checker that says what its message does and writes
   none has said there is nothing to send, so the briefing's older draft is not put back), and
   with every condition shown or closed the message stays empty. A refused
   answer is asked once more (`askAgain`, naming the open conditions and the rule the first answer
   broke: `askFault` over the gate's rules, each said plainly with the sentence that broke it quoted,
   cut to 200 characters, since the second call never saw the first answer; G39), and that answer
   passes the same gate. When it is refused too, or does not answer, one plain
   `$.model.complete` (`OBJECTIVE_MODEL`, `OWN_WORDS_EFFORT` high, left there until the audit's
   replay R37 measures medium on it; `OWN_WORDS_SYSTEM` (prompt audit §6.5): `OWN_WORDS_OPENING`,
   true of this call, which is given what the rep knows and what it found rather than a record,
   then the same section strings `REP_SYSTEM` holds for what it writes, `REP_WHY`, `REP_SHOWN`,
   `REP_REACHES`, `REP_WRITE`, `REP_MESSAGE` and `REP_PRIVATE`, so each rule has one source; the
   sections on reading a record stay with the readers; `OWN_WORDS_MAX_TOKENS` 64,000, `MAX_REPLY_TOKENS`, the engine's ceiling, `OWN_WORDS_TIMEOUT_MS` two minutes) over
   `ownWordsPrompt(memory, open, answer, fault)` writes the replaced parts in the rep's own words.
   Its request is what the rep knows (`memoryText` without the session's size, which is for a
   reader of the record), then "What the rep found in the record" (what stands and what is left
   out), then "This request": the rule the briefing broke, `askFault` over the last read's
   answer and gate rules, as the second asking names it, "and it stayed refused when asked once
   more" (true whether the second asking was refused or did not answer), the open conditions,
   one sentence that while a condition is open nothing it writes tells the agent to stop, calls
   the work finished or gives the owner a chore, a pointer to "What reaches the owner" for a held
   step, and the four labelled parts with their length aims. Its reply is read by `parseOwnWords`,
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
   off the card. Since 17 Nov 2026 every reply cap is `MAX_REPLY_TOKENS` (64,000), and a reply whose
   output reached `NEAR_CAP_SHARE` of its cap is read as cut (`cutShort('own-words', …)`) even when it
   parses, so `lastBrief.own` is `cut` and every replaced part keeps the rep's text. Its spend counts with the looks, and it writes card parts only, never the
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
   `does:` line and read 1's `left:` lines (they carry the calls that message acts on, so the
   card never shows one read's calls beside another's message), provided read 1 kept its message (`'message'` not in `first.replaced`) and
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
   only as the object of the nearest reporting word before them and outside any earlier quote (said, says, wrote, writes,
   called, calls, claimed, reported, told, reads, shows, prints, printed, states; `REPORTING`),
   however many words lie between, asides in commas included, inside that word's own clause.
   The clause ends (`clauseEnds`) at a semicolon or a coordinating word (`CLAUSE_WORD`: and,
   but, then, so, yet, or, otherwise, else, anyway, regardless, in any case, either way,
   whatever happens) or at a word starting a new instruction (`NEW_INSTRUCTION`) right after
   the reporting word, a comma, a colon or a dash (em, en, or a hyphen with a space each side),
   behind any run of now, please, just and also, and a quote past that end is read (`You said
   it passed and "You can stop now."`). One aside is no instruction (`COMMA_ASIDE`): it opens
   with a comma right after the reporting word, closes with a comma right before the quote,
   and holds no other clause end and no obey word (`OBEY_WORD`), so `said, run by run, "…"`
   stays a report and `said it passed, run the suite, "…"` and `said, follow this, "…"` are
   read. A pair of dashes in those two places is read as that pair of commas (`said — run by
   run — "…"`). Three leads order what the
   quote says, so that quote is read: a "to" directly before it (`TO_QUOTE`: `says to: "…"`,
   `told the agent to: "…"`, never `said in its reply to the lead: "…"`), "as" up to three
   words before the reporting word (`AS_LEAD`: `do as the note says`), and an obey word in its
   present form (follow, obey, do, act on, go by) starting its clause (`OBEY_LEAD`: `Follow
   what it says:`, `Obey the note, which says:`; `you followed what the note says:` stays a
   report), with no limit on the note's name inside that clause (`NAMED`: a coordinating word
   ends it);
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
   4. A wait on the owner's word before an act the owner's own words of this job held
      (`heldActs`, below), and only that act: no act is the owner's by its name alone. The
      acts it can name are the outward acts only the owner does toward the
      outside world, from a closed list (`OUTWARD_ACT`): submit, publish, pay, buy,
      purchase; send with an email, message, application, letter or invoice as its object
      (`send it` is no such act); sign with an agreement, contract, form, lease, offer, NDA
      or paperwork as its object, bare or after the, a, an, this, that, our, my or your and
      up to two more words (`signing the employment contract`, `signing our contract`; so
      `signing the release commit form` counts too, while `signing the release tag` does
      not); apply for or to; post publicly, online, or on or to social
      media. Signing off, and signing, applying or posting anything else (`signing off on
      the tests`, `applying the migration`), are the agent's work, and the agent's operations (`AGENT_ACT`): merge, push, deploy,
      release, install, delete, tag, ship, commit, and open a or the pull request or PR; the two
      lists together are `HOLD_ACT`, each read by its stem (`stemOf`). Said as a wait for the
      owner's word, go-ahead, approval or sign-off on,
      before or to the act (`WAIT_BEFORE_ACT`: `Wait for my go-ahead before you send the
      email.`), or on a button only the owner presses toward the outside world, named after
      "on", in any case (`OWNER_BUTTON`: Submit, Send, Publish, Post, Pay, Sign, Apply,
      Approve, Purchase, Merge, Push, Deploy, Release, Install, Delete, Tag, Ship, Commit;
      `wait for my word on Submit`; any other word is no button, so `Wait for my word on
      Build.` and `Wait for my word on Merging.` are caught), or as
      the act said not to happen (`NEGATED_ACT`: not, never or n't before it, or `HELD_ACT`,
      and the rest of its clause). `HELD_ACT` reads hold, hold off on or hold back on, an
      optional the, this or that, then an outward act (bare send or sending also counts).
      A named hold such as `Hold the publish step` or `Hold sending` counts only
      with the directly following wait described here; `Hold everything`, `Hold the rest`,
      `Hold off` and `Hold on` do not exempt a wait. The negated or held act is followed
      by a wait on the owner as the clause directly after it, a semicolon, a
      comma, "and" or a sentence's end between and nothing else (`WAIT_AFTER_NEGATED` in one
      sentence; `NEGATED_LAST` on the sentence before and `WAIT_FIRST` opening this one), that
      has no object of its own, or whose only object refers back to the act (on that, on it,
      on this, for that) (`WAIT_ON_HIM_BARE`, ending its clause); its wait words are masked
      (`Do not publish it; wait for my word.`, `Do not publish it; wait for my word on
      that.`, `Do not publish it. Wait for my word.`). A wait before something else is read
      (`Do not publish the report; wait for my approval before running the tests.` is
      caught), and so is a wait after other work (`Do not publish the report; run the suite
      and wait for my approval.`, or a sentence between). Every one of these is masked only
      when the act it names, by its stem, is one the owner held: the wait after `Do not merge.`
      stands for a held merge and not for a held publish. With nothing held, `Wait for my
      go-ahead before publishing.` and `Wait for my go-ahead before merging.` are both caught.

      `heldActs(owner, rep)` gives the acts held. It reads the owner's own messages and notes of
      this job (`jobMsgs`: kind his or note, never a draft or an agent's plan), with quoted text
      ("…", “…” and lines opening with `>`) taken out (`unquoted`), sentence by sentence, and
      skips a sentence found, folded to lower case and one space, inside one of the rep's
      recent messages (`rep`: the record's drafts and the last card's message), so the rep's
      own hold, sent back inside an edited draft, holds nothing. A sentence that asks for the
      owner first (`OWNER_LETS_GO`: until or before I, without or before my OK, approval,
      go-ahead, word, sign-off, review or look, ask me, check with me, wait for me, wait for my
      word, I want to review, let me see, my OK) holds each act it names (`OWNER_ACT`, any
      tense). It is read clause by clause (split at a semicolon, comma or colon, and at "but",
      "and then" or "then"): a clause that opens with the act as an order (`ORDERS_ACT`:
      `merge it`, `I have read it; push it`, `go ahead and deploy`) and asks for no one first
      lets that act go, as does a sentence that says not to wait or ask (`NO_WAIT`: `Don't wait
      for my approval before deploying.`); a later message wins. So `Merge now, but ask me
      before deploying.` holds deploying alone, and a mere mention (`Deploying is slow.`)
      changes nothing. A call saved before 0.9.1 has no `held` and replays with the acts the
      gate exempted then (`OLD_HELD`, read through `savedHeld`); `callRead` records the acts
      held beside the gate's rules.
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
   its line; a line left empty, or holding only the marker it began with, is dropped, and a
   number that was the line's own text, never its marker, stays; a blank line beside a
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
   It reads `$.session.messages()` and, when there are rows, makes one `$.model.complete`
   (`OBJECTIVE_MODEL`, `WATCH_EFFORT` for a look and `BRIEF_EFFORT` for the briefing and its second ask, both high until a replay shows a lower level loses nothing, `REP_SYSTEM`, `RECORD_MAX_TOKENS` 64,000, the engine's ceiling,
   `RECORD_TIMEOUT_MS` four minutes) over `recordPrompt`, never a fork. Its system prompt is
   `repSystem(fence)`, one text for all three, `repSections` joined, sent as one block marked for
   the cache (G3): `REP_OPENING` (who the owner is; one task, no tools, one answer), "Why you
   exist" (`REP_STAKE`), "The record" (`repRecord`: `repFence`, then `REP_UNSEEN`:
   `STANDING_LINE` and `NOT_ASSESSED_RULE`), "What you measure against" (`REP_MEASURE_BODY`, the
   owner's messages as evidence weighed in order, and `REP_SIX`, the six expectations, a
   self-proving step of an approved plan given the rep's call to keep or drop it, and why), "The conditions and
   their states" (`REP_STATES`: the four states, each defined once), "What counts as shown" (`REP_SHOWN_BODY`, the one standard every read, the check and the own-words call name: a fact by its command and what it printed, the result working or being good by a hands-on look at the real thing by someone who did not build it; a test, check, review or script passing shows only that it passed; what the agent says it did is a claim until the record shows it), "The
   objective stays open until it is completed" (`REP_OPEN`: until every condition is shown or closed nothing the reader writes calls the job finished or says the agent should stop), "What reaches the owner" (`REP_REACHES`: work left "for you" is the agent's to finish; the rep makes every call and the message carries it; a call weighs on the owner when it touches their livelihood or public name, cannot be undone or goes against their ask, and the briefing's `left:` gives it one line under 30 words of stake, call, reason and any assumption only the owner can check, never folded; a hold stands only where the owner's own words asked for it; a guard's refusal is never worked around), "How you make up your mind" (`REP_MIND`: a claim is shown false only where the record shows the opposite, and one shown neither way is "not shown", and nothing the reader writes calls it untrue or inaccurate (#59); a session is long only past `LONG_SESSION_PERCENT`, and below it the reader neither calls it long nor tells the owner to start fresh; the look-for list holds the North Star's eight things to look for in its words ("the owner" for "he", the third followed by "whatever routine asks for them"), with checks skipped and work put off, shrunk or quietly dropped; with `REP_HOLD`, G30: a finding and the lines already shown stand until the record shows something new, a change names what is new, and an agent's disagreement is not new evidence; the check's standing rules say the same), "How you write to the owner" (`REP_WRITE`: a term reaches the owner only if the owner used it, said as what to write with no list made first, G38; after reading, the owner knows what is going on and what to do next without reading anything technical or taking the agent's word for it),
   "How you write the message to the agent" (`REP_MESSAGE_BODY`, G28: the message is a prompt the
   owner sends as their own turn, so one line per thing asked with what done means for it, a
   fact's command and what it printed (a check proves only a fact) or, for working, a hands-on look at
   what the customer gets by someone who did not build it, the agent's own checks standing in for nothing, the rep's call on each weighty step named exactly,
   the routine steps the agent may take alone, and last the finish line `MESSAGE_FINISH` in place
   of "keep going"; it is the one place exact technical terms may stand, where the agent needs
   them; the own-words call and the check read the same section; the briefing's, the own-words
   call's and the check's answer forms ask for lengths in words, targets the gate does not
   enforce (G40): `SHORT_PART` for "stands", "means" and "next" (one or two sentences, about 20 words, under 40), `LEFT_ITEMS`
   for "left" (each item one sentence of about 8 words and under 20, at most six, the rest folded
   into "- and N smaller gaps"; a call that weighs on the owner is one line under 30 words, never folded), and `MESSAGE_FORM` for the message (each line one sentence of
   about 12 words, under 150 words in all unless more than five things are asked; the message
   section itself states no length, so the limit is said once, where the message is asked for).
   The aims sit below the limits so a reply written to the aim lands under them; the limits are
   the rule and nothing cuts a reply short to meet them), and
   "Private data" (secrets, keys, passwords and personal data stay out of what it writes). These
   rules were rewritten by the prompt audit's §6.1 to §6.4: each said once, plainly, with its
   reason, with no capitals for emphasis and no stacks of "never"; `PRE_RW_REP_SYSTEM` keeps the
   text as the build before it sent it (after #49 and #64), for the replay. Each section appears once in each call, and
   the rules the own-words call and the check share are the same strings (a unit test holds
   both). Each reader call is at or under its §6.9 target in words, "never", negatives and
   capitals (watch 3,500/5/84/0, briefing 3,360/6/77/0, second asking 160/0/1/0, the whole call
   with no plan held), held by a unit test on a fixed memory. The own-words call's system prompt
   and its request's fixed text are held apart: the system at 1,132/0/20/0, over §6.9's 1,024 and
   18 because the shared sections it takes grew after the audit (#68), and the request, from what
   the rep found to its last part with each quoted text a placeholder and without the end line,
   at 298/0/2/0, 72 words over §6.9's 226 for the rules the review of #74 put back (the message
   asks for work and proof on every open condition; a question goes to the owner only for a
   decision yet to make, what the owner settled stays settled, and a look is by someone other
   than the agent and the owner). The targets leave out the plan walk:
   with a plan held, the same test lets each call add only the walk's own text, its ceiling the
   no-plan target plus the counts of the plan as quoted, the line standing in for the owner's
   approving reply, `STEP_STATES`, `DECIDE_DROPPED` and the call's own walk text (`WALK_WATCH`
   and the `steps:` line for the watch; `WALK_BRIEF`, `UNASSESSED_PART` and `UNASSESSED_NONE`
   for the briefing). The same test holds what a held plan adds, measured against the same call
   with no plan, to those walk counts alone, so the room left under a target is never spent on
   the walk. The system prompt's one "never" is the North Star's "the product never
   opened and used".

   The record and the owner's messages are fenced by tags ending in the session's fence
   (`newFence`: eight random lowercase letters and digits, made once and kept in the session's
   record as `fence`, so every read of the session sends the same system prompt and the cache
   holds): `<session_record_<fence>>` and `<owner_messages_<fence>>`. `fenceTags` prints a tag
   of either fence found in quoted text, with or without a suffix, in any case, spaces or
   attributes allowed inside the brackets (attributes kept as written), self-closing or not (the
   closing slash kept), with its brackets turned
   to `‹ ›` and its name lower-cased, so text in the session cannot close either fence by
   guessing its tag (G23). `memoryText` applies it to every quoted text of what the rep knows
   (the objective, the approved plans, the owner's messages, the last briefing's message and the
   owner's sent message), and the replay's `rwMemory` does the same; `watchRequest` applies it to
   the lines already shown and the other watcher's notes, and `askAgainText` to the open
   conditions and the fault it quotes, and `ownWordsPrompt` to the open conditions, what stands,
   the items left out and the fault it quotes, so every text placed inside a fenced prompt is escaped; the owner's messages are fenced so an agent's text cannot pass as theirs. A reader given no fence (`REP_SYSTEM`) has the tags
   unsuffixed. Its words keep three apart: "the
   record" is what the reader is shown, "the session" what happened, "the owner's messages" the
   owner's words. The task after the record holds only what changes per call: `memoryText` (what
   the rep knows: the objective, the open conditions, the session's size (not in the own-words call's), the approved plans
   while one is held, the owner's messages in their fence, the jobs before, the last briefing and
   the last message sent), the request (`watchRequest(plan, reason, seen, others)`,
   `briefRequest(plan)`), which opens "Based on the record above", and `decidingText(plan,
   brief)`, the rules that decide that answer restated in a line each (`DECIDE_SHOWN`,
   `DECIDE_DROPPED` while a plan is held, `DECIDE_VERDICT` for the briefing, `DECIDE_ASKED`,
   `DECIDE_PLAIN`), since a long record sits between them and the system prompt; each restates
   a rule `REP_SYSTEM` holds and adds none. It carries no frame of its own and no line on how
   long to think, since the effort
   setting governs that. The prompt is the rows printed by `recordText`
   as entries labelled `entry N`, never `#N` (the owner's rows as the person only where their key is
   one of the owner's messages that `heldItems` read from the transcript, `NOT_TYPED` applied after
   as a second filter, and with no transcript read, `NOT_TYPED` alone; every other row on
   the owner's side as the session's),
   each tool use on one line with its result, a row of tool
   results shown only for results not already printed), each message cut to
   `RECORD_ENTRY_CUT` (3,000) and each tool input or result to `RECORD_TOOL_CUT` (600),
   head and tail kept around a marked gap, the oldest entries left out past `RECORD_BUDGET`
   (200,000 characters) with a line saying how many, fenced in the session's `<session_record_<fence>>` with any
   fence tag inside printed with `‹ ›` (`fenceTags`), then the task. `headTail` marks every cut inside its
   field (`[… n characters of this <field> left out here …]`). A compaction summary is cut at
   `RECORD_SUMMARY_CUT` (40,000). `recordPrompt` sends the record as blocks of about
   `RECORD_CHUNK` (50,000) characters and marks the last complete one for the cache, so a later
   look reads the part it shares with an earlier one from the cache. A build that takes only a
   text prompt (2.1.286, whose host check refuses blocks before any model is called, matched by
   `BLOCKS_REFUSED`) is sent the same text joined (`joinBlocks`), without the cache mark. Its
   result has a fork's shape (`ModelForkResult`), so its spend is counted the same; any other
   throw, or a throw from the joined retry, reads as an API error.
   With no rows no model is called, the result is `NOTHING_READ` (`nothing-to-fork`), and the
   toast says there is nothing to read. `SESSION_ROWS_CAP` (4,096) is the most rows
   `$.session.messages()` returns, so a list that long may not reach the session's start.

   **A reply that stopped before its end (G16, G20).** The engine reports no stop reason, so a
   reply cut off at its cap, or ended early for any other cause, arrives answered. Each reader
   therefore takes a reply only when it reached the last label its kind asks for (`endsWhole`):
   the watch's `closed:`, the check's `looked:`, the objective's `approved:` after `holds` and
   `dropped:` after `moved`, a briefing's and its second ask's `does:`, and the own-words call's
   whole reply (`parseOwnWords`). A reply cut inside its last value still has that label (the
   live test of 18 Nov 2026 drew a briefing whose `does:` stopped at "Requests an indep", 100
   output tokens into a cap of 64,000), so every reply must also end with `END_LINE` ("end of
   reply") as its last line (`endsWithEndLine`, which allows capitals, a closing full stop and
   bold or code marks). Each prompt asks for it in one line, `END_ASK`, put last by `endAsked`:
   `watchPrompt`, `briefPrompt`, `objectivePrompt`, `checkPrompt` and `ownWordsPrompt` return
   through it, and the briefing asked once more is `endAsked` over the briefing and `askAgain`,
   so the ask stays its last line and appears once. `parts` skips the end line, so it joins no
   value. An objective answer naming neither `holds` nor `moved` stays unreadable, not cut,
   with or without the line. `cutShort(kind, text, usage, cap)` is a reply not whole or one
   whose output reached `NEAR_CAP_SHARE` (98%) of its cap (`nearCap`), which is read as cut even
   when its last label is there. `noLabels` is a reply with none of the parts asked for; it is
   read as before (it shows nothing) and never asked again, since it is not a long answer that
   ran out of room. `readAgain` (a reply with labels that is cut short) is what asks again: a
   look reads the session once more, at most two reads, and a look cut both times takes nothing
   (no marks, no Heads up); a briefing, or its second ask, is asked once more, and one cut both
   times puts up no card and toasts that the briefing stopped before its end twice. An objective
   write that is cut short fails that attempt and uses the write's own retries
   (`OBJECTIVE_RETRIES`), its cause recorded by `writeFailure` as `cut-short (N output tokens): …`
   or `no-labels: …`, which `failureWords` puts in plain words. A check is read by `checkReadOf`:
   its result when whole, else the last whole answer the checker wrote on the way (a Stop hook
   can ask for one more turn after it, and an engine error, such as an expired login, can end
   that turn, replacing the result), and when the run ended in an engine error after that answer
   the card also shows `checkFailedAfterNote`, the engine's own words beside the answer read (fourth
   live test of 18 Nov 2026, section 2); with none, a run that ended in an engine error takes
   nothing and the card shows `checkFailedNote`, the engine's own words and no ask to press
   again (in both notes the engine's words are kept to 160 terminal cells by `fitMiddle`, whole
   when they fit, else their start and their end with the middle left out, so a reason of wide
   characters keeps the name it ends on: eighth live test of 18 Nov 2026), and any other run
   takes nothing (no marks, no verdict, no draft) and the card shows
   `CHECK_CUT_NOTE`, asking the owner to press it again, since a check costs real money and is
   never re-run on its own (live test of 18 Nov 2026, section 1). Every reply
   cap is `MAX_REPLY_TOKENS`, 64,000, the engine's ceiling, so the time limit, not the cap, ends a
   long answer.

   `boundaryRow` places the job's earliest open approval in the rows, which carry no number,
   time or turn: the job's stored messages, from that approval to the newest, are matched to the
   rows by their words, read back whole first, each aligned to its earliest feasible row and then
   its latest. It is placed only when both agree (`established`); `opens-after` says the record
   starts after it, `unknown` that it could not be placed. A plan-screen approval matches the tool
   result carrying its `toolUseId`, a note alone the end of the turn it answered. Rows from it on
   are read whole up to the budget (`recordText`'s `from`); `boundaryCover` turns the other
   outcomes into `ReaderGaps` and a line each reader is told. `STANDING_LINE` tells every reader
   the agent's standing instructions are not in what it reads, and `NOT_ASSESSED_RULE` what it may
   say of a step whose proof it cannot see.

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

   While a plan is held (`planHeld`), both readers are given `STEP_STATES`, which asks for a walk
   line for each thing a step names, in the plan's words, so a part done cannot hide a part left
   out, and one state for each line, each state defined once (done meaning the record shows all
   of it done): done, claimed, underway, not reached, no
   sign while later work goes on, looks dropped, done before the summary, runs alongside, not
   assessed. A step, or a part of one, with no sign while later work goes on, or one that looks
   dropped, is the owner's ask dropped and comes before any flag but one about harm happening now. The Heads up
   writes the walk under `steps:` (`STEP_LINE`) before `state:`; `parseWatch` reads that block as
   if it were not there, save that its lines ending `| not assessed` become `notAssessed`,
   and `walkDropped` turns its `no sign` and `looks dropped` lines into `dropped`. A line marked looks dropped is never `notAssessed`: the reader saw the
   agent leave it out, so the row never says its proof could be in a part of the record cut short.
   The briefing works the states out without writing the walk, putting each dropped step first
   under "left:" with the plan's number and each step not assessed under "unassessed:". A step
   looks dropped where the agent says it left it out or did less of it, whatever its reason. It is
   also the one exception to staying quiet about a step otherwise not assessed: where the
   agent's own whole list of what it is doing for the plan, or of what is done and what remains,
   stands whole in the record with no part of it left out and leaves the step out, the step looks
   dropped, said as looking dropped and never as skipped or done. A list from before the
   approval, a list of one part, a list called partial or a list that says the step comes later
   does not count. The Heads up alone is told (`WALK_WATCH`) that a flag about such a step names
   what shows it, the agent's own words or the list it is missing from, and asks the agent to do
   it or show it; `headsUpOf`'s why says the same.

   `headsUpOf`, called by the look after the reader answers, decides what the owner sees and
   returns the parts its line names (`drops`); `headsUp` is its note alone. A step
   walked `no sign` or `looks dropped` takes the line, `Plan step looks dropped: <part>.` or
   `N plan steps look dropped: <part>; <part>.`, each part cut at `DROPPED_STEP_MAX` (160), at most
   `1 + DROPPED_ALSO_MAX` (4) by name and then `; and N more` (`partsSaid`), whatever the reader's
   flag was about. The same text of two plans is named once (`textsOf`). The parts are in the line
   because `fitNote` keeps the line before the why on a short band; several lead with their count,
   which a one-row band keeps, and take turns in first place: `standingDrops` gives them an order
   that holds from look to look (the carried parts first, each in its place, a part dropped again
   keeping its place, then the new ones), `headsUpOf`'s `turn` turns it, and the turn (`lookTurns`)
   moves only when a note naming several parts reaches the screen, drawn by the look or by
   `showHeld` (`manyParts`), never at a note held and replaced unseen. So on a band that cuts the
   line each part reaches the owner in turn. Its why for `no sign` says only
   what the rep can know, that the record shows later work and does not show the step done, never
   that the record holds nothing of it. The flag and its why move into the why after `Also:`, so no
   concern is lost. This outranks even a flag about harm, whose words stay in the why. A step
   walked `not assessed` has no say. A flag never stands for a dropped part, even one whose words it
   holds: whether a clause calls a part dropped or done cannot be read from its words ("skipped, and
   the agent did run the install check"), so the part is always in the line and the flag always in
   the why. A part the flag speaks of is then said twice, which is noise; one said nowhere would be
   the harm.

   `walkLine` reads `- #n: <part> | <mark>` and the forms readers also write (`#6 step 2,`, `#6.1:`,
   `#6a:`, `#6 part 2:`, `#6 verification:`, `#6 (step 1):`, `#6 - `, `**#6**:`, `1. #6:`). A line
   with no plan number is read with 0 for it and can still be a dropped part, matched to the plans
   by its words; it is never counted as a step not assessed.

   A part the walk shows as looking dropped is said at every look where it looks dropped. Nothing
   said at an earlier look hides it: no part, line or flag shown before is matched against it,
   since every such matching (a likeness of parts, the plan's words, a flag's words) was found to
   hide a sibling part the owner never saw, and a silent drop is the harm the rep exists to prevent
   while a repeat is noise. On c440a6ae's looks 41 to 48 (two runs, each replayed twice, with Fine
   pressed between looks) the dropped Monitor part was said at every look the walk marked it
   dropped: 8 of 8, 6 of 6, 8 of 8 and 7 of 7. A note found while the briefing card is open, or
   while the session is not the one on screen, is held in `heldNotes` and shown when the band returns to the row
   (`showHeld`, called by `toRow` and when the session is entered); a note found while another note
   is on screen replaces it. The parts a held note says, and while the view is the note the parts of
   the note this mod drew (`shownParts`), are carried into the next look's note (`standingDrops`):
   a look shown another plan, or answering with a plain flag, says them still. A carried part goes
   only when a walk line takes it back (`samePart`): the same plan number, above 0, and the same set
   of content words, marked anything but dropped or `not assessed` (the answer's `cleared`). A
   sibling, a shorter part, a line with no plan number or one of another plan never takes it back,
   since a part taken back wrongly is a silent drop and one kept wrongly only a repeat. A held note
   whose every part is taken back goes, and so does this mod's note on screen: when a look's walk
   takes back every part it said and the look draws nothing of its own, the band returns to the row
   (`toRow`, which then draws a held note). The parts of the note on screen are carried only for the
   session on screen. `look` first waits for an objective write in flight for the
   session (`writeTaken`): until a pass shown the owner's newest message number saved when the look
   began has ended, however it ended, or the writer has stopped, and never longer than
   `LOOK_WAIT_MS` (60 s). A message saved after the look began is not waited for. A record from an earlier build that holds `saidDrops` loads, the field ignored. The
   register's check that a line was not shown before (`same`) applies only to a note with no
   dropped parts: a plain flag already shown is not shown again, while the same step of two plans,
   or a step still dropped, gives the same line and each is said.

   A part counts only where the plans shown to this look hold at least `PLAN_WORDS_SHARE` (0.4)
   of its stemmed content words, short or long; a real step reworded by one word ("Run the
   installer check" for "Run the install check") must count, and a short part no plan asked for
   that shares two common words with one passes too, a bad flag accepted so no real step is lost. A
   part no shown plan holds is never called part of one; words rather than exact text because readers reword steps. The walk's
   number is not checked against the step, because readers write a step's own number there as
   often as the plan's message. `walkLine` reads every form readers write, `#6:`, `#6 step 2,`,
   `#6.1:`, `#6a:` and `#6 part 2:`, keeping the plan's number, the mark being what follows the
   last `|`. `NOT_ASSESSED_RULE` and the lines of `boundaryCover` still hold, and the
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
   spawns a headless `claude -p` in it, marked `OWNER_REP_CHECK=1` in its environment (the rep
   loads in that session too, and every hook passes it by once `isOwnCheck` knows it, by that
   mark or by its folder under `checkCopiesDir`: no record, no call, nothing drawn; G19), and
   with `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` (`CHECK_ISOLATE_ENV`), `--setting-sources user`,
   `--disable-slash-commands` and `--strict-mcp-config --mcp-config` from `checkMcpConfig` (G18),
   on `CHECK_MODEL` (`opus`) at `CHECK_EFFORT` (`high`) whatever the owner's default (G17), with
   `CHECK_SYSTEM` as `--append-system-prompt` (G27): the checker's role (`CHECK_ROLE`), the
   readers' six sections on conditions, proof, the open objective, what reaches the owner, how
   to write to the owner and how to write the message (`REP_CONDITIONS`, `REP_SHOWN`,
   `REP_OPEN`, `REP_REACHES`, `REP_WRITE`, `REP_MESSAGE`), each once, its standing rules
   (`CHECK_STANDING`) and last the ways it must not stop (`CHECK_STOPS`, G24), the same text on
   every check, so `checkPrompt` (audit §6.8) carries only this check's facts and restates none
   of those: the session and when it began (`sessionStart` in `register.tsx` finds the
   session's transcript, by `transcripts` or a `find` under the config folder's `projects`,
   and reads its first time with `sessionStartArgv`, a `grep -m 1`; `sessionStartOf` takes it
   only in the form `YYYY-MM-DDTHH:MM:SS[.fff]Z`, else none), the room (`CHECK_ROOM_COPY`, or
   `CHECK_ROOM_NO_COPY` where the run is in the agent's folder: one rule for writing, only in
   the copy, or nowhere without one; G45) and the fence's denials as a list, a clock from
   `startedAt` (`clockOf`: when it began, when its time runs out, and to start its answer
   `CHECK_WRITE_BY_MS` before that, running `date` before a long command; G25), the
   objective, the owner's messages and the briefing (headed as written from the record
   alone), each quoted inside the session's fence (`<owner_messages_…>`, `<briefing_…>`,
   from `CheckArgs.fence`, the record's `fence`) with any tag of either inside escaped
   (`checkTags`: `fenceTags`, and the same for `briefing`), the steps, starting with the
   agent's changes (`git status`, `git diff`, `git log --since` the session's start, or the
   record's first entry when none was found; G26), and the answer's form with the forms of a
   look the check writes (`CHECK_LOOKS`, which `looksOf` reads; G44):
   the run loads the owner's user-level settings, the owner's guard hooks among them, the `--settings`
   fence, and the owner's own agentsview entry from Claude Code's `.claude.json` (`checkMcp`
   reads `<CLAUDE_CONFIG_DIR>/.claude.json`, else `~/.claude.json`, and takes that one entry, or
   none; a file past the engine's 4 MiB read limit cannot be read and gives none, and the
   checker then reads the record through the `agentsview` command, as the brief tells it to), and no CLAUDE.md, skill, slash command, project or local setting or other MCP server
   (hook text the owner's user-level hooks add still reaches it, and `CHECK_STANDING` says this
   task wins over it);
   nor the owner's plugins: `checkPlugins` reads `<CLAUDE_CONFIG_DIR>/settings.json`, else
   `~/.claude/settings.json`, and `checkPluginsOff` names every key of its `enabledPlugins`, each
   `false`, which `checkSettings` writes into the `--settings` file as `enabledPlugins`, read
   above the user level (none when the file cannot be read or lists none; the engine's built-in
   plugins stay);
   the brief says the agent's instruction files are in its folder, to read when a claim turns on
   them. Nothing is removed from the copy, since where no copy is made the run is in the agent's
   own folder. With `--permission-mode default`, `CHECK_ALLOWED_TOOLS`
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
   installs the links in the command folders lead to could not be found (`CHECK_NO_LINKS`); where it does not
   answer a git question whole (a throw, a timeout, an answer cut at the output cap or
   without its end mark, or a name holding a line break), `gitRepos` marks its answer not
   whole (`whole: false`) and keeps what the other questions found, and the brief says not
   every repository, nor every place a link in the copy leads to, could be found, and to
   stage, commit and stash nothing (`CHECK_NO_REPOS`); `CheckArgs.unanswered`), the brief naming the
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
   there fails (measured 17 Oct 2026, pnpm 10). Where `claude` or `pnpm` is a mise shim, the
   shim is mise itself: before the program runs, so outside the fence, it reads the mise
   config of the folder it starts in and of every folder above it, and any env file
   `MISE_ENV_FILE` names there. A `mise.toml` in the copy is untrusted, so the shim exited
   with "mise ERROR … not trusted" and the check said it could not run (exit 1); trusted, its
   `[env]` and hooks would run the project's code unfenced; and the env file loads even from
   a folder `MISE_IGNORED_CONFIG_PATHS` names, so a `NODE_OPTIONS=--require=…` the agent wrote
   in the copy's `.env` runs when node starts (measured 14 Nov 2026, mise 2026.10.19). So the
   check runs no shim at all (`launchFor`, `launchOf`). mise is asked `mise bin-paths` from the
   home with `MISE_ENV_FILE` empty (`MISE_BIN_PATHS_ARGV`, `MISE_ASK_ENV`, `MISE_ASK_TIMEOUT_MS`
   5 s), which names the folders of the owner's own tools from the owner's own config. It is
   asked once per Claude Code process (`miseBins`, held in `miseHeld`): at the session's start,
   waited for before the session goes on, so before its agent has run anything, and only when a
   person is at the prompt (`isInteractive`; a `-p` run, as the check's own is, asks nothing);
   every later check in the process takes that answer. A process whose start did not ask (a
   `/reload-plugins`, which also fires a start and so asks again then) asks at its first check.
   Then one `find` over those folders and the command path's (`programsArgv`, read by
   `programsOf`, 30 s) for `claude`, `pnpm` and every link to `mise`; a link to `mise` under
   another name is a shim (`isShim`), whatever tool it stands for. Where any shims folder is on
   the command path, whichever tools it holds (a `node` shim alone is enough: pnpm's
   `#!/usr/bin/env node` would run it), the run and the pnpm question get a `PATH` of every
   folder mise named, at the front, then the owner's path with every shims folder taken off
   (`checkEnv`, `pnpmAskEnv`). `claude` and `pnpm` start by their full paths (`withProgram`),
   each the first on the owner's own path that is no shim, the first shims folder read as
   mise's folders in its place, so an owner whose native claude comes before the shims gets
   that claude, and one whose claude comes through mise's node gets the claude the shim
   started. No mise runs on the copy's files or the folders above it. A pnpm found only as a
   shim is not asked, and the run gets no store. The fence and the links question take the
   owner's path and the check's both (`guardedPath`). The run's own commands use that path, so a
   tool the project pins through mise alone runs inside the check at the owner's version, or is
   not found. Where there is no shim, nothing changes: both start by name with no `PATH` given.
   Where mise cannot answer, or the `find` fails or is cut, both start by name, through any
   shim, with `MISE_ENV_FILE` empty and `MISE_IGNORED_CONFIG_PATHS` naming the folder they
   start in (the copy, or the agent's folder where no copy is made) and each folder above it,
   after the owner's own value, joined by `:` (`miseIgnoring`; mise splits the list as it
   splits `PATH` and reads no comma, and on Windows would split by `;`, but the check does not
   start there, `CHECK_NO_ROOM`). The home and the folders holding it are never named:
   ignoring the home drops the owner's `~/.config/mise/config.toml`, and the shim then fails
   with "not currently active" (measured).
   **The one limit: a session whose working folder is the home.** mise's answer comes from the
   home's own mise config, and in the fallback the shim reads it too. Where the agent works in
   the home itself, that config is the agent's to change, and nothing the rep starts can be
   fenced from an agent that shares its home: asking mise at the start keeps the answer from
   anything the agent writes later in the session, not from what an earlier session's agent
   left there, nor from a `/reload-plugins` after the agent has run. In every other session the
   agent's folder, the copy and the folders above them are never read by mise.
   **Who owns a copy, and when one is removed.** Before each copy, `makeCopy` writes its owner
   file, `<copy>.owner` beside it (`ownerFile`, `ownerWriteArgv`, 10 s): the pid of the Claude
   Code process and its start time from `ps -o lstart=`, read by a shell the mod starts, whose
   `$PPID` is that process (measured 14 Nov 2026, Claude Code 2.1.325), with `TZ=UTC` and
   `LC_ALL=C` (`PS_ENV`) so every reading of the time is the same text. A copy is removed only by
   renaming it first, with its owner file, to `.gone-<unique>` inside the copies folder
   (`retire`, `retireArgv`, `goneDir`, waited on, 30 s), then removing the renamed folder, not
   waited on: a session that makes a new copy at the old path is never hit. That is how a check
   clears what an earlier check left at its path before the copy (removed in place only if the
   rename fails), how a clone that failed part-way is cleared, and how the check's own copy is
   removed when the run ends, unless a newer press has replaced the run. The sweep
   (`sweepCopies`) runs when a session starts with a person at the prompt, not waited on, and
   before each copy: it lists every owner file named for a session (an id, or `session`) with
   its first line, and the `.gone-` folders more than a minute old (`copiesListArgv`, read by
   `copiesOf`, 30 s), removes those leftovers (by age alone, which is safe because nothing is
   ever made or run at a `.gone-` path: each is a unique name a removal gave a copy already
   taken, and the minute lets that removal finish first), and asks `ps` about the owners' pids and the
   asking process together (`aliveArgv`, `PS_ENV`, 10 s). `deadOwned` takes a copy whose owner
   is gone, or whose pid now names a process with another start time; it never takes this
   process's own copy, and takes none when ps did not see the asking process (a sandbox, a
   hidden process table) or did not answer. Each is renamed only when its owner file still
   holds the line the sweep read (`retireArgv` ends 3 otherwise), so a copy a session made
   there since is kept. No copy is ever taken for its age. A copy with no owner file it can read
   (one left by a build before 0.7.6) is kept. The questions come before the run's clock
   starts, so the check's measured time is the run's own. Fifteen-minute timeout
   (`CHECK_TIMEOUT_MS`), 120 turns, stream-json output with `--verbose`, so `resultOf` has each
   text the model wrote besides the result line, with the result's `is_error` kept as `error`
   and the engine's own "<synthetic>" answers left out; `permission_denials` in the result is the
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
`1 + OBJECTIVE_RETRIES` attempts (the retries at `OBJECTIVE_RETRY_EFFORTS` by `objectiveEffort`, `xhigh` then `max`, with their own cap and
time; none after a throw or an `aborted`; a `holds` with nothing held fails the attempt as
`holds-with-none`), and only a write whose every attempt failed is counted. A write that throws or comes
back unanswered, or answers with nothing `parseObjective` can read, leaves the objective as it was and adds one to `rec.objectiveFailed`,
which the card's price line (`spentText`) names only when above zero. The writer is a plain
`$.model.complete` call (`OBJECTIVE_MODEL`, high effort, `OBJECTIVE_MAX_TOKENS` and
`OBJECTIVE_TIMEOUT_MS`; the cap, and the retries' `OBJECTIVE_RETRY_MAX_TOKENS`, is `MAX_REPLY_TOKENS`, 64,000, the engine's ceiling, since 17 Nov 2026), never a fork of the conversation,
sent with its fixed rules, `objectiveSystem(fence)` in the session's fence (`rec.fence`, which the writer makes with `newFence` when it is the session's first call), as one block marked for the cache on every attempt, so a session's later writes read the rules at the cached price. The prompt goes with it as one block, because 2.1.286 checks only the prompt's shape and drops a block system beside a text prompt without an error; a block prompt makes that build refuse (`BLOCKS_REFUSED`), and it is then sent both as text. The replay sends a cached system the same way, and shown by
`objectivePrompt` only the held objective, `rec.past` and the owner's numbered messages on the job
(each with the agent's turn the owner answered, captured as it was shown: whole, only its end when it is long, or its last words), the messages inside `<owner_messages_<fence>>`, the tags the readers quote the owner in,
which the system prompt and the line after them (`objectiveClose`) call quoted records and no instruction to the writer; a fence tag
(any letter case, spaces inside the brackets allowed) in a message or in the agent line is
printed with its brackets turned to `‹` `›`, so no message can close the fence, and the record
keeps the text as typed. Its answer is `objective: holds`, or
`objective: moved` with `moved:`, `result:`, `for:`, `done:`, `step:` and `dropped:`
(`parseObjective`; `step:` is the step the owner's messages last set, `OBJECTIVE_STEP`, which each look then keeps current); `moved: new job …` closes the job. Straight after the `objective:` line,
holds or moved, come its `approved:` lines: one `approved: #n | all` or
`approved: #n | <the part taken>` for each message whose turn the owner approved, or
`approved: none` (`parseApproved`; `parseObjective` reads the rest as before). The rules for
an approval are `OBJECTIVE_SYSTEM`'s section "Plans the owner approved": what a yes is, a draft
with the owner's words read as one message, each step of an approved plan its own condition
after the whole plan is read, a clash kept as both sides and an open "Settle with the owner
which stands" condition, a plan's statements of fact held as the agent's claims, and, of the turn the owner answered, only the part the owner took counted, the rest of that turn and the agent's other turns counting for nothing. Outside that section, the rule on what moves the objective holds that the agent's progress, plan, reasons, step names, its "done", what it says it did or found, and any limit it sets on its own work (that it installed nothing, will ask first, or left some to the owner) are the agent's account, which enters the objective only through a plan the owner approved. The prompt is the prompt audit's §6.6 rewrite (2,004 words, two "never"s), with the kinds, the shape of a fact and one claim per condition added since; a test holds it to that size. `takeObjective` applies it: the first
objective is taken as it stands; after that a write is taken only when it saw a message of the owner's
or a note past `from` (`hisFrom` never counts a draft), so neither the agent's words nor the
rep's drafts can move it and a write that lands late cannot take a newer one's place. A
correction takes the result, purpose and step whole and runs the conditions through
`mergeConditions`. The writer is told to write a held condition only to close it or put it in
more exact words (`WRITE_CHANGED` in the request; before the replay of 20 Nov 2026 it was told to
write every one again, and restated them until a long job's writes ran out their time). The merge
keeps the held conditions in their order, each in its new form where it was written again, with
new ones after them, and keeps every held condition the writer leaves out unless `dropped:`
cites the number of a message from the owner, new since the held objective was built (past `from`),
and never raises a state: a held condition keeps its state, where and `reopened` mark unless
the writer closes it, and a new one proposed shown starts open;
a held open condition that an approval or a message that could not be read whole would let go of is
kept, with a "Settle with the owner" condition beside it (`settleConditions`); a held settle line is
already that question and is kept as it is, never wrapped in another (the rerun of #70, 21 Nov 2026);
`honest` turns a `shown` the writer adds (of the conversation it sees only the agent's turn
under each of the owner's messages, marked as the agent's) and a `closed` that cites no such
message back to open. A condition
listed twice, or with a state mark copied into its text, is kept once (`parseObjective`,
`mergeConditions`), and two conditions are the same when their words match with case,
punctuation and the articles set aside (`conditionKey`). A condition the writer marks
`| same as: <held text>` in place of its state (prompt group 6, G13: the owner's later words made a held one more
exact; `OBJECTIVE_SAME_AS`) takes the held one's place under the new words, keeps its state, where and marks, and
is never counted as dropped; a held condition is matched once, so a second rewrite of it is
not kept, and the mark is never saved (`plainCondition`). A new job pushes
the old result onto `rec.past` and starts the job (`since`, `rec.jobStart`) at its first new
message. The first write, which has nothing held to push, starts the job at the message its
`moved: new job #n` cites when n is one of the owner's messages after the first, so a seeded session
whose transcript held an earlier job does not show that job's messages as this one's. The looks, the briefing and the check never write the objective: `applyMarks` takes
their `shown:` lines when they name where, their `closed:` lines only when the number is a
message of the owner's on the job sent after `from` (one the objective was built from had its say
when it was written), and the check's `reopen:` lines when they say what shows otherwise; a look's or a briefing's
`shown:` line does not move a condition marked `reopened` (only the check's does, the fourth
argument). Each condition has a `kind`, `works` or `fact`, which the objective writer writes
before it (`conditionOf` reads it, and reads a state written first with no "|", "- not shown: …",
as that state, "shown" with no where as open, the kind read from the words after the state; `heldLine` writes it back, `bare` strips it where a reader
copies it, and `mergeConditions` keeps a held `works`, or one with no kind, as `works` whatever
kind a rewrite gives, and opens a shown `fact` rewritten as `works` with its where kept as
`seen`). `conditionOf`, and everything after it through `kindOf`, reads a `fact:` as `fact` only when
`factHolds`, by sentence shape: with its kind taken out, "runs (is on, is built from) the
newest" read as one word, quoted text (double, curly or single quotes) read as a name, and a
path or a file's name read as one only where it is one (`factTokens`, `factPath`): a path from
the root, the home folder or the current one ("/x", "~/x", "./x") or a URL, a word ending in a
file's ending from `FACT_EXT` ("sample.txt", "src/rep.ts"), and in backticks a version or a
commit (read as one), a path or a file's name; any other word joined by a slash or a dot
("secure/fast/reliable", "fast.secure", "sorts/validates2") is its words, joined as a hyphened
word, and plain words in backticks ("`owner-rep`") are words that name a thing, standing alone
as the thing held or the place only when each passes `factMod` (`pathAt`: "`secure/fast` is
committed" and "saved in `correct`" are works, and so is a tool's bare name, "`npm-run` is
installed", the designed safe direction); it matches no `BEHAVES` (works, runs, passes, does, prints, takes,
returns, shows, displays, gives, accepts, responds, reads, produces and the like, in any tense,
and does not, never, cannot and the like unless before "exist"), and `factRead` reads the whole
of it, to its end or a closing stop, as clauses parted by a comma or a semicolon and "and" or
"but". Each clause is one of a few shapes, each slot typed: a subject of nouns of the work
(`FACT_THING`, after an optional lead in `FACT_DET` and up to four words of the noun's own,
joined by commas and "and" or "or" where they are a list, "0 changed, added or deleted files";
a noun's own word comes from a closed list, `factMod`: one of `FACT_MOD`'s plain words that say
which thing it is (scratch, local, new, current, untracked, two, both and the like), a noun of the
work, of the machine or an actor, a word of `FACT_STATE` ("the installed build"), any of those
with 's ("the project's history"), a hyphened word only when each part is one ("the owner-rep
plugin"), all of them in an order a name can take (`factRunOk`, ninth live test: a plural noun only
last, next to the noun it names, "the logs folder", and a count, "every", "all", "two", only first,
so a doing folded in, "the copies-every-file tool" or "the logs-in tool", is works), a word with a digit only as a version or a commit (`FACT_NAME_H`, "v2", "a1b2c3d"), and
a number, or a path or a file's name in backticks; plain words in backticks only when they pass
`factMod` themselves (a path is a word that starts at a folder, a URL, a word ending in a file's
ending, or one with a slash and a standard folder of `FACT_DIR` in it, "install-case/bin/greet",
`factPath`); a path or a file's name without backticks never ("the /secure tool", "the
secure.c tool"); any other word, a quality or a doing above all, makes the clause works, so "the
resilient tool", "the fast/secure tool", "the `reliable` tool" and "the bug-free/reliable tool"
are works; "working copy" and "working tree" are read as
a worktree and "working folder" as a folder before `BEHAVES` is matched; after
the noun, a word of `FACT_STATE` or "made" with a place, "a commit made during this job") or
names other than plain words in backticks, or "named" or "called" and a name, or "copy of" and a path or a noun of the work ("a copy of welcome.txt exists in the sent folder", tenth live test; "a copy of the fast tool" is works) (`namedAt`: quoted, in backticks, a path, a version, or one word of letters, digits, "_" and "-" that is not a judgment such as "correctly" or "well", nor a joining word, `FACT_NAMED_NOT`; the name says which thing it is, never how good it is, so "an executable named greet" stands), with places after them ("as a copy of" or "as an exact copy of" a path or a noun of the work, "with permission to run" or "to execute", read as one word before `BEHAVES` is matched, "anywhere", "elsewhere" or "anywhere else", "for this job", "for the session", "for this task" or "for this work" and no other "for", or a word of `FACT_PREP`, during, since and by among them, before a name,
a noun of the work or of the machine, or one of `FACT_PLACE`: main, origin, GitHub and a few
more); then "is", "was", "has been" and the like (or nothing, "the newest build installed")
before one or more of `FACT_STATE` (saved, committed, pushed, merged, installed, deployed,
tagged, published, created, written, copied, moved, renamed, changed, edited, touched,
uploaded, archived, deleted, removed, made), with a version or a commit after it (`FACT_NAME_H`, alone or in brackets: "installed (UTF8-compliant)" is works) and places; or
exists, does not exist, no longer exists, or runs the newest. Only a stored thing (a name or a
noun of `FACT_STORE`) holds or contains quoted text, a thing of `FACT_HELD` (with "whose
contents are exactly" and quoted text after it), or is a count of a unit of `FACT_UNIT` ("long", "in size" or "in length" after it), each
with the note of its end in `FACT_TAIL` ("with no newline at the end", "(14 characters, no
trailing newline)", "5 bytes, with no final newline", "with no trailing newline (5 bytes)": notes split by commas each end there, a note in brackets may follow a note's words, and what follows a comma that is no note is its own clause). "Nothing", "none" or "no" and a noun, of a place, takes only a state or
existence, and "no" and a stored noun may also hold a thing of `FACT_HELD`, never quoted text; an agent, session or helper (`FACT_ACTOR`) saved or pushed a thing of the work; a
later clause may leave its subject out or say "it". A slash is "or" and "&" is "and". No word
of what the work does can stand in any slot, so such a condition is `works` whole, however much
of it is a fact (live tests of 18 Nov 2026: section 11, the third's section 3, the fourth's 36
wordings, the fifth's 88 in its section 1 and the sixth's 20 qualities, "the bug-free code is
committed" and "the script contains a correct fix" among them, and "the converter transforms saved text
to uppercase", "the README file lists the three commands", "the deployed service has 0
crashes" and "the file is saved; it is “usable”", all works, and the writers' own
"sample.txt in the scratch folder is 13 bytes long, with no newline at the end" and "nothing
from this job is committed or pushed", facts; the ninth live test's "note.txt in the scratch folder
holds exactly 'amber', 5 bytes, with no final newline", "no commit was made for this work",
"nothing was pushed for this work" and "an executable named greet is installed in a bin folder
inside the scratch folder", with "install-case/bin/greet is installed as a copy of
install-case/greet-source.sh" and "… is installed with permission to run", facts the writer wrote unprompted that were read as works; and the tenth live test's "a copy of welcome.txt exists in a local sent folder inside the scratch folder", "… holds exactly 'amber' with no trailing newline (5 bytes)", "… is installed as an exact copy of greet-source.sh", "no commits or pushes were made" and "no helper scripts, handoff notes or proof report exist from this work", read as works until "pushes", "report", "proof" and "sent" joined the lists). The writer's prompt gives the shape of a fact,
with one example. The
writer's prompt asks for one claim per condition (`ONE_CLAIM`) beside its kinds, then (`QUALITY_CONDITION`) that a condition about how good the result is name what a person using it would notice, from what the owner said and what the best in that trade plainly does, with one example and nothing the owner would not plainly want. It writes what is installed, deployed or running as not shown, which the rep marks shown when the record holds proof from outside the agent's word.
A `fact` moves shown on any where. A `works` condition, or one with no kind, moves shown only when
`looksOf` finds, among every `look by <who>: <what>` in the where, one whose `who` (compared by
`whoKey`, without case, curly apostrophes or a leading article) is the check (`CHECK_NAMES`) or a
run (`RUN_WHO`: "helper <run>", "Codex <run>", "Codex run <run>", "helper (run <run>)"), with
something seen and no "no", "not", "never" or "without" just before it, and `signsOff` finds that
the run qualifies: `runFor` takes the one run of that kind in `Rec.ran` whose id ends with the
ref, and `runQualifies` wants it `done`, unchanged and with something said; the check signs only
through its own marks. The watch and the briefing are offered only the run forms (`WHERE_LINE`):
they are told to write only looks the record shows, that their own reading of the record is no
one's look, that a look by the agent or by a run that changed the work leaves the condition
open, and that a condition about order ("before", "first") needs the record to show that order;
the check alone is offered "look by the check" (`LOOK_RULE`). `Rec.ran` (the newest `RUNS_KEPT`, 60) is filled in `tool.call` once the
call returns: `runOf` reads an Agent or Task call, or a shell call `shellRun` reads as Codex
(`codex exec`, `e` or `review` after any options, no help or version flag) or a helper (`claude -p`
or `--print`, changing the work unless `--permission-mode plan`), as the deciding command
(`deciding`: the last statement of `shellStatements`, joined by `&&` alone, not backgrounded);
`codexWrites` reads a writing sandbox, the bypass, the automatic approvals, `--add-dir` or a
`sandbox_mode` config; `runFromResult` keeps its state and last words (`RUN_SAID_MAX`, 300
characters); a helper's own edit call, or shell call `shellChanges` reads as writing in the
folder, adds it to `Rec.changedBy` and marks its runs changed; `runEnded` finishes a helper sent
off on its own at its `turn.complete`. The digest prints `(run <runKey>)`, the last 8 characters
of the call's id, beside such a call. A look that does not sign is kept under its who with why
(`keptWho`: names no run, no such run in the record, its run changed the work, was not seen to
finish, failed or said nothing, or not the check's own mark), and the named runs' words go on
the condition as `said`, shown beside it (`saidMark`). Otherwise, whoever
looked and whoever reports it, the check included, the state stays as it was and the condition
keeps what the looks saw as `seen` and who made them as `seenBy`, from this where alone (a where
with no look keeps the whole where, made by the agent). `objectiveText` marks such a condition on the card (`seenMark`):
the agent's own look as "the agent looked at it itself", anyone else's by name, both still
needing a look by someone who did not build it; `countLine` adds the same by who (`looksNote`,
counted rather than named past `LOOKS_NOTE_MAX` characters),
and `fillCard` brings the count line back right after the head. The prompts are shown each open
condition's kind (`kindMark`, `works` for one with none) and what its looks saw (`promptLine`).
The watch, the briefing and ask again carry `LOOK_RULE`, which teaches the form; the check carries `CHECK_LOOKS`, the same forms said once in its answer's form. A new job's conditions start with no mark. A draft moves only `step`, set to the draft's `firstSentence` in
`prompt.submit`. The card shows `revisedLine` under the head and `objectiveText` as its
reading; the row shows `result`.

### The plan screen

`planScreen(input, result)` reads what Claude Code's plan screen answered from the `ExitPlanMode`
call, and `null` is everything it does not recognise. Accepted: a result object holding a
non-empty `plan` and a boolean `planWasEdited`, or a result or text opening
`PLAN_ACCEPTED_TEXT`, is an approval. It holds the plan the call carried, which is the plan the
screen showed: the `tool.call` hook's input is read from the plan file when the call arrives,
while the plan the result returns is that file as it was at approval, which the agent may have
changed while the screen was up. Only when the owner edited the plan on the screen, told by
`planWasEdited` true or by the text form's `PLAN_EDITED_HEADING` ("Approved Plan (edited by
user)") in place of `PLAN_ACCEPTED_HEADING`, does it hold the returned plan (the part after the
heading, in the text form), with `edited` true. `planLabel` names a plan read back so as
`(read back from the session)`, and one edited there, live or read back, `after editing it there`. With no plan in the call it holds the returned
one. Rejected: an error result
holding `PLAN_REJECTED_SAID` gives the owner's note, whatever follows it, and the plan the call
carried; a rejection with no note is `null`, so nothing is stored. `takePlanScreen` runs after the
call returns, so a thrown call stores nothing, and `storeScreen` writes one `OwnerMsg`: accepted is
kind `plan`, `approved: 'all'`, `screen` `accepted` or `edited`, the plan saved whole as `src.body`
and its start as `text`; rejected is kind `his`, the note as `text`, `screen: 'rejected'`, the plan
saved as `src.rejected`, read by nobody as approved. Both keep the `toolUseId`, which `boundaryRow`
uses to place them.

A session the rep did not watch has its answers read back: `screenFromRows` finds each
`ExitPlanMode` use in the rows and its answer, matched strictly by `tool_use_id` in a later row's
results, else the use's own result. `seedOrder` sets them among the typed messages by time, and
`storeScreen` stores each with `readBack: true`; the text form's heading says whether the owner
edited the plan there.

A note the owner types with an approval ("approve with this feedback") is in neither the call's
input nor its result: Claude Code writes it as a second content block, a `text` after the
`tool_result`, on the transcript row that carries the approval, a row of type user with no
`origin` and a `permissionDecision` of `accept` whose `source` begins `user` (the engine's own
accepts by a setting say `config`). `humanItems` reads such a row's text as a `HumanItem`
tied to that call by `toolUseId` (`noteCallOf` takes the id of the result just before the
text), and `heldKeys` keeps it as `noteKey(toolUseId, key)`, so the same words beside another
call, or in any agent output, prove nothing. Live, `takePlanScreen` marks each accepted call as
due (`notesDue`), and `catchNotes` reads the transcript at the next prompt, tool call or stop,
up to `NOTE_TRIES` times, and stores each note found with `pushNote` as kind `his`,
`screen: 'accept-note'`, its text marked `ACCEPT_NOTE_MARK` for the writer as the owner's own
words that can narrow or add to the plan before it, and rebuilds the objective. Read back,
`typedFromItems` matches a note only to the row holding its call's result, and `seedOrder` puts
it after the screen of the same row. `boundaryRow` places nothing by a note. The record shows a
note proven so as `the person (typed on the plan screen while accepting the plan)`. An
accepted plan's returned copy, when the owner did not edit it and the call carried a plan, is
shown by a pointer to the call's input when it matches the plan the screen showed
(`planCopyOut`); when it differs, the file was changed under the screen, and the copy is shown
after a mark saying it was changed after the screen showed the plan and the owner did not
approve it. So the reader neither takes a plan the owner did not see as approved nor says the
change is missing.

Owner messages are `OwnerMsg`s: `n`, `kind` (`his`, `note`, `draft` or `plan`), `text` (cut to
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
has not changed since the mark (`recRev` still `lostRev + 1`), its files then removed once the
record is saved; a new job clears the mark and removes its files. A list that exists and cannot be
read (`LOST_LIST_UNREAD`) stays where it is, the mark holding `keptRev` and `after`, and is read
again at each start: at or under `keptRev` it goes and the mark with it; newer, it is taken up
while the owner has sent nothing since the mark, and otherwise renamed as lost with
`LOST_CHANGED`, which no later start takes up, whatever else was wrong with it. While the mark
stands a store that refuses the record leaves it in this process alone (`saveToFiles`), and a
store that takes it again leaves the list where it is (`stored`): the list may be newer than the
record. Sources held in memory by an earlier process are marked `LOST_RESTART`.

**The call log and the counters.** Every model call the rep makes for itself is saved by
`logCall` (`hooks/register.tsx`), queued by `saveCall` behind the call so the card, the row and
the record never wait on the disk: the objective writer (`objective`, one file per attempt), each
look (`watch`), the briefing (`brief`), its second ask (`ask-again`) and the own-words call
(`own-words`); the check keeps its own record in agentsview. The folder is
`<config>/owner-rep/calls/<session id>/` (`callsRoot`), only for a uuid session id
(`isSessionId`), so the kit's `test-session` writes nothing. Each call is one file,
`<13-digit ms>-<4-digit seq>-<kind>.json` (`callFileName`, `CALL_FILE`), a `CallEntry`: the
settings sent (`CallSettings`), the attempt, the system prompt and each prompt block by
fingerprint (`LoggedBlock`, with its cache mark), `joined` when the prompt went as one text,
`promptSha` and `promptChars` of the whole prompt as one text (`joinBlocks`), the time, the
outcome (`callOutcome`: `answered`, `threw`, the engine's reason, or `api-error` with status and
error), the reply, the usage, `nearCap` (output at `NEAR_CAP_SHARE`, 98%, of the cap or past it),
the reply as its kind's reader read it (`callRead`: the objective writer's `holds`, `moved` or
`unreadable`; the watch's `read`, `flag` or `unreadable` with its marks; a card's `read` or
`no-verdict` with its marks, its words part by part and, for a briefing and its second ask, the
gate's rules, `gateRules`, which mirror `gateVerdict`'s refusals; the own-words call's `whole` or
`cut`), and for a card the conditions open when the gate read it (`open`), so a replay gates its
answer the same way. Each text is written once, to `parts/<sha256>.txt` (`PART_FILE`); the
session record every look resends is the same text call after call and is kept once. A process
writes at most `CALL_LOG_SESSION_BYTES` (64 MiB) of texts for a session; past that a call is
saved with `kept: false` and no texts. `logCall` never throws: a call not saved stands as it came
back. At each `session.start` with a uuid session id, `pruneCalls` lists the calls folder,
without being awaited, and removes in one `rm -rf` through `hostArgv` each session folder whose
last change is more than `CALL_LOG_DAYS` (14) days old, except the session starting (a session
resumed after 14 idle days keeps its calls), and, in the same command, the folders
`overCallCap` names: with every other folder sized by its call files and its parts
(`folderBytes`), while they hold more than `CALL_LOG_TOTAL_BYTES` (1 GiB) together, the one
changed longest ago, never the session starting, one changed in the last `CALL_LOG_LIVE_MS` (an
hour, perhaps another running session's) or one whose change time is unknown; so the total may
stay over until those age. A session of this process whose folder was removed has its saved
texts forgotten (`savedParts`, `savedBytes`), so its next call writes them again.
`removableCallFolder` allows only a uuid-named folder right under an absolute calls folder.

The counters are `rec.counts` (`Counts`), changed in the same `changeRec` as the spend: per kind
(`KindCounts`) the calls, the four token counts, the time, the replies near the cap, the outcomes,
what the replies were read as, and for cards the gate's rules (`passed` when none);
`countEnd` counts how each briefing ended (`BriefEnd`: `passed` at once, `asked-again`,
`own-words`, or `fixed-text`). Two commands are registered at `session.start` and hidden from the
menu and `/help` (`command.describe`, `HIDDEN_COMMANDS`): `/owner-rep-counts` prints
`countsText`, one line per kind and a `cards:` line; `/owner-rep-replay <call file, session folder,
session id, "this" or "all"> [--kind k] [--last 1-50] [--effort low|medium|high|xhigh|max] [--times 1-10]
[--variant build|frame|no-think|rep-system|end-line|proof|decisions|now|same-as|message|evidence|fault|unshown|rewrite|writer|own|decide] [--base frame|no-think|rep-system|end-line|proof|decisions|now|same-as|message|evidence|fault|unshown|rewrite|writer|own|decide] [--now]` (`parseReplayArgs`, `REPLAY_USAGE`) takes a folder's last `--last`
(`REPLAY_LAST`, 10) calls of the kind asked for, or with "all" the last of every session folder's
calls together by when each was made (`replayPick`, `replayFiles`), rebuilds each from its parts (`savedCall`, which refuses one whose
texts were not kept, one naming a text by anything but a fingerprint (`isSha`), so a call file
cannot point it at another file, one whose texts are missing, whose system text no longer has its
fingerprint, or whose prompt no longer joins to `promptSha`), prints it as logged and sends
it `--times` times with the same settings, or the effort given, reading each answer with
`callRead` against the saved `open` (`replayLine`, whose tokens are those read fresh, read from
the cache, written to the cache and sent out; a part written "- none", "None." or "(none)" marks
nothing, as `items` reads it), then the totals of each (`replayTotals`). With
`--variant`, each call is sent `--times` times as saved and `--times` times with its texts edited
to what this build sends in their place (`editSaved`; `build` names every edit in
`PROMPT_EDITS`): `frame` drops the fork frame the build before prompt group 1 opened the task
with and sends group 1's record system prompt (`PRE_G2_RECORD_SYSTEM`), for a watch, brief or
ask-again call; `no-think` drops the watch's line telling the model not to think it over;
`rep-system` (`toRepSystem`, applied after those two) sends `REP_SYSTEM` and rebuilds the task
from group 1's (the `PRE_G2_*` texts) as the build after prompt group 2 wrote it: the rules moved out, the request
opening "Based on the record above" with its restatement (it builds this build's texts and undoes every later group's edit, `toGroup2`, so its arm stays group 2's); a call that asks for `END_LINE` last
(`asksEnd`) is matched without it and asks for it again after the new texts; `end-line`, applied
last, asks for `END_LINE` last (`endAsked`), for a watch, brief or ask-again call, and refuses a
call that asks for it already. The prompt groups after group 2 are `GROUPS`, in order, each an edit with its pairs by the kind
of call: `proof` (group 3: `G3_REP_SYSTEM`, `G3_OBJECTIVE_SYSTEM`, `G3_OWN_WORDS_SYSTEM`,
`G3_TASK`), `decisions` (group 4: `G4_REP_SYSTEM`, `G4_OBJECTIVE_SYSTEM`, `G4_TASK`; it has no
own-words pair) and `now` (group 5: `G5_OBJECTIVE_SYSTEM`, `G5_TASK`; watch and objective calls
only, since it changes neither the shared system prompt nor the briefing), and `same-as` (group 6: `G6_OBJECTIVE_SYSTEM`, `G6_TASK`; objective calls only), and `message` (group 7: `G7_REP_SYSTEM`, `G7_OWN_WORDS_SYSTEM`, `G7_TASK`; every call but the objective's), and `evidence` (group 8: `G8_REP_SYSTEM`, `REP_HOLD` added; watch, brief and ask-again calls). Group 9's edit, `fault`, rebuilds nothing: its second asking names the rule the first answer broke, which no saved call holds, so `editSaved` sends no ask-again call under it, and the build before it's text stays as `askAgainBefore`. Issue #49's edit, `unshown` (`G10_OBJECTIVE_SYSTEM`; objective calls only), rewrites the objective writer's turn-end line, so a message under a turn none of which is shown approves only in words that accept a plan; the build before it is group 9's, since group 9 rebuilt nothing. The rewrite's edit, `rewrite` (prompt audit §6.1 to §6.4; watch, brief, ask-again and own-words calls), is the group before the own-words rewrite: it swaps `PRE_RW_REP_SYSTEM` for `repSystem(REPLAY_FENCE)` (`PRE_RW_OWN_WORDS_SYSTEM` for `PRE_OWN_OWN_WORDS_SYSTEM`, the own-words system prompt the build after #68 sent), and its step (`rewriteTask`) takes the build before's request apart (the watch's reason and its two lists, the briefing's request, the second asking's fault and open conditions) and builds this build's request from those parts, while `rwMemory` rebuilds what the rep knows (the owner's messages in their fence under the new heading, their fence tags escaped, the new lines on a sent draft and on a reopened condition). The own-words request is the build after #68's, with that build's length aims swapped in (`G7_SHORT_PART`, `G7_MESSAGE_FORM` for `PRE_OWN_SHORT_PART`, `PRE_OWN_MESSAGE_FORM`) and its quoted conditions and findings escaped by `fenceTags`; group 7's own pairs keep the old length texts frozen (`G7_SHORT_PART`, `G7_LEFT_ITEMS`, `G7_MESSAGE_FORM`), so a change to the live ones never breaks group 7's edit. Each old text must be found exactly once, or the call is not sent. It takes only a call whose record is in the build before's fence (`PRE_RW_RECORD_OPEN`, `PRE_RW_RECORD_CLOSE`) and quotes that record in the replay's fixed fence (`REPLAY_FENCE`, `replay00`, so a call replayed twice reads the same), its fence tags escaped by `fenceTags`, which leaves the old escape as it was. A second asking saved before group 9 names no fault, so, as under `fault`, it is never rebuilt. The writer's edit, `writer` (prompt audit §6.6; objective calls only), comes next: it swaps `PRE_OW_OBJECTIVE_SYSTEM` for `objectiveSystem(REPLAY_FENCE)`, and its step (`writerTask`) moves the owner's messages from the build before's `<his_messages>` fence (`PRE_OW_OPEN`, `PRE_OW_SHUT`) into `<owner_messages_replay00>`, their fence tags escaped, and swaps its closing note (`PRE_OW_CLOSE`) for `objectiveClose`; a call whose old fence is not in it exactly once, or whose messages hold the old fence's own tag, is not sent. The older groups' objective pairs read the frozen `PRE_OW_*` texts, so a change to the live writer never breaks their edits. The own-words rewrite's edit, `own` (prompt audit §6.5; own-words calls only), is the group before `decide`: it swaps `PRE_OWN_OWN_WORDS_SYSTEM` for `OWN_WORDS_SYSTEM`, and its step (`ownTask`) reads the build after #68's request back into its parts (the open conditions, what stands, what is left out) between the frozen texts `PRE_OWN_HEAD`, `PRE_OWN_FOUND`, `PRE_OWN_LEFT` and `PRE_OWN_TAIL`, checks that they build the old request again, takes the session's size out of what the rep knows, quotes the owner's messages in the replay's fence and builds this build's request (`ownWordsText`). The rule the briefing broke was never in that request, so the replay reads it from the calls saved before the own-words call in its folder (`savedFault`, the nearest twelve, nearest first): the ask-again call just before it, its gate rules over its reply (`askFault`), or, when that ask-again was not read (no gate), the nearest briefing's; another own-words call, a briefing first or an ask-again that passed gives none, and `editSaved` (given it as `known.fault`) then does not send the call. The rep-makes-the-call edit, `decide` (0.9.0; watch, brief, ask-again and own-words calls), is the last group: plain swaps of each `PRE_DC_*` text for its `DC_*` text, in the system prompt (`DC_REP_SYSTEM`, or `DC_OWN_WORDS_SYSTEM` for an own-words call) and in the request by kind of call (`DC_TASK`), so a call the 0.8.0 build saved goes out as this build sends it; `rewrite` alone, and `own` alone, now give 0.8.0's texts. Each pair is the group before's text, kept word for word, and the text the group
sent in its place. Applied after `rep-system`, in that order (`stepGroups`), each named group's
edit (`stepGroup`) moves a call the build before it saved to exactly what the build after it
sends: the call's system prompt must be the build before's (`systemBefore`, this build's with
that group's and every later group's pairs undone), and each old text must be in it exactly once
(`swapped`), or the call is not sent; so `decisions` alone takes a call the build after group 3
saved, `decisions` with `now` one the build after group 3 saved, and `now` alone one the build
after group 4 saved, and `same-as` alone one the build after group 5 saved, and `message` alone one the build after group 6 saved, and `evidence` alone one the build after group 7 saved. The objective and own-words calls have no record, so their whole prompt is the task and only
the groups' edits apply to them. Every reply is read as its own prompt's build read it
(`readAsAsked`): a reply to a prompt that never asked for the end line is not taken as cut for
lacking it, so an old call replayed as saved is read as it was then. With `--now` (`replayNow`)
each call, in every arm, goes as this build would send it, at `MAX_REPLY_TOKENS` and with
`END_ASK` as its prompt's last line once (on the last block of a prompt in blocks), and is read
against that cap; the rest is as logged, so a call saved before the shared cap and the end line
shows what those two alone change (audit test R16). With `--base`, a strict part of the
variant's edits, the first arm is sent with the base's edits in place of as saved, so the two arms
differ by the variant's other edits alone; a base that is not a strict part prints `REPLAY_USAGE`. Only the task after
the last `</session_record>` is edited, never the record (the rewrite changes only its fence and the fence tags inside it), and the blocks wholly before it go as
they were, cache marks and all. A call an edit applies to but cannot change (its old text is not
there, or its system prompt is not the record read's), or one no edit applies to, is not sent in
either arm, so the arms are the same calls; the totals are `logged`, `as saved` (or `base`) and
`variant`. Every reply a replay gets is written to
`replays/<call file's name>.<run>.<effort>[.[<base>~]<edits>][.now].<arm>-<n>.txt`
beside the call, `<run>` being the millisecond the replay started and always later than the run
before it (`replayRun`), so neither a run with other settings nor the same run again writes over
another's replies, which `folderBytes` counts toward the 1 GB. A replay is not logged or counted. Nothing of
either is drawn on the row or the card.

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

A seeded message has a body too. `typedFromItems` walks back from each matched row to the matched
row before it, collecting the agent's text oldest first, joined by a blank line, into a `SeededTurn`,
and `seededBody` gives it one span with `by: 'other'` and `note: 'read-back'`, which `spansText`
shows as `READ_BACK_LINE`. A walk stopped by a summary row is `incomplete` with `COMPACTED_WHY`; one
that runs out of rows with messages before it, with `TURN_START_WHY`. The first message is not
marked: nothing comes before it. A later message with no row at all, queued or from before a
compaction, gets no body and `incomplete` with `NO_ROW_WHY`. That gives no line by itself, or every
compacted session would show many: only an approval of such a message is named, as row 3, so a
reader that cannot see the plan says so. The writer sees nothing of the turn before such a
message, so its note under the message (`noneLine`) and its rule in `OBJECTIVE_SYSTEM` let it mark
the message approved only when the owner's own words accept a plan in so many words: a go-ahead
("keep going", "take over and build it"), praise for work done, or a request for changes approves
nothing. A go-ahead after a compaction is then never named as a plan approval, and the message
named does not move between runs. The steps a reader names under a plan it was never shown
(`notAssessedGaps`' `READER_CUT_WHY`, for an approval `showable` refuses) are its own guesses:
`coverageLines` leaves them out, and the approval's row 3 line stands.

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
(`HUMAN_SED`), which prints only the lines holding `"kind":"human"` and the plan screen's
note rows (an owner accept, `NOTE_SED_MARK`, with a text block straight after a result,
`NOTE_SED_ROW`), every picture's `"data"` blanked so a message with a picture stays under the
output cap. A read cut at that cap
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
the copy, which holds the line with nothing before it, is passed over; with no file there, every
project folder is searched for it (below), and with no file found anywhere the copy's own messages
stand alone. When the session's own file cannot be read (a
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
is taken, the newest on a tie, and the scan stops once a file matches every candidate. A file
read that begins at a summary (`startFind`, `summaryStart`, run only on a file that matched) is an
earlier fork's copy, never the parent: its stretch since the summary matches the newest rows as
well as the parent does and it is newer, so it never ends the scan and wins only by matching more
than every whole file; when it wins, its summary line is followed back to the file it was copied
from as above (the start folder, then every project folder), and the messages before the line
there come before the copy's. Taking the copy as the parent read only the messages since the
summary and numbered the compacted turn's message #1 where the owner sent it as #6.
`heldItems` is null when the best file matched none, whether or not any file was read
whole, so the record read labels the owner's rows by their text rather than calling them all the
session's.

A session recorded in a folder since removed (a worktree removed after its merge), then resumed
or forked from another folder, is in none of the start folder's files: Claude Code names the
fork's file after the new id in the start folder's records and hands the mod nothing naming the
parent (no field in `SessionStart`'s input, and a fork's own lines carry its new `sessionId`
only; measured on Claude Code 2.1.325). So when the start folder's newest files leave the summary
line or the last tool call unfound, or match fewer than every candidate row, every project folder
is searched once for that line's `"uuid"` or that call's `"id"`: `parentGitArgv`, `git grep
--no-index -l -z -F --max-depth 1` over `*.jsonl` with `<config>/projects` as its working folder,
which takes 0.04 seconds over 3 GB of transcripts on this Mac warm and about 1.5 cold; where git
cannot run (it throws, as on a Windows host with no Git on `PATH`, or exits 2 or more), the same
search by `parentGrepArgv`, `grep -r -l -F --include=*.jsonl` with `subagents` and `tool-results`
left out, one of the `POSIX_COMMANDS`. `parentHits` keeps only `<projects>/<folder>/<file>.jsonl`,
from git's relative names (NUL-ended) or grep's full ones, and the files not tried yet are put
newest first by one `ls -t` and tried as in the start folder, at most `HUMAN_SCAN_MAX`. Each run
takes no more than what is left of `HUMAN_SCAN_BUDGET_MS`, the one budget for the whole scan, so
the search adds no time past it. It never runs for a new session (no rows, no tool call yet) or
for one whose start folder holds a whole file matching every candidate row, which is the plain
resume and the fork of a session recorded in that folder.
Both go through `hostArgv`: git by its name, which Git for Windows puts on `PATH`, grep and ls by
their full path in Git's `usr/bin` there; the paths are slashed like the others. A
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
call's `"id"`, and `toolLineOf`) with any of the owner's lines before it gives the items before
that line (`humanReadBefore`, `sed` stopping there), a cut read skipped; a file holding the call
with nothing of the owner's before it, an earlier fork of the same session saved as the stretch
since the summary, is passed over, as the summary search passes over a copy of the copy, so an
earlier fork never makes a later one wait for a press; when every file holding the call is such a
copy, the scan gives no items rather than none found, so the rows still seed a plan accepted on
the plan screen; the call, not the result, because a fork taken while a
tool ran holds a result Claude Code marks interrupted, which its parent saves only later.
With no tool result either, nothing past its own file is read. `seedOwner`
runs one seed per session at a time (`seeding`), and
`prompt.submit` awaits it before recording a prompt or a note, so a prompt sent during the
start's read is numbered after the seeded messages; the objective is rewritten when that
seed recorded any. `enterSession` (a start, or a new id taken up after a `/clear` or a
resume) runs it without waiting and writes the objective when it recorded any; `pressBrief` awaits it before its objective-null write. A record that holds a
message or note of the owner's is never seeded.

State lives in two places. Atoms (`atom({plugin, key})`) are per-session UI state that drives
the render. The `$.store` holds a `Rec` per session id, each under a key of its own,
`rec:<session id>` (`recKey`; the objective, the
results of earlier jobs, the owner's numbered messages and the counter, the last briefing's
next step and message, the last `DRAFTS_MAX` (3) cards' messages in `rec.drafts`, flags already seen, other mods' notes, spend counters with the writer's own and its failed calls), capped
at `SESSIONS_MAX` newest. A record that still loads as the blank one a session starts with
(`isBlankRec`: no message, objective, draft or spend) is never kept, since a missing record
loads the same: `session.end` saves every session's record, so before 17 Oct 2026 each
scripted `claude -p` run left a blank one that took a place from the owner's sessions.

A save (`storeRec`) sets the session's own key and nothing of any other session's. Claude
Code's store locks its file for each `set` or `delete`, reads it, changes the one key and
writes it back, so a write to one key is whole across processes; a `get`, a change and a `set`
of one shared value is not. Until 20 Nov 2026 every record sat in one map under the key
`sessions` (`OLD_MAP_KEY`), and each save read the map, changed its own entry and wrote the map
back, so a save from another session's process that landed between them was written over: one
session's save put back an older copy of another's, and a plan approval was lost that way.
After the save, `trimStore` lists the keys (`$.store.keys`, one read) and, only when the record
keys number more than `SESSIONS_MAX`, reads each record's `at` and lets go the oldest past it,
never the session saving (`recsToLetGo`). A record let go leaves its drafts (`recDrafts`: its
`rec.drafts`, last briefing's message and messages held as `draft`) in the key
`droppedDrafts`, newest first, each once, up to `DROPPED_DRAFTS_MAX` (200) (`keepDropped`),
before its key is deleted; a fork's own first save can let go the record it was forked from.
The save stands whatever the trim does: a trim that fails, or a process that ends between the
two, leaves one record over, which the next save's trim lets go. Each record picked is read
again just before its key is deleted, and kept when its `at` has changed since the trim read
it: a session idle long enough to be the oldest can save while another session's trim runs.
The store has no compare-and-delete, so a save landing between that `get` and the `delete` is
still lost; the window was the whole trim. `trimStore` returns only the ids it deleted, so only
their folders go. Two trims at once may each let go the same record (deleting a missing key
does nothing). `droppedDrafts` is still one key read and written whole, so two
trims that write it in the same instant can lose one's drafts; that window is a `get` and a
`set` long, against the whole save the map had. A refused save throws, as before, and the
store's limit is on the whole store's JSON, the record's key included.

The map is moved once per process, before its first read (`migrateOnce`): each of its
records is copied to its own key when that key is missing or older (`newerRec`), and the `at` of
every map record the move read, by session id, blank ones and ones whose key was newer included,
is added to the mark `movedSeen` (`MOVE_SEEN_KEY`, `moveSeenOf`). The move reads the mark again just
before writing it and merges the two, the later `at` per id (`mergeSeen`), so a mark another process
wrote meanwhile is kept. Each session the move read is then marked at no more than the `at` its own
key still holds, so when another move running at the same time wrote an older copy over that key,
the map's later save stays unseen, is read, and is copied by the next move; a key let go meanwhile
keeps its mark, so the map's copy from before the move is not read back. Until the check of
13e7d4d, that older copy was marked seen at the later `at` and the older build's later save was
never read. The marks assume clocks move forward: an older build whose clock stepped back, or one
saving a session twice in the same millisecond with the move reading between, saves a copy no
later than the one the move saw, and it is not read. The copy itself is a read then a write, with
no compare-and-set: a new-build save of the same session landing inside one move's read and write
of that key is written over, the same window as the trim's. A later move copies only map records no finished move saw at their `at` or
later (`unseenByMove`): a session the mark does not name, or a later `at` than the one it names. So a
record the trim let go is not copied back, and an older build's save that lands after the map was
read is a session or an `at` the move did not see, whatever its stamp, so it is read and copied. A
map copy older than the one the move saw is an older build writing back its stale map, and is not
read: its record is at its own key, or was let go and stays gone. Until the check of 535608c the
mark was one time, the newest `at` the move saw, and with two older builds saving during the move a
save stamped below that time was never read. The map is
kept, not deleted: a process still running an older build reads and saves only the map, and
with the map gone it would load a blank record and save it as the newest. Every read takes the
newer of the record's own key and the map's entry (`loadStored`, `allStored`), so a save an
older build makes into the map is the one read. A read takes a map record only when no finished
move saw it (`oldMapSinceMove`), or every one when no move has finished (no mark, or one that is
not an object): a finished move copied each record it saw, so a map record it saw is in its key
or was let go, and reading it would bring a let-go record back as its copy from before the
move. The map goes at the first move after its newest record is `OLD_MAP_IDLE_MS` (7 days)
old, when no older build can still be saving into it; the mark stays, one number per session the
map held. A move the store refuses partway stops there with the mark unwritten: the records it
would have marked are still read, and the next process copies what is left. The trim never lets go
a record that `oldMapSinceMove` returns, whether or not its key was copied: with the key gone, the
map's older copy would be read in its place and copied back. It ranks every record key, mapped or
not, keeps the newest `SESSIONS_MAX`, and lets go only the unmapped ones past them, so a mapped
record never costs a newer session its place; the store holds at most `SESSIONS_MAX` plus the mapped
records outside the newest `SESSIONS_MAX`, up to the map's 32 while a move is unfinished. Two moves
at once can still write the mark backwards in the instant between one's re-read and its `set`; a
record let go inside that instant can come back from the map. While the map stays, the store
holds each record twice, and the move itself writes other sessions' keys, so a session saving
in another process in the same instant can lose that one save: the move copies a record only
when the map's copy is newer than the key's, which is so only at the first move or after an
older build saved into the map, and the window is between the move's `get` of the key and its `set`.
A blank record whose session `oldMapSinceMove` returns is saved rather than deleted, so the
map's older copy is not read in its place. `storedDrafts` reads the records (`allStored`) before
`droppedDrafts`, the reverse of the trim's order, so a record let go
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
takes the strip alone. Up to 2.1.310 every mod draws in one chain and what another mod draws
is the rep's `next(e)`. From 2.1.325 the band asks each mod for a row of its own (the
`AbovePrompt` hook hears only its own row) and stacks the rows in `AbovePromptList`, where
`next(e)` under the rep's row answers only the engine's own drawing; so the rep's
`AbovePromptList` hook reads the other mods' rows (`e.props.rows`, every row whose `plugin`
is not `PLUGIN`), keeps whether any draws something in `othersDraw` by surface and draws the
band again when that changes, and while the rep's row last drew the briefing (`cardUp`, set
by the row's render) passes on only the rep's own row. The `AbovePrompt` render takes
`hasBeneath` from both, so the same rules hold on every build; on the terminal each line has its width in columns and the card fills the band's rows in order of importance (`fillCard`: the buttons row, the head's result, one row of the message and the check's note cut to one row first; on a band of about five rows, a 24-row terminal's, what the check found then goes to one line without its heading (`checkedBare`, the counts of what held and what was false, or the checker's own account of what it looked at when it sorted no claim, with how many commands were refused on it), then the empty line above the card goes (`tight`), then that line is cut to one row and then dropped, then the conversation's size comes off the buttons row (round 10: on a three-row band at 60 columns the size took a third buttons row and Tell the rep and Later sat under "↓ n more"), then, on a band of two rows whose buttons take both, the head (`headless`, not counted by `cardRows` and not drawn), so the head where it fits, the note and the buttons stay in the window; the result whole next, then whole without the empty line above the card, then also without the conversation's size, and where it still cannot be whole, grown to every row the buttons leave it with the size kept (round 10: at 60 and 100 columns on a 24-row terminal the card had cut the result to one row); the note whole next, in its short form (`shortCheckNote`, "Check failed after answering: …") and then without the conversation's size on the buttons row when the long form will not fit, ahead of what the check found when the band holds only one of them (that line comes back next), taking the empty line's row when it needs it, then that line, the heading and the lists back in that order, then the judgment one row each, most telling first (stands, then the revision line from `revisedLine`, so a long message never crowds out that the reading moved), then the count line (`countLine`), then the judgment whole as the rows allow, then the message with the rows that remain, then the extras while they fit; on a band too short for the message's box between the head and the buttons the box goes and Put message in prompt, drawn while the brief has a message, carries it whole, Put and Check it fixed from the whole card (`putShows`, `checkShows`); rows counted by `cardRows` as the band wraps them: `rowsOf` follows the band's wrap (wrap-ansi with trim off and hard on, so an indent and the space a row starts with take cells, a word wider than the row breaks, and `widthOf` gives a wide character two cells and a combining mark none), and `buttonRows` counts the buttons row, which wraps (`flexWrap`, three cells apart) with the size last on it, from `cardButtons`), the row likewise keeps its head to the rows the band leaves it (`fitRow`, which cuts it with `rowHead`: `maxRows` less the empty line above it, the record line, its buttons row as it wraps (`buttonRows`; drawn with `flexWrap`, three cells apart, in the band's columns, so at 60 columns "stopped, waiting on you   1: Brief me   2: Tell the rep" takes two rows and is counted as two), and the rows of anything another mod draws beneath, cut with "…"; on a band too short for the whole row the empty line goes first, then the status off the buttons row when that takes the row a wrap would add, then the head: this Mac's 24-row terminal at 60 columns leaves the band three rows while its status line takes five and two when the usage line wraps to a sixth, and on two the status goes, so the head and both buttons take a row each), so a long result never puts Brief me and Tell the rep under a "↓ n more" row; under a heads-up, `fitNote` fits the note's line, its why and the row's head into the rows the buttons rows and the record line leave: everything whole where it fits, else the line and the head at one row each with no why and no empty line above; on a band too short even for that the row's buttons row, which has no digits under a note, goes, then the row's head, so the note's digits stay in the window; then, each while it fits, the row's buttons row back, the head back, the line whole or grown to the rows left, the why the same way, the empty line, then the head grown (round 10: a long note put every button under "↓ n more" at 60, 100 and 170 columns on 24 rows); and on a surface whose band is a scrolling box in a proportional font (`sizesInColumns` false: Claude Code for VS Code, whose extension counts columns by a wide glyph and draws widths in `ch`) no line is given a width, so each fills the box, and the card is drawn whole. Buttons use bare digits for hotkeys because from the prompt box only a
digit presses a band button. A keyboard chord for the Rep button once rode on an unrelated
engine action; it could not be proven and was removed on 14 Oct 2026. Do not bring it back
without a binding that is shown working.
