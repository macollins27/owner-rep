# Changelog

What changed in each release of Owner Rep, newest first. The full record is the
[commit history](https://github.com/macollins27/owner-rep/commits/main).

## Unreleased

- **The rep's brief is shorter and plainer.** The rules the watch, Brief me and the second
  asking read had grown by patches to about 5,000 words per call, with 35 to 44 "never"s and
  many rules said two or three times. They are rewritten as one system prompt of sections, each
  rule said once with its reason, and the rules that decide an answer restated in a line each
  after the record. Each call now sends about 3,300 words with at most one "never" and no capitals for
  emphasis, and a test holds every call to its size target.
- **Text in the session cannot pass as the record's end or as the owner.** The record and the
  owner's messages are fenced in tags that end in a random code made once per session, and any
  such tag found inside is printed harmlessly, so an agent cannot close the fence by guessing it.
- **A step held for your go-ahead reaches you as a question.** A briefing could call a send held
  for your go "your decision, not a gap" and ask nothing; the card now lists each decision that
  is yours (a go-ahead to publish, send or pay) as one plain question, also while the agent is
  rightly holding the step.
- **The message asks a non-builder to look, not the agent to re-check.** Where nobody but the
  agent had read the result, a message could ask the agent to re-run its own line-length and
  character checks. Checks are now asked for only to prove a fact; whether the result works or
  is good is asked of a hands-on look at what the customer gets, by someone who did not build it.
- **A condition is not marked shown on a look nobody made.** The watch and Brief me could mark
  a "works" condition shown "by the check" when no check had run. They now write only the looks
  the record shows, by whoever made them; their own reading of the record and the agent's own
  look leave the condition open.
- **A narrowed plan step is flagged.** The plan walk takes a line for each thing a step names, so
  a step done in part reads as part left out, and the agent's own word that it narrowed or left
  out part of an approved step reads as looking dropped.
- **Briefings and messages are short again.** Each card part asks for one or two sentences first,
  each gap gives its reason in a few words, and the message stays under 150 words.
- **The replay rebuilds calls with this change.** `/owner-rep-replay` takes `rewrite`, the edit
  that turns a watch, briefing, second-asking or own-words call saved by the build before into
  what this build sends.

## 0.7.7 (19 November 2026)

- **Every button stays on screen on a 24-row terminal 60 columns wide.** The row's buttons
  wrapped to two rows where one was counted, so Brief me fell out of view and the digit typed
  into the prompt; the row now counts its buttons as they wrap, and on a band of three rows (a
  24-row terminal whose status line takes five) drops the empty line above it, and on a band of
  two (the status line's usage line wrapped to a sixth) the status beside the buttons. A heads-up above
  the row now fits its line, its why and the row's head into the rows left, line first, and on a
  band too short for the row beneath it leaves out the row's buttons, which have no digits under
  a note, so the note's digits stay in view. On a short band the card shows the result whole
  when dropping the empty line above it and the conversation's size makes room, otherwise gives
  it every row the buttons leave, drops the size where the buttons would not fit with it, and
  on a band of two, whose buttons take both rows, leaves out its head.
- **Facts the writer wrote in the tenth live test read as facts.** "a copy of welcome.txt exists
  in the sent folder", "installed as an exact copy of greet-source.sh", "with no trailing
  newline (5 bytes)", "no commits or pushes were made" and "no ... proof report exist" were
  read as works, so the builder's own listing could not close them. The fact reader now takes
  each, and the same shapes saying how a thing behaves stay works.
- **A fact written with its state first stays a fact.** A condition the objective writer wrote
  as "fact: not shown: note.txt exists" was read with "not shown:" still in it, so the fact
  reader refused it and the rep asked for a hands-on look at a plain fact. The reader now
  reads the words the condition keeps.
- **The left-out list folded onto one row reads as sentences.** It joined its items with
  "; " after their full stops ("directly.; The counter was never run"); an item that ends its
  sentence is now followed by a space.
- **A session started from another folder than the one it was recorded in gets its goal.** A
  session recorded in a worktree that was later removed, then resumed or forked from the main
  folder, had none of the owner's messages read, so the row waited on "working out the result
  you want…" and Brief me judged the work against no goal. The rep now searches every project
  folder once for the session it came from, newest first, inside the same 30 seconds.
- **The compacted turn keeps the number the owner sent it under.** An earlier fork of the same
  session, newer and matching as well, was taken as the parent, so the messages before the
  summary were lost and the first one after it was numbered #1. A whole file now wins over
  such a copy, and a copy alone is followed back to its parent.
- **Left out no longer names a plan nobody approved.** After a compaction the rep sees nothing of
  the agent's turn before an older message, and it took go-ahead words such as "keep going"
  for a plan approval, a different message on different runs. Only words that accept a plan
  count now, and steps a reader guessed for a plan it never saw are left off the card.
- **The replay rebuilds calls with this change.** `/owner-rep-replay` takes `unshown`, the edit
  that turns an objective call saved before 0.7.7 into what this build sends.

## 0.7.6 (19 November 2026)

- **Check it works where Claude Code comes through mise.** Where `claude` is a mise shim and the
  project holds a `mise.toml`, the check stopped about 15 seconds in with "The check could not
  run (exit 1): mise ERROR", because mise refused the project's config in the check's copy as
  untrusted. The check now asks mise, from your home, where your own tools are and starts
  Claude Code and pnpm from there by full path, with mise's shims off their command path, so
  nothing in the project's mise config, or an env file the agent wrote, runs outside the
  fence. This holds whichever tool is the shim: with only `node` from mise, the check still
  runs no shim, since pnpm would start node's. mise is asked once, when a session starts with
  you at the prompt, before the agent has run anything. A check started from your home works
  too; there alone the home's mise config is the agent's to change, which the rep cannot fence.
  Where mise cannot answer, the check goes through the shim with no env file read and the
  project's mise config ignored, never your own.
- **Copies of cut-off checks are cleaned up.** A check whose Claude Code ended mid-run, or
  closed straight after a check, left its copy of the project in `~/.cache/owner-rep/checks`.
  Each copy now has an owner file naming the Claude Code process that made it, and copies
  whose process has closed are deleted when the next session starts and before each check. A
  running session's copy is never touched, however old; copies left by builds before 0.7.6
  have no owner file and are kept.
- **The rep holds what it found until the record shows something new.** An agent arguing back no
  longer moves its briefing; what the agent ran and what that printed can, and a changed line says
  what is new.
- **A second asking says what the first answer got wrong.** When the rep's briefing breaks a rule
  while work is open, it is asked once more with that rule named and the sentence quoted, rather
  than a list of every rule.
- **The message to send reads like a good prompt.** One line per thing asked, each with what done
  means; a held step named exactly; a closing line saying when the agent is done and what to report,
  in place of "keep going"; and the card's parts and the message kept to set word counts.
- **Check it runs the same way on every machine.** It always uses Opus at high effort rather
  than whatever model you last picked, sees the clock so it starts its answer in time, reads what
  the agent changed before judging it, and keeps its standing rules apart from this check's facts.
- **A failed objective write is retried at extra-high effort first**, and at maximum effort only
  if that fails too, so the rare retry costs less.
- **A part of done you restate is kept once.** When your later words say a part of done more
  exactly, the rep rewrites that part in your new words and keeps whether it was shown, instead
  of listing the old and new wordings side by side.
- **"Right now" on the card follows the work.** Each look the rep takes reads the step the
  agent is on from the session's record and puts it on the card, so the line no longer shows
  the step from your last message after the agent has moved on. The objective writer now writes
  the step your messages last set, and the rep keeps it current from there.
- **A part of done written with its state first** ("not shown: the pages are built", with no
  "|") keeps that state, and the state word no longer shows in the part.
- **A decision that is truly yours reaches you as one plain question.** The rep asks you only
  about a decision that touches your livelihood or public name, cannot be undone, or goes
  against something you asked for (publishing, sending, paying and anything your guard refused
  among them), and a go-ahead is such a decision, not a chore. When a part of the job waits on
  your go-ahead, the message tells the agent to finish everything else, hold that step, and say
  what it will show you then. A step of a plan you approved whose only job is to prove the
  agent's own work is kept, with a question beside it asking whether you want it kept.
- **One standard of proof.** The rep's reads, its check and its own-words message now name one
  standard for what shows a condition: a fact is shown by the command that shows it and what
  that printed; the result working or being good, by someone looking at the real thing. Where
  proof is missing, the message asks for the one that fits, not a hands-on look for a fact.
  "Not shown" is said plainly and never as a failure, and a claim is called untrue only where
  the record shows the opposite, never on a guess at what the agent's commands did. When the job's account names how good the
  result must be, it says what a person using it would notice, so the condition can close.
- **The rep's reads lost a frame left over from their first version.** Each Heads up look and
  each briefing opened with a block in capitals, written when the look was a copy of the agent's
  own conversation, that said things no longer true (that you had asked it a side question, that
  it shared the agent's context). The look also told the model not to think it over, against the
  effort it runs at. Both are gone; the facts that still hold (it has no tools, gives one answer,
  and keeps secrets out of what it writes) are said once, in the read's fixed instructions.
- **The rep's rules live in one place.** Each Heads up look, each briefing and its second ask
  now share one fixed set of instructions, laid out in named sections, in place of rules split
  between those instructions and the question after the session. The question carries only what
  changes each time: what the rep knows, the request, which points back at the record, and a short
  reminder of the rules that decide that answer. The words are the same rules, moved; they now say
  "the record" for what the rep is shown, so a sentence patching over the old wording is gone. The
  replay can set one change against another with `--base`.
- **The replay can measure a prompt change.** `/owner-rep-replay all --kind watch --variant build`
  sends saved calls from every session both as they were saved and as this version would send
  them, and keeps each reply beside its call, so the two can be read side by side.
- **The rep keeps a log of its own model calls, on your machine.** Each call it makes for itself
  (the job's account, each Heads up look, each briefing and its second ask, and the own-words
  call) is saved under `<config>/owner-rep/calls/`, with the text sent and the reply, so a call
  can be read and sent again to compare a change. A text sent many times is kept once, and a
  session's folder is removed after 14 days with no change, and all of them together are kept under
  about 1 GB, the oldest removed first. Two hidden commands read it:
  `/owner-rep-counts` and `/owner-rep-replay`. Nothing the rep shows you changes.
  `/owner-rep-replay --now` sends a saved call as this version would, at its cap and with its
  end line, to measure what those change on calls saved before them.
- **The rep no longer watches its own check.** The check runs as a Claude Code session of its own,
  and the rep loaded in it and watched it like one of your agents: it kept a record of it, spent
  calls on it and wrote Heads up lines about the checker. It now knows that session, by its folder
  under `~/.cache/owner-rep/checks` or by the `OWNER_REP_CHECK` mark the check is started with,
  and leaves it alone.
- **The check no longer takes on the agent's instructions.** Its own Claude Code run loaded the
  agent's CLAUDE.md, your own CLAUDE.md, your skills and every MCP server, so the checker was told
  how to work as the agent it is meant to judge. It now loads your user-level settings, so your
  own hooks still guard it, the sandbox fence, and agentsview as its only server, and no
  CLAUDE.md, skill, plugin or project setting: your plugins, the rep among them, are turned off
  by name in the check's own settings. The brief tells it the agent's instruction files are in
  the agent's folder, to read when a claim turns on them. To find your agentsview entry the rep
  reads Claude Code's `.claude.json` and takes only that entry.
- **Only someone who did not build the work can sign it off.** Each part of the job is a
  "works" part (the work does what it should, or is good) or a "fact". A works part now closes
  only on a hands-on look by a helper that did not build it, Codex, or the rep's own check;
  a fact still closes on the command and what it printed. Anyone else's look, the agent's
  above all, is kept and shown on the card and on its count line, by who looked, and that part
  stays open. A look signs off only by naming its run as the record prints it, and only when
  the record shows that run finished, said something and changed nothing: a helper that edited
  or wrote in the project, a Codex run allowed to write, piped, backgrounded or run after `||`,
  and a `claude -p` run outside plan mode are the agent's. The card shows the run's own last
  words beside the part. "Fact" now means only saved, committed, pushed, merged, installed,
  deployed, a file holding something or the newest version running; any other part is "works".
  A part you closed reads "closed on your word (#n)".
  A part is a fact only when every clause in it is one: any clause about what something does,
  in any words, or what it does not do ("does not crash"), makes the whole part "works",
  however much of it is a fact, and the rep asks for one claim per part. A fact is read by its
  sentence shape: a thing of the work is saved, committed, pushed, installed or the like, exists,
  or runs the newest code, and only a file or the like holds quoted text or is so many bytes
  long. Each place in the sentence takes only its own kind of word, so no wording of what the
  work does can close as one ("lists the commands", "has 0 crashes" and a quality in quotes are
  "works"), and the rep tells its writer what a fact looks like. A word before the thing that
  says how good it is or what it does ("the bug-free code is committed", "the encrypting tool is
  installed") makes the part "works" too: the words that may stand before the thing come from a
  short list that only says which thing it is (new, local, current, untracked, the project's), so
  a quality no list foresaw ("the resilient tool", "the fast/secure tool") is "works" as well.
  A word counts as a file's name or a path only when it is one (it ends in a file's ending or
  starts at a folder), so qualities joined by slashes or dots ("the secure/fast/reliable tool",
  "the fast.secure tool") or put after the state ("installed (UTF8-compliant)") are "works", and
  "nothing is committed for this job" is a fact. So are the plain ways a job's account names
  facts: a thing "named greet", a text's end notes split by commas ("5 bytes, with no final
  newline"), and "no commit was made for this work"; a name after "named" says which thing it
  is, and a judgment there ("named correctly") is "works". A doing folded into a thing's name
  ("the copies-every-file tool", "the logs-in tool") is "works": a plural word stands only next
  to the thing it names ("the logs folder"), and "every" or "all" only first. A path inside the
  project with a standard folder in it ("install-case/bin/greet"), "installed as a copy of" a
  file, and "installed with permission to run" are facts.
- **The briefing's buttons always show.** A card could be counted one row shorter than it is
  drawn (an indented line a cell or two past the edge, the size beside the buttons), and then
  scrolled with its buttons below the fold. Rows are now counted as the strip wraps them, the
  buttons first. On a 24-row terminal the strip has about five rows, and a checked card
  now fits them: what the check found goes to one line, then the empty line above the card,
  so a check's error and every button stay in view. When the strip is too short for both the
  error and the line of what the check found, the error is shown whole and that line waits. A
  long error is shortened to "Check failed after answering: …" and the conversation's size
  leaves the buttons row before any of the error is cut. The row above the prompt keeps the
  job's result to the rows the strip leaves it, ending in "…" when it is longer, so Brief me
  and Tell the rep stay in view; the briefing shows the result whole.
- **A reply cut off in its last line is never shown.** The rep asks every model call to end its
  reply with a fixed line, "end of reply". A reply without it stopped early, even one cut in
  the middle of its last sentence, and the rep treats it as it treats any cut reply: it asks
  again, or says so, and never shows the half line.
- **A check that fails says why, and a whole check is never lost.** When a check's run ends in
  an error, such as an expired login, the card now shows that error rather than calling the
  check cut and asking you to press it again. A check that finished its answer before such an
  error, or before a last turn a hook asked for, is read from that answer, and the card still
  says the run then failed, and why. A check that says there is nothing to send no longer leaves the briefing's
  older message on its card for Put message.

## 0.7.5 (14 November 2026)

- **The strip above the prompt is shared properly again on Claude Code 2.1.325.** That build
  draws each mod's row on its own, so the rep stopped seeing another mod's note under its row.
  With a second mod showing a note, both rows offered the same digit key and pressing it did
  nothing. The rep now sees the other rows again: its own note waits and its buttons drop their
  digits while another mod's note is up, and the briefing takes the strip alone. Tests and the
  GitHub run now type-check on 2.1.325, and still run on 2.1.286 and 2.1.310.

## 0.7.4 (11 November 2026)

- **A forked session gets its goal at once again.** A session forked after a compaction
  (copied into a new session), whose own file Claude Code had not finished saving when the rep
  started, could take an earlier fork of the same session for the one it came from. That
  earlier fork holds none of the owner's messages, so the rep had nothing to work from and
  showed "working out the result you want" until the Rep button was pressed. It now passes over
  such a copy and reads the owner's messages from the session it really came from.

## 0.7.3 (11 November 2026)

- **Tests and reviews are good work again.** The rep no longer treats tests, code reviews,
  plan checks, second readers or planning as waste, and its message no longer tells the agent
  to stop them. What it flags as waste is anything built only to prove the agent did its own
  work: scripts confirming its own steps ran, logs kept as evidence, graders approving its own
  output, guards on its own edits, proof reports. The sign-off is still someone who did not
  build the thing using it and trying to break it; a test or review never stands in for that.

## 0.7.2 (11 November 2026)

- **Only the part you said yes to counts.** When you approve part of the agent's message, the rest
  of it and the agent's other messages add nothing to your goal, and the agent saying some of the
  work is yours to do never excuses it from "done".

## 0.7.1 (10 November 2026)

- **Hold one step, finish the rest.** Every message-writing read now tells the agent to
  finish the other work while one step waits for your go-ahead, and say what it will show
  you then. The stop-check keeps a hold on a named outward step, such as publishing or
  sending, while still removing instructions to hold the whole job.

## 0.7.0 (10 November 2026)

- **A plan you approved is your ask.** The rep used to keep only the last 400 characters of a
  plan you said yes to, and treated it as the agent's idea, so a step could be dropped without a
  word. It now keeps the whole plan for as long as the job is open, reads it whole, and holds each
  step as part of "done". A yes never approves more than the text it answered, and the agent
  can't approve anything for you by saying you did.
- **The Heads up warns when a step looks dropped.** Each look walks your approved plans step by
  step against what the session shows, and says so when a step has no sign while later work
  goes on, or when the agent's own full list leaves it out. It says only what it can know: that
  the record does not show the step done, never that the record holds nothing of it.
- **The plan screen counts.** A plan you accept or edit on Claude Code's plan screen is held the
  same way, your edits included. A plan you turn down stays beside your note, and none of it is
  taken as approved.
- **The plan you saw is the plan held.** If the agent changes its plan file while the plan
  screen is up, the rep holds the plan the screen showed you, not the changed file, and its
  record shows the changed file marked as one you did not approve; a plan you
  edit there is held with your edits. A note you type as you approve it ("approve with this
  feedback") is read as your own words beside that plan, never as the agent's output.
- **The rep sees the whole turn you answered.** The agent's visible text is saved as it streams,
  in its own checked file, so a yes is read against what was on your screen.
- **The Heads up and the briefing read the session's record.** They no longer use a copy of the
  agent's conversation, so what they send is what the mod builds, every cut is marked, and they
  say what they could not assess instead of guessing. See "What it can reach".
- **Sessions the rep did not watch are read back.** Opening a session it holds no record of
  brings in the agent's words before your messages and your plan-screen answers, marked as read
  back.
- **The rep tells you what it could not read.** A plan that was too long, a copy that was lost, or
  a store that was full gets a plain line on the row and the card.
- **What the agent says about its own work sets no limit on yours.** When the agent's turn says it
  installed nothing, changed nothing or will ask first, the rep no longer writes that into your
  goal as a limit or part of "done". Only steps of a plan you approved come from the agent's turn.
- **A yes closes what was waiting on it.** When you asked for a plan and to be asked before
  anything is built, approving the plan now counts as done for those requests. The card no
  longer asks you to settle them, and everything else you asked for stays as you said it.
- **Older Claude Code builds still get a reading.** Claude Code 2.1.286, the oldest build the
  rep supports, takes the record only as one text, and the rep now sends it that way there.

## 0.6.0 (10 November 2026)

- **The rep judges the work itself.** Its standard is the best work the trade can produce,
  and it says when the work passes the agent's checks but is plainly not the best it could
  be: weak pages, generic words, a design a customer would not trust.
- **Proof is someone using the real thing.** The agent's own tests passing no longer counts
  as proof that the product works. What counts is someone opening it, using it the way you or
  a customer would, and trying to break it.
- **It watches where the effort goes.** When more of a session goes into the agent checking
  its own work (tests, check scripts, graders, rule books, review rounds, proof reports) than
  into the product, the rep says so, and it counts checks the result does not need as waste.
- **Its message never asks for machinery.** The message it writes for you to send asks for
  the missing work and what better looks like, and where proof is missing, a hands-on look.
  It never asks for new tests, scripts, counts or reports.
- **A routine is not the goal.** The rep's account of what you want no longer lists a routine
  followed or a brief's steps carried out as part of "done"; it holds the result they serve.
- **Check looks at the product.** The paid check opens what was built where it can reach it,
  judges it against the best in its trade, and reports how the session's work was split.

## 0.5.2 (30 October 2026)

- **The card always carries a message while the work is open.** Before, the rep could leave
  the message box empty while parts of "done" were still open, and you had nothing to send
  the agent. An empty message now counts as a card to fix: the rep asks once more, writes it
  in its own words if that fails, and only then falls back on its fixed list of what is
  open. A good card with only the message missing keeps its meaning, next step and what
  stands. When everything is shown or closed, an empty message is still fine.
- **The fixed list holds a step that needs your word.** It tells the agent to hold any step
  that needs your go-ahead, finish the rest, and say what it will show you when you give it.
- **The brief says plainly when to write the message.** The rep is told to write it while
  anything is open or not shown, in the briefing and in Check it alike.
- **A quote is read the right way round.** A stop inside quotation marks that reports what
  someone said is left alone however long the sentence is, including what a log reads,
  shows or prints. A quote the sentence tells the agent to obey, or one that stands after
  the report has ended, is read as the order it is.
- **A number left beside a removed sentence stays.** Taking out a stop sentence no longer
  takes with it a figure that was the line's own text and not a list number.

## 0.5.1 (30 October 2026)

- **The message to the agent keeps everything but a stop.** While part of "done" is still
  open, the rep never lets the card tell the agent to stop. Before, one sentence such as
  "You can stop now." at the end of a good message threw the whole message away and
  put a bare list of what is still open in its place, with every finding the rep had made
  lost. Now only the sentences that tell the agent to stop, call the work finished or hand it
  back to you are taken out, and the rest of the message stays word for word. The bare list
  appears only when nothing useful is left, such as a message that was only "Great work.
  You can stop now."
- **Fewer good messages mistaken for a stop.** Five kinds of sentence are no longer read as
  telling the agent to stop: a push to finish more before it stops ("Two things before you
  stop."), a wait on someone other than you ("Wait for a reply from the lead."), a stop on a
  blocker that tells you exactly what stands in the way ("If the guard refuses the push,
  stop and tell me exactly what it refused."), a wait for your word before something
  only you decide, such as submitting a form, sending an email, publishing, paying or
  signing, and a request to find what let the agent stop or hand work back to you ("Name
  which instruction let you stop ordered work and hand it back to me."). A wait for your go-ahead before merging, pushing, deleting, deploying or
  installing is still treated as a stop, since those are the agent's to do.
- **A stop once something is done is caught.** "You can stop once the README is fixed." and
  "You can stop after that." were let through before; they are now taken out like any other
  stop.
- **The first reading's message is tried before the list.** When Brief me's second reading
  and the rep's rewrite both leave nothing useful, the message from its first reading, with
  any stop taken out, goes on the card before the bare list does.
- With no objective written yet, a sound message stands in the same way instead of being
  replaced.
- **Only the stop is taken, and only where it is said.** A stop on a blocker is let through
  only in the part of the sentence its "if" opens, a wait is let through before an outward act
  only when that act is what it waits on, and signing off or applying a technical change is
  not an outward act. Taking a sentence out never leaves a bracket or quote without its
  partner, and a message that is only praise, thanks, a question or a pointer to an earlier
  message is not chosen for Brief me's card.
- **Narrower exceptions.** A wait for your word "on" a button holds only for a button you
  alone press toward the outside world (Submit, Send, Publish, Post, Pay, Sign, Apply, Approve,
  Purchase), so "Wait for my word on Build." is taken out. After "do not publish it", a wait on
  you is let through only as the very next part ("Do not publish it; wait for my word on
  that."), not after other work. A blocker whose condition is negated ("If the remote is not
  missing, stop") is no blocker. "Run the tests and then stop when they pass." is caught. What
  is left after a stop is taken out counts only when it holds a letter or a digit, so a lone
  "..." gives the list of what is still open.

## 0.5.0 (26 October 2026)

- **The card fills the space it has, most important first.** It opens with the result you
  want and a count line under it ("Done means 6 things: 1 shown, 5 open"). Then come where
  the work stands, what the agent's last message means, what was left out and what should
  happen next, whole while there is room and shortened a row at a time when there is not.
  The line saying the rep revised its reading of what you want stays with them. The message
  to the agent takes every row that remains, and the smaller extras come last.
  A taller window shows more of the card; in an 80-row terminal an ordinary card shows
  whole. Before, the card was cut from the body up, so the message often showed one line
  while rows sat empty.
- **The buttons stay on screen in a short window.** In a terminal of about 24 rows the card
  had no room for the message's box and its buttons, and the buttons slid out of reach. Now
  the box gives way there, and Put message in prompt still carries the whole message.
- In VS Code, whose card scrolls, the card is drawn whole in the new order, nothing cut.

## 0.4.1 (26 October 2026)

- **Tested on more than one Claude Code build.** Every change now runs the tests on Claude
  Code 2.1.286, the first build with mods on by default, on 2.1.310, and on the newest
  release. The mod needs 2.1.286 or later.
- **Main's GitHub run shows passing after a merge.** A merge whose pull request already
  passed, with the same files, passes without running the hour of tests again, where
  before it showed as skipped.
- The independent check's instructions say "this machine" where they said "this Mac",
  which was wrong on Linux. The code comments name no machine and call the owner "the
  owner".

## 0.4.0 (26 October 2026)

- **The rep speaks of the owner, never of "him".** The row and the card used to read "He
  wants…" and "His note…", because the rep was written around one owner. Every brief now
  calls the owner "the owner" and writes to the owner as "you", with no guess at who the
  owner is. The rep's account of the job is written as the thing the owner will have ("A
  to-do command with tests, a README and a passing GitHub run"), never as a sentence about
  the owner. The gate that keeps a card from telling the agent to stop reads a message in
  the owner's voice ("wait for my reply") as the owner's, and the neutral forms ("the
  owner's reply", "let them decide", "ask her") too. Records written by earlier versions still
  read.
- **A push that changes only prose gets no GitHub run**, and a branch gets one run through
  its pull request instead of two.

## 0.3.0 (25 October 2026)

- **The briefing's gate works part by part.** While part of "done" is still open, a card is
  never allowed to tell the agent to stop. Before, a refused card lost its meaning, next step
  and message to fixed text. Now the meaning is still the rep's, but the model's own next
  step and message stand unless they say stop or are empty.
- **A card refused twice is written in the rep's own words.** One plain model call rewrites
  the replaced parts, so the card names what the agent actually got wrong, not just the
  open conditions. A reply that comes back cut off mid-sentence is never shown. The fixed
  text stays as the last net.
- The gate reads the natural ways a message says stop, and a whole message may end in a list
  item.
- The session record keeps how many reads each card took and what came of the rewrite.
- Tests and the GitHub run are on Claude Code 2.1.310.

## 0.2.0 (23 October 2026)

The first tagged release. It covers everything since the first version was built on
13 October 2026.

- **The row, the watch, the briefing and the check**: one row above the prompt, a "Heads up"
  when something costs you, a briefing card with a message ready to send, and an independent
  check that marks each claim holds, false, not shown or since then.
- **The rep's own account of the job.** It is written by a call of its own from your messages
  alone, held in parts (the result, what it is for, what "done" has to show, the step now),
  and kept until every part of "done" is shown or you let it go.
- **Notes to the rep.** Start a prompt with `Owner rep:` to steer the rep. The agent never
  sees the note.
- **A fenced check.** The check works in a throwaway copy inside Claude Code's sandbox, with
  writes to your real work denied and the network closed.
- **Claude Code for VS Code.** The rep draws in the editor's chat window from extension
  2.1.310: the card whole, the text to the box's edge.
- **The Heads up draws above the row**, which keeps its buttons beneath it.
- **Windows.** Your messages are read through Git for Windows' own commands. The check is
  off on Windows, where Claude Code's sandbox is off, and the card says so.
- **Sessions that were reopened, resumed, forked or compacted** have your messages read back
  from their transcript files, so the rep knows the job.
- **Drafts stay the rep's.** A message the rep wrote and you sent is never mistaken for your
  own words, across reloads and sessions.
- **Tests**: the test kit, a doctor that plants known defects to prove the tests catch them,
  live scenarios in real sessions, and a GitHub run on Ubuntu, macOS and Windows.
