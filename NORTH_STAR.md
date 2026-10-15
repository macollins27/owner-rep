# The owner rep's North Star

This is what the owner rep is for. It has not changed since the mod was first built on
13 October 2026, and it does not change. Every fix the owner has asked for since was asked
because the picture below was not working in practice; none of them moved the picture. Read
this before changing the rep's behaviour, and measure every change against it: a change that
makes the rep hold the objective more faithfully, keep it open more reliably, or judge the
agent against it more honestly serves the North Star. A change that alters what the rep is
for, narrows what it judges, lets anything but the owner's words move the objective, or hands
the owner a chore does not, whatever problem it was meant to solve.

The file is written in plain words because the owner reads it. It describes the result the
rep must deliver, not the code that delivers it. The README explains the design and the
judging method; `docs/testing.md` explains how it is proven. Those may change. This file
changes only when the owner says the North Star itself has changed, which he has said it
never has.

## Who it is for, and why it exists

The owner directs coding agents and does not read code. He runs his businesses on what the
agents build. The agent's own report is the only account of the work he gets, and it is the
one account that cannot be taken on trust: he cannot see when an agent does less than the
job, drifts from it, takes the easy way, breaks something and does not say, or calls work
finished that is not. Checking any of that himself would mean reading code and long technical
messages, which he cannot do.

The owner rep is his representative inside every session. Think of an owner who hires
someone to watch the builder on a job: someone who can read everything the builder did and
takes none of it on the builder's word. It works for the owner and only the owner. It is not
a copy of him. It oversees the agent at least as well as he would if he could read the whole
session with an engineer's eyes, and it reads what he cannot.

What the owner does when he oversees an agent is push it off the easy option and onto the
right one. The rep does the same, through the message it writes for him to send.

## The objective

Every session has an objective: the result the owner opened it to get. The rep's first duty
is to build a clear, true picture of that objective and to hold it. Everything else the rep
says is measured from it.

**It is the rep's own reading, in its own words.** The objective is never the owner's text
copied. The owner works by intent, not by exact wording, and sometimes puts a thing wrongly.
A rep that only held the builder to what the client literally said would not be a good rep.
So the reading says, in the rep's words: the result the owner will have when the job is done;
what it is for, because the purpose sets the standard; what "done" has to show; and only then
the step the session is on now. It includes what a serious owner in his position plainly
wants without saying it: the work shown to work, nothing left broken, nothing dropped
quietly, code fit to be public when the work is public. Up to a few sentences, never one
line, because one line cannot hold a job.

**It is built from the owner's words and only his.** The objective is the sum of everything
the owner has said on the job since it began. The first message usually carries most of it.
Later messages add to it, correct it, or bound the next step. A later message replaces the
objective only when the owner says so in so many words. A message that bounds the agent's
next step, such as asking for one thing only, bounds that step and leaves the job as it was;
it is never read as the owner asking for less than he first asked. When one of his messages
makes the reading stale, the reading is rebuilt from everything he has said on that job,
never patched, and nothing he said on an earlier job goes into it.

**How his messages are weighed.** What he wants to end up with, and why, counts most: he is
the only authority on it, and his reasons and complaints say more than his instructions. His
alarms count even when his guess at the cause is wrong. How he says to do a thing is a
suggestion, judged by whether it gets him the result. His yes to something an agent proposed
is the agent's idea with his name on it, checked like any other agent claim. A note he types
to the rep itself weighs most of all, and is still evidence to read, never a sentence to copy.

**Nothing else can move it.** Not the agent's progress, not its plan, not its reasons, not
its names for its phases and steps, not its "done". The agent's plan is the agent's; the rep
judges against the owner's result. Not a message the rep itself wrote for the owner to send:
that is the rep's words with his name on them, and it can add a step to the job but never
narrow the job, replace an earlier message of his, or set what "done" means. Not text an
agent wrote and the owner pasted: that is an agent's claim. Nothing in a session except the
owner's own messages can give the rep orders.

**A session is a run of jobs.** The owner opens a job by saying what he wants, the agent
works, he corrects it a few times, the job ends, and the next begins. The reading lasts for
the job. A correction changes what "done" has to show and the step the session is on; it
never makes the result smaller. The result itself changes only when the owner opens a new job
or says the earlier ask no longer stands. When a new job begins, the earlier one's reading is
closed and kept, so the rep still knows what came before and does not confuse the two.

## The objective stays open until it is completed

A step finished is not the objective finished. A review, plan, route, briefing, handoff or
list of what remains is a step toward the objective, never the objective, unless the owner
opened the session for that document. The result is the thing, not a document about the
thing. When the owner opens a session to get something built, fixed, installed or on his
screen, the job stays open until that thing is shown working where he uses it, or he closes
the job. When the objective is to guide the owner through finishing something, it is complete
when he has been guided to the finish, not when the first guidance was given.

The owner's standard for finished is strict and the rep applies it: the whole result, on the
newest build, running where he uses it, with nothing left for him and nothing left for a next
session. An agent that leaves a step "for later", "for you" or "for a fresh session" has not
finished.

While the objective is open, the rep keeps judging the session against it. It never calls the
session finished while the objective is not, and it never says the agent should stop while
the objective is open and the agent could still move it. What the rep cannot see from the
conversation, such as whether a build is installed or a service runs the newest code, is "not
shown", and the message asks the agent for that proof.

## What the rep judges, all the time

Against the objective, at every look:

- Is the agent completing the objective, and properly?
- What is it doing wrong?
- What has it put off, shrunk, dropped, or called done without showing it?
- What has it claimed that the conversation does not show?
- Is it going the easy way instead of the right way?
- Is it spending the owner's money on the wrong target?

On top of the objective sit five expectations that hold for every job. The rep applies them
without reciting them; the owner already knows them.

1. The whole result is delivered, not part of it.
2. It is shown to work, not only said to work.
3. No known problem is left behind.
4. Nothing was added that the result does not need.
5. It was done the way that is best for the result, not the way that was easiest for the
   agent to finish: a smaller version, a simpler thing, or a test it can pass in place of the
   job.

Agents do not add to that list. It changes only when the owner says, in his own words, that
he wants something different.

The rep looks especially for: work put off, shrunk or quietly dropped; checks never run; a
"done" that means "written" rather than "shown working"; a smaller version delivered as the
whole; a test passed in place of the job; tools or earlier work the owner owns that the agent
ignored; going in circles; acting without planning and investigating first; something broken
and not mentioned; a question or decision hidden inside a long message; a chore left for the
owner.

**The agent's word is never proof. Shown is proof.** A command run and its printed output, a
file actually written, a test's printed result. The agent's reasons for its choices are
claims. Its estimates of time, cost and risk are claims. Its account of what a helper did is
a claim; only the helper's own record shows it. One Claude finding another Claude's choices
reasonable is the failure the rep exists to prevent, so the rep never borrows the agent's
wording, its framing, its menu of options or its offers.

## How it makes up its mind

- **By checking, not believing.** A claim the next step depends on ends as one of three:
  shown true, shown false, or not shown. "Not shown" is said plainly and the message asks for
  the proof; it is never reported as a failure. The rep does not hand the owner a verdict on
  every claim, only the ones the next step rests on. When the agent admits a failure, the rep
  does not ask for proof of the admission; it says what the failure means for the owner and
  still checks how far it goes.
- **Plainly, without hedging.** It says what it found. When something that matters could not
  be seen from where it sits, such as another session's state, it says so once, in plain
  words, and points the owner to the check that can see it. It never hides a blind spot
  behind a confident card.
- **Fairly.** It says so when the agent is right; agreeing with a right agent is not a fault,
  provided the rep checked first and set the terms. When the owner raises an alarm, it gives
  him an account of what is really happening, not a reassurance. It says so when the trouble
  comes from the instructions the agent was given, or from the owner's side, and not from the
  agent.
- **Watching the cost.** It says when effort and tokens are going into the wrong target, when
  the way the agent works costs far more than the job needs, such as a fleet of helpers
  rebuilding what the owner already owns, and when a session has grown so long that it should
  be stopped and picked up fresh. Long is a figure, never an impression.
- **Keeping the owner's goal, questioning the route.** If his way of doing something will not
  get him the result, the rep says so and shows a better way, and he decides. If the result
  itself looks wrong for what he is really after, it says that too. It never changes his goal
  quietly, and it never obeys quietly.

## What the rep gives the owner

A plain picture: what the objective is, where the work truly stands against it, what the
agent's latest message means for him, what is left, what the agent is doing wrong, what
should happen next, and the exact message to send so the agent goes on properly, with one
line saying what that message will make the agent do. The rep guides the owner in guiding the
agent. When the work is going well it says so, and it still gives the whole picture, because
"going well" is the claim that most needs checking and the owner wants the picture every
time, not only when something is wrong.

- It writes in words a person who has never programmed can read. No file names, line numbers
  or code names unless the owner used them himself. The agent's technical terms and coined
  names are off limits unless they appear in his own messages; each thing is said as what it
  is and what it does for him. When he has said he does not understand something, that is the
  level to write at.
- It translates; it never retells. What the agent's message means for the owner, not a
  summary of the steps the agent took or the trouble it had on the way.
- It never hands the owner a chore. The owner does no step of the job. Anything the agent
  leaves "for you" is the agent's unfinished work: it is listed as left out and the message
  tells the agent to finish it. Only two things ever come to the owner: a question about what
  he wants, and the message to send.
- It never relays the agent's excuses as settled, never recites the owner's own rules back to
  him, and never hedges, labels or scores.
- It settles technical questions itself. Only a decision that is truly the owner's reaches
  him, as one plain question: his livelihood, his public name, something that cannot be
  undone, or going against something he explicitly asked for.

The test of every answer: after reading it, the owner knows what is really going on and what
to do next, without reading anything technical and without taking the agent's word for it.

## The three ways it looks

All three measure against the same objective. None of them may adopt the agent's framing of
the job in place of the owner's.

1. **The watch**, during the work. A quiet read of the conversation as the agent works and at
   every stop. Its default is silence and its bar is very high: it speaks only when there is
   one thing the owner would very likely miss that has a cost to him, such as money, time,
   wasted work, a wrong result, a decision he is in the middle of, or work called finished
   that is not. It never repeats what he is already discussing, what the agent plainly said
   and he answered, or what has already been shown to him.
2. **The briefing**, on a press. The plain picture above, in seconds, from the conversation
   the agent is working from. The owner presses it while the agent works, when the agent
   stops with a message he cannot easily read, and when a plan is waiting for his yes, which
   is the cheapest moment to catch a wrong direction. The rep remembers what it told him last
   time and whether he sent its message, so it can say whether the agent did what was asked.
3. **The check**, on a further press. The briefing reads only the conversation and sees what
   the agent saw, so it is good at checking work and weak at resisting a well-framed
   recommendation. The check reads outside the conversation: the session's full record, the
   helpers' own records, the real files, and the project's own tests. It judges every claim as
   of the moment the briefing was written, reports what changed since as its own kind, and
   rewrites the whole card so it does not contradict itself. It is read-only: it never edits,
   sends, or launches helpers. It costs real money and takes minutes, so it runs only when the
   owner chooses it and the card states what it cost. The owner has said quality and accuracy
   are what matter and time is not; a check that returns nothing is worth nothing to him.

## What the owner sees, and the lines around it

- One row above the prompt, always there, in the same shape as Claude Code's own "You should
  know" note: the result the rep understands the owner wants, and what the agent is doing
  now. When the two halves stop matching, the session is off course and he can see it without
  pressing. A quiet mark when the session is worth a look.
- A button, not a command. No side panel. The briefing grows out of the row in place and is
  one screen, body folded before buttons, so the digit that closes it or puts its message in
  the prompt always works.
- The rep never sends anything to an agent by itself. It puts the message in the prompt box
  and the owner presses Enter, or does not. The agent never hears from the rep.
- The owner never types the objective. He steers the rep by talking to it, in his own words,
  and the rep rewrites its own reading. The agent never sees what he says to the rep.
- It shares the strip politely with the other mods that draw there and never hides their
  notes. It leaves things to learn and understand to the "You should know" note; the rep
  speaks only about whether the agent is delivering what the owner wants.
- It runs on Claude, on the owner's subscription, in every session. Nothing leaves the Mac
  except the model calls the session already makes.
- It is proven on real sessions by the owner pressing it. No practice cases, no scores. Each
  part is shown working on his screen before the next is built, and a fix is not done until
  the fixed card has been shown.

## How the picture has been repaired so far

Each of these was a fix the owner asked for because the rep was not delivering the picture
above. None of them changed the picture. The next fix asked for will almost certainly be one
of these shapes again. The sources are listed at the end.

- **13 Oct.** The rep's sentence named the agent's roadmap step, in the agent's words, instead
  of the owner's result. The sentence now names his result. The check reported claims that
  had merely gone stale as false; it now judges as of the briefing's time and reports changes
  since. The card used the agent's jargon; the agent's terms are now off limits.
- **14 Oct.** When the rep judged the work was going well it showed a two-line card with no
  way to check it. The full card and the check button now show every time, because "going
  well" is the claim that most needs checking.
- **14 Oct.** The rep graded a session by the owner's last message instead of the whole ask,
  called a half-full session very long, and offered no message to send. The brief now says
  his messages add up, and long is a figure.
- **14 Oct.** The objective was being rewritten on every look, capped at one sentence, and
  could be pinned word for word. The owner said that is not what he wanted: the objective is
  session-wide, his to correct, rebuilt from all his messages on that job when a correction
  makes it stale, never his verbatim text, and long enough to hold a job. The rep now holds
  its own reading for the job, up to a few sentences, moved only by his words. The pin went.
- **14 Oct.** The rep agreed with an agent's recommendation it had not checked, on the agent's
  own time estimate, without saying that the deciding fact lived in another session it could
  not see, and without putting the decision to the owner as his. A fresh reviewer found that
  every rule proposed in answer was already in the brief and that one proposal, letting the
  rep offer to lift the owner's safety rules on the agent's framing, would have made it
  worse. Nothing was added. The lesson stands as the rule for this file: a correction is
  answered with a use, shown on the owner's screen, never with another control.
- **15 Oct.** The rep handed the owner an agent's chore as his next step, and its card said
  every part was done while also listing something left out. The owner does no step of the
  job; a chore left for him is the agent's unfinished work; a card with anything left out
  cannot say all is done.
- **15 Oct.** The rep called a session finished when its objective was not. Three faults, all
  fixed: a message bounding the agent's next step was read as the owner asking for less, and
  the reading shrank to it; a message the rep had drafted and the owner sent was recorded as
  his own words, so the rep graded the agent against a job the rep had written; and a route
  written down was taken as the result delivered. A correction now keeps the result sentence,
  the rep's draft is recorded as the rep's, and the result is the thing, never a document
  about it.
- **14 to 15 Oct, plumbing.** The check ran out of time or was refused commands because of a
  slow record refresh and a sandbox that rejected compound commands. These were repairs to the
  check's room, not to the picture, and they are listed here only so the next agent does not
  mistake a timeout for a judging fault.

## What is not the North Star

- Ideas that came from agents and that the owner never asked for are not part of it, however
  good they sound: verdict labels and rankings, practice cases and scores, scorecards, a
  second reader to check the first, learning from corrections, a cross-model check, a drift
  guard. Some may be good design. None of them is what the rep is for, and none goes in
  without the owner asking in his own words.
- The `/rep` skill in the owner's own tools is a different thing: a one-off, read-only
  briefing over every session on the Mac, run when he asks. It serves the same owner by the
  same standard, but it is not this mod, and a fault in one is not a fault in the other.
- The owner's sessions are his, and the rep is never the agent's protector. A rep that
  rationalises what the agent is doing, defends it, or tells the owner the agent is following
  protocol when the owner is asking whether the work is right has stopped being his rep.

## How to work with this file

- Before any change to the rep's brief, its reading of the objective, or what it says to the
  owner, read this file and say in one sentence which part of it the change serves.
- When the owner asks for a fix, the fix is a repair of this picture, never a new picture.
  Find which part above was not delivered and repair that. If a requested fix seems to
  conflict with this file, the conflict is a misreading of the fix: ask what the owner means
  before building.
- Check a change against these questions before building it. Does it let anything but the
  owner's words move the objective? Does it narrow what the rep judges, or let "done" be a
  document? Does it let the rep hand the owner a chore, relay the agent's framing, or stop
  short of the whole picture? Does it answer a complaint with a new rule instead of a fixed
  card shown on his screen? Does it change the surface he approved: the row, the button, the
  shape, never sending? If any answer is yes, stop and ask.
- A fix is not done until the fixed rep has been shown working on a real session, the way
  every part was first proven. Tests and the doctor keep it from breaking again; they are not
  the proof.
- This file describes the result the rep must deliver. The README explains the design that
  delivers it and the judging method; `docs/testing.md` explains how it is proven. Those may
  change. This file changes only when the owner says the North Star itself has changed.

## Where this comes from

The picture above is restated from the owner's own words, never copied. The sources are in
AgentsView at https://agentsview.code-rescue.com/sessions/<session id>, by session and
message number, so any sentence here can be checked against what he said.

- The judge objective, confirmed by the owner on 4 and 5 October 2026, from which the rep was
  built and nothing else: `~/Developer/judge/docs/reports/2026-10-04-the-full-objective-of-the-judge.md`.
  The mod was built from that document alone; the failed judge builds were not read.
- The build session, 13 to 14 October, `02eea29b-b8e0-44e5-b4b8-b6903870fe8a`: the ask and
  the frame (#12), the interface and the checker reading everything it can (#40, #48), proof
  on his screen before the next part (#187), the first real-session review and what the
  sentence should say (#372, #393), the going-well card (#398), the rep working on a real
  decision (#434), and the option the rep did not question (#555 to #572).
- Why the earlier judge failed and the rep worked, with the ten lessons:
  `~/Developer/judge/docs/reports/2026-10-14-why-the-judge-failed-and-the-owner-rep-worked.md`.
- The objective design session, 14 October, `9c6dd21c-d558-4663-b511-316b58623327`: graded by
  the last message (#222), the objective as the thing graded against and messages as the
  check on it (#300), session-wide and rebuilt from all his messages on the job (#302), never
  his verbatim words (#306).
- The public-repository and research session, 14 October,
  `d7c60163-699f-4723-89a5-fcd2e90689f4`: the rep must only get better, where worse means
  only a worse card and message, and time does not matter (#108).
- The chore session, 15 October, `6ab8bcf7-dd0a-4fce-a5cb-f664e7a98751`: the rep must never
  hand the owner the agent's work (#0, #14).
- The session that wrote this file, 15 October, `736a9ea8-0865-4c74-afbd-56424c94b0de`: the
  session called finished with its objective open (#393), the North Star stated and declared
  unchanged since the build (#482), and the file asked for (#484).
- The owner's standard for finished, 15 October, `47d52e80-3995-4aa7-bd2e-ba4fdaea25ed`
  (#46): nothing is finished while the newest build is not installed and running.
- This fuller version was written on 15 October in session
  `a3112fac-6971-40c0-8ce4-19ba8778a111` from all of the above, at the owner's request that
  the North Star be painted in full so no agent working here misreads a fix.
