# Changelog

What changed in each release of Owner Rep, newest first. The full record is the
[commit history](https://github.com/macollins27/owner-rep/commits/main).

## 0.3.0 (25 October 2026)

- **The briefing's gate works part by part.** While part of "done" is still open, a card is
  never allowed to tell the agent to stop. Before, a refused card lost its meaning, next step
  and message to fixed text. Now only the parts that say stop are replaced, and the model's
  own sound next step and message stand.
- **A card refused twice is written in the rep's own words.** One plain model call rewrites
  the replaced parts, so the card names what the agent actually got wrong, not just the
  open conditions. A reply that comes back cut off mid-sentence is never shown. The fixed
  text stays as the last net.
- The gate reads the natural ways a message says stop, and a whole message may end in a list
  item.
- The card records how many reads it took and what came of the rewrite.
- Tests and the GitHub run are on Claude Code 2.1.310.

## 0.2.0 (23 October 2026)

The first tagged release. It covers everything since the first version was built on
13 October 2026.

- **The row, the watch, the briefing and the check**: one row above the prompt, a "Heads up"
  when something costs you, a briefing card with a message ready to send, and an independent
  check that marks each claim holds, false, not shown or changed since.
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
