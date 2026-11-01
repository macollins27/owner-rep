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
- the messages the rep drafted that you sent, the last briefing's next step and message, and
  the last three cards' messages;
- the notes the rep has shown, and the text of up to 10 notes other mods drew in the strip,
  so none is repeated;
- counters of what the rep has spent.

It also keeps a list of up to 200 of its own drafts from sessions that have left the store,
so a message it wrote is never mistaken for one of yours.

To read which messages you typed, the rep reads the session transcripts Claude Code already
keeps under `~/.claude/projects/`. It copies only the messages you typed into the record
above.

## What leaves your machine

Only model calls: the rep's own, on top of your agent's, made with your Claude Code
session's credentials. They go wherever your Claude Code is set up to send them, under the
terms you already have with that provider. The rep's calls include parts of your session:
your messages, the agent's conversation, and, for **Check it**, the session record and any
file the check reads.

The check's commands run with the network closed except for your own machine. Nothing else
in the mod opens a network connection.

## Questions

Open an issue at <https://github.com/macollins27/owner-rep/issues>.
