# Owner rep

A Claude Code mod that watches each session for its owner and briefs him plainly.
One row above the prompt: the result he wants, what the agent is doing now, and
the helper count. A Heads up line when the agent is cutting corners. On a press,
a briefing with the message to send; on a second press, a checked briefing from a
separate read-only run over the session record and the files.

## Install

```
/plugin install owner-rep --marketplace ~/Developer/owner-rep
```

Installed from this folder, it runs from this folder: an edit here reaches a
session after `/reload-plugins` or a restart. No version bump is needed.

## Checks

```
claude plugin validate ~/Developer/owner-rep
claude plugin test ~/Developer/owner-rep
```

Type-check with the engine's `tsconfig.json` laid in `.claude-plugin/types/`.
Built and proven on Claude Code 2.1.296.
