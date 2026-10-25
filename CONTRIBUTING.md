# Contributing to Owner Rep

Thanks for helping. The most useful thing you can send is a real case where the rep got it
wrong: it missed something the agent skipped, it flagged something that was fine, or its
message to the agent would have sent the work the wrong way. Use the
[**The rep got it wrong**](https://github.com/macollins27/owner-rep/issues/new?template=wrong-call.yml)
form for those, with the card's text and what the agent had really done.

## Before you change the rep's judgment

Read [How the owner rep works](docs/how-it-works.md) first. Most of the rep is judgment, and
each rule there came from a real session that went wrong. Open an issue that describes the
session before you send a pull request that changes what the rep says or decides, so the fix
can be weighed against the rules already there.

## Run it from a clone

You need Claude Code 2.1.310, the build the tests run on.

```
git clone https://github.com/macollins27/owner-rep
cd owner-rep
claude --plugin-dir .
```

Edits reach the session after `/reload-plugins`.

## Check your change

```
claude plugin validate .         # manifest, hooks, and every engine call and state key
claude plugin test .             # the whole suite, a few seconds
python3 tests/doctor/doctor.py   # plants each known defect; the suite must fail on every one
```

Validation reports one expected warning: a `CLAUDE.md` at the plugin root is not shipped as
plugin context. It is there for people and agents working on this repository.

Type-checking needs the mods API declarations, which Claude Code writes into a mod's
development copy, not into this repository. [How the owner rep works](docs/how-it-works.md#develop)
says where to find them.

## What a pull request needs

- **A test for each change in behaviour**, in `tests/rep.test.tsx`. Await every engine call
  before you read the strip or the store.
- **A doctor entry for each new rule the hooks enforce**: a patch in `tests/doctor/defects/`
  that plants the bug, listed in `tests/doctor/defects.json`, so the run proves the test
  catches it.
- **True docs.** Every claim in the README, `docs/how-it-works.md`, `docs/testing.md` and
  `PRIVACY.md` must be something the code shows. A change to what the rep reads, runs, keeps
  or sends changes the README's "What it can reach" and `PRIVACY.md` too.
- **A green GitHub run** on Ubuntu, macOS and Windows.
- **No compiled files.** Don't commit `.claude-plugin/types/`, `node_modules/` or any `.js`.

Commit messages in this repository say what is now true, in a plain sentence: "The heads-up
draws above the row, which stays beneath it".

By contributing, you agree that your work is released under the [MIT licence](LICENSE).
