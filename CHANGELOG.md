# Changelog

What changed in each release of Owner Rep, newest first. The full record is the
[commit history](https://github.com/macollins27/owner-rep/commits/main).

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
