# Changelog

What changed in each release of Owner Rep, newest first. The full record is the
[commit history](https://github.com/macollins27/owner-rep/commits/main).

## 0.5.1 (30 October 2026)

- **The message to the agent keeps everything but a stop.** While part of "done" is still
  open, the rep never lets the card tell the agent to stop. Before, one sentence such as
  "You can stop now." at the end of a good message threw the whole message away and
  put a bare list of what is still open in its place, with every finding the rep had made
  lost. Now only the sentences that tell the agent to stop, call the work finished or hand it
  back to you are taken out, and the rest of the message stays word for word. The bare list
  appears only when nothing useful is left, such as a message that was only "Great work.
  You can stop now."
- **Fewer good messages mistaken for a stop.** Four kinds of sentence are no longer read as
  telling the agent to stop: a push to finish more before it stops ("Two things before you
  stop."), a wait on someone other than you ("Wait for a reply from the lead."), a stop on a
  blocker that tells you exactly what stands in the way ("If the guard refuses the push,
  stop and tell me exactly what it refused."), and a wait for your word before something
  only you decide, such as submitting a form, sending an email, publishing, paying or
  signing. A wait for your go-ahead before merging, pushing, deleting, deploying or
  installing is still treated as a stop, since those are the agent's to do.
- **A stop once something is done is caught.** "You can stop once the README is fixed." and
  "You can stop after that." were let through before; they are now taken out like any other
  stop.
- **The first reading's message is tried before the list.** When Brief me's second reading
  and the rep's rewrite both leave nothing useful, the message from its first reading, with
  any stop taken out, goes on the card before the bare list does.
- With no objective written yet, a sound message stands in the same way instead of being
  replaced.

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
