# Archived defects

- `goal-prefix-dropped.patch`: planted "Fix the goal" filling the prompt box without the
  `Owner rep goal:` prefix. The goal pin and its button were removed on 14 Oct 2026 (the
  reading is the rep's own and is never the owner's text), so the patch no longer applies.
  Its successor is `tell-prefix-dropped`, which plants "Tell the rep" filling the box without
  the `Owner rep:` prefix.
- `reading-rewritten-each-look.patch`: planted the reading parser taking a "holds" answer as
  a new reading, so every look rewrote the reading. Since 15 Oct 2026 the looks no longer
  write the rep's account of the job at all: a separate writer call builds the objective
  from the owner's messages, and a "holds" from that writer is not observable as a change.
  Its successor is `looks-write-objective`, which plants a look taking an objective from
  its own answer and so rewriting the objective between the owner's message and the writer.
- `correction-shrinks-result.patch`: planted a correction replacing the whole reading with
  the rebuilt text instead of keeping its first sentence. The first-sentence lock it guarded
  was removed on 15 Oct 2026: a correction now rebuilds the whole objective, and what keeps a
  narrowing message from shrinking the job is that every held condition of "done" stays
  unless a message of the owner's is cited for dropping it. Its successor is
  `condition-dropped-uncited`, which plants the merge keeping none of the held conditions.
- `route-as-result.patch`: planted the briefs losing the rule that a document about the
  result is not the result. That rule was replaced on 15 Oct 2026 by the rule that the
  objective stays open until it is completed, with the case of a session opened for the
  document itself; the test of the briefs checks that wording and that the old sentence is
  gone. Its successor is `stop-while-open`, which plants the gate never refusing a card that
  says stop, or that the work is going well, while a condition is still open.
- `step-look-reads-record.patch`: planted every look reading the session's record, as a cost
  defect. That became the design at bcba3aa ("Task 7a: the readers read
  the session's record, never a fork"), so the behaviour it planted is the mod's own. No
  successor: `tests/rep.test.tsx` asserts the new behaviour directly.
- `in-plans-short-part-usual-share.patch`: planted a dropped part of four words or fewer counting
  as a plan's at the usual 0.4 share rather than three quarters. The short-part share was
  reverted on 20 Nov 2026 (PR #68, fourth round): a real step reworded by one word must count,
  so every part counts at the one 0.4 share, which is now the code. No successor:
  `heads-up-plan-words-any` still plants any step passing.
- `walk-watch-flag-on-carried-drop.patch`: planted the watch not being told that the walk carries
  each dropped line on its own, so its flag could go to a drop the owner already hears. That text
  was reverted on 20 Nov 2026 (PR #68, fourth round) to 38b0dc9's, and the test of `WALK_WATCH`
  holds that text word for word. No successor.
- `heads-up-said-drops-not-kept.patch`, `heads-up-said-likeness-lowered.patch`,
  `heads-up-said-plan-words-unchecked.patch`, `heads-up-said-plan-ignored.patch` and
  `heads-up-sibling-hidden.patch`: each planted a weaker form of the test that hid a dropped plan
  part because a like part of the same plan had been said at an earlier look (the record's
  `saidDrops`, its likeness of 0.75 and its plan-word subset check). That test was removed on
  20 Nov 2026 (PR #68, fifth round): three reviews in a row each found new ways it hid a part
  never said to the owner, so a part the walk shows as dropped is now said at every look where it
  is dropped and nothing said before hides it. Their successor is
  `heads-up-walk-drop-said-before-hidden`, which plants a dropped part named in a line shown
  before being held back.
- `heads-up-repeats-shown.patch` and `heads-up-short-steps-repeat.patch`: planted a dropped step
  being raised again at every look. Since 20 Nov 2026 (PR #68, fifth round) that is the rule: a
  part still dropped is said at every look, a repeat being noise and a part unsaid the harm. No
  successor; `heads-up-walk-drop-said-before-hidden` plants the opposite.
- `heads-up-flag-names-every-part.patch`: planted a flag that holds every word of two dropped
  parts standing for both, so the second lost its "Also looks dropped" line. Since 20 Nov 2026
  (PR #68, commit 1061d6a) that is the rule: `namedBy` names every part a clause of the flag says
  was dropped, and none of them is said again after it. Its successors are `flag-names-one-only`
  (the flag stands for only the longest part again) and `flag-named-subset-hidden` (a part whose
  words all sit inside a longer named part counts as named).
