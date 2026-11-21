# Privacy

Owner Rep collects nothing. It has no servers, no accounts, no analytics and no telemetry,
and its author receives no data from anyone who runs it.

## What stays on your machine

The mod keeps a small store of its own, a JSON file that Claude Code keeps for each plugin
under your Claude Code configuration folder. For each of the 32 newest sessions that hold
anything, it keeps:

- the rep's account of what you want on the job, with its earlier versions, and the results
  of earlier jobs in the session;
- the messages you typed in that session, numbered, each with up to 400 characters of the
  agent's answer before it, and the notes you sent to the rep;
- the fingerprints and sizes of the saved texts listed below;
- the messages the rep drafted that you sent, the last briefing's next step and message, and
  the last three cards' messages;
- the notes the rep has shown, the steps of your approved plans those notes said look dropped
  (up to 40, each with the number of the message that approved its plan, or a short fingerprint
  of that plan's text), and the text of up to
  10 notes other mods drew in the strip, so none is repeated;
- counters of what the rep has spent, and of how its model calls came back and were read;
- a random label of eight letters and digits, made once for the session, which marks where
  the session's record and your messages begin and end in what the rep reads;
- the last 60 helper and Codex runs the agent or its helpers started: each one's tool-call id,
  whether it finished, failed or is still going, whether it changed the work, and up to 300
  characters of its own last words (the end of a helper's answer, or of what Codex printed), so
  a look naming that run can be checked against what the run said.

It also keeps a list of up to 200 of its own drafts from sessions that have left the store,
so a message it wrote is never mistaken for one of yours.

Versions before this one kept every record in one shared list. After the update the mod copies
each record to a place of its own and leaves that list beside them, so a session still running
an older version keeps working; the list, up to 32 more records, some of them sessions the
newest 32 have since pushed out, is removed at the first start after no older version has
saved into it for a week. To tell an older version's later saves from what it has already copied, it keeps
each session id in that list with the time of the copy it saw. Once the copy has finished, a record in
that list it saw is never read again unless an older version saves it again.

Beside the store, in the folder `<config>/owner-rep/sources/`, it saves these texts, each in
its own file checked by SHA-256:

- the agent's whole visible turn before each of your messages (never its thinking);
- a long message of yours, kept whole, and the whole message for a draft of the rep's you sent
  with your words added;
- plans you approved and the part you took, and a plan you turned down, beside your note.

A saved text is kept as long as its message is kept and removed with the session's record. An
approved plan is kept for as long as its job is open, up to 60 a job. When the shared store is
full, the record's manifest and parts go in the same folder, and the files of a lost copy stay
while its loss mark stands.

In the folder `<config>/owner-rep/calls/`, it saves a copy of each model call it makes for
itself in a session: the job's account, each Heads up look, each briefing and its second ask,
and the own-words call. Each copy holds the full text sent (which includes parts of your session,
as listed under "What leaves your machine"), the full reply, the settings, the time it took,
the tokens it used, what the rep read in the reply (counts of the conditions it marked, a card's
words and the rules that refused it) and, for a card, the job's open conditions as the rep held
them, with each one's kind (works or fact), what was seen of it and who looked. A text sent more than once is kept once, checked by SHA-256. A session's
folder is removed once nothing in it has changed for 14 days (except the session starting, so a
session resumed later keeps its calls), and all the folders together are
kept under about 1 GB: past that, the folders changed longest ago are removed first (never the
session starting, nor one changed in the last hour). It is never sent anywhere.
Two hidden commands read it: `/owner-rep-counts` prints the counters, and `/owner-rep-replay`
sends saved calls to the model again, which is a new model call like any other, as they were
saved or with this version's prompt changes made to them. Each reply a replay gets is saved in a
`replays/` folder beside the call it answers, removed with that session's folder under the same
14-day and 1 GB limits. The check's own run is not saved here.

To read which messages you typed, the rep reads the session transcripts Claude Code already
keeps under `~/.claude/projects/`. It copies only the messages you typed, including a note you
typed while approving a plan on Claude Code's plan screen, into the record above. For a session it holds no record of, it also reads the agent's words before each of
your messages and your plan-screen answers back from the session's messages, and saves them the
same way. For such a session started from another folder than the one it was recorded in, it
searches the transcripts of every project there with `git grep` (or `grep -r`) for one line of
the session it came from, and reads your messages from the files that hold it; nothing else of
those files is kept.

When you press **Check it**, the rep reads Claude Code's `.claude.json` (in your Claude Code
configuration folder, or your home) for your agentsview server entry alone, and passes that
entry to the check's own run on your machine. Nothing else in that file is read into the rep,
kept or sent. It also reads the names of the plugins your Claude Code `settings.json` turns on
(in the same folder, else `~/.claude`), only to turn each one off in the check's run; nothing
else in that file is read into the rep, kept or sent. The check's run does not load any
CLAUDE.md, yours or the agent's, nor your plugins.

## What leaves your machine

Only model calls: the rep's own, on top of your agent's, made with your Claude Code
session's credentials. They go wherever your Claude Code is set up to send them, under the
terms you already have with that provider. The rep's calls include parts of your session:

- each Heads up look and each briefing sends your messages, the plans you approved, and the
  session's recorded messages, built from their text and tool fields. Structured thinking, the
  agent's system prompt and the instruction files Claude Code adds to the agent's context are not
  sent; an instruction file the agent opened with a tool is a recorded tool result, and is sent
  like any other;
- each write of the rep's account of your job sends your messages, the agent's words before
  each, and the plans you approved;
- **Check it** sends the session as agentsview reads it, thinking included, and any file the
  check reads.

The check may open what was built and run the project's own commands to look at it, all
inside its throwaway copy and Claude Code's sandbox. The check's commands run with the
network closed except for your own machine. When a session starts with you at the prompt,
the rep asks mise, once, in your home, where your own tools are; where any mise shim is on
your command path, the check starts them from there with every shim off its command path, so
nothing in the project's mise config or env file runs. A session whose working folder is your
home is the one exception: there the home's mise config is the agent's to change, and the rep
cannot fence what it reads from it. Beside each copy the rep writes an owner file holding the
pid and start time of the Claude Code process that made it. At a session's start and before
each copy it reads those files and asks `ps` whether each process is still running (it learns
the pid and start time of other sessions' Claude Code, nothing else), and deletes the copies
whose process has closed. Nothing else in the mod opens a network connection.

## Questions

Open an issue at <https://github.com/macollins27/owner-rep/issues>.
