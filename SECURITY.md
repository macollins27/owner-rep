# Security policy

Owner Rep runs inside Claude Code with your permissions and reads your sessions, so a flaw in
it matters. Please report one privately.

## How to report

Use GitHub's private reporting: open the repository's **Security** tab and choose
**Report a vulnerability**. Don't open a public issue for a security problem.

You'll get a reply within seven days. A fix ships as a new release, and the report is credited
unless you'd rather it wasn't.

## What counts

Anything that breaks a promise the README makes, for example:

- **The check's fence leaks**: the check run writes outside its throwaway copy, changes a git
  repository, reaches the network beyond your own machine, or runs where the sandbox did not
  start.
- **The rep can be steered from inside a session**: text from the agent, a tool result or a
  file gives the rep orders, moves its account of what you want, or gets a card to tell the
  agent to stop while part of "done" is open.
- **The rep sends something on its own**: a message reaches the agent without you pressing
  Enter.
- **Data leaves your machine** other than through the model calls your session already makes.

## Supported versions

Only the newest release gets fixes. Update with `claude plugin update owner-rep@owner-rep`.
