# The type check on GitHub

`tsc` needs the declarations of the mods API, which Claude Code writes into a mod's
development copy when a session loads it and never into a checkout (see the root
`CLAUDE.md`). GitHub has no session, so `types/` here is a pinned copy of those
declarations as Claude Code 2.1.300 wrote them on 14 Oct 2026, the same build the workflow
installs. `tsconfig.json` beside it is the engine's own, pointed at that copy.

When the workflow moves to a newer Claude Code, replace `types/` with that build's
declarations from a development copy, in the same commit.
