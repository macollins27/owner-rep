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
| A record that holds nothing takes no place in the store, and a session that starts and ends with nothing of the owner's, as a scripted run does, saves none; a record is judged as it loads, whatever order its fields were saved in, and one holding a field the blank lacks is kept | `rule: a blank record takes no place…`, `rule: a session that starts and ends with nothing of the owner's…`, `isBlankRec: a record that loads as the blank one…` | `blank-records-kept`, `blank-as-saved`, `blank-ignores-extra`, `blank-key-order` |
| A record the store lets go leaves its drafts in a kept list of up to `DROPPED_DRAFTS_MAX`, newest first, each once, and a seed reads that list, so a card message the owner sent in a session whose record was let go is still the rep's draft; the seed reads the records before that list, the reverse of the order they are written, so a record let go between its two reads is found in one | `rule: a record the store lets go leaves its drafts…`, `recDrafts takes a record's cards' messages…`, `rule: a card message the owner sent in a session whose record the store has let go…`, `rule: a record let go while the drafts are being read…` | `dropped-drafts-lost`, `dropped-drafts-unread`, `dropped-drafts-uncapped`, `dropped-drafts-oldest-first`, `dropped-drafts-read-order` |
| The objective is written by its own call from the owner's messages, never by the looks; the row shows its result | `rule: the objective is written by its own call…` | `looks-write-objective`, `writer-forks-conversation`, `row-shows-whole-reading` |
| The agent's words never move the objective; a message of the owner's does, with the cause on the card; a draft the owner sent moves only the step | `rule: the agent's words never move…` | `revision-cause-dropped`, `draft-moves-result` |
| A note to the rep is dropped before the agent sees it and cleared from the box, listed as said to the rep, read at once | `rule: a note to the rep…` | `note-reaches-agent`, `note-never-read`, `note-left-in-box` |
| A note to the rep typed after other text (at the start of a line, after a sentence's end with any closing quote or bracket, or glued with its capitalised prefix to a letter, a digit or a sentence's end) goes to the rep only: the agent gets the text before it, recorded as the owner's message, and the note is numbered after it; the prefix in the middle of a sentence, glued to anything else, or inside a slash command's arguments is left as their words; a prefix after text with nothing after it notes nothing and a toast says so | `noteSplit finds a note…`, `rule: a note typed after other text…`, `rule: a prefix inside a slash command's arguments…` | `note-after-text-leaks`, `glued-note-after-any`, `note-after-quote-missed`, `note-split-in-command`, `empty-note-silent` |
| A new job closes the old objective; its result is listed as closed and the earlier job's messages leave the writer; a seeded session whose first write says the new job opened at a later message of the owner's starts the job there, and the earlier job's messages leave the writer and the briefing | `rule: a new job closes…`, `rule: a seeded session that held more than one job…` | `earlier-job-leaks`, `first-write-new-job-ignored` |
| A write that lands late cannot take a newer write's place, and a message during a write is written after it | `rule: a write that lands late…` | `late-look-wins` |
| The revision line is part of the judgment, one row from the start, so a message that takes every row left never crowds it out | `fillCard gives the message the rows that remain…` | `revised-line-folds-first` |
| The message box takes the rows the judgment leaves, never one row when more remain | `fillCard gives the message the rows that remain…` | `card-cut-with-rows-empty` |
| The extras (revision, does, check price, spend, the objective whole) come back only after the message has its rows | `fillCard gives the message the rows that remain…` | `extras-before-message` |
| The count line under the head outlasts the judgment's later rows when the card is short of rows | `fillCard shortens the judgment to one row each…` | `count-line-dropped-first` |
| On a band too short for the message's box between the head and the buttons (a 24-row terminal), the box goes, the buttons stay, and Put message in prompt still carries the message whole | `fillCard shortens the judgment to one row each…`, `rule: the card heads with the result and a count line…` | `message-box-hides-buttons` |
| The check runs in a throwaway copy of the project, fenced, and the copy is removed when the run ends; where the fence cannot start the run refuses to start, and no command can ask to run outside it | `rule: the check runs in a throwaway copy…`, `the checker: its prompt names the session…` | `check-outside-copy`, `room-bypassed`, `fence-unavailable-runs`, `fence-way-out-kept` |
| The fence guards the main places in the home whose contents run later (the shell's startup files, git's settings, the package managers' and other tools' settings, the cloud tools' settings, Node's fallback module folders, Python's add-on folders, npx's installs, rustup's toolchains, the whole of Claude Code's configuration, its install, the login programs folder, and for each command-path folder in the home, and each place in the home a path folder or a link in one leads to, the install it belongs to, the question asking each folder and its links, never the folders inside it, one name to each readlink, with thirty seconds to answer, the caches and other shared folders never guarded whole, the folder alone when that install would hold the copies and never one holding them), and the brief names the main ones and says no list names every one rather than saying every write outside the copy is denied | `the checker: its prompt names the session…`, `rule: the check runs in a throwaway copy…`, `installOf guards a command-path folder…`, `rule: the check asks, outside the fence, where the command path's folders…`, `pathLinksArgv asks find…`, `holdsCopiesOf names the folders…` | `fence-runs-later-open`, `fence-path-ignored`, `fence-path-holds-copy`, `brief-overstates-fence`, `fence-startup-files-open`, `fence-gitconfig-open`, `fence-package-settings-open`, `fence-claude-config-open`, `fence-python-open`, `fence-path-folder-only`, `install-shared-folder-guarded`, `install-holds-copies-kept`, `brief-says-every-place`, `fence-npx-open`, `fence-rustup-open`, `fence-tool-settings-open`, `fence-node-home-open`, `fence-cloud-settings-open`, `path-links-ignored`, `path-links-not-asked`, `path-links-exit-read`, `path-links-cut-kept`, `links-throw-fails-check`, `install-caches-shared`, `path-links-depth-dirs`, `path-links-many-names`, `path-links-folder-unfollowed`, `path-links-short-wait` |
| The home is read with any separator at its end dropped, so the fence's comparisons hold | `the home is HOME on a Mac or Linux and USERPROFILE on Windows…` | `home-slash-kept` |
| Where the fence cannot start, the card says the check does not run on that machine, with what Claude Code says is missing and that a restart clears it once that is installed, and offers no Check it, and so does every later card while Claude Code runs, and a press on a card drawn before the refusal starts nothing | `rule: where the fence cannot start…`, `noFenceNote reads only the refusal…`, `rule: once the fence has refused to start, each later card…`, `rule: once the fence has refused to start, a press on a card drawn before…` | `no-fence-reason-dropped`, `no-fence-card-offers-check`, `no-fence-forgotten`, `no-fence-check-starts`, `no-fence-restart-unsaid` |
| pnpm's store is asked of pnpm in the copy outside the fence, with the project's pnpmfile not loaded, no pinned pnpm installed and nothing downloaded, all said on pnpm's command line, where a project's workspace file cannot turn them back on, and corepack's network off, and named to the run, so an install inside the fence finds the owner's store; a pnpm that cannot be asked leaves the check running | `rule: the check names pnpm's store to its run…`, `pnpmStoreDir takes the folder above…`, `rule: a machine where pnpm or find cannot be asked…` | `pnpm-store-not-passed`, `pnpm-store-keeps-version`, `pnpm-asks-in-agent-folder`, `pnpm-runs-pnpmfile`, `pnpm-throw-fails-check`, `pnpm-pin-installed`, `pnpm-settings-overridable`, `pnpm-goes-online`, `corepack-fetches-pin` |
| Every git repository the copy and the agent's folder reach is found before the run, outside the fence, by asking for the `.git` in the copy, the agent's folder and every folder above either, and every `.git` inside the copy unless it is the home, the pointer read even when readlink fails, then asking each git folder found for the worktrees it lists, and fenced wherever it is: the folder holding each `.git`, where a `.git` link leads, the folder a pointer names read from the folder holding the `.git` and from where it leads, for a worktree the git folder its branches live in, each other worktree listed, a relative entry read from its file's folder, never a place in the copy or one holding the copies; the brief names it; where the git or link question gets no answer the check still runs and the brief says the repository, or the installs the links lead to, could not be found | `rule: the check asks, outside the fence and each on its own, for the .git…`, `rule: where no copy is made of a subfolder of a repository…`, `gitDirsOf names each repository found…`, `worktreesArgv asks find for the gitdir file…`, `rule: an agent working in the home…`, `the checker: its prompt names the session…`, `rule: a machine where pnpm or find cannot be asked…`, `rule: when only the git question goes unanswered…`, `rule: when the question inside the copy comes back cut…`, `rule: when the worktrees question fails…`, `rule: when the worktrees question comes back cut…`, `rule: when every git question answers whole…`, `rule: when the question inside the copy passes over a name holding a line break…`, `rule: when the question about where the links lead fails…`, `gitUpArgv asks find…`, `wholeArgv asks find through sh…`, `gitLinksOf names where the links in the copy lead…` | `repo-git-open`, `repo-git-not-asked`, `worktree-common-dir-missed`, `repo-pointer-unresolved`, `repo-throw-fails-check`, `repo-holds-copies-kept`, `brief-repo-unsaid`, `git-walk-not-upward`, `git-lead-dropped`, `git-copy-fenced`, `unanswered-not-passed`, `links-unanswered-as-none`, `repos-unanswered-as-none`, `brief-repo-unanswered-unsaid`, `brief-links-unanswered-unsaid`, `git-inside-not-searched`, `git-search-enters-git`, `git-pointer-needs-readlink`, `git-pointer-needs-lead`, `git-pointer-trimmed`, `git-pointer-lead-base-dropped`, `home-searched-inside`, `worktrees-not-asked`, `worktree-entry-unresolved`, `worktree-own-fenced`, `worktrees-throw-fails-check`, `worktrees-unanswered-as-none`, `git-cut-taken`, `worktrees-cut-taken`, `git-links-dropped`, `git-links-not-fenced`, `git-beyond-not-asked`, `git-odd-ignored`, `git-odd-not-passed-over`, `git-entry-no-leading-break`, `worktree-entry-no-leading-break`, `git-entry-not-git-folder`, `git-end-not-required`, `git-end-signal-printed`, `git-inside-fails-drops-up`, `repo-outermost-dropped`, `readlink-probe-dropped`, `sh-not-host-named`, `brief-links-fence-unsaid`, `brief-links-unfound-unsaid` |
| When the copy cannot be made, or the agent's folder holds the copies' folder, the check runs in the agent's folder, with writes there denied, and the brief says so and never tells it to write | `rule: when the copy cannot be made…`, `rule: when the agent's folder holds the copies' folder…`, `the checker: its prompt names the session…` | `no-copy-brief-says-write`, `copy-inside-agent-folder` |
| On Windows, where Claude Code's sandbox is off, the card says the check does not run there in place of its price and offers no Check it, even when looking for its commands throws; pressed on a card drawn before, the check does not start | `rule: on Windows, since nothing there fences the check's run…`, `rule: on Windows the card offers no Check it when looking for its commands throws…`, `rule: on Windows the check itself does not start either…` | `windows-check-unfenced`, `windows-refusal-rests-on-probe`, `windows-card-offers-check`, `windows-check-button-kept` |
| The copy is an APFS clone; where `cp` refuses `-c` before making anything, as GNU `cp` on Linux does, the folder's contents are copied plainly into the folder just made; a clone that failed part-way is never copied over, and its part is removed | `the copy tries the APFS clone…`, `rule: where cp refuses -c…`, `rule: where the clone fails part-way…` | `copy-no-fallback`, `plain-copy-nests`, `fallback-over-partial-clone`, `part-copy-left` |
| Every program is named for the host it runs on: as written on a Mac or Linux, and on Windows Git for Windows' coreutils by their full path and npm's `claude.exe`, each found by running it; the home is `HOME`, else `USERPROFILE`, on a Mac or Linux, and on Windows `USERPROFILE`, else `HOME`, where Claude Code keeps its folder, written with forward slashes, and a home of `/tmp` is a home; on Windows the owner's messages are read through Git's own `find` and `sed`, a fork's parent found by its last tool result, and a copy's parent by its summary line, through Git's `grep` and `sed`, a transcript path given with backslashes is read slashed, and a probe that failed is tried again on the next read | `the home is HOME on a Mac or Linux and USERPROFILE on Windows…`, `homeOf takes USERPROFILE before HOME on Windows…`, `rule: on Windows with HOME set to another folder…`, `rule: on a Mac with USERPROFILE set as well…`, `a host that resolves by name…`, `a Windows host names every command…`, `the places Git for Windows and npm put their binaries…`, `rule: on Windows the owner's messages are read…`, `rule: on Windows a transcript path given with backslashes…`, `rule: on Windows a fork taken after a compaction finds its parent…`, `rule: on Windows a fork whose own file is a copy…`, `rule: on Windows a probe for Git's commands that failed…`, `rule: a home that is /tmp is a home…` | `home-ignores-userprofile`, `windows-commands-by-name`, `windows-claude-by-name`, `candidates-unslashed`, `windows-find-by-name`, `windows-read-by-name`, `windows-probe-failure-held`, `home-tmp-is-none`, `windows-home-mixed-slashes`, `windows-home-before-profile`, `windows-held-path-backslashed`, `windows-tool-line-by-name`, `windows-read-before-by-name`, `windows-start-by-name` |
| The card says how many of the check's commands were refused approval, and the right number is zero, and that commands the fence stopped are not counted | `rule: the card says how many…` | `refusals-unreported`, `refused-count-claims-fence` |
| Tell the rep puts the prefix in the prompt box | `rule: Tell the rep puts…` | `tell-prefix-dropped` |
| While the rep reads, the row says so and a second press starts no second read | `rule: while the rep reads…` | `reading-state-unmarked` |
| The checked card folds its lists to counts on a small band | `rule: the checked card folds…` | `checked-lists-never-fold` |
| When the checked card folds, the claims that hold become a count before the failed ones go | `rule: when the checked card folds…` | `holds-outlive-failures` |
| Rows are counted as the band wraps them, at words, so a card that fits by its count fits on screen | `rowsOf counts rows…` | `rows-counted-by-cells` |
| A card with anything left out never also says the work is going well | `a card with anything left out…` | `well-with-left` |
| The briefs say a chore left for the owner is the agent's unfinished work, never the owner's next step | `the briefs say a chore…` | `chore-to-owner` |
| The watch looks every `CHECK_EVERY` model requests, through `turn.step` | `rule: the watch looks every…` | `step-look-dropped` |
| A correction rebuilds the whole objective, and keeps every held condition the writer drops unless a message of the owner's is cited for it | `rule: a correction rebuilds the whole objective…`, `mergeConditions keeps…` | `condition-dropped-uncited` |
| A message the rep drafted and the owner sent is listed to the model as the rep's draft, never as the owner's words, and is still recognised after a reload | `rule: a message the rep drafted…`, `rule: a draft is recognised…` | `draft-as-his-words` |
| The last three cards' messages are kept, so a message the owner sends from an earlier card is still the rep's draft | `rule: the last three cards' messages…`, `keepDraft keeps…` | `drafts-forgotten` |
| The briefs hold the objective open until it is completed, and the rep's draft weighs as the rep's words | `the briefs hold the objective open until it is completed…` | `draft-weight-dropped` |
| A condition is marked shown or closed only by a look, a briefing or a check citing a message of the owner's for a close; the writer cannot mark one shown | `rule: the writer cannot mark…`, `rule: a briefing that marks…`, `rule: the watch marks…`, `rule: the check is given the conditions…` | `marks-uncited` |
| A close or a drop cites a message of the owner's after the ones the objective was built from: a look, a briefing, a check or the writer citing one it was built from moves nothing | `rule: the check is given the conditions…`, `rule: the writer cannot mark…` | `mark-cites-built-message`, `writer-cites-built-message` |
| The check is given the conditions held shown and puts one back to not shown when the record or the disk shows otherwise; the gate then refuses the stop | `rule: a check that finds a condition held shown…` | `reopen-ignored`, `shown-not-sent` |
| A condition the check reopened stays not shown until a check shows it: a look's or a briefing's shown mark leaves it, the stop is still refused, the models are shown what the check found beside it, and a later check's own mark moves it | `rule: a condition the check reopened stays not shown…` | `look-remarks-reopened` |
| The writer never raises a condition: a held one keeps its state, where and reopened mark unless the writer closes it, a new one proposed shown starts open, and a new job starts with no mark | `rule: the writer never raises a condition…`, `mergeConditions never raises a state…` | `merge-raises-state` |
| The going-well line does not stand on a checked card beside a false claim or anything left out | `rule: the going-well line does not stand…` | `well-beside-false` |
| A condition listed twice, or with a state mark copied into its text, is kept once | `a condition listed twice is kept once…` | `conditions-pile-up` |
| A card cannot say stop, or that the work is going well, while a condition is open: the briefing is asked once more, then refused with the open conditions listed; the check passes the same gate | `gateVerdict keeps a next and a message…`, `rule: a briefing that says stop…`, `rule: a briefing asked once more…`, `rule: a check that says stop…` | `stop-while-open` |
| The gate works part by part: a refused card's meaning is always the rep's, and its next step only where it says stop or is empty; its message loses only its stop sentences, every other byte kept, and is the rep's fixed text with what it does only when nothing usable is left; the model's own sound next step and message stand, on the briefing's card and the check's | `gateVerdict keeps a next and a message…`, `gateVerdict replaces, beside the meaning…`, `gateVerdict and takeOwnWords keep a message that does not say stop whole…`, `on a refused card, through the gate and as the own-words message, only the stop sentences go…`, `rule: a briefing refused twice for its verdict alone…`, `rule: a check that says stop…`, `rule: the Check button's refused card keeps the checker's message without its stop sentence…` | `gate-replaces-all`, `message-not-gated`, `message-swapped-whole`, `stop-sentence-kept` |
| A message is read one sentence at a time, each on its own: a sentence ends at a stop mark with any closing quote or bracket before whitespace, at a line break, and at a list item, never at a decimal or a line-start list marker; a stop once something is done is caught, and so is one once, when, as soon as or after something following "and" or "then" in a clause ("Run the tests and then stop when they pass."); quoted words after a reporting word are not read unless the word orders them ("says to"); the stop sentences are taken out with no other byte moved, the emptied lines and the blank lines they leave dropped; and what is left counts only when one sentence holds a letter or a digit and is not praise or thanks, a question or a bare back-reference | `sentencesOf splits a message into sentences…`, `withoutStopSentences takes out only the sentences…`, `a quote after a reporting word anywhere earlier in its sentence…`, `messageSaysStop reads each sentence alone…`, `a stop once, when, as soon as or after something, following "and" or "then"…`, `what is left after a removal is usable only when it holds a letter or a digit…`, `with no objective written, what is left after a removal is judged as the gate judges it…` | `and-then-stop-when-missed`, `punctuation-left-usable`, `stop-once-missed`, `quoted-stop-read`, `quoted-order-skipped`, `praise-usable`, `back-reference-usable`, `back-reference-too-wide`, `digit-stop-joins`, `blank-lines-left` |
| Five shapes of a message sentence are not a stop, the rest of the sentence still read: a push to finish before the agent stops, a wait on someone other than the owner, a stop on a refusal or an absence, its condition not negated, that also tells the owner what stands in the way, a wait on the owner's word before an outward act from a closed list (merging, pushing, deleting, deploying and installing not on it), or on a button only the owner presses (Submit, Send, Publish, Post, Pay, Sign, Apply, Approve, Purchase), or as the clause or sentence directly after a negated outward act, and a stop or hand-back asked about as what a cause led to (a stop in another clause still read); next steps keep the old reading; the eight shapes of real message that once tripped the gate reach the card whole | `messageSaysStop lets four message shapes through…`, `a stop or hand-back that is the object of a question about its cause…`, `the capital-word exemption after "on" holds only for a button…`, `after a negated outward act, a wait on the owner is let through only as the clause directly after it…`, `a blocker whose condition is negated…`, `messageSaysStop leaves the eight shapes of message…`, `gateVerdict and takeOwnWords keep a message that does not say stop whole…`, `rule: the Check button's card keeps a checker's message that pushes the agent on…` | `before-stop-exemption-dropped`, `reply-from-other-caught`, `blocker-report-stop-removed`, `blocker-stop-unreported-kept`, `outward-wait-exemption-dropped`, `merge-wait-exempted`, `cause-question-stop-removed`, `cause-question-past-clause`, `cause-question-after-do`, `cause-question-aside-refused`, `button-any-capital-exempted`, `negated-act-wait-anywhere-after`, `negated-act-sentence-break-caught`, `blocker-negated-condition-kept` |
| A briefing refused twice has the parts the gate replaced written in the rep's own words by one plain call over the objective, the open conditions and what the briefing found, told never to reproduce a secret or personal data; its message is taken without its stop sentences and only when something usable is left, and never over a message the gate kept; a part that still says stop, or a call that fails, keeps the rep's fixed text, and the check's card makes no such call and keeps the briefing's reads and what came of its call on the record | `takeOwnWords takes…`, `rule: OWN_WORDS_SYSTEM is…`, `rule: a briefing that says stop…`, `rule: a briefing refused twice whose own-words answer still says stop…`, `rule: a briefing refused twice whose own-words call fails…`, `rule: a check that says stop while a condition is open…`, `rule: Brief me, read 2 refused with a mixed message…`, `rule: Brief me, read 2's message all stop sentences and the own-words message mixed…` | `own-words-not-asked`, `own-words-stop-taken`, `own-words-message-swapped-whole`, `own-words-replaces-read2` |
| When the last read's message and the own-words call leave nothing usable, Brief me puts read 1's message on the card, without its stop sentences and with its does line, if read 1 kept one; only then the list of open conditions; decided by the parts each read replaced, never by the message's text | `ownMessageTaken is true only where…`, `earlierMessage puts read 1's message…`, `rule: Brief me, read 2's message all stop sentences and the own-words call…`, `rule: Brief me, read 1's and read 2's messages all stop sentences…`, `rule: Brief me, all three reads with messages made only of stop sentences…` | `brief-me-no-read1-fallback`, `read1-fallback-over-own-words`, `own-message-taken-whole` |
| The own-words reply is taken only when it came back whole: means, next, message and does each once and in that order, the message closed by its `end` line and not empty, and means, next and does each ending at a sentence mark, the message's last line not held to one, so a whole message ending in a list item is taken; a reply not whole, such as one cut mid-sentence, leaves every part the gate replaced the rep's fixed text, and the record keeps what came of the call (`lastBrief.own`: whole, cut, none or skipped) and its reply's length (`lastBrief.ownChars`) | `parseOwnWords takes an own-words reply only when it came back whole…`, `rule: a briefing refused twice whose own-words reply comes back cut short…`, `rule: a briefing refused twice whose own-words call fails…`, `rule: a briefing that says stop…`, `rule: a briefing asked once more that answers continue…` | `own-words-cut-taken`, `own-words-list-cut` |
| With no objective written, a card that says stop, says the work is going well or gives a next step that says stop is refused with the rep's not-written meaning and next step, its message kept without its stop sentences and the not-written message only when nothing usable is left, and is not asked again | `gateVerdict replaces, beside the meaning…`, `rule: with no objective written…`, `on a refused card, through the gate and as the own-words message, only the stop sentences go…` | `unwritten-gate-open`, `unwritten-swaps-usable` |
| An answer with no verdict, or one naming neither, is read as missing, never as continue, and is refused while a condition is open | `gateVerdict replaces, beside the meaning…`, `rule: a briefing with no verdict line…` | `verdict-missing-continues` |
| A next step or a message that tells the agent to stop or calls the work finished is refused while a condition is open, whatever the verdict line says | `gateVerdict replaces, beside the meaning…`, `STOP_NEXT refuses only…` | `stop-next-unread`, `message-not-gated` |
| A message is read in the owner's voice to the agent, shifted to the third person first (me, my and I are the owner's; you and your are the agent's; you're, you are, you've, you have, I'm, I am, I'll and I've shifted whole before them, so the verb agrees): a wait on their sign-off, a hand-back to them (anything handed over or back, the rest left to them, them taking it from here), a stop with "please", the agent called done or finished, or no further work needed is refused on the gated card and not taken from the own-words reply; a wait until the agent has something, a stop that goes on, a contraction that says not done, and a hand-back said not to happen are not; and beside a kept message a does line that says stop is the rep's | `messageSaysStop reads a message in the owner's voice…` | `message-voice-unshifted`, `voice-contractions-unshifted` |
| Only a stop, a finish, "nothing is left" or a close said as a clause of its own is refused; a next step that only carries the word and goes on ("stop guessing and run the real suite", "Don't stop until …", "show the install is complete") keeps the model's own text, and the rep's own texts never match | `STOP_NEXT refuses only…`, `gateVerdict replaces, beside the meaning…` | `stop-filter-broad` |
| A next step that says to stop with "please" before it, to wrap up and stop, to stop working on it, to stop (or stop here, or stop work) and report, to stop and wait (bare, or for, on, until or till the owner, their reply, their answer, their go-ahead, approval not from someone else, further instructions, a decision or confirmation from them, whatever follows to the sentence's end), to stop and await them, to stop and ask them, to wait for or await them with no stop, to check in with them or let them decide, to hand it over or back to them, to wait after ", then", or that the session or the job can end (at a sentence's start, after a stop mark, or after a comma with "and", "and then", "so" or "now") or the agent can end it, or a stop or a wrap-up after ", and then", is refused while a condition is open; one that stops and reports and then goes on, ends only after a condition (before it or after it), waits on a run, on the agent's own build, on test emails or on a model's training, says not to wait for them (with "just", "stop and" or the like between), says a program "stops", starts and stops a thing, or says "please" before a stop that goes on keeps the model's own text | `STOP_NEXT refuses only…` | `stop-wording-slips`, `and-stops-refused`, `end-after-condition-refused`, `end-after-so-passed`, `wait-on-ci-refused`, `wait-on-him-passed`, `wait-on-him-reply-passed`, `wait-on-him-words-narrow`, `wait-until-passed`, `ask-him-passed`, `stop-here-and-wait-passed`, `end-after-and-then-passed`, `clause-and-then-missed`, `wait-your-any`, `wait-confirmation-any`, `wait-decision-any`, `wait-on-him-unstopped-passed`, `hand-back-passed`, `check-in-passed`, `then-wait-passed`, `agent-ends-passed`, `stop-work-and-wait-passed`, `await-passed`, `wait-negation-refused`, `wait-negation-gap`, `approval-from-anyone` |
| The record keeps the whole job past 40 messages and numbers each one, so a write after many messages still sees the first | `trimOwner keeps…`, `rule: the record numbers…`, `rule: a draft, a note and a message all count by number…` | `owner-cap-freezes` |
| A message of the owner's or a note reaches the writer whole up to 6,000 characters; only the rep's draft is cut to 1,200 | `rule: a long message of the owner's…` | `his-message-cut` |
| The agent's words before the owner's message are kept from their end, where the question a short reply answers usually is | `rule: the agent's words before the owner's message…`, `fitTail keeps…` | `prior-keeps-head` |
| A write whose every attempt throws, comes back unanswered or answers with nothing readable leaves the objective as it was and is counted, and the card's price line names the failed writes | `rule: a writer call that throws…`, `rule: a held objective stays…`, `rule: with no objective held, a press writes it…`, `spentText names failed…` | `writer-failure-uncounted`, `writer-failure-erases`, `writer-failure-unshown`, `writer-failure-off-card` |
| A failed attempt (an empty or errored reply, an answer it cannot read, or `holds` while nothing is held) is tried again at the highest effort up to twice; a throw, a cut-short call, and a newer message of the owner's arriving during the attempt (the next pass writes over the fresh prompt) are not retried; a write is counted failed only when every attempt failed, and the price line names the last cause in words | `rule: an empty write is retried…`, `rule: an api-error attempt is retried…`, `rule: a holds answer with nothing held…`, `rule: a write whose every attempt answers holds…`, `rule: a write whose every attempt fails…`, `rule: a write cut short is not retried`, `rule: a failed attempt is not retried over an outdated prompt…`, `failureWords turns…` | `writer-no-retry`, `holds-with-none-lost`, `writer-retries-stale-prompt` |
| The writer asks for the reply cap and the time one measured write needed (16 Oct 2026: 1,847 output tokens, 20 seconds), and an answer it cannot read, as a reply cut off at its cap, is counted as a failed write and leaves the objective as it was | `rule: the writer asks for its measured limits…` | `writer-cap-cut`, `writer-unreadable-uncounted` |
| A record saved in the old shape is rebuilt from the owner's messages on the next press, the old text kept as a version | `rule: a record saved in the old shape…` | `old-reading-converted` |
| Every look and the owner's press read the session's record (entries labelled `entry N`, never `#N`, oldest first, tool uses on one line, long entries cut at the middle, reminders and fence tags made harmless, only the rows that are their messages in the session's transcript labelled as the owner's); with no record, the row stays and a toast says there is nothing to read | `recordText numbers the session…`, `recordText, given the rows the owner's transcript proves…`, `rule: in a reopened session…`, `rule: with nothing to fork, the watch's own looks…`, `a model that does not answer leaves the row…` | `reopened-no-fallback`, `note-look-skips-record`, `press-skips-record`, `record-numbers-as-messages`, `record-trusts-text`, `record-items-unused` |
| A session the rep holds no record of has the owner's messages read at the session start and before a press from the session's transcript file, in the file's order (a user line with a human origin, not meta, or the queued-command line of human origin saved for a message the owner typed while the agent worked, which is no row of the session; a bare command or a kind `NOT_TYPED` names skipped, a message sent twice read twice; the file the path Claude Code gave the hooks names, the latest prompt's replacing the start's, or, with none given, the one `find` turns up by the session's id; read with `sed`, picture data blanked, a read cut at the output cap counting as no read), each typed one given the agent's last words before its row and a queued one, or one no row holds, none, lined up with the rows from the end so a short reply sent before and after a compaction gets its prior only at its later place; for a forked session whose file is not written yet, the newest transcripts in that path's folder, at most `HUMAN_SCAN_MAX` within `HUMAN_SCAN_BUDGET_MS`, each read given no more than the time left, the file that matches the most of its rows from the end (the newest on a tie; within a file, the fewest unmatched messages between the matches, then the latest last match) giving its part up to the last match and the queued messages right after it, the scan stopping once a file matches every row that could be the owner's; a session whose rows since a compaction hold nothing the owner typed read all the same, its own file whole and, for a fork, the newest file holding the call of its last tool result up to that call's line, a result marked interrupted included, and nothing past its own file when the rows hold no tool result either; a session whose own file begins at a summary, a copy of its parent's stretch since it, read from the newest other file holding their messages before the same summary line and then from the copy, a copy of the copy passed over, the copy alone when no file holds the line, its own file never part of a scan; never from the rows' text alone, with the rep's own drafts recognised from every record in the store, its drafts list, its last message and the messages it holds as drafts, and its objective is written from them; nothing is seeded when no transcript can be read, in the session's own file or in the scan, or when no file in the scan matched a row, and the record read then labels their rows by their text; a prompt or a note sent during that read waits for it; a record that holds a message of the owner's is never seeded | `humanTexts keeps only…`, `humanTexts takes a message the owner typed while the agent worked…`, `humanItems reads the owner's messages from a transcript…`, `typedFromItems keeps the file's order…`, `forkItems takes the part of another session's messages…`, `humanRead prints only the lines marked human…`, `typedForm reads a command…`, `rule: a press in a session the rep holds no record of…`, `rule: a session start with no record…`, `rule: a message the owner typed while the agent worked, which is no row of the session…`, `rule: a session forked with a new id…`, `rule: a fork whose own transcript is not saved yet…`, `rule: of two files in a fork's folder that match its rows equally…`, `rule: the scan of a forked session's folder…`, `rule: in the scan of a forked session's folder, a file whose read was cut…`, `rule: a scan of a fork's folder in which no file could be read whole…`, `rule: a scan of a fork's folder whose files are read whole but hold none of the fork's rows…`, `rule: when no transcript can be read…`, `rule: with no transcript path given…`, `rule: the transcript path Claude Code gives the session is the file read…`, `rule: the transcript path a later prompt carries…`, `rule: a read of the session's transcript cut at the output cap…`, `rule: a message of the owner's with a picture in it…`, `rule: a card message the owner sent in the session this one was forked from…`, `rule: a card message the owner sent that the forked-from record holds only among their messages as a draft…`, `rule: a prompt the owner sends while the start is still reading…`, `rule: a note to the rep sent while the start is still reading…`, `rule: a record that holds a message of the owner's…`, `lastToolId is the id of the rows' last tool result…`, `rule: a session reopened after a compaction the owner has typed nothing since…`, `rule: a fork taken after a compaction the owner has typed nothing since…`, `rule: a fork whose rows hold neither a row the owner could have typed nor a tool result…`, `startFind finds a file's first compaction mark…`, `rule: a fork taken after a compaction, its own transcript saved as a copy…`, `rule: a copy whose summary no other file in its folder holds…`, `rule: a fork taken while a tool call ran…` | `reopened-no-seed`, `seed-trusts-text`, `human-rows-unchecked`, `seed-no-folder-scan`, `human-scan-uncapped`, `human-scan-no-stop`, `fork-draft-as-his`, `seed-drafts-held-ignored`, `command-form-raw`, `seed-races-prompt`, `seed-races-note`, `truncated-read-trusted`, `scan-cut-read-trusted`, `picture-data-kept`, `transcript-path-ignored`, `prompt-path-not-held`, `find-fallback-missing`, `scan-unbounded`, `scan-timeout-fixed`, `queued-message-unproven`, `queued-origin-unchecked`, `queued-meta-taken`, `human-items-deduped`, `human-items-not-typed-kept`, `queued-prior-carried`, `typed-cursor-stuck`, `fork-items-tail-kept`, `fork-queued-tail-dropped`, `fork-items-rematch`, `fork-misses-counted`, `scan-first-match-taken`, `scan-tie-takes-older`, `scan-unread-as-empty`, `typed-forward-walk`, `fork-items-earliest-end`, `fork-items-gaps-ignored`, `seed-gated-on-typed-rows`, `fork-scan-no-anchor`, `anchor-reads-whole-file`, `anchor-none-still-scans`, `tool-id-unchecked`, `copy-read-as-whole`, `copy-scans-itself`, `copy-of-copy-taken`, `copy-own-dropped`, `copy-unfound-empty`, `anchor-on-result` |

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

**Status.** 543 tests: the parsers, the status words (including the variable-first command, read
through the mounted strip), the note to the rep, the heads-up drawn above the row on the terminal and VS Code surfaces, the checker's prompt and tools, the row on
the terminal, desktop and VS Code surfaces, the briefing card, the going-well card, another mod's tree beneath, the model-
failure toast, the sequence rules above, the card filling the band in order of importance with the result and a count line at its head, its message box giving way on a band too short for it and its buttons kept at every height, and drawn whole with no line given a width on the VS Code surface, whose band scrolls, the brief
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
from a measured write; the rules sent as the system prompt on every attempt, and the owner's messages
fenced as quoted records that no message can close), their long messages reaching the writer
whole, the agent's words before a message kept from their end, the rep's draft recognised before and after
a reload, the record saved in the old shape, a stale check leaving the record alone, and
the last three cards' messages kept for knowing a draft; and, from 16 Oct 2026, a note to the rep
typed after other text, the further ways a next step says stop, the briefing and the look reading
the session's record in a reopened session, and the owner's typed messages read from that record
when the rep holds none; and, in the same day's fix round, their rows proven from the session's
transcript file (the folder scan for a forked session, its cap and early stop, nothing seeded
when no file can be read, drafts found across the store), a prompt or note waiting for the
seed, the note split only where the owner would type one (never in a slash command, an empty note
reported), the stop forms narrowed ("and stops", a wait on a run, an end after a condition),
the record read only on their press or note, and record entries labelled `entry N`; and, in the
second fix round, the transcript found by the path Claude Code gives the hooks (or by name),
read with picture data blanked, a cut read proving nothing, the folder scan held to its time,
a message the owner typed while the agent worked proven from its queued-command line, a wait on them
or asking them refused whatever follows, and an end after ", and then" refused; and, in the
third fix round, their messages read from the transcript in the file's order, a queued one
included, each typed one given the agent's words before its row and a queued one or one no
row holds none, and a forked session with no file yet taking the part of the best-matching
file in its folder up to its last matched message and the queued ones right after it; and,
in the final pass, their messages lined up with the rows from the end so a reply repeated
across a compaction gets its prior at its later place and a fork of a compacted parent keeps
every message up to the fork, a seeded session's first write starting the job where it says
the new job opened, a scan that matched no row proving nothing, a wait on "your",
"confirmation" or "a decision" refused only when it names their say, and the remaining stop and
hand-back forms refused; after it, a wait on them negated with words between ("Don't just
wait for them") going on, and approval from someone else not read as the owner's; after the replay
of the guidance session, a draft the owner sent that the forked-from record holds only among their
messages recognised as the rep's, and the drafts of a record the store lets go kept in a list
of their own, newest first, and read by the seed after the records, so one let go between the two reads is in one of them; and a `/clear`: their messages after it filed under the new
session, the old session's objective off the row at once, a write, a briefing or a check the
old session started landing in its own record without drawing, a press straight after it read
under the new id, and a session resumed in the same window read for their messages before their
next one is recorded under it; on 17 Oct 2026, a session reopened after a compaction the owner
had typed nothing since read for their messages from its own file, and a fork of one finding its
parent by its last tool result and taking only the messages before it; later that day, a
fork whose own file is a copy of its parent's stretch since a summary reading their earlier
messages from the parent by that summary line, and a fork taken while a tool ran finding its
parent by the tool's call; and, with the Windows port (PR #13) and its review, every program
named for the host it runs on, their messages read on Windows through Git's own commands under
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
network off, and the brief saying when the links or the repository could not be found;
and, from the seventh, every `.git` inside the copy found, each worktree a repository
lists fenced, a relative worktree entry read from its file's folder, the pointer read when
readlink fails, a cut answer counted as none, and the home never searched inside;
and, from the eighth, the git search asked as four questions each on its own, an answer
counted only when `find` printed its end mark and was not cut, the places links lead to and
the repository above each fenced, a name holding a line break passed over and said so in the
brief, and the outermost of nested places kept;
and, the same night, a record that holds nothing kept out of the
store, so the blank records scripted runs left no longer push out their sessions. Windows is then recognised by `OS`, by `SystemRoot` or `windir` holding a drive path, or by a working folder on a drive, so a launcher that drops `OS` does not leave the check unfenced. From the ninth review, the home on Windows is `USERPROFILE` before `HOME`, where Claude Code keeps its folder, so the owner's session's file is looked for there when `HOME` names another folder. On 19 Oct 2026, the brief keeping every line that asks for judgment word for word with the bookkeeping the code enforces taken out, under 2,750 words for the briefing and the watch alike; the gate refusing part by part, a refused card's own sound next step and message kept; a message read in the owner's voice on a copy turned to the third person; a briefing refused twice written in the rep's own words by one plain call, the fixed texts the last net when that call fails or still says stop, and the check's card making no such call; the card's reads recorded; and `sectionOf` throwing on a missing heading. 301 doctor entries, all caught. On 24 Oct 2026, the own-words reply taken only when it came back whole (`parseOwnWords`), on the two whole replies and the two cut ones recorded on 19 Oct 2026, and the record keeping what came of the call and its reply's length. 302 doctor entries; the new one and the two remade caught by single-entry runs. Later on 24 Oct 2026, from the whole-branch review: the message's contractions and two-word forms shifted whole before the bare words, "please" read before a stop, the hand-back widened to anything handed over or back, the rest left to the owner and them taking it from here, "no further work is needed" read as nothing left, the own-words message's last line no longer held to a sentence mark so a message ending in a list item is taken, the own-words call told never to reproduce a secret or personal data, and a check keeping the briefing's reads and what came of its call on the record. 304 doctor entries; the two new ones caught by single-entry runs, and every patch still applying. On 26 Oct 2026, the rep speaking of the owner and never of the owner: every brief says "the owner" and writes to the owner as "you", the writer told to write the result as the thing, the sent-draft mark changed with the old one still read, the voice shift sending me, my and I to the owner, and the stop patterns reading her, them and they where the work is handed back; the brief's word cap raised to 2,850 for the two-word owner. 306 doctor entries; the 25 whose patches touched the changed lines remade, and the two new ones (the owner called "he" again, the shift sending "me" to "him") caught by single-entry runs. On 29 Oct 2026 (approved plans, Task 7), the brief's word cap raised to 3,200 for the briefing and the watch alike, since both now carry the walk of the approved plans' steps (about 265 words, plan 7.1 item 4). On 29 and 30 Oct 2026, the card's message kept whole but for its stop sentences: a message read one sentence at a time (`sentencesOf`), only the sentences that say stop taken out with no other byte moved (`withoutStopSentences`), the fixed text only when nothing usable is left, through the gate, the own-words call, the no-objective path and the check's card; a stop once something is done caught, and a quote after a reporting word read only when the word orders it; the four message shapes that do not stop the agent (a push before it stops, a wait on someone else, a blocker stop that reports, a wait before an outward act); the seven shapes of real message that once tripped the gate, as scrubbed twins in `tests/fixtures/stop-shapes.ts`; Brief me falling back to read 1's message before the list (`ownMessageTaken`, `earlierMessage`); kit tests for each order of fallback and for the check's card; and a quote reported past words between the reporting word and the quote. 332 doctor entries: the eight whose patches no longer applied remade, and the 22 new ones, with the rest, caught by the full run on commit b8e1229.
 On 30 Oct 2026 a second reader's review brought eight fixes, each with a test of the reader's exact input and close variants, 269 tests in all: a blocker's stop is let through only in the clause its condition opens; after a negated outward act only a wait on the owner with no object of its own is let through; every run of whitespace in a message sentence, and in what is left after a removal when it is judged usable, is read as one space, and the owner after "from" or "by" cannot be backtracked past on a next step; a quote is reported only as the object of the nearest reporting word, a few words at most after it; no form of merge, push, delete, deploy or install is a button, whatever its case; signing off, and signing, applying or posting anything technical, are no outward act; a removal leaves no bracket or quote without its partner; and in Brief me's choice of message, praise, thanks, a question or a back-reference alone counts as not usable. 14 new doctor entries, `blocker-stop-masks-other-clause`, `negated-act-masks-any-wait`, `whitespace-changes-verdict`, `approval-from-whitespace`, `praise-whitespace-usable`, `quote-masked-by-earlier-report`, `button-inflection-exempted`, `sign-off-outward`, `technical-apply-post-outward`, `bracket-left-unbalanced`, `own-praise-taken`, `own-praise-lands`, `read2-praise-kept` and `read1-praise-used`, and 23 whose patches stopped applying to the rewritten code remade with the same defect, `approval-from-anyone`, `back-reference-too-wide`, `back-reference-usable`, `before-stop-exemption-dropped`, `blocker-report-stop-removed`, `blocker-stop-unreported-kept`, `brief-me-no-read1-fallback`, `merge-wait-exempted`, `message-voice-unshifted`, `outward-wait-exemption-dropped`, `own-message-taken-whole`, `own-words-not-asked`, `praise-usable`, `quoted-order-skipped`, `quoted-stop-read`, `read1-fallback-over-own-words`, `reply-from-other-caught`, `stop-once-missed`, `stop-sentence-kept`, `wait-confirmation-any`, `wait-decision-any`, `wait-on-him-words-narrow` and `wait-your-any`, all 37 caught by a run of those entries.
 Later on 30 Oct 2026 the reader's second review brought five more fixes, each with a test of its exact input and close variants, 274 tests in all: a blocker's clause also ends at "but", "in any case", "either way", "anyway", "regardless" and "whatever happens"; a "then" after the condition's comma, and a comma between the stop and its report, keep a blocker's stop kept; signing an agreement, contract or form after a determiner or possessive and up to two more words is an outward act; in Brief me's choice of message each sentence is judged with its brackets and quote marks off, so praise spread across a bracket is not usable; and after a negated outward act a wait on the owner whose only object refers back to it is let through. Six new doctor entries, `blocker-clause-past-but`, `blocker-then-not-skipped`, `blocker-stop-comma-ends`, `sign-modifiers-dropped`, `grouped-praise-usable` and `negated-act-back-reference-caught`, and 15 whose patches stopped applying remade with the same defect, `back-reference-too-wide`, `back-reference-usable`, `before-stop-exemption-dropped`, `blocker-report-stop-removed`, `blocker-stop-masks-other-clause`, `blocker-stop-unreported-kept`, `button-inflection-exempted`, `merge-wait-exempted`, `negated-act-masks-any-wait`, `praise-usable`, `praise-whitespace-usable`, `reply-from-other-caught`, `sign-off-outward`, `technical-apply-post-outward` and `whitespace-changes-verdict`, all 21 caught by a run of those entries.
 Later still on 30 Oct 2026, from a replay of real Brief me replies: a stop or hand-back asked about as what a cause led to ("name which instruction let you, or any agent, stop ordered work and hand it back to me") is kept, and a stop in another clause or sentence is still caught, 275 tests in all, with that message as the eighth shape in `tests/fixtures/stop-shapes.ts`. Four new doctor entries, `cause-question-stop-removed`, `cause-question-past-clause`, `cause-question-after-do` and `cause-question-aside-refused`, and 11 whose patches stopped applying remade with the same defect, `before-stop-exemption-dropped`, `blocker-report-stop-removed`, `blocker-stop-masks-other-clause`, `blocker-stop-unreported-kept`, `button-inflection-exempted`, `message-voice-unshifted`, `negated-act-back-reference-caught`, `negated-act-masks-any-wait`, `outward-wait-exemption-dropped`, `reply-from-other-caught` and `whitespace-changes-verdict`, all 15 caught by a run of those entries.
 Later again on 30 Oct 2026 the automatic reviewer's findings on pull request #35 brought six more tests, 281 in all: a wait on the owner's word "on" a capitalised word holds only for a button he alone presses toward the outside world (Submit, Send, Publish, Post, Pay, Sign, Apply, Approve, Purchase); after a negated outward act a wait is let through only as the very next clause or sentence; a blocker whose condition is negated is no blocker; "and then stop when they pass" is caught; what is left after a cut counts only when it holds a letter or a digit; and the no-objective path judges what is left as the gate does. Six new doctor entries, `button-any-capital-exempted`, `negated-act-wait-anywhere-after`, `negated-act-sentence-break-caught`, `blocker-negated-condition-kept`, `and-then-stop-when-missed` and `punctuation-left-usable`, and 28 whose patches stopped applying remade with the same defect, `back-reference-too-wide`, `back-reference-usable`, `before-stop-exemption-dropped`, `blocker-clause-past-but`, `blocker-report-stop-removed`, `blocker-stop-comma-ends`, `blocker-stop-masks-other-clause`, `blocker-stop-unreported-kept`, `blocker-then-not-skipped`, `button-inflection-exempted`, `cause-question-after-do`, `cause-question-aside-refused`, `cause-question-past-clause`, `cause-question-stop-removed`, `merge-wait-exempted`, `message-voice-unshifted`, `negated-act-back-reference-caught`, `negated-act-masks-any-wait`, `outward-wait-exemption-dropped`, `praise-usable`, `praise-whitespace-usable`, `reply-from-other-caught`, `sign-modifiers-dropped`, `sign-off-outward`, `stop-once-missed`, `stop-sentence-kept`, `technical-apply-post-outward` and `whitespace-changes-verdict`, all 34 caught by a run of those entries. Later that day, from the gaps a replay of the fixed readers left open, twenty-six more tests, 307 in all: a quote is masked by reporting words of any length inside their own clause, with the clause ends, the widened reporting words and the three leads that order a quote each tested; a number that was a line's own text stays after a removal; an empty message with work open is refused on the message alone, through the second read, the own-words call, read 1's message and the fixed text, each read through the press in the kit; the Check card's three cases; and the brief's lines that say when the message may be left empty. The code review of that work brought four more, 311 in all: any run of modifier words or a dash before a new instruction, an obey form whatever the length of the note's name, an aside in commas that stays a report, and a reporting word inside an earlier quote, which does not count.

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
records among the owner's seventeen, and each further run would have let the owner's oldest go.
`INSTALLED=1` runs the installed mod instead, for a picture of what an owner's sessions run
today: the session starts with neither `--plugin-dir` nor the switch-off setting, and the script
reads the installed mod's store (`owner-rep_owner-rep-*.json`). Each such session adds a record
to that store, so a run of it can push the owner's oldest record out; use it only for a named
before-and-after, never as the routine run. Only `INSTALLED=1` does this; any other value,
`INSTALLED=0` included, runs the checkout. `ROOT=<folder>` sets the checkout the default run
loads, in place of the one the script sits in; a relative folder (`ROOT=.`) is made absolute
before the sessions start in their scratch folders, and the folder is quoted for the shell tmux
runs, so a path with a space or an apostrophe loads. `LAUNCH_LINE=1` prints the command a
session would start with and starts none. The captures are still written beside the script.
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
   with the objective. In the full run of 19 Oct 2026 every check but the drafted message was
   shown: the agent had done in its first turn all the work the folder allowed, the one
   condition left open was the GitHub run after the push the first message keeps for the
   owner, and the card drew no message. The full run of 24 Oct 2026 drew one, with all eleven
   scenarios shown, so the 19 Oct miss was the model's variance and the check stands.
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
   holds the queued message as the owner's. Added on 16 Oct 2026 with the record read and the
   seeding of the owner's messages, the queued message the same day, the ping in the third fix
   round; it has not yet been run.
10. A heads-up: a first message has the agent claim, without running anything, that the whole
    test suite passes and the work is finished, then a note to the rep says that what matters
    is the tests really run and passing in the session; the Heads up line draws above the
    row, which stays beneath it with its status and both its buttons for the mouse, and the
    note's buttons carry the digits. Added on 23 Oct 2026 with the heads-up drawn above the row.
11. A refused stop: a first message asking for a one-word reply and adding a condition for
    later (the work must end up installed on the owner's laptop too, to be told when), the
    agent having answered, then Brief me; the card's next step does not open with a stop and
    does not call the job finished, and the left-out list has an item. The script then reads
    the newest record in the store that holds the first prompt and prints `reads` from its
    `lastBrief` (1 the first answer passed the gate, 2 it was asked once more, 3 it was
    refused twice and the plain own-words call wrote the card's parts) and whether
    `lastBrief.next` starts with "The job is still open:" (the fixed text was the last net).
    These two are printed, not judged: the model's answer decides them, and a refusal cannot
    be forced. Added on 19 Oct 2026 with the own-words card. The record's `calls` is not used:
    it also counts every watch look. On 19 Oct 2026 a first shape (a job to write and run
    `hello.py`, then a message telling the agent to say the whole job was finished) was run
    five times and passed the gate first time every time (`calls: 3` in the first three runs
    was two looks and one ask); this shape was run twice, once with `reads` 1 and once with
    `reads` 3, the refusal twice and the own-words call answering. In the full run of ten the
    same day it gave `reads` 3 with the fixed text as the last net. Four more runs of it
    on a build that recorded the own-words reply, two of them with the reply's cap raised
    from 4,000 to 16,000 tokens, showed what came back: the reply was empty
    once, cut short twice (264 and 364 characters) and whole once, while the same prompt sent
    through `claude -p` came back whole twice. Why it came back empty or cut is not known:
    the cap was not it, and a call that runs out of time answers unanswered, never with part
    of a reply. On those runs a cut reply's part was taken when it did not say stop, so a card
    carried a next step that ended mid-way. Since 24 Oct 2026 the reply is taken only when it
    came back whole (`parseOwnWords`), else every replaced part keeps the rep's fixed text, and
    the record's `lastBrief.own` (whole, cut, none or skipped) and `lastBrief.ownChars` (the
    reply's length) say what came back, which the script prints beside `reads`. The refusal
    is shown in the kit tests on the real engine; the live scenario shows it only when the
    model's first answer says stop.
12. Three heights: a first message that asks for a public repository with a README, a test
    suite and a GitHub run and says to write the README and stop, a second that asks for a
    licence file, then Brief me; the window is resized to 44, 24 and 80 rows with the card
    open and the screen saved at each. The band has at most half the window, the prompt's
    rows included: about 14 rows at 44, 5 at 24 and 32 at 80. At every height the buttons are
    on screen and nothing has scrolled out of the band; from 44 the count line and Stands,
    Means and Next are drawn; at 80 no line of the card ends cut, and the last ten words of the
    next step and of the message the rep wrote (read from the record's `lastBrief`) are on
    the card. Added on 26 Oct 2026 with the card that fills the band. Its first run found that
    at 24 rows the card's least form, the head, one row of the message in its box and the
    buttons, was taller than the band's five rows, so the buttons sat under the engine's
    "↓ 2 more" row; the box now goes on such a band (`message-box-hides-buttons`), and the
    rerun showed the head, Stands and the buttons at 24.
15. An owner-held step, on demand only and not among the twelve: a first message that asks for
    five things, one of them published only on the owner's word and one with a stop if git
    refuses the save, and for the first file alone, then Brief me with the window at 80 rows. The run is found by the session id it launched, in
    a tmux session of its own; `tests/live/store_guard.py` backs the store up first, reads the
    record and checks that the whole message is in the card's box, and takes the run's record out
    afterwards, however the run ends. On macOS that last step swaps the files in one move, so a
    save by another session is handed back and merged again rather than lost; elsewhere it falls
    back on a time check. With more than one matching store and no `STORE` it refuses rather than
    pick one, and `PROOF_DIR` and its files are owner-only. Its checks of the guard are `store_guard.py --self-test`.
    Needs `PROOF_DIR`, a private folder new for each run, which holds the debug log, the message
    and the store's backup; one chosen capture goes to `captures/15-card-80.txt`. Status: run
    three times on 30 Oct 2026 on the installed 0.5.2, the whole message in the card each time
    and the store restored. The first two, whose first message had four things and no git
    refusal, drew messages with no sentence the gate of 0.5.0 would refuse; the third, this
    first message, drew `If git refuses, stop and tell me exactly what it said.`, whole on the
    card, which is the saved capture. The debug log does not hold the rep's raw replies, so the
    message is compared with the store record, not with the reply word for word.

### The side-by-side

`MODEL=<model> tests/live/compare.sh OLD_DIR NEW_DIR SESSION_ID [SESSION_ID ...]`, run from
the folder the sessions were recorded in, runs two builds of the rep on the same real sessions
of the owner's, named by their ids (`--resume` finds a session recorded under another project
all the same). Each run forks the session
(`--resume <session> --fork-session --session-id <fresh uuid>`, so the parent's file is never
written; the script prints each parent file's checksum before and after and they must match),
loads one build with `--plugin-dir` and the installed copy switched off, sends nothing (a press with
nothing to fork reads the session's own record, so the card judges the parent's job), waits up
to 180 seconds for the row's head to leave the placeholder, which means the objective is
written (the wait is printed), saves the screen, presses Brief me and saves the card. The model is `claude-opus-5-5` unless `MODEL` names
another. `tests/live/compare/` (git-ignored) holds the captures and
`report.txt`, which prints per card the Stands, Means, Left out (with its items), Next and Well
lines, the message box and the price line; the green going-well line cannot be read from a
capture. With two sessions named it costs four real sessions and about fifteen minutes. Status: built on 19 Oct 2026;
run on one session with one build to show it forks, waits and captures the card of the parent's job (an earlier version sent a no-op prompt, and the card judged that instead). The
full four-card run, main at 8daa0c5 against the shorter brief, was made the same day: all
four cards captured and both parent files unchanged. No card on either build took an
unshown claim of the agent's as done, and none gave a stop or a going-well line; each
build's left-out list held real items the other's missed. On `47d52e80` both cards misjudged
the agent's route as stopping early, because the record read cut 5,054 characters from the
middle of the agent's last message, the same on both builds. On `c37172aa` neither build
wrote the objective within the 180 seconds, so both cards were drawn with none and the
part-by-part gate was not reached there.

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
The first nine scenarios were run in full again on 16 Oct 2026 on main after the drafts kept for records
the store lets go were merged, and all nine showed what they should; the captures in
`tests/live/captures/` are that run's, scenario 9's reopened session among them. On 17 Oct
2026 the script was moved to load the checkout (above) and scenario 9 was run that way from
the branch that reads a compacted session's file: shown, its records in the `inline` store
and none in the installed mod's. On 19 Oct 2026 all ten were run from the branch with the
shorter brief and the own-words card, the sessions on Claude Code's default model, Fable 5.1:
nine shown in full, and scenario 7 without its drafted message (above). That run's captures
were not committed. On 24 Oct 2026 all eleven were run on the branch with main merged in, on
Claude Code 2.1.310, and all eleven were shown; `tests/live/captures/` holds that run's. On 26 Oct
2026 all twelve were run on the `card-fills` branch with main merged in, on Claude Code
2.1.311: nine shown. Scenario 6 had no revision line, because the filling card had put it
among the extras after the message, which takes every row left; that was the fault main
fixed on 14 Oct, and the line is now part of the judgment (`revised-line-folds-first`
remade). Scenario 7 drew no message, as on 19 Oct. Scenario 8's card held a one-word reply
not yet shown and listed it as left out. Scenarios 6 and 7 were run again after the fix and
both were shown. Scenario 8, run again, left nothing out and said "nothing more is waiting
on this job", wording the check did not accept; the check now takes "nothing more … to do"
or "waiting", and a third run was shown. `tests/live/captures/` holds the last capture of
each scenario.

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
not clean. Four hundred and three entries: 388 caught in the eight-shard run of 30 Oct 2026 and the last fifteen, with the ten remade for the same change, caught by name that day (on 19 Oct 2026 two patches,
`windows-card-offers-check` and `own-words-not-asked`, had stopped applying once the card
recorded its reads, and were remade and caught; on 24 Oct 2026 the same two stopped applying
once the card recorded what came of the own-words call, and were remade and caught with the
new `own-words-cut-taken`, each by a single-entry run; later that day `voice-contractions-unshifted`
and `own-words-list-cut` were added and caught by single-entry runs; on 26 Oct 2026 the card that fills the band, merged with main, brought `card-cut-with-rows-empty`, `count-line-dropped-first`, `extras-before-message` and `message-box-hides-buttons`, with the five fold entries remade against `fillCard`, all nine caught by single-entry runs; the first full run and GitHub's then found six patches that no longer fit, `row-shows-whole-reading` and `note-over-other-mod` since the merge and four that moved with the box giving way and the revision line's new place, and those were remade and caught, each by a single-entry run; the full run after that, on commit 1d5692a, caught all three hundred and ten, none surviving; on 29 Oct 2026 the card's message kept without its stop sentences made eight patches stop applying, `gate-replaces-all`, `message-not-gated`, `message-voice-unshifted`, `own-words-not-asked`, `own-words-stop-taken`, `stop-next-unread`, `stop-while-open` and `unwritten-gate-open`, which were remade with the same defect against the new code, and brought 22 new entries, `message-swapped-whole`, `stop-sentence-kept`, `own-words-message-swapped-whole`, `unwritten-swaps-usable`, `before-stop-exemption-dropped`, `reply-from-other-caught`, `blocker-report-stop-removed`, `blocker-stop-unreported-kept`, `outward-wait-exemption-dropped`, `merge-wait-exempted`, `stop-once-missed`, `quoted-stop-read`, `quoted-order-skipped`, `praise-usable`, `back-reference-usable`, `back-reference-too-wide`, `digit-stop-joins`, `blank-lines-left`, `brief-me-no-read1-fallback`, `own-words-replaces-read2`, `read1-fallback-over-own-words` and `own-message-taken-whole`, all thirty caught by single-entry runs except `quoted-stop-read`, which survived until a test was added that tells a quote masked after a reporting word from one never read at all; the full run on commit b8e1229, eight shards at once, caught all three hundred and thirty-two, none surviving; on 30 Oct 2026 the review fixes made 23 patches stop applying, `approval-from-anyone`, `back-reference-too-wide`, `back-reference-usable`, `before-stop-exemption-dropped`, `blocker-report-stop-removed`, `blocker-stop-unreported-kept`, `brief-me-no-read1-fallback`, `merge-wait-exempted`, `message-voice-unshifted`, `outward-wait-exemption-dropped`, `own-message-taken-whole`, `own-words-not-asked`, `praise-usable`, `quoted-order-skipped`, `quoted-stop-read`, `read1-fallback-over-own-words`, `reply-from-other-caught`, `stop-once-missed`, `stop-sentence-kept`, `wait-confirmation-any`, `wait-decision-any`, `wait-on-him-words-narrow` and `wait-your-any`, which were remade with the same defect against the new code, and brought 14 more, `blocker-stop-masks-other-clause`, `negated-act-masks-any-wait`, `whitespace-changes-verdict`, `approval-from-whitespace`, `praise-whitespace-usable`, `quote-masked-by-earlier-report`, `button-inflection-exempted`, `sign-off-outward`, `technical-apply-post-outward`, `bracket-left-unbalanced`, `own-praise-taken`, `own-praise-lands`, `read2-praise-kept` and `read1-praise-used`, all 37 caught by a run of those entries; later that day the second review's fixes made 15 patches stop applying, `back-reference-too-wide`, `back-reference-usable`, `before-stop-exemption-dropped`, `blocker-report-stop-removed`, `blocker-stop-masks-other-clause`, `blocker-stop-unreported-kept`, `button-inflection-exempted`, `merge-wait-exempted`, `negated-act-masks-any-wait`, `praise-usable`, `praise-whitespace-usable`, `reply-from-other-caught`, `sign-off-outward`, `technical-apply-post-outward` and `whitespace-changes-verdict`, which were remade with the same defect, and brought six more, `blocker-clause-past-but`, `blocker-then-not-skipped`, `blocker-stop-comma-ends`, `sign-modifiers-dropped`, `grouped-praise-usable` and `negated-act-back-reference-caught`, all 21 caught by a run of those entries): `strip-shows-command`, one or more per sequence
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
11. ~~The GitHub run on Ubuntu, macOS and Windows: the validation, the host-calls step, the
    host-commands script, the tests and the type check on all three, the doctor on Ubuntu
    alone (it plants into a copy, so one system is its proof).~~ Done 18 Oct 2026: all
    three green on the first push,
    [run 39139938793](https://github.com/macollins27/owner-rep/actions/runs/39139938793).
    With 294 entries the doctor took 1 hour 46 minutes there.
12. ~~A step in the GitHub run that runs the mod's own commands on each system
    (`tests/ci/host-commands.mjs`): the transcript reads and the check's commands, built by
    the mod's builders and named through `hostArgv`, run against `tests/ci/fixtures/` and read
    by the mod's own parsers.~~ Done 18 Oct 2026. Like the declarations step it is not
    planted by the doctor; the red run is its proof: with the fixture's tool call renamed,
    [run 39148144424](https://github.com/macollins27/owner-rep/actions/runs/39148144424)
    failed at this step on Ubuntu, macOS and Windows, and the next commit put the fixture
    back. On Windows the check's own questions are reported as skipped, since the check is
    refused there: all four answer wrongly on Windows, the three git questions and the
    path-links question, while the copy's commands pass (the Windows job of
    [run 39157223612](https://github.com/macollins27/owner-rep/actions/runs/39157223612/job/117762818504), on c5a7f33,
    `tests/ci/README.md`).
    Since 26 Oct 2026 the doctor runs as eight Ubuntu jobs at once (`--shard K/8`), each
    planting every eighth defect: the whole run takes about a quarter of an hour where one
    machine took over one. Since 26 Oct 2026 too, the tests run on Ubuntu with Claude Code
    2.1.286, the first build with mods on by default (2.1.281 to 2.1.285 pass only with the
    early-access switch on, and 2.1.280 fails 161 of 230), and with the newest release,
    beside 2.1.310; and a merge to main whose pull request's run passed on the same files
    passes on a light first job instead of running everything again or showing as skipped.
