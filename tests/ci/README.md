# The type check on GitHub

`tsc` needs the declarations of the mods API, which Claude Code writes into a mod's
development copy when a session loads it and never into a checkout (see the root
`CLAUDE.md`). GitHub has no session, so `types/` here is a pinned copy of those
declarations as Claude Code 2.1.300 wrote them on 14 Oct 2026, the same build the workflow
installs. `tsconfig.json` beside it is the engine's own, pointed at that copy.

The engine stamps its build on the first line of `types/claude-code/index.d.ts` when it
writes the three folders together. `declarations.sh` reads that stamp and `claude --version`
and fails the run when they differ; the workflow runs it before the type check. The first
pin, made on 14 Oct 2026, was in fact from 2.1.296 while the workflow installed 2.1.300,
and nothing said so until this step was added and went red.

When the workflow moves to a newer Claude Code, replace `types/` with that build's
declarations from a development copy, in the same commit; the step is red until you do.

# The host-calls step

`host-calls.sh` fails the run when a hook runs a program whose argv does not go through
`hostArgv`, the one place a command is named for the host it runs on: on Windows Git's
coreutils answer only by their full path, and a bare name finds nothing. The copy's two argvs
(built by `copyArgvs` through `hostArgv`) and the `--version` probe, which runs a full path it
was given, are the only calls let through by name. Write a call's argv on the call's own line,
or the step reports it. It was shown red on 16 Oct 2026 against a trial merge of PR #12,
whose transcript reads ran `grep` and `sed` by bare name.
