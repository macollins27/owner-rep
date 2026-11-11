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
