# The type check on GitHub

`tsc` needs the declarations of the mods API, which Claude Code writes into a mod's
development copy when a session loads it and never into a checkout. GitHub has no session, so `types/` here is a pinned copy of those
declarations as Claude Code 2.1.310 wrote them on 24 Oct 2026, the same build the workflow
installs. The engine writes them beside the mod when a session loads it with `--plugin-dir`,
which the live layer does, so `tests/live/live.sh 1` on the build to pin refreshes the copy
in `.claude-plugin/types/` (the MCP folder is written only when the session has MCP tools
connected; the pinned one is from 15 Oct 2026 and the mod does not use it). `tsconfig.json` beside it is the engine's own, pointed at that copy.

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
builders and parsers from `hooks/rep.ts` and wraps each built argv as the mod does, through
`hostArgv` and, for the git questions alone, `wholeArgv`, so the argv it runs is the argv the
mod runs, and it reads each answer with the parser the mod reads it with. The `find`, `ls -t`,
`mkdir -p` and `rm -rf` argvs the mod writes inline are written out the same way. Against the
two transcripts in `fixtures/` (a session's own file with his typed, pictured, queued, meta
and engine lines and a compaction mark, and a parent holding the same mark), copied into a
scratch folder laid out as `<config>/projects/p1/`, it runs the reads `heldItems` makes:
`humanRead`, `startFind`, `toolLineFind`, `humanReadBefore`, `summaryLineFind`, and the `find`
and `ls -t` that look for a session's file and its folder's newest files. Against a git-like
layout in the same folder it runs the check's git questions (`gitUpArgv`, `gitInsideArgv` and
`worktreesArgv`, each through `wholeArgv`, as `gitRepos` asks them, read by `gitFoldersOf` and
`worktreeDirsOf`), and its path-links question (`pathLinksArgv`, bare, as `pathLinks` asks it)
against a command folder holding a link to a program installed elsewhere in the scratch folder,
requiring `linkTargets` to name the program. Then it runs the copy's commands: `mkdir -p`, the
copy (`copyArgvs`: the clone, and when it is refused the plain copy into a folder just made) and
`rm -rf`. Then it checks the signs `windowsOs` reads Windows by: on Windows that `OS`,
`SystemRoot`, `windir` and the working folder each say Windows, on the other two that none
does. And it checks the home the mod takes (`homeOf`, as `homeFor` calls it): on Windows the
profile folder, `USERPROFILE` written with forward slashes, whatever `HOME` says; on the other
two `HOME`. Each check prints `ok <name>`; a failure prints the argv, its exit code, stdout and
stderr, and the step ends 1. The last line says how many answered as the mod expects, how
many did not, and how many of the check's questions were skipped.

On Windows the commands are Git for Windows' coreutils, found as `lookUpHost` finds them:
the first of `winPosixBinCandidates` whose `mkdir.exe --version` exits 0. The transcript
reads and the copy's commands must answer there as on the other two systems. One of the
check's questions that does not is printed as skipped, with its output, and does not fail the
step, because the check does not start on Windows (`CHECK_NO_ROOM`); on macOS and Linux every
question must answer. On the first Windows run (18 Oct 2026) three were skipped, and each is
a fault the check would have there. `gitUpArgv` asks for the folders above a drive path as
`/C:/…`, since `foldersUp` starts every folder with `/`, and Git's `find` finds none of them.
`gitInsideArgv`'s `*\n*` pattern reaches `find` split and matched against the working folder's
files by Git's runtime, so `find` refuses its arguments. And `gitAnswer`, which reads both git
questions' answers, takes only `entry` lines whose path begins with `/`, so a right answer
would still name no `.git` on a drive. `worktreesArgv`'s `find` answers right, but
`worktreeDirsOf` reads only `tree` lines whose path begins with `/`, so it finds no worktree.
Once the path-links question was asked bare, as the mod asks it (the Windows job of run
39157223612, on c5a7f33, the same day), it was skipped too: `pathLinksArgv` splits the command path on `:`, which cuts the
drive off `C:/…/path/bin`, so Git's `find` is asked for `/Users/…/path/bin`, finds nothing
and prints nothing; `linkTargets` also keeps only lines that begin with `/`, and a Windows
command path separates its folders with `;`. The copy's `mkdir -p`, plain copy and `rm -rf`
pass there (the clone, `cp -Rc`, is refused, as on Linux).

The fixtures' line ends are read as `\n` whatever the checkout gave, as Claude Code writes its
transcripts. The repository's `.gitattributes` keeps every file's `\n` ends on a Windows
checkout too. That is a precaution, taken from Git for Windows' documented default (its
installer sets `core.autocrlf` to `true`, which writes `\r\n` on checkout) and from Git
Bash reading a carriage return as part of a command; no run of this project has shown it,
since the file was in place from the first Windows run.

What stays unshown on a real Windows machine: the mod inside a live interactive Claude Code
there, so the card as drawn, and `$.env.get` reaching the process environment (the script
reads Node's own `process.env`), and the lookup of `claude.exe`, which only the check, refused
there, would spawn.
