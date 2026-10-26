# CLAUDE.md

Guidance for Claude Code, and for anyone else, working on this repository.

## What this is

The owner rep is a Claude Code mod (plugin) that oversees a coding agent on behalf of the
person who owns the work and does not read code. It draws one row above the prompt, speaks up
when the agent cuts a corner, and briefs the owner when they press the Rep button.

Where to read:

- `README.md`: what the rep does, for the owner who installs it. It is also the listing text
  in Anthropic's plugin directory.
- `docs/how-it-works.md`: the problem, the design decisions and the judging method, for an
  engineer. Read it first when changing how the rep behaves rather than its plumbing.
- `docs/reference.md`: the rules of the code, named by the functions and constants that hold
  them. Read the part you are changing before you change it, and keep it true when you do.
- `docs/testing.md`: the testing design (unit tests, live sessions, and the doctor, which
  plants known defects to prove the tests catch them), with a status line per part. Read it
  before adding tests, and keep its status lines true.

## Commands

```
claude plugin validate .        # manifest, hooks, and a report of every $ call and state key
claude plugin test .            # runs every *.test.ts(x); all the tests are in tests/rep.test.tsx
python3 tests/doctor/doctor.py  # plants each known defect in a throwaway copy; the suite must fail on each
tests/live/live.sh              # on demand: real sessions of this checkout in tmux, the strip captured to tests/live/captures
npx -y -p typescript@5.9.3 tsc -p tests/ci/tsconfig.json --noEmit   # type check, as CI runs it
```

`claude plugin test` has no filter flag; run the whole file, which takes a few seconds.
`python3 tests/doctor/doctor.py --shard K/8` runs every eighth defect, as CI does.
`claude plugin validate` reports one expected warning, that a root `CLAUDE.md` is not shipped
as plugin context: this file is for work on the repository.

The type check reads `tests/ci/types/`, a pinned copy of the mods API's declarations for
Claude Code 2.1.310, the build CI type-checks against; move the two together. `tests/ci/declarations.sh` fails the run
when they differ. What CI runs on each push is in `docs/reference.md` under "Tests on GitHub".

## Conventions

- **Claims match the code.** Every claim in the README and `docs/how-it-works.md` is something
  the code shows. A change to what the rep reads, runs, keeps or sends also changes the
  README's "What it can reach" and `PRIVACY.md`, since the plugin directory's security scan
  reads the README for that.
- **Changelog.** `CHANGELOG.md` gets a line for each release.
- **Pure core, thin adapter.** `hooks/rep.ts` is pure functions and constants with no `$`;
  anything that can be unit-tested lives there. `hooks/register.tsx` is the engine side:
  hooks, state, the store record, the band render and the check run. `types/index.d.ts`
  declares the mod's state keys and the shapes the render reads.
- **Every program through `hostArgv`.** CI's `tests/ci/host-calls.sh` fails a hook that runs a
  program any other way, so the same code runs on macOS, Linux and Windows.
- **Testing hooks.** The test kit's `$.tool.call`, `$.prompt.submit` and other engine calls run
  through this mod's hooks as a session does. Await the call before mounting: a call left
  unawaited has not started when the next line runs. `$.model.fork` and the band render are
  stubbed in the kit; the check step is tested through `checkArgv`, `checkPrompt` and
  `parseCheck`, never by spawning a real run. A tool the typings do not list (an MCP tool,
  `Grep`) is called from a test with `as never`.
- **Never commit compiler output.** `.gitignore` drops `*.js`, `node_modules/` and
  `.claude-plugin/types/`.
- **No keyboard chord for the Rep button** without a binding shown working: band buttons use
  bare digits because from the prompt box only a digit presses one.
- **Icon.** The listing icon is `.claude-plugin/icon.png`, named by `icon` in `plugin.json`;
  its source is `docs/brand/sign.svg`. The directory takes the icon only at the first
  submission.

## Installing

`/plugin install owner-rep --marketplace macollins27/owner-rep`, or
`claude plugin marketplace add macollins27/owner-rep` then
`claude plugin install owner-rep@owner-rep`. To run a working copy in one session,
`claude --plugin-dir <path to this folder>`.
