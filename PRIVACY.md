# Privacy

Owner Rep collects nothing. It has no servers, no accounts, no analytics and no telemetry,
and its author receives no data from anyone who runs it.

## What stays on your machine

The mod keeps a small store of its own, a JSON file that Claude Code keeps for each plugin
under your Claude Code configuration folder. For each of the 32 newest sessions that hold
anything, it keeps:

- the rep's account of what you want on the job, with its earlier versions, and the results
  of earlier jobs in the session;
- the messages you typed in that session, numbered, and the notes you sent to the rep;
- the last briefing's next step, and the messages the rep drafted for you to send the agent;
- the notes the rep and other mods have already shown in the strip, so none is repeated;
- counters of what the rep has spent.

It also keeps a list of up to 200 of its own drafts from sessions that have left the store,
so a message it wrote is never mistaken for one of yours.

To read which messages you typed, the rep reads the session transcripts Claude Code already
keeps under `~/.claude/projects/`. It does not copy them anywhere.

## What leaves your machine

Only model calls, made through your own Claude Code session's credentials, exactly as the
agent's own calls are. They go wherever your Claude Code is set up to send them, under the
terms you already have with that provider. The rep's calls include parts of your session:
your messages, the agent's conversation, and, for **Check it**, your project's files and
session record.

The check runs with the network closed except for your own machine. Nothing else in the mod
opens a network connection.

## Questions

Open an issue at <https://github.com/macollins27/owner-rep/issues>.
