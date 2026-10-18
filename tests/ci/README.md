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

# The host-commands step

The kit stubs `$.process.run`, so no test runs a command the mod builds. `host-commands.mjs`
does, on each system the workflow runs on (Ubuntu, macOS and Windows), with
`node --experimental-strip-types tests/ci/host-commands.mjs`. It imports the mod's own
builders and parsers from `hooks/rep.ts` and passes every argv through `hostArgv`, so the argv
it runs is the argv the mod runs, and it reads each answer as the mod reads it. Against the
two transcripts in `fixtures/` (a session's own file with his typed, pictured, queued, meta
and engine lines and a compaction mark, and a parent holding the same mark), copied into a
scratch folder laid out as `<config>/projects/p1/`, it runs the reads `heldItems` makes:
`humanRead`, `startFind`, `toolLineFind`, `humanReadBefore`, `summaryLineFind`, and the `find`
and `ls -t` that look for a session's file and its folder's newest files. Against a git-like
layout in the same folder it runs the check's questions (`gitUpArgv`, `gitInsideArgv`,
`worktreesArgv` and `pathLinksArgv`, each through `wholeArgv`), its `mkdir -p`, the copy
(`copyArgvs`: the clone, and when it is refused the plain copy into a folder just made) and
its `rm -rf`. Then it checks the signs `windowsOs` reads Windows by: on Windows that `OS`,
`SystemRoot`, `windir` and the working folder each say Windows, on the other two that none
does. Each check prints `ok <name>`; a failure prints the argv, its exit code, stdout and
stderr, and the step ends 1. The last line says how many answered as the mod expects.

On Windows the commands are Git for Windows' coreutils, found as `lookUpHost` finds them:
the first of `winPosixBinCandidates` whose `mkdir.exe --version` exits 0. The transcript
reads must answer there as on the other two systems. A command of the check that does not is
printed as skipped, with its output, and does not fail the step, because the check does not
start on Windows (`CHECK_NO_ROOM`); on macOS and Linux every command must answer. The
fixtures' line ends are read as `\n` whatever the checkout gave, as Claude Code writes its
transcripts, and the repository's `.gitattributes` keeps every file's `\n` ends on a Windows
checkout, where Git would otherwise write `\r\n` and Git Bash would read the carriage return
as part of each command of the shell scripts the run starts.

What stays unshown on a real Windows machine: the mod inside a live interactive Claude Code
there, so the card as drawn, and `$.env.get` reaching the process environment (the script
reads Node's own `process.env`), and the lookup of `claude.exe`, which only the check, refused
there, would spawn.
