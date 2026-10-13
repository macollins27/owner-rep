# The owner rep mod: designed, built, proven on screen, installed and published in one session

**Date:** 2026-10-13
**Status:** IN PROGRESS — installed; first fresh-session use not yet seen; polish items open
**Evidence:** `HANDOFF_standalone-a99a476b_owner-rep-built_2026-10-13_evidence.md`

---

## Plain-English summary

You asked for a mod of your own, built on the working logic of Claude Code's built-in "You should know" note, that does what your judge was meant to do: watch an agent for you and tell you plainly what is really going on, without borrowing anything from the failed judge build. That mod now exists, is called the owner rep, is installed in every new session, and is public on GitHub in a form written for your job application. It shows one row above the prompt with the result it thinks you want and what the agent is doing now, speaks up on its own when the agent cuts a corner, gives you a briefing with a ready-to-send message when you press 1, and on a further press runs a separate read-only check of the agent's claims against the real files and the session record. Proven on your own screen: the row, the briefing, the self-running watch, the goal fix, and two real checks. Two things are not yet proven: the keyboard chord, which could not work in this session and which you set aside, and the installed copy drawing in a fresh session, since this session ran the development copy throughout. Four small things remain: proving or removing that chord, fresh screenshots for the public page, your decision on a licence, and two lines in the draft application answer that overstate things until a fresh session has shown the rep in use. The next step is to open a new session and see the installed copy draw its row there.

## The Goal

An owner rep mod that meets the judge objective on the built-in note's mechanism, with no side panel and the built-in note's clean two-row look, a button rather than a typed command, a checker that looks at everything it can, each route proven by what you see rather than by tests, the expensive check only when you press for it, and the result installed everywhere and published well enough to stand as your most recent project (U2, U3, U4, U13, U21, U25, U27).

## Where We Are

- Installed at user scope and run straight from the kept folder, so edits reach sessions on a restart or reload with no version to bump.
- Proven on your screen: the row, the briefing on a press, the watch running on its own (its looks count rose from 10 to 12 across one turn), the goal fix through the prompt box, and two real checks that read the session record and ran the type check.
- The check costs about 200 thousand fresh tokens plus around 2 million cache re-reads and takes two minutes; the card states this and the check runs only when you press 3.
- Unproven: the Ctrl+X R chord. Claude Code reads shortcuts only at session start and the binding was written after this session began. You said you will probably never use it.
- Published: 16 commits, a README written for a reader who directs agents, two screenshots cropped to the rep alone, and a draft answer for the application question.
- Still running the development copy in this session; the installed copy has not yet been seen drawing in a fresh session.
- The watch rate is fixed in the code at every eighth request and every stop; a setting you could tune yourself is listed as a later step in the evidence file, along with a fault-planting run of the tests.

## Next Steps

1. Open a new terminal tab, start `claude`, confirm the row draws from the installed copy, then press Ctrl+X then R and note whether the card appears (evidence steps 5 and 1).
2. If the chord does nothing or you will not use it, remove the `action` prop from the Rep button in `~/Developer/owner-rep/hooks/register.tsx` and the `ctrl+x r` line from `~/.claude/keybindings.json` (evidence step 2).
3. Paste fresh screenshots of the current row and card; crop them to the band and replace `docs/row.png` and `docs/briefing.png` in `~/Developer/owner-rep`, then commit and push (evidence step 3).

## Open Decisions

- Should the public repository carry a licence? It is public with none, so anyone can read and copy the rep's judging brief, which is your thinking on overseeing agents, but nobody may legally reuse it. Recommendation: add a permissive one only if you want others to use the rep; for the application alone, none is needed.
- After a week of use, should the built-in "You should know" note be switched off in favour of the rep's watch? Recommendation: keep both for now; decide once the rep's Heads up notes have shown their worth on your real sessions.
