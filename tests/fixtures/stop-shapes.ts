// Seven messages of the shapes the rep's own messages took when one sentence tripped the stop
// detector though none tells the agent to stop while it could still move the work. Each keeps a
// real message's sentence boundaries, line breaks, lists and paragraphs, and its tripping clause
// word for word; every name of a person, place, employer, project or folder is replaced by a
// neutral one. Each must reach the card whole: through the gate on a refused card and as the
// own-words message.

// Refused environment: a stop on the one allowed command being refused, telling the owner so.
export const REFUSED_ENVIRONMENT = 'Run the one command I gave you, sleep 60, exactly as written, and show me that it ran to completion with no error. Do not run anything else, and do not swap in a different command or a shorter wait. If the environment refuses to run it, tell me that plainly and stop. Say done only after the command has actually finished.'

// Missing remote: a stop on no remote being added, in a message whose only work is pushing to it.
export const MISSING_REMOTE = "Check whether a remote has been added to this repository.\n\nIf it has:\n1. Push main, and show the push output.\n2. Show the CI run that the push started, with the result of each test as the CI printed it. If anything fails, fix it, push again, and show the run passing. Don't stop at a failing run.\n3. Delete the leftover old-parser branch with the branch cleanup tool, and show that only main remains.\n\nIf no remote has been added yet, say so in one line and stop."

// A "before you stop" push to finish more work, the stop words opening a line that ends in a colon.
export const BEFORE_YOU_STOP_COLON = 'Before you stop: your two draft messages each ask a different session to install the newest build. My rule is one install at a time. Say in one line which session installs first and change the second message so that session checks that no install is running and waits for the first to finish before it touches the database.'

// Wait on his word before Submit: an application form he alone sends.
export const WAIT_BEFORE_SUBMIT = 'Before I say submit, two fixes on the Example Labs form. Put the Sample Works project first, above Demo Project, so my current work is what a reviewer reads first, and make that Demo Project location read "Sometown, XX" like the others if the form will keep it. Then print the five projects from the Review page again in order, confirm both file names are still attached, and confirm the Submit button has not been touched. If reordering risks dropping entries again, say so and leave it as it is rather than lose anything. After that, wait for my word on Submit.'

// A "before you stop" push to finish more work: three things, one paragraph each.
export const THREE_BEFORE_YOU_STOP = 'The list is now the one I asked for; thank you. Three things to close before you stop.\n\nFirst, the four copies you matched by name and not by path: the two tool-kit folders, notes-archive, and the report now counted inside a website checkout. For each, say in one line whether the copy really holds the same work as the old folder, by comparing contents or git history, not by name. Where it does not, record the system as having no copy and add it to the short list beside parser-repo.\n\nSecond, the fourteen folders under Code/Old that belong to no system. Do not leave them for a later step. Budget Tracker v2 and my notes repository are my work: add them to the list as systems with their commit counts and "unknown" where the record is silent. For the rest, say in one line each what the folder is, from its contents, and whether it is my work, a third-party checkout, or empty.\n\nThird, where a copy\'s README is only template text, keep the register\'s description as the main one and put the template note second, so no system reads worse than it did before.\n\nCommit these in the same place through a pull request as before and tell me when it is on main. Leave the sorting rule alone until I answer.'

// A "before you stop" push to finish more work: two things in one paragraph.
export const TWO_BEFORE_YOU_STOP = 'Two things before you stop. First, the shared-drive permission is mine to grant, but the board\'s silence about it is yours to fix: build the could-not-see line that counts folders the server was refused, and the install check that tests a read under the shared drive, so my page says when it cannot see a repository instead of calling it "not a repository". Do that as a small slice through a pull request, install it, and show me the line on my page for 2026-09-14. Second, the 512-system list lives in a scratch folder that can vanish; save it, with its merge notes and unknowns, in the private spec folder where the index step will start from it, and tell me the path. Leave the sorting rule alone until I answer.'

// Guard refusal: a stop on the guard refusing the push, telling the owner what it refused.
export const GUARD_REFUSAL = "The new remote is now added. Finish the job:\n- Push main to the remote. Do not push the old-docs branch.\n- Watch the workflow run that this push starts until it finishes. Show the printed result for each of the three Node versions and give me the run's link. If any version fails, fix it, push again and show a passing run.\n- Then delete the spare old-docs branch with the cleanup tool and show the branch list afterwards.\n- Do not change the repository's visibility or settings, and do not create anything else online. If the guard refuses the push, stop and tell me exactly what it refused.\nReport back in plain words, with the printed run result."

// All seven, in the order above.
export const STOP_SHAPES = [REFUSED_ENVIRONMENT, MISSING_REMOTE, BEFORE_YOU_STOP_COLON, WAIT_BEFORE_SUBMIT, THREE_BEFORE_YOU_STOP, TWO_BEFORE_YOU_STOP, GUARD_REFUSAL]
