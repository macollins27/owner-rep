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
- the notes the rep has shown, and the text of up to 10 notes other mods drew in the strip,
  so none is repeated;
- counters of what the rep has spent.

It also keeps a list of up to 200 of its own drafts from sessions that have left the store,
so a message it wrote is never mistaken for one of yours.

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

To read which messages you typed, the rep reads the session transcripts Claude Code already
keeps under `~/.claude/projects/`. It copies only the messages you typed, including a note you
typed while approving a plan on Claude Code's plan screen, into the record above. For a session it holds no record of, it also reads the agent's words before each of
your messages and your plan-screen answers back from the session's messages, and saves them the
same way. For such a session started from another folder than the one it was recorded in, it
searches the transcripts of every project there with `git grep` (or `grep -r`) for one line of
the session it came from, and reads your messages from the files that hold it; nothing else of
those files is kept.

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
network closed except for your own machine. Nothing else
in the mod opens a network connection.

## Questions

Open an issue at <https://github.com/macollins27/owner-rep/issues>.
