# Testing the owner rep

This is the design for how the rep is tested: two layers of tests, each proving something
the other cannot, and a doctor that plants known defects to prove the tests bite. It is a
plan with a status line per part. Build it in the order given at the end, and keep the status
lines true as parts land.

## Why two layers

The rep's code fails in three ways:

- Pure functions in `hooks/rep.ts` (prompts, parsers, the status words, cost arithmetic)
  fail when an input shape was not thought of. The command that begins by setting a
  variable, which drew shell syntax in the strip on 14 Oct 2026, was one of these.
- Hook bodies in `hooks/register.tsx` (what happens on a prompt, a tool call, a turn step,
  a turn end, a button press) fail when the sequence is wrong: a flag shown twice, a stale
  check overwriting a newer card, a note shown while another mod draws.
- The engine wiring fails when a Claude Code release renames a field or stops raising an
  event. The mods API is early access and changes between releases, and this failure is
  silent: the hook is skipped and the strip quietly stops updating.

The first two are proved by the test kit; the third only by a real session.

## Layer 1: the test kit

`claude plugin test .` runs `tests/rep.test.tsx` against the engine itself. The test holds
the engine's `$` and an `on` whose hooks sit beneath the mod, standing for the engine. A call
such as `$.tool.call`, `$.prompt.submit` or `$.turn.complete` runs through the mod's hooks
as a session does, and `$.ui.mount` draws the strip through the mod's render hook, so a test
makes the call and then reads the strip, the store or a toast to see what the hook did.

This was settled by a run on 14 Oct 2026 (a probe mod with three hook styles, each reporting
through a toast, all three reached). An earlier attempt had mounted the strip before an
unawaited call had started, which looked like the kit not reaching the hook. Await every
engine call before asserting.

The sequence rules the hooks enforce, each with a test driven through the kit and a doctor
entry that proves the test bites (added 14 Oct 2026; the objective's rules 15 Oct 2026):

| Rule | Test | Doctor entry |
| --- | --- | --- |
| A flag already shown is not shown again as a note | `rule: a flag already shown…` | `flag-shown-twice` |
| Typing past notes backs the watch off, after the free ones | `rule: typing past notes…` | `watch-never-backs-off` |
| A newer press makes an older check stale; its answer does not rewrite the card | `rule: a newer press…` | `stale-check-wins` |
| A check that lands after a newer press changes nothing on record: its marks are not taken, and the newer card's message stays the one a draft is known by | `rule: a check that lands after a newer press…` | `stale-check-wins`, `stale-check-on-record` |
| A stop while the card is up and a check runs leaves the card | `rule: a stop while the card is up…` | `flag-replaces-card` |
| The status names each kind of work; a stop or a question marks the row | `rule: the status names…` | `stop-never-marked` |
| The note waits while another mod draws beneath | `rule: the note waits…` | `note-over-other-mod` |
| The digit hotkeys leave the row while another mod draws, and come back | `rule: the digit hotkeys…` | `digits-doubled` |
| The store keeps only the newest `SESSIONS_MAX` sessions | `rule: the store keeps…` | `sessions-unbounded` |
| A record the store lets go leaves its drafts in a kept list of up to `DROPPED_DRAFTS_MAX`, newest first, each once, and a seed reads that list, so a card message he sent in a session whose record was let go is still the rep's draft; the seed reads the records before that list, the reverse of the order they are written, so a record let go between its two reads is found in one | `rule: a record the store lets go leaves its drafts…`, `recDrafts takes a record's cards' messages…`, `rule: a card message he sent in a session whose record the store has let go…`, `rule: a record let go while the drafts are being read…` | `dropped-drafts-lost`, `dropped-drafts-unread`, `dropped-drafts-uncapped`, `dropped-drafts-oldest-first`, `dropped-drafts-read-order` |
| The objective is written by its own call from the owner's messages, never by the looks; the row shows its result | `rule: the objective is written by its own call…` | `looks-write-objective`, `writer-forks-conversation`, `row-shows-whole-reading` |
| The agent's words never move the objective; a message of the owner's does, with the cause on the card; a draft he sent moves only the step | `rule: the agent's words never move…` | `revision-cause-dropped`, `draft-moves-result` |
| A note to the rep is dropped before the agent sees it and cleared from the box, listed as said to the rep, read at once | `rule: a note to the rep…` | `note-reaches-agent`, `note-never-read`, `note-left-in-box` |
| A note to the rep typed after other text (at the start of a line, after a sentence's end with any closing quote or bracket, or glued with its capitalised prefix to a letter, a digit or a sentence's end) goes to the rep only: the agent gets the text before it, recorded as his message, and the note is numbered after it; the prefix in the middle of a sentence, glued to anything else, or inside a slash command's arguments is left as his words; a prefix after text with nothing after it notes nothing and a toast says so | `noteSplit finds a note…`, `rule: a note typed after other text…`, `rule: a prefix inside a slash command's arguments…` | `note-after-text-leaks`, `glued-note-after-any`, `note-after-quote-missed`, `note-split-in-command`, `empty-note-silent` |
| A new job closes the old objective; its result is listed as closed and the earlier job's messages leave the writer; a seeded session whose first write says the new job opened at a later message of his starts the job there, and the earlier job's messages leave the writer and the briefing | `rule: a new job closes…`, `rule: a seeded session that held more than one job…` | `earlier-job-leaks`, `first-write-new-job-ignored` |
| A write that lands late cannot take a newer write's place, and a message during a write is written after it | `rule: a write that lands late…` | `late-look-wins` |
| The revision line outlasts the parts that restate the agent's work when the card folds | `fitCard folds the body…` | `revised-line-folds-first` |
| The check runs in a throwaway copy of the project, fenced, and the copy is removed when the run ends; where the fence cannot start the run refuses to start, and no command can ask to run outside it | `rule: the check runs in a throwaway copy…`, `the checker: its prompt names the session…` | `check-outside-copy`, `room-bypassed`, `fence-unavailable-runs`, `fence-way-out-kept` |
| The fence guards the main places in the home whose contents run later (the shell's startup files, git's settings, the package managers' and other tools' settings, the cloud tools' settings, Node's fallback module folders, Python's add-on folders, npx's installs, rustup's toolchains, the whole of Claude Code's configuration, its install, the login programs folder, and for each command-path folder in the home, and each place in the home a path folder or a link in one leads to, the install it belongs to, the question asking each folder and its links, never the folders inside it, one name to each readlink, with thirty seconds to answer, the caches and other shared folders never guarded whole, the folder alone when that install would hold the copies and never one holding them), and the brief names the main ones and says no list names every one rather than saying every write outside the copy is denied | `the checker: its prompt names the session…`, `rule: the check runs in a throwaway copy…`, `installOf guards a command-path folder…`, `rule: the check asks, outside the fence, where the command path's folders…`, `pathLinksArgv asks find…`, `holdsCopiesOf names the folders…` | `fence-runs-later-open`, `fence-path-ignored`, `fence-path-holds-copy`, `brief-overstates-fence`, `fence-startup-files-open`, `fence-gitconfig-open`, `fence-package-settings-open`, `fence-claude-config-open`, `fence-python-open`, `fence-path-folder-only`, `install-shared-folder-guarded`, `install-holds-copies-kept`, `brief-says-every-place`, `fence-npx-open`, `fence-rustup-open`, `fence-tool-settings-open`, `fence-node-home-open`, `fence-cloud-settings-open`, `path-links-ignored`, `path-links-not-asked`, `path-links-exit-read`, `path-links-cut-kept`, `links-throw-fails-check`, `install-caches-shared`, `path-links-depth-dirs`, `path-links-many-names`, `path-links-folder-unfollowed`, `path-links-short-wait` |
| The home is read with any separator at its end dropped, so the fence's comparisons hold | `the home is HOME where there is one…` | `home-slash-kept` |
| Where the fence cannot start, the card says the check does not run on that machine, with what Claude Code says is missing and that a restart clears it once that is installed, and offers no Check it, and so does every later card while Claude Code runs, and a press on a card drawn before the refusal starts nothing | `rule: where the fence cannot start…`, `noFenceNote reads only the refusal…`, `rule: once the fence has refused to start, each later card…`, `rule: once the fence has refused to start, a press on a card drawn before…` | `no-fence-reason-dropped`, `no-fence-card-offers-check`, `no-fence-forgotten`, `no-fence-check-starts`, `no-fence-restart-unsaid` |
| pnpm's store is asked of pnpm in the copy outside the fence, with the project's pnpmfile not loaded, no pinned pnpm installed and nothing downloaded, all said on pnpm's command line, where a project's workspace file cannot turn them back on, and corepack's network off, and named to the run, so an install inside the fence finds the owner's store; a pnpm that cannot be asked leaves the check running | `rule: the check names pnpm's store to its run…`, `pnpmStoreDir takes the folder above…`, `rule: a machine where pnpm or find cannot be asked…` | `pnpm-store-not-passed`, `pnpm-store-keeps-version`, `pnpm-asks-in-agent-folder`, `pnpm-runs-pnpmfile`, `pnpm-throw-fails-check`, `pnpm-pin-installed`, `pnpm-settings-overridable`, `pnpm-goes-online`, `corepack-fetches-pin` |
| Every git repository the copy and the agent's folder reach is found before the run, outside the fence, by asking for the `.git` in the copy, the agent's folder and every folder above either, and fenced wherever it is: the folder holding each `.git`, where a `.git` link leads, the folder a pointer names read from the folder holding the `.git`, for a worktree the git folder its branches live in, never a place in the copy or one holding the copies; the brief names it; where the git or link question gets no answer the check still runs and the brief says the repository, or the installs the links lead to, could not be found | `rule: the check asks, outside the fence, for the .git in its copy…`, `rule: where no copy is made of a subfolder of a repository…`, `gitFindArgv asks find…`, `gitDirsOf names each repository found…`, `the checker: its prompt names the session…`, `rule: a machine where pnpm or find cannot be asked…`, `rule: when only the git question goes unanswered…` | `repo-git-open`, `repo-git-not-asked`, `worktree-common-dir-missed`, `repo-pointer-unresolved`, `repo-throw-fails-check`, `repo-holds-copies-kept`, `brief-repo-unsaid`, `git-walk-not-upward`, `git-lead-dropped`, `git-copy-fenced`, `unanswered-not-passed`, `links-unanswered-as-none`, `repos-unanswered-as-none`, `brief-repo-unanswered-unsaid`, `brief-links-unanswered-unsaid` |
| When the copy cannot be made, or the agent's folder holds the copies' folder, the check runs in the agent's folder, with writes there denied, and the brief says so and never tells it to write | `rule: when the copy cannot be made…`, `rule: when the agent's folder holds the copies' folder…`, `the checker: its prompt names the session…` | `no-copy-brief-says-write`, `copy-inside-agent-folder` |
| On Windows, where Claude Code's sandbox is off, the card says the check does not run there in place of its price and offers no Check it, even when looking for its commands throws; pressed on a card drawn before, the check does not start | `rule: on Windows, since nothing there fences the check's run…`, `rule: on Windows the card offers no Check it when looking for its commands throws…`, `rule: on Windows the check itself does not start either…` | `windows-check-unfenced`, `windows-refusal-rests-on-probe`, `windows-card-offers-check`, `windows-check-button-kept` |
| The copy is an APFS clone; where `cp` refuses `-c` before making anything, as GNU `cp` on Linux does, the folder's contents are copied plainly into the folder just made; a clone that failed part-way is never copied over, and its part is removed | `the copy tries the APFS clone…`, `rule: where cp refuses -c…`, `rule: where the clone fails part-way…` | `copy-no-fallback`, `plain-copy-nests`, `fallback-over-partial-clone`, `part-copy-left` |
| Every program is named for the host it runs on: as written on a Mac or Linux, and on Windows Git for Windows' coreutils by their full path and npm's `claude.exe`, each found by running it; the home is `HOME`, else `USERPROFILE`, written with forward slashes on Windows, and a home of `/tmp` is a home; on Windows his messages are read through Git's own `find` and `sed`, a fork's parent found by its last tool result, and a copy's parent by its summary line, through Git's `grep` and `sed`, a transcript path given with backslashes is read slashed, and a probe that failed is tried again on the next read | `the home is HOME where there is one…`, `a host that resolves by name…`, `a Windows host names every command…`, `the places Git for Windows and npm put their binaries…`, `rule: on Windows his messages are read…`, `rule: on Windows a transcript path given with backslashes…`, `rule: on Windows a fork taken after a compaction finds its parent…`, `rule: on Windows a fork whose own file is a copy…`, `rule: on Windows a probe for Git's commands that failed…`, `rule: a home that is /tmp is a home…` | `home-ignores-userprofile`, `windows-commands-by-name`, `windows-claude-by-name`, `candidates-unslashed`, `windows-find-by-name`, `windows-read-by-name`, `windows-probe-failure-held`, `home-tmp-is-none`, `windows-home-mixed-slashes`, `windows-held-path-backslashed`, `windows-tool-line-by-name`, `windows-read-before-by-name`, `windows-start-by-name` |
| The card says how many of the check's commands were refused approval, and the right number is zero, and that commands the fence stopped are not counted | `rule: the card says how many…` | `refusals-unreported`, `refused-count-claims-fence` |
| Tell the rep puts the prefix in the prompt box | `rule: Tell the rep puts…` | `tell-prefix-dropped` |
| While the rep reads, the row says so and a second press starts no second read | `rule: while the rep reads…` | `reading-state-unmarked` |
| The checked card folds its lists to counts on a small band | `rule: the checked card folds…` | `checked-lists-never-fold` |
| When the checked card folds, the claims that hold become a count before the failed ones go | `rule: when the checked card folds…` | `holds-outlive-failures` |
| Rows are counted as the band wraps them, at words, so a card that fits by its count fits on screen | `rowsOf counts rows…` | `rows-counted-by-cells` |
| A card with anything left out never also says the work is going well | `a card with anything left out…` | `well-with-left` |
| The briefs say a chore left for the owner is the agent's unfinished work, never his next step | `the briefs say a chore…` | `chore-to-owner` |
| The watch looks every `CHECK_EVERY` model requests, through `turn.step` | `rule: the watch looks every…` | `step-look-dropped` |
| A correction rebuilds the whole objective, and keeps every held condition the writer drops unless a message of the owner's is cited for it | `rule: a correction rebuilds the whole objective…`, `mergeConditions keeps…` | `condition-dropped-uncited` |
| A message the rep drafted and the owner sent is listed to the model as the rep's draft, never as his words, and is still recognised after a reload | `rule: a message the rep drafted…`, `rule: a draft is recognised…` | `draft-as-his-words` |
| The last three cards' messages are kept, so a message he sends from an earlier card is still the rep's draft | `rule: the last three cards' messages…`, `keepDraft keeps…` | `drafts-forgotten` |
| The briefs are built from the North Star: the objective stays open until completed, and the rep's draft weighs as the rep's words | `the briefs are built from the North Star…` | `draft-weight-dropped` |
| A condition is marked shown or closed only by a look, a briefing or a check citing a message of the owner's for a close; the writer cannot mark one shown | `rule: the writer cannot mark…`, `rule: a briefing that marks…`, `rule: the watch marks…`, `rule: the check is given the conditions…` | `marks-uncited` |
| A close or a drop cites a message of the owner's after the ones the objective was built from: a look, a briefing, a check or the writer citing one it was built from moves nothing | `rule: the check is given the conditions…`, `rule: the writer cannot mark…` | `mark-cites-built-message`, `writer-cites-built-message` |
| The check is given the conditions held shown and puts one back to not shown when the record or the disk shows otherwise; the gate then refuses the stop | `rule: a check that finds a condition held shown…` | `reopen-ignored`, `shown-not-sent` |
| A condition the check reopened stays not shown until a check shows it: a look's or a briefing's shown mark leaves it, the stop is still refused, the models are shown what the check found beside it, and a later check's own mark moves it | `rule: a condition the check reopened stays not shown…` | `look-remarks-reopened` |
| The writer never raises a condition: a held one keeps its state, where and reopened mark unless the writer closes it, a new one proposed shown starts open, and a new job starts with no mark | `rule: the writer never raises a condition…`, `mergeConditions never raises a state…` | `merge-raises-state` |
| The going-well line does not stand on a checked card beside a false claim or anything left out | `rule: the going-well line does not stand…` | `well-beside-false` |
| A condition listed twice, or with a state mark copied into its text, is kept once | `a condition listed twice is kept once…` | `conditions-pile-up` |
| A card cannot say stop, or that the work is going well, while a condition is open: the briefing is asked once more, then refused with the open conditions listed; the check passes the same gate | `gateVerdict refuses…`, `rule: a briefing that says stop…`, `rule: a briefing asked once more…`, `rule: a check that says stop…` | `stop-while-open` |
| With no objective written, a card that says stop, says the work is going well or gives a next step that says stop is refused with the rep's not-written texts, and is not asked again | `gateVerdict refuses with no objective written…`, `rule: with no objective written…` | `unwritten-gate-open` |
| An answer with no verdict, or one naming neither, is read as missing, never as continue, and is refused while a condition is open | `gateVerdict refuses with no objective written…`, `rule: a briefing with no verdict line…` | `verdict-missing-continues` |
| A next step that tells the agent to stop or calls the work finished is refused while a condition is open, whatever the verdict line says | `gateVerdict refuses with no objective written…`, `STOP_NEXT refuses only…` | `stop-next-unread` |
| Only a stop, a finish, "nothing is left" or a close said as a clause of its own is refused; a next step that only carries the word and goes on ("stop guessing and run the real suite", "Don't stop until …", "show the install is complete") keeps the model's own text, and the rep's own texts never match | `STOP_NEXT refuses only…`, `gateVerdict refuses with no objective written…` | `stop-filter-broad` |
| A next step that says to wrap up and stop, to stop working on it, to stop (or stop here, or stop work) and report, to stop and wait (bare, or for, on, until or till him, the owner, his reply, his answer, his go-ahead, approval not from someone else, further instructions, a decision or confirmation from him, whatever follows to the sentence's end), to stop and await him, to stop and ask him, to wait for or await him with no stop, to check in with him or let him decide, to hand it over or back to him, to wait after ", then", or that the session or the job can end (at a sentence's start, after a stop mark, or after a comma with "and", "and then", "so" or "now") or the agent can end it, or a stop or a wrap-up after ", and then", is refused while a condition is open; one that stops and reports and then goes on, ends only after a condition (before it or after it), waits on a run, on the agent's own build, on test emails or on a model's training, says not to wait for him (with "just", "stop and" or the like between), says a program "stops", or starts and stops a thing keeps the model's own text | `STOP_NEXT refuses only…` | `stop-wording-slips`, `and-stops-refused`, `end-after-condition-refused`, `end-after-so-passed`, `wait-on-ci-refused`, `wait-on-him-passed`, `wait-on-him-reply-passed`, `wait-on-him-words-narrow`, `wait-until-passed`, `ask-him-passed`, `stop-here-and-wait-passed`, `end-after-and-then-passed`, `clause-and-then-missed`, `wait-your-any`, `wait-confirmation-any`, `wait-decision-any`, `wait-on-him-unstopped-passed`, `hand-back-passed`, `check-in-passed`, `then-wait-passed`, `agent-ends-passed`, `stop-work-and-wait-passed`, `await-passed`, `wait-negation-refused`, `wait-negation-gap`, `approval-from-anyone` |
| The record keeps the whole job past 40 messages and numbers each one, so a write after many messages still sees the first | `trimOwner keeps…`, `rule: the record numbers…`, `rule: a draft, a note and a message all count by number…` | `owner-cap-freezes` |
| A message of his or a note reaches the writer whole up to 6,000 characters; only the rep's draft is cut to 1,200 | `rule: a long message of his…` | `his-message-cut` |
| The agent's words before his message are kept from their end, where the question a short reply answers usually is | `rule: the agent's words before his message…`, `fitTail keeps…` | `prior-keeps-head` |
| A write whose every attempt throws, comes back unanswered or answers with nothing readable leaves the objective as it was and is counted, and the card's price line names the failed writes | `rule: a writer call that throws…`, `rule: a held objective stays…`, `rule: with no objective held, a press writes it…`, `spentText names failed…` | `writer-failure-uncounted`, `writer-failure-erases`, `writer-failure-unshown`, `writer-failure-off-card` |
| A failed attempt (an empty or errored reply, an answer it cannot read, or `holds` while nothing is held) is tried again at the highest effort up to twice; a throw, a cut-short call, and a newer message of his arriving during the attempt (the next pass writes over the fresh prompt) are not retried; a write is counted failed only when every attempt failed, and the price line names the last cause in words | `rule: an empty write is retried…`, `rule: an api-error attempt is retried…`, `rule: a holds answer with nothing held…`, `rule: a write whose every attempt answers holds…`, `rule: a write whose every attempt fails…`, `rule: a write cut short is not retried`, `rule: a failed attempt is not retried over an outdated prompt…`, `failureWords turns…` | `writer-no-retry`, `holds-with-none-lost`, `writer-retries-stale-prompt` |
| The writer asks for the reply cap and the time one measured write needed (16 Oct 2026: 1,847 output tokens, 20 seconds), and an answer it cannot read, as a reply cut off at its cap, is counted as a failed write and leaves the objective as it was | `rule: the writer asks for its measured limits…` | `writer-cap-cut`, `writer-unreadable-uncounted` |
| A record saved in the old shape is rebuilt from the owner's messages on the next press, the old text kept as a version | `rule: a record saved in the old shape…` | `old-reading-converted` |
| In a reopened session, after /clear, or through a new session's first turn, where there is nothing to fork, his press and the look after his note read the session's record instead (entries labelled `entry N`, never `#N`, oldest first, tool uses on one line, long entries cut at the middle, reminders and fence tags made harmless, only the rows that are his messages in the session's transcript labelled as his); the watch's step and stop looks read nothing more; with no record either, the row stays and a toast says there is nothing to read | `recordText numbers the session…`, `recordText, given the rows his transcript proves…`, `rule: in a reopened session…`, `rule: with nothing to fork, the watch's own looks…`, `a model that does not answer leaves the row…` | `reopened-no-fallback`, `step-look-reads-record`, `note-look-skips-record`, `press-skips-record`, `record-numbers-as-messages`, `record-trusts-text`, `record-items-unused` |
| A session the rep holds no record of has his messages read at the session start and before a press from the session's transcript file, in the file's order (a user line with a human origin, not meta, or the queued-command line of human origin saved for a message he typed while the agent worked, which is no row of the session; a bare command or a kind `NOT_TYPED` names skipped, a message sent twice read twice; the file the path Claude Code gave the hooks names, the latest prompt's replacing the start's, or, with none given, the one `find` turns up by the session's id; read with `sed`, picture data blanked, a read cut at the output cap counting as no read), each typed one given the agent's last words before its row and a queued one, or one no row holds, none, lined up with the rows from the end so a short reply sent before and after a compaction gets its prior only at its later place; for a forked session whose file is not written yet, the newest transcripts in that path's folder, at most `HUMAN_SCAN_MAX` within `HUMAN_SCAN_BUDGET_MS`, each read given no more than the time left, the file that matches the most of its rows from the end (the newest on a tie; within a file, the fewest unmatched messages between the matches, then the latest last match) giving its part up to the last match and the queued messages right after it, the scan stopping once a file matches every row that could be his; a session whose rows since a compaction hold nothing he typed read all the same, its own file whole and, for a fork, the newest file holding the call of its last tool result up to that call's line, a result marked interrupted included, and nothing past its own file when the rows hold no tool result either; a session whose own file begins at a summary, a copy of its parent's stretch since it, read from the newest other file holding his messages before the same summary line and then from the copy, a copy of the copy passed over, the copy alone when no file holds the line, its own file never part of a scan; never from the rows' text alone, with the rep's own drafts recognised from every record in the store, its drafts list, its last message and the messages it holds as drafts, and its objective is written from them; nothing is seeded when no transcript can be read, in the session's own file or in the scan, or when no file in the scan matched a row, and the record read then labels his rows by their text; a prompt or a note sent during that read waits for it; a record that holds a message of his is never seeded | `humanTexts keeps only…`, `humanTexts takes a message he typed while the agent worked…`, `humanItems reads his messages from a transcript…`, `typedFromItems keeps the file's order…`, `forkItems takes the part of another session's messages…`, `humanRead prints only the lines marked human…`, `typedForm reads a command…`, `rule: a press in a session the rep holds no record of…`, `rule: a session start with no record…`, `rule: a message he typed while the agent worked, which is no row of the session…`, `rule: a session forked with a new id…`, `rule: a fork whose own transcript is not saved yet…`, `rule: of two files in a fork's folder that match its rows equally…`, `rule: the scan of a forked session's folder…`, `rule: in the scan of a forked session's folder, a file whose read was cut…`, `rule: a scan of a fork's folder in which no file could be read whole…`, `rule: a scan of a fork's folder whose files are read whole but hold none of the fork's rows…`, `rule: when no transcript can be read…`, `rule: with no transcript path given…`, `rule: the transcript path Claude Code gives the session is the file read…`, `rule: the transcript path a later prompt carries…`, `rule: a read of the session's transcript cut at the output cap…`, `rule: a message of his with a picture in it…`, `rule: a card message he sent in the session this one was forked from…`, `rule: a card message he sent that the forked-from record holds only among his messages as a draft…`, `rule: a prompt he sends while the start is still reading…`, `rule: a note to the rep sent while the start is still reading…`, `rule: a record that holds a message of his…`, `lastToolId is the id of the rows' last tool result…`, `rule: a session reopened after a compaction he has typed nothing since…`, `rule: a fork taken after a compaction he has typed nothing since…`, `rule: a fork whose rows hold neither a row he could have typed nor a tool result…`, `startFind finds a file's first compaction mark…`, `rule: a fork taken after a compaction, its own transcript saved as a copy…`, `rule: a copy whose summary no other file in its folder holds…`, `rule: a fork taken while a tool call ran…` | `reopened-no-seed`, `seed-trusts-text`, `human-rows-unchecked`, `seed-no-folder-scan`, `human-scan-uncapped`, `human-scan-no-stop`, `fork-draft-as-his`, `seed-drafts-held-ignored`, `command-form-raw`, `seed-races-prompt`, `seed-races-note`, `truncated-read-trusted`, `scan-cut-read-trusted`, `picture-data-kept`, `transcript-path-ignored`, `prompt-path-not-held`, `find-fallback-missing`, `scan-unbounded`, `scan-timeout-fixed`, `queued-message-unproven`, `queued-origin-unchecked`, `queued-meta-taken`, `human-items-deduped`, `human-items-not-typed-kept`, `queued-prior-carried`, `typed-cursor-stuck`, `fork-items-tail-kept`, `fork-queued-tail-dropped`, `fork-items-rematch`, `fork-misses-counted`, `scan-first-match-taken`, `scan-tie-takes-older`, `scan-unread-as-empty`, `typed-forward-walk`, `fork-items-earliest-end`, `fork-items-gaps-ignored`, `seed-gated-on-typed-rows`, `fork-scan-no-anchor`, `anchor-reads-whole-file`, `anchor-none-still-scans`, `tool-id-unchecked`, `copy-read-as-whole`, `copy-scans-itself`, `copy-of-copy-taken`, `copy-own-dropped`, `copy-unfound-empty`, `anchor-on-result` |

Three things the kit taught while writing these. The engine strips a refusal cause that a
hook writes itself on `prompt.fill`, so a test can make the box refuse but cannot make it say
why; the "dialog" wording is reachable only from the engine. A look the hook starts without awaiting has
not finished when the engine call resolves; draw the strip (`$.ui.mount` then `unmount`)
between two stops so each look settles, as a session's redraw does. And a test's `on` may
register an event once: a test that needs to read the store back answers `store.get` and
`store.set` itself instead of calling `mock.store`.

The `turn.step` test drives the kit's streaming call: `$.turn.step(input)` returns the
stream, a `turn.step` hook beneath answers it with an `async function*` returning the step's
result, and the test reads the stream to its end before asserting.

The doctor earned its place twice more on 14 Oct 2026: the first race test matched the words
"(to the rep)" anywhere in the brief, which the brief's own instructions contain, so both
looks were taken for the one that saw the note and the late-look defect survived; and the
stop's look was reading the record after the note had been recorded, so there was no race
to test. The test now starts the stop's look before the note is sent and matches the listed
note line.

The doctor also earned its place here: the first version of the stale-check test passed with
its defect planted, because the held check answered with text that was not a result, so the
stale answer had nothing to write. The doctor reported it as survived and the test was fixed.

And again on 15 Oct 2026: `looks-write-objective`, a look taking an objective from its own
answer, survived at first, because the test of the writer made only one look and every
objective it checked came from the writer's own call. The test now sends a further message
the writer answers with `objective: holds` and a look whose answer carries an objective in
the writer's shape, and asserts that the objective is unchanged.

**Status.** 192 tests: the parsers, the status words (including the variable-first command, read
through the mounted strip), the note to the rep, the checker's prompt and tools, the row on
both surfaces, the briefing card, the going-well card, another mod's tree beneath, the model-
failure toast, the sequence rules above, the card folding to a small band, the brief
carrying the whole-ask rule and the session's size as a figure, the helper count, the prompt
box's refusals, the check's three failure paths, the word-wrapped row count, the checked card
keeping its failed claims as it folds, the session end saving the record, and, from 15 Oct
2026, the objective: its writer call and the parser of its parts, the conditions kept through
a correction, the marks, the gate on stop and going-well (with no objective written, with
no verdict, and on a next step that says stop, read only where the stop or the finish is a
clause of its own), closes cited past the messages the objective
was built from, a check reopening a condition held shown and clearing the going-well line
beside a false claim, a reopened condition held not shown until a check shows it (no look,
briefing or writer raising it), conditions kept once, the numbered and trimmed record of
the owner's messages, the writer's failure paths (a failed write counted, named on the price
line and leaving the objective as it was, an answer it cannot read counted with them, a failed
attempt tried again at the highest effort up to twice but not after a throw or a cut-short
call, a `holds` with nothing held counted as a failed attempt, and its reply cap and time set
from a measured write; the rules sent as the system prompt on every attempt, and his messages
fenced as quoted records that no message can close), his long messages reaching the writer
whole, the agent's words before a message kept from their end, the rep's draft recognised before and after
a reload, the record saved in the old shape, a stale check leaving the record alone, and
the last three cards' messages kept for knowing a draft; and, from 16 Oct 2026, a note to the rep
typed after other text, the further ways a next step says stop, the briefing and the look reading
the session's record in a reopened session, and the owner's typed messages read from that record
when the rep holds none; and, in the same day's fix round, his rows proven from the session's
transcript file (the folder scan for a forked session, its cap and early stop, nothing seeded
when no file can be read, drafts found across the store), a prompt or note waiting for the
seed, the note split only where he would type one (never in a slash command, an empty note
reported), the stop forms narrowed ("and stops", a wait on a run, an end after a condition),
the record read only on his press or note, and record entries labelled `entry N`; and, in the
second fix round, the transcript found by the path Claude Code gives the hooks (or by name),
read with picture data blanked, a cut read proving nothing, the folder scan held to its time,
a message he typed while the agent worked proven from its queued-command line, a wait on him
or asking him refused whatever follows, and an end after ", and then" refused; and, in the
third fix round, his messages read from the transcript in the file's order, a queued one
included, each typed one given the agent's words before its row and a queued one or one no
row holds none, and a forked session with no file yet taking the part of the best-matching
file in its folder up to its last matched message and the queued ones right after it; and,
in the final pass, his messages lined up with the rows from the end so a reply repeated
across a compaction gets its prior at its later place and a fork of a compacted parent keeps
every message up to the fork, a seeded session's first write starting the job where it says
the new job opened, a scan that matched no row proving nothing, a wait on "your",
"confirmation" or "a decision" refused only when it names his say, and the remaining stop and
hand-back forms refused; after it, a wait on him negated with words between ("Don't just
wait for him") going on, and approval from someone else not read as his; after the replay
of the guidance session, a draft he sent that the forked-from record holds only among his
messages recognised as the rep's, and the drafts of a record the store lets go kept in a list
of their own, newest first, and read by the seed after the records, so one let go between the two reads is in one of them; and a `/clear`: his messages after it filed under the new
session, the old session's objective off the row at once, a write, a briefing or a check the
old session started landing in its own record without drawing, a press straight after it read
under the new id, and a session resumed in the same window read for his messages before his
next one is recorded under it; on 17 Oct 2026, a session reopened after a compaction he
had typed nothing since read for his messages from its own file, and a fork of one finding its
parent by its last tool result and taking only the messages before it; later that day, a
fork whose own file is a copy of its parent's stretch since a summary reading his earlier
messages from the parent by that summary line, and a fork taken while a tool ran finding its
parent by the tool's call; and, with the Windows port (PR #13) and its review, every program
named for the host it runs on, his messages read on Windows through Git's own commands under
`USERPROFILE` with paths written one way, the scan by last tool result and the search by
summary line among them, a failed probe looked for again, a home of `/tmp` kept as a home, the
check refused on Windows where nothing fences it, with the card saying so and offering no
Check it there, the check's run refusing to start where the sandbox cannot and given no way to
run a command outside it, its brief in the agent's own folder never telling it to write, and
the copy made plainly where `cp` refuses the clone and never over a clone that failed
part-way; from the second review, the fence guarding the places in the home whose contents
run later with the brief naming what it guards, the refusal count saying it counts approvals
only, and the card where the fence cannot start naming what is missing and offering no Check
it; and, from the third, the fence widened to the shell's startup files, git's and the package
managers' settings, Python's add-on folders, the whole of Claude Code's configuration and each
command-path folder's install, the brief saying no list names every such place, pnpm's store
named to the run, and a fence that refused to start remembered for the process; and, from
the fourth, the fence following the command path's links to their installs and guarding
npx's installs, rustup's toolchains, more tools' settings, the cloud tools' settings and
Node's fallbacks in the home, the caches never guarded whole, pnpm asked in the copy with
the project's own hook file not loaded, a pnpm or find that cannot be asked leaving the
check running, a press after the fence's refusal starting nothing, the note saying a
restart clears it, no copy tried of a folder holding the copies, and a home's trailing
separator dropped; and, from the fifth, pnpm told its two settings on its command line,
where a project's workspace file cannot turn them back on, the link question asking each
path folder and its links but never the folders inside it, one name to each readlink, with
thirty seconds to answer, and the repository a copied worktree's `.git` file points at
fenced; and, from the sixth, every repository the copy and the agent's folder reach found
by walking up from both and following a `.git` link, pnpm asked offline with corepack's
network off, and the brief saying when the links or the repository could not be found.
Two hundred and fifty-six doctor entries, all caught.

## Layer 2: a real session

**Problem.** Layer 1 proves the code does what it says when the engine calls it. It cannot
prove that the build the owner runs calls it, with the fields the code expects.

**Design.** A script under `tests/live/` that starts a fresh `claude` session in tmux in a
scratch folder, accepts the trust prompt, sends a prompt, captures the screen on a loop and
asserts on the captured text. A long prompt can arrive as a paste, and an Enter just after a
paste becomes a line break: a run on 16 Oct 2026 sent scenario 6's three prompts as one
message that way. So the script presses Enter again while the prompt box still opens with the
text it typed. The nested-session environment variables (`CLAUDECODE`,
`CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`, the messaging socket and token) must be
unset or `claude` falls into print mode and exits. Each session loads the mod from the
checkout the script sits in (`--plugin-dir`), with the copy installed at user scope switched
off for that session (`--settings` with `enabledPlugins` false), so the build under test is
the checkout's and the sessions' records go to the store of a mod loaded that way
(`owner-rep_inline-*.json`). Until 17 Oct 2026 the script ran the installed mod, whose store
keeps only its newest `SESSIONS_MAX` (32) records: two full runs had left fifteen test
records among the owner's seventeen, and each further run would have let his oldest go.
Scenarios, one capture each:

1. Idle: the row draws with the placeholder goal and "idle".
2. A shell command that begins by setting a variable: the status is "running <program>" and
   no character of the command appears in the strip.
3. `Owner rep: ...` typed as a prompt after a first exchange: the agent never answers it, the
   prompt box is emptied, and the rep's row changes from the placeholder to a reading,
   because the note starts a look. The first live runs of this scenario on 14 Oct 2026 found
   two faults: the engine leaves a dropped prompt in the box, so the digit pressed next in
   scenario 6 landed in the box as text (the rep now empties the box once the drop has
   landed; a fill made during the submit is undone by the drop); and a look from a stop
   that landed after the note's look had started took the note's place, because the guard
   counted the messages that had arrived rather than the messages each look saw (each look
   now carries what it saw, and the fold keeps the revision line until the card is nearly
   bare).
4. The Rep button pressed mid-turn: the briefing card appears with its buttons, its head
   shows the objective rather than the placeholder, and no objective write failed. The
   last two checks were added on 16 Oct 2026, after this scenario's command-like ask was
   found leaving every write at high effort empty.
5. The session stopped: the status is "stopped, waiting on you" with the mark.
6. The whole ask: a first message asking for much, a second asking for a step, then a note to
   the rep that changes what matters most, then Brief me; the card lists the open work
   against the reading, says when and why the reading was revised, drafts a message, and
   gives the conversation's size as a figure on its buttons row.
7. The objective kept whole: a first message asking for a README and a test run that passes
   on GitHub, the card's own draft sent through "Put message in prompt", then a message
   that bounds the next step to a one-line answer, then Brief me; the card's head still names
   the whole result, the card says the objective was revised, lists the tests or the GitHub
   run as open, drafts a message, and its next step does not say stop. Added on 15 Oct 2026
   with the objective; it runs against the installed mod, so its first run comes after the
   branch is merged.
8. A finished job: a one-word reply the agent has given, then Brief me; the card's head shows
   the objective, nothing is listed as left out, the card says the job is done, and no
   objective write failed. Added on 16 Oct 2026 so that keeping an objective open is never
   paid for by a rep that cannot say a finished job is finished.
9. A reopened session: a first session is asked to run `ping -c 20 127.0.0.1` in the
   foreground (about twenty seconds; Claude Code refuses a foreground `sleep`) and then give a
   one-word reply, a second message is typed while the ping runs (so Claude Code queues it,
   and it is never a row of the session),
   and the session is closed with `/exit`; a second is started in the same folder with
   `claude --continue --fork-session`, and Brief me is pressed before anything is sent; the
   card draws with its body, never says there is nothing to read yet (the pane is read every
   half second while the card is awaited), its head shows the objective rather than the
   placeholder, and no objective write failed. The script then reads the rep's store file
   (`~/.claude/plugins/store/owner-rep_inline-*.json`, the name carrying a hash, the newest
   such file) and shows
   that the newest record new since the fork started, the one holding the first prompt,
   holds the queued message as his. Added on 16 Oct 2026 with the record read and the
   seeding of his messages, the queued message the same day, the ping in the third fix
   round; it has not yet been run.

It runs on demand, not under `claude plugin test`, because each scenario costs a model call
and about a minute. Its output is the captured screens, kept beside the script, so a reader
can see what the strip showed.

**Status.** Built: `tests/live/live.sh`, with the captures in `tests/live/captures/`. First
full run on 14 Oct 2026: scenarios 1, 2, 3 and 5 shown; scenario 4 found a defect. The card
drew, with its body and its message, but it was taller than the band's window, so its buttons
sat under the engine's "↓ 4 more" row, and a bare digit arms only a button wholly inside the
window (the engine's rule, stated on `AbovePrompt.maxRows` in the API declarations). The
owner's "2" went into the prompt box as text and the card stayed up. Fixed the same day:
`fitCard` folds the card's body to the band's rows, body first and buttons never, and the
rerun showed the buttons' row inside the window and the digit closing the card. On 14 Oct
2026 a session run for the README's pictures, at 200 columns and 60 rows, found the same
fault's remainder: the row count took cells, the band wraps at words, and a long paragraph
took one row more than counted, so a card of exactly the band's rows by the count scrolled by
two on screen, and the digit for the check went into the prompt box. `rowsOf` now counts at
words (the `rowsOf counts rows…` test, doctor entry `rows-counted-by-cells`); the proof on
screen is the README's briefing picture, taken at that size after the fix with the buttons in
view. The same session showed the paid check's findings folding to a bare count on an ordinary
band, so the fold now counts the holding claims first and keeps the failed ones listed. The kit
test for it mounts the band with eight rows; the doctor entry is `card-overflows-band`.
Scenario 6 was added the same day after a card gave a green line for a finished step with the
job open and called a 48 percent session very long: the brief now carries the rule that the
owner's messages add up and gets the engine's own size figure, and the rerun showed the card
listing the untouched parts of the first message with a message drafted and "conversation at
5 percent of its window" on its buttons row.
The whole run of nine was repeated on 16 Oct 2026 on main after the drafts kept for records
the store lets go were merged, and all nine showed what they should; the captures in
`tests/live/captures/` are that run's, scenario 9's reopened session among them. On 17 Oct
2026 the script was moved to load the checkout (above) and scenario 9 was run that way from
the branch that reads a compacted session's file: shown, its records in the `inline` store
and none in the installed mod's.

## The doctor

**Problem.** A test suite that passes proves nothing unless it is known to fail when the code
is wrong. An agent that edits a test until it passes, or a refactor that silently stops a test
from exercising its target, leaves a green suite that guards nothing.

**Design.** Mutation testing, written by hand so each defect is legible. A file lists named
defects. Each one is a small patch to the mod plus one plain sentence saying what it breaks,
for example:

- `strip-shows-command`: the shell status returns the command's first two words again.
- `flag-shown-twice`: the watch forgets which flags it has shown.
- `stale-check-wins`: an older check run overwrites a newer card.
- `note-reaches-agent`: an `Owner rep:` prompt is passed through to the agent.
- `digits-doubled`: the row keeps its digit hotkeys while another mod draws.

The doctor makes a throwaway worktree of the mod, applies one defect, runs
`claude plugin test`, and expects at least one failure. A defect that survives is a gap in
the suite, and the doctor names it and the sentence. It never touches the main checkout,
because the owner's live sessions load the mod from there and a planted defect would reach
them. It can also run the layer 2 script against a defect to prove the live check bites.

Every fixed bug adds a defect to the list, starting with `strip-shows-command`. Run the
doctor before any claim that the tests pass. A patch is a diff with context lines, so it
stops applying when the lines around its edit move; the doctor reports that by name, and the
patch is remade with the same edit from a committed tree (`git diff`, then `git checkout` of
the file). Never make one from an uncommitted tree: the checkout would wipe the work.

**Status.** Built: `tests/doctor/doctor.py`, with `defects.json` and one patch per defect in
`tests/doctor/defects/`. Run it with `python3 tests/doctor/doctor.py`; it exits 1 when the
clean suite fails or a defect survives, and stops before planting when the clean suite is
not clean. Two hundred and fifty-six entries, all caught: `strip-shows-command`, one or more per sequence
rule above, `card-overflows-band`, `size-figure-dropped`, `whole-ask-rule-dropped`, and one
per remaining hook path (`helper-not-counted`, `box-text-overwritten`, `fill-refusal-ignored`,
`check-timeout-unreported`, `check-failure-swallowed`, `end-not-saved`), and six for a
`/clear` (`clear-id-read-once`, `clear-screen-kept`, `clear-late-write-draws`,
`clear-press-old-id`, `clear-brief-marks-draw`, `clear-check-marks-draw`). A throwaway entry no test looks at was planted on 14 Oct
2026 to show the survivor path reports and exits 1; it was not kept. Entries whose rule was
replaced move to `tests/doctor/defects/archive/` with a note in its `ARCHIVED.md` naming the
successor; three moved there on 15 Oct 2026, when the objective replaced the reading.

## Order of work

1. ~~The doctor, with `strip-shows-command` as its one entry.~~ Done 14 Oct 2026.
2. ~~The layer 1 sequence-rule tests, with a doctor entry for each.~~ Done 14 Oct 2026.
3. ~~The layer 2 script with its first five scenarios.~~ Done 14 Oct 2026; scenario 4 red.
4. ~~Lay the briefing card out to fit the band's `maxRows`.~~ Done 14 Oct 2026; scenario 4
   green, kit test and doctor entry in place.
5. ~~A run on GitHub of the validation, the tests, the type check and the doctor on every
   push.~~ Done 14 Oct 2026: `.github/workflows/tests.yml`, with the declarations pinned in
   `tests/ci/` for the type check.
6. ~~The held reading: the rep's own account of what the owner wants, kept for the job,
   moved only by the owner's words, with the note to the rep in place of the goal pin; the
   three states still untested (the reading state, the checked card folded, the
   every-`CHECK_EVERY` look).~~ Done 14 Oct 2026, with a test and a doctor entry per rule
   and live scenarios 3 and 6 reshaped around the note.
7. ~~A step in the GitHub run that fails when the installed Claude Code build is not the
   build that wrote the pinned declarations, so an API change cannot pass a type check
   against a stale copy.~~ Done 14 Oct 2026: `tests/ci/declarations.sh`, run before the
   type check; shown red on its branch against the pin from 2.1.296 while the run
   installed 2.1.300, then green once the pin moved to 2.1.300. It is a step of the run,
   not a rule of the mod, so the doctor does not plant against it; the red run is its proof.
8. ~~The objective in place of the reading: written by its own call from the owner's
   messages, kept open until it is completed, with its conditions, the marks that move
   them, and the gate on a card that says stop.~~ Done 15 Oct 2026 in layer 1, with a test
   and a doctor entry per rule; three entries of the reading's rules archived.
9. ~~A step in the GitHub run that fails when a hook runs a program whose name does not go
   through `hostArgv`, so a new command cannot quietly find nothing on Windows.~~ Done 16 Oct
   2026: `tests/ci/host-calls.sh`, run after the validation; shown red on a trial merge of
   PR #12's head, which runs `grep` and `sed` by bare name, and green on its own branch. Like
   the declarations step it is not planted by the doctor; the red run is its proof.
10. Keep growing the defect list as bugs are fixed.
