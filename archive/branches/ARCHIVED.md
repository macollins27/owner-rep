# Archived branches

Work from branches that were deleted after their changes reached main. Each patch here is the
part of a branch that its merge did not carry word for word, kept so that nothing a branch held
is lost when the branch name goes. The branch's whole history is also kept as a git archive ref
(`refs/archive/<name>@<commit>`, listed by `delete-merged-branches.py --archived`).

## pr-13-review.patch (26 October 2026)

The branch `pr-13-review` (three commits: the check's commands named for the host they run on,
the Windows sandbox measured as gated off, and grep listed ahead of its use) reached main
through pull request #14, `windows-host`, merge 8daa0c5. That branch went on after the review
commits and rewrote parts of them before the merge, so replaying the review tip into the merge
would add 521 lines to `hooks/rep.ts`, `hooks/register.tsx` and `tests/rep.test.tsx`. Those
lines are this patch: the review's wording of code that main holds in a later form. Nothing in
main depends on them; they are kept for the record.
