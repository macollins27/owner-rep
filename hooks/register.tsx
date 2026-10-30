import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelForkResult, Register, RenderChildren } from 'claude-code'

type RenderNodeList = RenderChildren[]

import type { Brief, Checked, Note, Now, View } from '../types'
import {
  CHECK_EVERY,
  CHECK_TIMEOUT_MS,
  CHECK_TIMEOUT_WORDS,
  CLEAR_AFTER_PROMPTS,
  NOTE_CLEAR_MS,
  NOTE_PREFIX,
  OWNER_CUT,
  HIS_CUT,
  PRIOR_CUT,
  type OwnerKind,
  type OwnerMsg,
  trimOwner,
  migrateOwner,
  PAST_MAX,
  SEEN_MAX,
  SESSIONS_MAX,
  OTHERS_MAX,
  briefPrompt,
  cachedOf,
  checkArgv,
  checkCostText,
  countLine,
  checkCopiesDir,
  checkCopyDir,
  checkSettings,
  CHECK_NO_ROOM,
  PNPM_STORE_ARGV,
  COREPACK_ASK_ENV,
  PNPM_STORE_ENV,
  PNPM_STORE_TIMEOUT_MS,
  pnpmStoreDir,
  PATH_LINKS_TIMEOUT_MS,
  pathLinksArgv,
  GIT_FIND_TIMEOUT_MS,
  gitUpArgv,
  gitInsideArgv,
  wholeArgv,
  wholeAnswer,
  gitDirsOf,
  gitFoldersOf,
  gitLinksOf,
  passedOver,
  worktreesArgv,
  worktreeDirsOf,
  linkTargets,
  holdsCopiesOf,
  checkBarred,
  noFenceNote,
  copyArgvs,
  type Host,
  homeOf,
  hostArgv,
  isWindowsHost,
  PATH_HOST,
  slashed,
  winClaudeCandidates,
  winPosixBinCandidates,
  WINDOWS_OS,
  windowsOs,
  refusedLine,
  checkPrompt,
  doingFor,
  firstSentence,
  fillCard,
  sizesInColumns,
  fit,
  fitTail,
  noteSplit,
  draftSplitAny,
  keepDraft,
  keepDropped,
  isBlankRec,
  recDrafts,
  askAgain,
  gateOpen,
  gateVerdict,
  mergeConditions,
  OBJECTIVE_MAX_TOKENS,
  OBJECTIVE_MODEL,
  OBJECTIVE_TIMEOUT_MS,
  OBJECTIVE_RETRIES,
  OBJECTIVE_SYSTEM,
  OBJECTIVE_RETRY_EFFORT,
  OBJECTIVE_RETRY_MAX_TOKENS,
  OBJECTIVE_RETRY_TIMEOUT_MS,
  objectivePrompt,
  OWN_WORDS_MAX_TOKENS,
  OWN_WORDS_SYSTEM,
  OWN_WORDS_TIMEOUT_MS,
  ownWordsPrompt,
  parseOwnWords,
  takeOwnWords,
  ownMessageTaken,
  earlierMessage,
  unusableReplaced,
  RECORD_MAX_TOKENS,
  RECORD_SYSTEM,
  RECORD_TIMEOUT_MS,
  recordPrompt,
  humanItems,
  typedFromItems,
  forkItems,
  forkCandidates,
  lastToolId,
  toolLineFind,
  startFind,
  summaryStart,
  summaryLineFind,
  toolLineOf,
  humanReadBefore,
  type HumanItem,
  folderOf,
  humanRead,
  HUMAN_READ_TIMEOUT_MS,
  HUMAN_SCAN_MAX,
  HUMAN_SCAN_BUDGET_MS,
  type RecordRow,
  objectiveText,
  openConditions,
  parseBrief,
  parseCheck,
  parseObjective,
  writeFailure,
  parseWatch,
  resultOf,
  revisedLine,
  same,
  skipAfter,
  spentText,
  textOf,
  tokensOf,
  VERSIONS_MAX,
  watchPrompt,
  type BriefAnswer,
  type Condition,
  type Memory,
  type Objective,
  type ObjectiveAnswer,
} from './rep'

// From the prompt box only a bare digit presses a band button.
const PRESS_HOTKEY = '1'

const IDLE: Now = { doing: 'idle', helpers: 0, isWorking: false, mark: '' }

// The objective held for the job in hand, for the row and the card. Kept under a
// shape tag, so a value an older build wrote there (the reading) reads as absent.
const readingA = atom({ plugin: 'owner-rep', key: 'reading' } as const, null, { shape: 'objective-1' })
const nowA = atom({ plugin: 'owner-rep', key: 'now' } as const, IDLE)
const noteA = atom({ plugin: 'owner-rep', key: 'note' } as const, null)
const briefA = atom({ plugin: 'owner-rep', key: 'brief' } as const, null)
const viewA = atom({ plugin: 'owner-rep', key: 'view' } as const, 'row')
const helpersA = atom({ plugin: 'owner-rep', key: 'helperIds' } as const, [])

// What came of a card's own-words call: its reply parsed whole, answered but not whole
// (cut short, or missing a part), not answered or thrown, or no call made.
type OwnRead = 'whole' | 'cut' | 'none' | 'skipped'

// What the rep remembers about a session between reloads and sessions ($.store).
type Rec = {
  id: string
  at: number
  // The objective held for the job in hand; null until the writer has written it.
  objective: Objective | null
  // The number of the job's first message while no objective is held; a new job sets it.
  jobStart: number
  // An old-shape reading's text, kept until the first objective takes it as a version.
  stale?: { text: string; cause: string; at: number }
  owner: OwnerMsg[]
  // The last number given to an owner message.
  counter: number
  past: string[]
  seen: string[]
  others: string[]
  // The last card's next step and message; on a briefing's card also its reads (1, 2 with
  // the second ask, 3 with the own-words call), what came of that call (`own`) and the
  // length of its reply (`ownChars`, 0 with none). Older records have neither of the last two.
  lastBrief?: { at: number; next: string; message: string; reads?: number; own?: OwnRead; ownChars?: number }
  // The last DRAFTS_MAX cards' messages, newest first, for knowing a draft the owner sends.
  drafts: string[]
  lastSent?: { text: string; at: number }
  typedPast: number
  skip: number
  calls: number
  tokens: number
  cached: number
  checks: number
  checkTokens: number
  lastCheckTokens: number
  lastCheckCached: number
  lastCheckMs: number
  lastCheckRefused: number
  // The objective writer's own calls and their tokens.
  objectiveCalls: number
  objectiveTokens: number
  // Writes (each up to 1 + OBJECTIVE_RETRIES attempts) whose every attempt threw,
  // came back unanswered, answered with nothing parseObjective can read, or held
  // with nothing held; each left the objective as it was.
  objectiveFailed: number
  // Why the last failed write failed: the engine's reason, or that the answer could not be read.
  objectiveWhy: string
}

const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && typeof (v as Rec).id === 'string' && Array.isArray((v as Rec).owner)

const freshRec = (id: string): Rec => ({
  id,
  at: Date.now(),
  objective: null,
  jobStart: 1,
  owner: [],
  counter: 0,
  past: [],
  seen: [],
  others: [],
  drafts: [],
  typedPast: 0,
  skip: 0,
  calls: 0,
  tokens: 0,
  cached: 0,
  checks: 0,
  checkTokens: 0,
  lastCheckTokens: 0,
  lastCheckCached: 0,
  lastCheckMs: 0,
  lastCheckRefused: 0,
  objectiveCalls: 0,
  objectiveTokens: 0,
  objectiveFailed: 0,
  objectiveWhy: '',
})

async function loadRec($: EngineInterface, id: string): Promise<Rec> {
  const all = await $.store.get('sessions')
  const rec = typeof all === 'object' && all !== null ? (all as Record<string, unknown>)[id] : undefined
  if (!isRec(rec)) return freshRec(id)
  const out: Rec = { ...freshRec(id), ...rec }
  if (typeof (out.owner as unknown[])[0] === 'string') out.owner = migrateOwner(out.owner as unknown[], out.lastSent?.text)
  out.counter = Math.max(out.counter, ...out.owner.map(m => m.n), 0)
  // A record saved with a reading and no objective is the old shape: its text waits as a version.
  const old = (rec as { reading?: { text?: unknown; cause?: unknown; movedAt?: unknown; openedAt?: unknown; since?: unknown } }).reading
  if (old !== undefined && old !== null && typeof old.text === 'string' && !('objective' in rec)) {
    out.objective = null
    out.stale = { text: old.text, cause: String(old.cause ?? ''), at: Number(old.movedAt ?? old.openedAt ?? 0) }
    out.jobStart = Number(old.since ?? 0) + 1
  }
  delete (out as { reading?: unknown }).reading
  return out
}

async function saveRec($: EngineInterface, rec: Rec): Promise<void> {
  const got = await $.store.get('sessions')
  const all: Record<string, Rec> = {}
  if (typeof got === 'object' && got !== null) {
    for (const [k, v] of Object.entries(got as Record<string, unknown>)) if (isRec(v)) all[k] = v
  }
  all[rec.id] = { ...rec, at: Date.now() }
  // A blank record loads back the same when missing, so none takes a place (`isBlankRec`).
  for (const k of Object.keys(all)) if (isBlankRec(all[k] as Rec, freshRec(k))) delete all[k]
  const ids = Object.keys(all).sort((a, b) => (all[b]?.at ?? 0) - (all[a]?.at ?? 0))
  const kept: Record<string, Rec> = {}
  for (const k of ids.slice(0, SESSIONS_MAX)) kept[k] = all[k] as Rec
  // A record let go leaves its drafts behind first, so a draft the owner sent stays the rep's.
  const dropped = ids.slice(SESSIONS_MAX).flatMap(k => recDrafts(all[k]))
  if (dropped.length > 0) await $.store.set('droppedDrafts', keepDropped(await droppedDrafts($), dropped))
  await $.store.set('sessions', kept)
}

// The drafts of records the store has let go (`saveRec`), newest first.
async function droppedDrafts($: EngineInterface): Promise<string[]> {
  const got = await $.store.get('droppedDrafts')
  return Array.isArray(got) ? got.filter((d): d is string => typeof d === 'string') : []
}

// Every change to a session's record runs alone, from its load to its save,
// so two hooks that finish together never save over each other: a look that
// landed beside the objective writer once saved the old objective back.
const changing = new Map<string, Promise<void>>()
async function changeRec<T>($: EngineInterface, id: string, change: (rec: Rec) => T | Promise<T>): Promise<T> {
  const before = changing.get(id) ?? Promise.resolve()
  let done: () => void = () => undefined
  const mine = new Promise<void>(r => (done = r))
  const turn = before.then(() => mine)
  changing.set(id, turn)
  await before
  try {
    const rec = await loadRec($, id)
    const out = await change(rec)
    await saveRec($, rec)
    return out
  } finally {
    done()
    if (changing.get(id) === turn) changing.delete(id)
  }
}

// The number of the job's first message, and the job's messages.
const jobOf = (rec: Rec): number => rec.objective?.since ?? rec.jobStart
const jobMsgs = (rec: Rec): OwnerMsg[] => rec.owner.filter(m => m.n >= jobOf(rec))
// The numbers of the owner's own messages and notes from `from` on: never a draft's.
const hisFrom = (rec: Rec, from: number): number[] => rec.owner.filter(m => m.kind !== 'draft' && m.n >= from).map(m => m.n)

const memoryOf = (rec: Rec): Memory => ({
  objective: rec.objective,
  owner: jobMsgs(rec),
  past: rec.past,
  seen: rec.seen,
  others: rec.others,
  lastBrief: rec.lastBrief,
  lastSent: rec.lastSent,
})

// The conversation's size against its window, from the engine, for the brief.
// Best effort: a session that cannot say leaves the figure unknown.
async function contextOf($: EngineInterface): Promise<Memory['context']> {
  try {
    const { context } = await $.session.usage()
    const tokens = context.tokens ?? 0
    const window = context.window
    if (window <= 0) return undefined
    return { tokens, window, percent: context.percent ?? Math.round((tokens / window) * 100) }
  } catch {
    return undefined
  }
}

// The writer sees the conversation only as the agent's last words before each
// of the owner's messages, so a condition it marks shown is taken only as
// already held shown, and one it marks closed only when the number cited is
// one of the messages of theirs it is given (on a correction, those sent after
// the held objective was built); otherwise it is open.
function honest(proposed: Condition[], held: Condition[], his: readonly number[]): Condition[] {
  return proposed.map(c => {
    const was = held.find(x => same(x.text, c.text))
    if (c.state === 'shown' && was?.state !== 'shown' && was?.state !== 'closed') return { ...c, state: 'open', by: '' }
    if (c.state === 'closed' && !his.includes(Number(c.by.slice(1))) && was?.state !== 'closed') return { ...c, state: 'open', by: '' }
    return c
  })
}

// Applies the objective writer's answer to the record. `saw` is the number of
// the last of the owner's messages the writer was shown. The objective moves
// only on the owner's own words: an answer from a writer that saw no message
// of theirs or note beyond what the held objective was built from is refused,
// so a draft never moves it, and a write that lands after a newer one cannot
// take its place. A correction rebuilds the result, the purpose and the step
// whole and keeps every held condition the writer let go without a message of
// the owner's that says so; a new job closes the old objective into `past`.
// True when it changed.
function takeObjective(rec: Rec, a: ObjectiveAnswer, now: number, saw: number): boolean {
  if (a === null || a.kind === 'holds') return false
  const held = rec.objective
  if (held === null) {
    let his = hisFrom(rec, rec.jobStart).filter(n => n <= saw)
    // A session seeded from its transcript can hold more than one job, all recorded as one:
    // when the first write says a new job opened at a message of the owner's after the first,
    // the job starts there, and the earlier messages are no longer their messages on this
    // job.
    const opened = a.isNewJob ? Number(a.cause.match(/#(\d+)/)?.[1] ?? Number.NaN) : Number.NaN
    if (his.includes(opened) && opened > Math.min(...his)) {
      rec.jobStart = opened
      his = his.filter(n => n >= opened)
    }
    rec.objective = {
      ...a.parts,
      done: honest(a.parts.done, [], his),
      openedAt: now,
      since: his.length > 0 ? Math.min(...his) : rec.jobStart,
      from: saw,
      movedAt: null,
      cause: a.cause,
      revisions: 0,
      versions: rec.stale === undefined ? [] : [{ at: rec.stale.at, cause: 'rebuilt from the old shape', text: rec.stale.text }],
    }
    delete rec.stale
    return true
  }
  if (saw <= held.from) return false
  const fresh = hisFrom(rec, held.from + 1).filter(n => n <= saw)
  if (fresh.length === 0) return false
  const version = { at: now, cause: a.cause, text: objectiveText(held) }
  if (a.isNewJob) {
    const since = Math.min(...fresh)
    rec.past = [...rec.past, held.result].slice(-PAST_MAX)
    rec.jobStart = since
    rec.objective = {
      ...a.parts,
      done: honest(a.parts.done, [], hisFrom(rec, since).filter(n => n <= saw)),
      openedAt: now,
      since,
      from: saw,
      movedAt: now,
      cause: a.cause,
      revisions: 0,
      versions: [version],
    }
    return true
  }
  // A close or a drop cites a message of the owner's this write is the first
  // to see: one the held objective was built from already had its say.
  rec.objective = {
    ...held,
    result: a.parts.result,
    purpose: a.parts.purpose,
    step: a.parts.step,
    done: mergeConditions(held.done, honest(a.parts.done, held.done, fresh), a.dropped, fresh),
    from: saw,
    movedAt: now,
    cause: a.cause,
    revisions: held.revisions + 1,
    versions: [...held.versions, version].slice(-VERSIONS_MAX),
  }
  return true
}

// Applies a look's, a briefing's or a check's marks to the held conditions:
// one the owner closed in a message of their own on the job, after the one the
// objective was last built from, becomes closed with that number (a message
// the writer already read and kept the condition open after closes nothing);
// one held shown that the check found is not so goes back to not shown and is
// marked reopened; one the conversation showed, with where, becomes shown,
// except that a reopened one moves shown only on the check's own mark (`check`
// is the check's marks, null for a look or a briefing), so a look rereading
// the same conversation cannot undo what the paid check found. A draft's
// number closes nothing, and a shown or reopen mark without a where is not
// taken. True when a condition moved.
function applyMarks(
  rec: Rec,
  shown: Array<{ text: string; by: string }>,
  closed: Array<{ text: string; by: number | null }>,
  check: { reopen: Array<{ text: string; by: string }> } | null = null,
): boolean {
  const o = rec.objective
  if (o === null) return false
  const his = hisFrom(rec, Math.max(o.since, o.from + 1))
  let changed = false
  const done = o.done.map((c): Condition => {
    const close = closed.find(x => x.by !== null && his.includes(x.by) && same(x.text, c.text))
    if (close !== undefined && c.state !== 'closed') {
      changed = true
      return { text: c.text, state: 'closed', by: `#${close.by}` }
    }
    const back = check?.reopen.find(x => x.by !== '' && same(x.text, c.text))
    if (back !== undefined && c.state === 'shown') {
      changed = true
      return { text: c.text, state: 'not-shown', by: back.by, reopened: true }
    }
    const show = shown.find(x => x.by !== '' && same(x.text, c.text))
    if (show !== undefined && (c.state === 'open' || c.state === 'not-shown') && !(c.reopened === true && check === null)) {
      changed = true
      return { text: c.text, state: 'shown', by: show.by }
    }
    return c
  })
  if (changed) rec.objective = { ...o, done }
  return changed
}

// The objective writer running for a session, one at a time per session, and
// whether a message of the owner's or a note asked for a write while it ran.
type Writing = { run: Promise<void>; again: boolean }
const writing = new Map<string, Writing>()

// The objective writer: a plain completion of its own over the owner's
// messages on the job, never the conversation, so nothing the agent says can
// move what it writes. A request while one runs joins it, and a message or
// note that joins is written after the write in hand. A load or a press asks
// only for the first objective, and a message or a note for a rebuild. Never
// awaited by the prompt hook that starts it, so the agent is never slowed.
async function rebuildObjective($: EngineInterface, sid: string, cause: 'message' | 'note' | 'load' | 'press'): Promise<void> {
  const running = writing.get(sid)
  if (running !== undefined) {
    if (cause === 'message' || cause === 'note') running.again = true
    return running.run
  }
  const entry: Writing = { run: Promise.resolve(), again: false }
  writing.set(sid, entry)
  entry.run = writeObjective($, sid, cause === 'load' || cause === 'press', entry).finally(() => {
    if (writing.get(sid) === entry) writing.delete(sid)
  })
  return entry.run
}

async function writeObjective($: EngineInterface, sid: string, onlyFirst: boolean, entry: Writing): Promise<void> {
  // The last message number a write in this run was shown; a rerun with
  // nothing of the owner's past it makes no call.
  let shown = -1
  for (;;) {
    entry.again = false
    const rec = await loadRec($, sid)
    const saw = rec.counter
    const due = !(onlyFirst && rec.objective !== null) && hisFrom(rec, Math.max(jobOf(rec), shown + 1)).length > 0
    if (due) {
      shown = saw
      // Up to 1 + OBJECTIVE_RETRIES attempts over the same prompt: an empty or errored
      // reply, an answer that cannot be read and a "holds" with nothing held are tried
      // again at the highest effort; a call that threw or was cut short is not. Only a
      // write whose every attempt failed counts as failed, with the last cause.
      const prompt = objectivePrompt({ objective: rec.objective, owner: jobMsgs(rec), past: rec.past })
      let after = rec
      for (let attempt = 0; attempt <= OBJECTIVE_RETRIES; attempt++) {
        const retry = attempt > 0
        const result = await $.model
          .complete({
            model: OBJECTIVE_MODEL,
            system: OBJECTIVE_SYSTEM,
            prompt,
            maxTokens: retry ? OBJECTIVE_RETRY_MAX_TOKENS : OBJECTIVE_MAX_TOKENS,
            effort: retry ? OBJECTIVE_RETRY_EFFORT : 'high',
            timeoutMs: retry ? OBJECTIVE_RETRY_TIMEOUT_MS : OBJECTIVE_TIMEOUT_MS,
          })
          .catch(() => null)
        let again = false
        let stale = false
        after = await changeRec($, sid, r => {
          if (result !== null) {
            r.objectiveCalls += 1
            r.objectiveTokens += tokensOf(result.usage)
          }
          const answer = result !== null && result.isAnswered ? parseObjective(result.text) : null
          const none = answer !== null && answer.kind === 'holds' && r.objective === null
          if (answer !== null && !none) {
            takeObjective(r, answer, Date.now(), saw)
            return r
          }
          const cut = result !== null && !result.isAnswered && result.reason === 'aborted'
          again = result !== null && !cut && attempt < OBJECTIVE_RETRIES
          // A newer message of the owner's arrived during the attempt: the next pass writes
          // over the fresh prompt, so this write stops here and is not counted as failed.
          // Judged by number only: a request can join after this pass already loaded its
          // message.
          if (again && r.owner.some(m => m.kind !== 'draft' && m.n > saw)) {
            again = false
            stale = true
            return r
          }
          if (!again) {
            r.objectiveFailed += 1
            r.objectiveWhy = none ? 'holds-with-none' : writeFailure(result)
          }
          return r
        })
        if (!again || stale) break
      }
      // The row shows what the record holds, whichever write put it there,
      // while its session is the one on screen.
      if (onScreen(sid)) await update($, readingA, () => after.objective)
    }
    onlyFirst = false
    // A message of the owner's or a note that came in during the write is
    // written now: one whose request joined this run, or one saved after the
    // write was shown the messages. The check and the release are one step, so
    // a request that comes after it starts a run of its own.
    const now = await loadRec($, sid)
    if (!entry.again && !now.owner.some(m => m.kind !== 'draft' && m.n > saw)) {
      if (writing.get(sid) === entry) writing.delete(sid)
      return
    }
  }
}

async function setNow($: EngineInterface, patch: Partial<Now>): Promise<void> {
  await update($, nowA, n => ({ ...(n ?? IDLE), ...patch }))
}

// One read of the conversation for the watch or the briefing: a fork of it. A fork has
// nothing to fork before the first response of the process: in a session reopened with
// --continue or --resume, after /clear, and through the whole first turn of a new session.
// Then, only for a read the owner started (`fallback`: their press, and the look after their note),
// the session's record is read instead, by one plain completion over the rows
// `$.session.messages()` returns (recordPrompt), with the same task: a row is labelled the owner's
// when its key is one of their messages in the session's transcript (heldItems), and the
// session's when it is not; when no transcript can be read, by NOT_TYPED alone.
// The watch's own looks, on a step and at a turn's end, skip quietly instead: a record
// read on each of them would be paid on every look of every new session's first turn.
// With no rows, or no fallback, the fork's answer stands, so the caller says there is
// nothing to read yet or skips. A completion that throws reads as an API error, which the
// callers already show. Either way the result has the fork's shape, so its spend is
// counted as a fork's.
async function readSession($: EngineInterface, sid: string, prompt: string, fallback: boolean): Promise<ModelForkResult> {
  const forked = await $.model.fork({ prompt })
  if (!fallback || forked.isAnswered || forked.reason !== 'nothing-to-fork') return forked
  const rows = await $.session.messages().catch(() => [])
  if (rows.length === 0) return forked
  const items = await heldItems($, sid, rows)
  return $.model
    .complete({
      model: OBJECTIVE_MODEL,
      system: RECORD_SYSTEM,
      prompt: recordPrompt(rows, prompt, items === null ? undefined : new Set(items.map(i => i.key))),
      maxTokens: RECORD_MAX_TOKENS,
      effort: 'high',
      timeoutMs: RECORD_TIMEOUT_MS,
    })
    .catch(
      (): ModelForkResult => ({
        isAnswered: false,
        reason: 'api-error',
        status: null,
        error: 'unknown',
        usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      }),
    )
}

// One look by the watch: the same cached copy of the conversation the agent
// works from, read by a fresh instance with the rep's brief. Never awaited by
// the hook that starts it, so the agent is never slowed.
async function look($: EngineInterface, sid: string, reason: 'step' | 'stop' | 'note', turnId: string): Promise<void> {
  const rec = await loadRec($, sid)
  // Typing past notes backs the watch off; a note to the rep is never skipped.
  if (rec.skip > 0 && reason !== 'note') {
    await changeRec($, sid, r => {
      r.skip = Math.max(0, r.skip - 1)
    })
    return
  }
  // Only the look after the owner's note falls back to the record when there is nothing to fork.
  const result = await readSession($, sid, watchPrompt({ ...memoryOf(rec), context: await contextOf($) }, reason), reason === 'note')
  const usage = 'usage' in result ? result.usage : null
  await changeRec($, sid, async after => {
    after.calls += 1
    after.tokens += tokensOf(usage)
    after.cached += cachedOf(usage)
    if (!result.isAnswered) return
    const answer = parseWatch(result.text)
    if (applyMarks(after, answer.shown, answer.closed) && onScreen(sid)) await update($, readingA, () => after.objective)
    const view = await read($, viewA)
    if (answer.flag !== null && view === 'row' && onScreen(sid) && ![...after.seen].some(s => same(s, answer.flag ?? ''))) {
      after.seen = [...after.seen, answer.flag].slice(-SEEN_MAX)
      const note: Note = { line: answer.flag, why: answer.why, shownAt: Date.now(), turnId }
      await update($, noteA, () => note)
      await update($, viewA, () => 'note')
    }
  })
}

// The press: an instant read over the same copy, drawn in the band.
async function pressBrief($: EngineInterface, sid: string): Promise<void> {
  const view = await read($, viewA)
  if (view === 'reading') return
  await update($, viewA, () => 'reading')
  await setNow($, { mark: '' }).catch(() => undefined)
  try {
    // A session the rep holds no record of has the owner's messages read from the session first.
    await seedOwner($, sid)
    // No objective yet: it is written first, so the briefing measures against it.
    if ((await loadRec($, sid)).objective === null) await rebuildObjective($, sid, 'press')
    const context = await contextOf($)
    // On Windows the check does not start (runCheck), nor where its fence once refused
    // to start, so the card says why in place of its price and offers no button for it.
    const noCheck = await hostOf($).then(isWindowsHost, () => false)
    // One read of the conversation: its spend counted, and when it answered,
    // its marks applied and its verdict through the gate, against the
    // conditions still open after them.
    const ask = async (extra: string) => {
      const rec = await loadRec($, sid)
      const prompt = briefPrompt({ ...memoryOf(rec), context })
      const result = await readSession($, sid, extra === '' ? prompt : `${prompt}\n\n${extra}`, true)
      const usage = 'usage' in result ? result.usage : null
      return changeRec($, sid, async after => {
        after.calls += 1
        after.tokens += tokensOf(usage)
        after.cached += cachedOf(usage)
        if (!result.isAnswered) return { reason: result.reason }
        const parsed = parseBrief(result.text)
        if (applyMarks(after, parsed.shown, parsed.closed) && onScreen(sid)) await update($, readingA, () => after.objective)
        const left = gateOpen(after.objective)
        return { ...gateVerdict(parsed, left), open: left }
      })
    }
    const first = await ask('')
    if ('reason' in first) {
      await update($, viewA, () => 'row')
      $.ui.toast(
        first.reason === 'nothing-to-fork'
          ? 'Owner rep: nothing to read yet. Ask the agent something first.'
          : `Owner rep: the model did not answer (${first.reason}). Press again.`,
      )
      return
    }
    // A stop, a missing verdict, a next step or a message that says stop, or a
    // going-well line while a condition is open is refused, and the brief is asked once
    // more with the open conditions named; that answer passes the same gate.
    // With no objective written there are no conditions to name: the refused
    // card stands with the rep's texts, and nothing is asked again. Two reads
    // at most: when the second does not answer, the first one's gated answer stands.
    let taken = first
    // The card's own reads: the first ask, a second ask, the own-words call.
    let reads = 1
    // What came of the own-words call, and its reply's length, for the record.
    let ownRead: OwnRead = 'skipped'
    let ownChars = 0
    if (first.refused && first.open !== null) {
      reads += 1
      const again = await ask(askAgain(first.open))
      if (!('reason' in again)) taken = again
    }
    // Refused twice (or refused once, the second ask unanswered): the parts the gate
    // replaced are written in the rep's own words by one plain call (no fork) over the
    // objective, the open conditions, the owner's messages and what the briefing itself
    // found. A part it writes that still says stop, a reply that did not come back
    // whole (parseOwnWords), or a call that fails, leaves the rep's fixed text, and the
    // press goes on. It writes card parts only, never the objective. With no objective
    // written there is no such call.
    if (taken.refused && taken.replaced.length > 0 && first.open !== null && taken.open !== null) {
      // A message the gate kept that is praise, thanks, a question or a back-reference alone counts as replaced.
      const open = taken.open
      taken = { ...taken, ...unusableReplaced(taken.answer, taken.replaced, open) }
      reads += 1
      const rec = await loadRec($, sid)
      const result = await $.model
        .complete({
          model: OBJECTIVE_MODEL,
          system: OWN_WORDS_SYSTEM,
          prompt: ownWordsPrompt({ ...memoryOf(rec), context }, open, taken.answer),
          maxTokens: OWN_WORDS_MAX_TOKENS,
          effort: 'high',
          timeoutMs: OWN_WORDS_TIMEOUT_MS,
        })
        .catch(() => null)
      const own = await changeRec($, sid, after => {
        if (result !== null) {
          after.calls += 1
          after.tokens += tokensOf(result.usage)
          after.cached += cachedOf(result.usage)
        }
        return result !== null && result.isAnswered ? parseOwnWords(result.text) : null
      })
      const answered = result !== null && result.isAnswered
      ownChars = answered ? result.text.length : 0
      ownRead = !answered ? 'none' : own === null ? 'cut' : 'whole'
      // The own-words message is taken only when it is usable: praise alone leaves the fixed text for read 1's message.
      const ownTaken = ownMessageTaken(taken.replaced, own)
      taken = { ...taken, answer: takeOwnWords(taken.answer, ownTaken ? taken.replaced : taken.replaced.filter(p => p !== 'message'), own) }
      // No usable message from the last read or the own-words call: one read 1 kept stands before the list.
      taken = { ...taken, answer: earlierMessage(taken.answer, taken.replaced, ownTaken, first) }
    }
    const a = taken.answer
    const brief = await changeRec($, sid, after => {
      const brief: Brief = {
        result: after.objective === null ? '' : firstSentence(objectiveText(after.objective)),
        count: countLine(after.objective),
        reading: after.objective === null ? '' : objectiveText(after.objective),
        revised: revisedLine(after.objective),
        well: a.well,
        stands: a.stands,
        means: a.means,
        leftOut: a.leftOut,
        next: a.next,
        message: a.message,
        does: a.does,
        at: Date.now(),
        spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens, after.objectiveCalls, after.objectiveTokens, after.objectiveFailed, after.objectiveWhy),
        size: context === undefined ? '' : `conversation at ${context.percent} percent of its window`,
        isChecking: false,
        checked: null,
        checkNote: noCheck ? CHECK_NO_ROOM : noFence,
        checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs, after.lastCheckRefused),
      }
      after.lastBrief = { at: brief.at, next: brief.next, message: brief.message, reads, own: ownRead, ownChars }
      after.drafts = keepDraft(after.drafts, brief.message)
      return brief
    })
    // A /clear while it read leaves the card to the session that asked for it.
    if (!onScreen(sid)) return
    await update($, noteA, () => null)
    await update($, briefA, () => brief)
    await update($, viewA, () => 'brief')
    lastInstant = { at: brief.at, answer: a, refused: taken.refused }
  } catch {
    await update($, viewA, () => 'row')
    $.ui.toast('Owner rep: the reading failed. Press again.')
  }
}

// Whether the checker's answer carried a "left:" part at all; an absent part
// keeps the instant read's list, an empty one ("- nothing") clears it.
const parts_hasLeft = (text: string): boolean => /^\s*left:/im.test(text)

// The check step: a separate headless Claude Code run with read-only tools,
// agentsview and the files. It starts after the instant read is on screen and
// rewrites the card when it returns. A newer press makes an older run's answer
// stale, and a reload of this module kills the child.
let checkEpoch = 0
let activeCheck: { stop: () => void } | null = null
// The instant read the card was drawn from, kept for "Check it", and whether
// the gate refused it (its meaning, and any next step or message that said
// stop, are then the rep's).
let lastInstant: { at: number; answer: BriefAnswer; refused: boolean } | null = null
// What the card said when the check's fence refused to start on this machine (a Linux
// without bubblewrap), kept for the process, so each later card says it too and offers
// no Check it rather than a press that copies the project only to be refused.
let noFence = ''

// "Check it": the owner chose to pay for the check on the card that is up.
async function pressCheck($: EngineInterface, sid: string): Promise<void> {
  const b = await read($, briefA)
  if (b === null || lastInstant === null || lastInstant.at !== b.at) {
    $.ui.toast('Owner rep: press Brief me first, then Check it.')
    return
  }
  if (b.isChecking) return
  await update($, briefA, x => (x === null ? x : { ...x, isChecking: true, checkNote: '' }))
  await runCheck($, sid, b.at, lastInstant.answer, lastInstant.refused)
}
async function runCheck($: EngineInterface, sid: string, at: number, instant: BriefAnswer, refused: boolean): Promise<void> {
  const epoch = ++checkEpoch
  activeCheck?.stop()
  activeCheck = null
  const isStale = async (): Promise<boolean> => {
    const b = await read($, briefA)
    return epoch !== checkEpoch || b === null || b.at !== at || !onScreen(sid)
  }
  const finish = async (patch: Partial<Brief>): Promise<void> => {
    if (await isStale()) return
    await update($, briefA, b => (b === null ? b : { ...b, ...patch, isChecking: false }))
  }
  try {
    const rec = await loadRec($, sid)
    const cwd = await $.session.cwd()
    const home = (await homeFor($)) || '/tmp'
    const checkHost = await hostOf($)
    if (isWindowsHost(checkHost)) return finish({ checkNote: CHECK_NO_ROOM })
    if (noFence !== '') return finish({ checkNote: noFence })
    const copy = await makeCopy($, home, sid, cwd)
    const path = (await $.env.get('PATH')) ?? ''
    const store = await pnpmStore($, checkHost, copy)
    const links = await pathLinks($, checkHost, home, path)
    const repos = await gitRepos($, checkHost, home, copy, cwd)
    const prompt = checkPrompt({
      sessionId: sid,
      cwd,
      copy,
      reading: rec.objective === null ? '' : objectiveText(rec.objective),
      conditions: openConditions(rec.objective),
      shown: rec.objective?.done.filter(c => c.state === 'shown') ?? [],
      from: rec.objective?.from ?? 0,
      owner: jobMsgs(rec),
      brief: instant,
      writtenAt: new Date(at).toISOString(),
      unanswered: [...(links === null ? ['links' as const] : []), ...(repos.whole ? [] : ['repos' as const])],
    })
    const startedAt = Date.now()
    const stream = $.process.spawn({ argv: hostArgv(checkHost, checkArgv(prompt, checkSettings(home, cwd, path, links ?? [], repos.dirs))), cwd: copy, ...(store === '' ? {} : { env: { [PNPM_STORE_ENV]: store } }) })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const close = (signal: string) => {
      stream.return({ code: null, signal }).catch(() => undefined)
    }
    activeCheck = { stop: () => close('replaced') }
    const stop = $.clock.after(CHECK_TIMEOUT_MS, () => {
      timedOut = true
      close('timeout')
    })
    let end: { code: number | null; signal: string | null } = { code: null, signal: null }
    try {
      for (;;) {
        const piece = await stream.next()
        if (piece.done) {
          end = piece.value
          break
        }
        if (piece.value.stream === 'stdout') stdout += piece.value.text
        else stderr += piece.value.text
      }
    } finally {
      stop.cancel()
      if (activeCheck !== null && epoch === checkEpoch) activeCheck = null
      if (copy !== cwd) $.process.run(hostArgv(checkHost, ['rm', '-rf', copy]), { timeoutMs: 120000 }).catch(() => undefined)
    }
    if (timedOut) return finish({ checkNote: `The check ran out of time (${CHECK_TIMEOUT_WORDS}) and was stopped.` })
    const got = resultOf(stdout)
    if (got === null) {
      const barred = noFenceNote(stderr)
      if (barred !== null) {
        noFence = barred
        return finish({ checkNote: barred })
      }
      const why = stderr.trim().split('\n').pop() ?? ''
      return finish({ checkNote: `The check could not run${end.code === null ? '' : ` (exit ${end.code})`}${why === '' ? '' : `: ${fit(why, 160)}`}.` })
    }
    const patch = await changeRec($, sid, async after => {
      after.checks += 1
      after.checkTokens += got.tokens
      after.lastCheckTokens = got.tokens
      after.lastCheckCached = got.cached
      after.lastCheckMs = Date.now() - startedAt
      after.lastCheckRefused = got.refused
      // A run a newer press made stale changes nothing more: its marks are not
      // taken and the card on record stays the newer one, so the message the
      // owner sends from that card is still known for the rep's draft.
      if (epoch !== checkEpoch || after.lastBrief?.at !== at) return null
      const c = parseCheck(got.text)
      // A condition the check saw shown, or the owner closed, moves under the same
      // rule as a look's, and a reopened one moves shown only here; one held shown
      // that the check found is not so goes back to not shown, marked reopened.
      const marked = applyMarks(after, c.shown, c.closed, { reopen: c.reopen })
      if (marked && onScreen(sid)) await update($, readingA, () => after.objective)
      const checked: Checked = { holds: c.holds, wrong: c.wrong, notShown: c.notShown, changed: c.changed, looked: c.looked, refused: got.refused }
      const hasLeft = parts_hasLeft(got.text)
      // The card the check leaves, each part the checker's where it gave one
      // and the instant read's where it did not, verdict and going-well line
      // included, goes through the same gate as the briefing: a stop or a
      // going-well line while a condition is still open after the check's
      // marks is refused, part by part, as the briefing's is; the check is not
      // asked again, and no own-words call rewrites its card. When the briefing
      // was refused, its meaning, next, message and does were written against
      // the conditions open then (the rep's fixed texts, the rep's own words for
      // them, or the model's own next step and message the gate let stand),
      // which the check may have shown since: they are never carried over. A
      // part the checker left empty stays empty, and on a refusal the gate
      // writes the meaning, and an empty next step or message, again for
      // whatever is still open.
      const or = (mine: string, theirs: string): string => (mine !== '' ? mine : refused ? '' : theirs)
      // The going-well line does not stand beside a claim the check found false or anything left out.
      const leftOut = hasLeft ? c.leftOut : instant.leftOut
      const card = gateVerdict(
        {
          verdict: c.verdict ?? instant.verdict,
          shown: [],
          closed: [],
          well: leftOut.length > 0 || c.wrong.length > 0 ? '' : instant.well,
          stands: c.stands === '' ? instant.stands : c.stands,
          means: or(c.means, instant.means),
          leftOut,
          next: or(c.next, instant.next),
          message: or(c.message, instant.message),
          does: or(c.does, instant.does),
        },
        gateOpen(after.objective),
      ).answer
      const patch: Partial<Brief> = {
        checked,
        ...(marked && after.objective !== null ? { reading: objectiveText(after.objective), count: countLine(after.objective) } : {}),
        well: card.well,
        stands: card.stands,
        means: card.means,
        leftOut: card.leftOut,
        next: card.next,
        message: card.message,
        does: card.does,
        spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens, after.objectiveCalls, after.objectiveTokens, after.objectiveFailed, after.objectiveWhy),
        checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs, after.lastCheckRefused),
      }
      // The card's reads and what came of its own-words call stay the briefing's: the check
      // makes no such call.
      after.lastBrief = { ...after.lastBrief, at, next: patch.next ?? '', message: patch.message ?? '' }
      after.drafts = keepDraft(after.drafts, patch.message ?? '')
      return patch
    })
    if (patch !== null) await finish(patch)
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    await finish({ checkNote: `The check failed: ${fit(why, 160)}` }).catch(() => undefined)
  }
}

// The host, resolved once per process and then reused.
//
// Only Windows needs resolving, and it needs it because the names the check
// runs — mkdir, rm, cp, find, ls, sed, claude — resolve to nothing there. Each
// candidate is PROVEN by running it with `--version` rather than by testing a
// path, so a machine with Git somewhere unusual, or with none at all, is told
// apart from one where the folder merely exists. A Windows host where nothing
// answers keeps every name as written, so the commands are tried by name and
// fail; the check does not start on Windows in any case (`CHECK_NO_ROOM`).
// KEYED ON WHAT `windowsOs` MAKES OF `OS`, `SystemRoot`, `windir` and the session's working
// folder (Windows is recognised by any of the four, so a launcher that drops `OS` does not
// hide it), not held outright: a host is resolved once and reused, and the
// key makes a stale answer impossible rather than merely unlikely. The four signs
// agree on any one machine and do not change under a running session, so production resolves once; a test that
// says the host is Windows gets a fresh resolution instead of whatever an
// earlier test left behind, which is what a plain `Host | null` would have
// handed it. The lookup itself is held, so two reads at once share one probe.
// A Windows host whose coreutils did not answer is not held: a probe can time
// out the first time a virus scanner meets mkdir.exe, and held, that would leave
// every transcript read of the process unread. Windows stays Windows when a
// lookup throws, so the check's refusal there never rests on a probe.
let host: { os: string; value: Promise<Host> } | null = null

// The first candidate that answers `--version` with exit code 0, '' when none does. A probe
// that throws (no such file, a timeout) counts as no answer and the next is tried.
async function firstThatAnswers($: EngineInterface, candidates: readonly string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      const got = await $.process.run([candidate, '--version'], { timeoutMs: 10000 })
      if (got.exitCode === 0) return candidate
    } catch {
      // No answer: the next candidate is tried.
    }
  }
  return ''
}

// `OS`, `SystemRoot`, `windir` and the working folder, read as `windowsOs` takes them; the
// throw of any read after `OS` counts as none. Each name is written out, as the mods API reads only those.
async function osOf($: EngineInterface): Promise<string> {
  const os = (await $.env.get('OS')) ?? ''
  if (os === WINDOWS_OS) return WINDOWS_OS
  let systemRoot = ''
  let windir = ''
  let cwd = ''
  try {
    systemRoot = (await $.env.get('SystemRoot')) ?? ''
    windir = (await $.env.get('windir')) ?? ''
    cwd = (await $.session.cwd()) ?? ''
  } catch {
    // A read that throws counts as none; the signs read before it stand.
  }
  return windowsOs(os, systemRoot, windir, cwd)
}

async function hostOf($: EngineInterface): Promise<Host> {
  const os = await osOf($)
  if (host === null || host.os !== os) host = { os, value: lookUpHost($, os) }
  const held = host
  const got = await held.value
  if (isWindowsHost(got) && got.posixBin === '' && host === held) host = null
  return got
}

async function lookUpHost($: EngineInterface, os: string): Promise<Host> {
  if (os !== WINDOWS_OS) return PATH_HOST
  try {
    const bins = winPosixBinCandidates(
      await $.env.get('PROGRAMFILES'),
      await $.env.get('ProgramFiles(x86)'),
      await $.env.get('LOCALAPPDATA'),
    )
    const mkdir = await firstThatAnswers(
      $,
      bins.map(bin => `${bin}/mkdir.exe`),
    )
    const posixBin = mkdir === '' ? '' : mkdir.slice(0, -'/mkdir.exe'.length)
    const claude = await firstThatAnswers(
      $,
      winClaudeCandidates(await $.env.get('APPDATA'), await $.env.get('LOCALAPPDATA')),
    )
    return { os, posixBin, claude }
  } catch {
    return { os, posixBin: '', claude: '' }
  }
}

// The home, '' when there is none. On Windows (by the four signs of `windowsOs`, the reading
// the check is refused by) it is `USERPROFILE` before `HOME`, as Claude Code finds its own
// folder there, written with forward slashes as every path built from it is.
async function homeFor($: EngineInterface): Promise<string> {
  const windows = (await osOf($)) === WINDOWS_OS
  const home = homeOf(windows, await $.env.get('HOME'), await $.env.get('USERPROFILE'))
  return windows ? slashed(home) : home
}

// pnpm's store as pnpm names it in the copy, outside the fence, its pnpmfile ignored, its
// version left alone and nothing fetched, by its command line (`PNPM_STORE_ARGV`) and
// corepack's network off (`COREPACK_ASK_ENV`), or '' when there is no pnpm or it does not
// answer (`pnpmStoreDir`).
async function pnpmStore($: EngineInterface, host: Host, copy: string): Promise<string> {
  const r = await $.process.run(hostArgv(host, PNPM_STORE_ARGV), { cwd: copy, env: COREPACK_ASK_ENV, timeoutMs: PNPM_STORE_TIMEOUT_MS }).catch(() => null)
  return r === null || r.exitCode !== 0 ? '' : pnpmStoreDir(r.stdout)
}

// Where the command path's folders and the links in them lead, asked outside the fence
// (`pathLinksArgv`), or null when the host does not answer, which the brief then says.
async function pathLinks($: EngineInterface, host: Host, home: string, path: string): Promise<string[] | null> {
  const r = await $.process.run(hostArgv(host, pathLinksArgv(home, path)), { timeoutMs: PATH_LINKS_TIMEOUT_MS }).catch(() => null)
  return r === null ? null : linkTargets(r.stdout, r.isStdoutTruncated)
}

// The git repositories the copy and the agent's folder reach, the places the copy's links
// lead and the repositories holding them, and the worktrees all of these list (`gitUpArgv`,
// `gitInsideArgv`, `worktreesArgv`, read by `gitDirsOf`, `gitLinksOf` and `worktreeDirsOf`),
// asked outside the fence. Each question is asked on its own, so one that fails, runs long or
// is cut loses only what it alone would name; `whole` is false when any did, or when the
// search inside passed a name over, which the brief then says.
async function gitRepos($: EngineInterface, host: Host, home: string, copy: string, cwd: string): Promise<{ dirs: string[]; whole: boolean }> {
  const own = [copy, cwd]
  const ask = async (argv: string[]): Promise<string | null> => wholeAnswer(await $.process.run(hostArgv(host, wholeArgv(host, argv)), { timeoutMs: GIT_FIND_TIMEOUT_MS }).catch(() => null))
  const up = await ask(gitUpArgv(own))
  const inside = holdsCopiesOf(home, copy) ? '' : await ask(gitInsideArgv(copy))
  const links = gitLinksOf(own, inside ?? '')
  const beyond = links.length === 0 ? '' : await ask(gitUpArgv(links))
  const answers = [up, inside, beyond].map(a => a ?? '')
  const gits = [...new Set(answers.flatMap(gitFoldersOf))]
  const trees = gits.length === 0 ? '' : await ask(worktreesArgv(gits))
  return {
    dirs: [...new Set([...answers.flatMap(a => gitDirsOf(own, a)), ...links, ...worktreeDirsOf(own, trees ?? '')])],
    whole: [up, inside, beyond, trees].every(a => a !== null) && !passedOver(inside ?? ''),
  }
}

// The throwaway copy the check runs in: an APFS clone (cp -c) of the agent's folder as it
// stands, uncommitted work included, made in a moment and taking no space until written
// to (a 6.5 GB project cloned in 14 s on 15 Oct 2026). A cp that does not take -c (GNU's,
// on Linux) refuses it before making anything, so the copy's folder is still free and a
// plain copy is made into it. Darwin's cp copies plainly by itself where it cannot clone,
// so a clone that failed there failed on the files (an unreadable file) and left
// part of a copy behind: a plain copy would fail the same way after copying everything in
// full, and would land nested inside the part-made one (both measured 16 Oct 2026). When
// no copy is made the check runs in the agent's own folder with writes there denied by the
// room, the brief says so, and whatever part of a copy was made is removed. No copy is
// tried of a folder that holds the copies' folder (the home, `~/.cache`): it would be
// copied into itself.
async function makeCopy($: EngineInterface, home: string, sid: string, cwd: string): Promise<string> {
  if (holdsCopiesOf(home, cwd)) return cwd
  const copy = checkCopyDir(home, sid)
  const host = await hostOf($)
  try {
    await $.process.run(hostArgv(host, ['rm', '-rf', copy]), { timeoutMs: 120000 })
    await $.process.run(hostArgv(host, ['mkdir', '-p', checkCopiesDir(home)]), { timeoutMs: 30000 })
    const [clone, plain] = copyArgvs(host, cwd, copy)
    if ((await $.process.run(clone, { timeoutMs: 600000 })).exitCode === 0) return copy
    // mkdir without -p fails on a folder that is there, which tells a cp that refused -c
    // from a clone that failed part-way.
    const free = await $.process.run(hostArgv(host, ['mkdir', copy]), { timeoutMs: 30000 })
    if (free.exitCode === 0 && (await $.process.run(plain, { timeoutMs: 600000 })).exitCode === 0) return copy
  } catch {
    // fall through: no copy
  }
  $.process.run(hostArgv(host, ['rm', '-rf', copy]), { timeoutMs: 120000 }).catch(() => undefined)
  return cwd
}

async function putMessage($: EngineInterface, text: string): Promise<void> {
  const box = await $.prompt.read()
  if (box.text.trim() !== '') {
    $.ui.toast('Your prompt box has text in it. Send or clear it, then press 1 again.')
    return
  }
  const filled = await $.prompt.fill({ text, mode: 'replace' })
  if (!filled.isFilled) {
    $.ui.toast(
      filled.refusal === 'dialog'
        ? 'A dialog has the keyboard. Answer it, then press 1 again.'
        : 'The prompt box did not take the message. Press 1 again.',
    )
    return
  }
  await update($, viewA, () => 'row')
  $.ui.toast('The message is in your prompt box. Enter sends it; nothing is sent until you do.')
}

// The agent's last answer, the "prior" of the owner's next message.
let lastAnswer = ''

// Records one owner message with the next number and the end of the agent's
// last answer. The owner's messages and notes are kept to the larger cut,
// since the writer reads nothing else; a draft of the rep's to the smaller.
function pushOwner(rec: Rec, kind: OwnerKind, text: string, prior: string = lastAnswer): void {
  const cut = kind === 'draft' ? OWNER_CUT : HIS_CUT
  rec.owner = trimOwner(
    [...rec.owner, { n: ++rec.counter, kind, text: fit(text, cut), prior: fitTail(prior, PRIOR_CUT) }],
    jobOf(rec),
  )
}

// Where Claude Code saves each session's transcript, by session id, as the classic hooks
// that carry it say (SessionStart, refreshed on UserPromptSubmit). A session forked with a
// new id is given its path at its start, before the file is written.
const transcripts = new Map<string, string>()
function holdTranscript(id: unknown, path: unknown): void {
  if (typeof id === 'string' && id !== '' && typeof path === 'string' && path !== '') transcripts.set(id, path)
}

// The owner's messages, read from the session's transcript file in its order (humanItems),
// which says who wrote each row where `$.session.messages()` does not, and holds the
// messages the owner typed while the agent worked, which are no row at all. The file is the
// path the classic hooks gave (transcripts); with none held it is found by name under
// <config>/projects, the config folder CLAUDE_CONFIG_DIR or ~/.claude, and with none found
// nothing is read. sed keeps only the lines marked human, picture data blanked (humanRead);
// a read that finds none means the owner typed nothing. A read cut at the output cap is not
// taken: for the session's own file nothing is read. A session forked after a compaction
// may have a file of its own that begins at the summary (summaryStart), holding none of
// what the owner typed before it: the newest other files in its folder are searched for
// that summary line, one at a time, at most HUMAN_SCAN_MAX within HUMAN_SCAN_BUDGET_MS, and
// their messages are those before it in the first file that holds any there (a copy of the
// copy holds none), then the copy's own; with no such file, the copy's own alone. A session
// forked with a new id has no file of its own until its first message is saved: the newest
// other files are read instead, a cut read skipped, and the file whose items match the most
// of the fork's rows (forkItems; the newest on a tie) gives its part up to the last match
// and the queued messages right after it, the scan stopping once every row that could be
// the owner's is matched. A fork taken after a compaction the owner has typed nothing since
// holds no such row: its parent is then the newest file holding the call of its last tool
// result (lastToolId), and their messages are the ones before that call's line. Null when
// nothing could be read in the session's own file, and when the scan matched none of the
// fork's rows, whether no file could be read whole or the files read hold none of them: a
// file that matches nothing proves nothing about who wrote the rows.
async function heldItems($: EngineInterface, sid: string, rows: readonly RecordRow[]): Promise<HumanItem[] | null> {
  try {
    const host = await hostOf($)
    const local = (p: string): string => (isWindowsHost(host) ? slashed(p) : p)
    let path = local(transcripts.get(sid) ?? '')
    if (path === '') {
      const set = await $.env.get('CLAUDE_CONFIG_DIR')
      const home = await homeFor($)
      const config = set !== undefined && set !== '' ? local(set) : home !== '' ? `${home}/.claude` : null
      if (config === null) return null
      const found = await $.process.run(hostArgv(host, ['find', `${config}/projects`, '-maxdepth', '2', '-name', `${sid}.jsonl`]), { timeoutMs: HUMAN_READ_TIMEOUT_MS })
      path = found.exitCode === 0 ? local(found.stdout.split('\n').find(l => l.trim() !== '')?.trim() ?? '') : ''
      if (path === '') return null
    }
    const read = (file: string, timeoutMs: number) => $.process.run(hostArgv(host, humanRead(file)), { timeoutMs })
    const own = await read(path, HUMAN_READ_TIMEOUT_MS)
    let summary: string | null = null
    if (own.exitCode === 0) {
      if (own.isStdoutTruncated) return null
      const begins = await $.process.run(hostArgv(host, startFind(path)), { timeoutMs: HUMAN_READ_TIMEOUT_MS })
      summary = begins.exitCode === 0 ? summaryStart(begins.stdout) : null
      if (summary === null) return humanItems(own.stdout)
    }
    const copied = own.exitCode === 0 ? humanItems(own.stdout) : []
    const folder = folderOf(path)
    const name = path.slice(folder.length + 1)
    const want = summary === null ? forkCandidates(rows).length : 0
    const anchor = summary === null && want === 0 ? lastToolId(rows) : null
    if (summary === null && want === 0 && anchor === null) return null
    const start = await $.clock.now()
    const left = async () => HUMAN_SCAN_BUDGET_MS - ((await $.clock.now()) - start)
    const listed = await $.process.run(hostArgv(host, ['ls', '-t', folder]), { timeoutMs: HUMAN_READ_TIMEOUT_MS })
    if (listed.exitCode !== 0) return summary === null ? null : copied
    const files = listed.stdout
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.endsWith('.jsonl') && f !== name)
      .slice(0, HUMAN_SCAN_MAX)
    if (summary !== null || anchor !== null) {
      for (const file of files) {
        const remaining = await left()
        if (remaining <= 0) break
        const find = summary !== null ? summaryLineFind(`${folder}/${file}`, summary) : toolLineFind(`${folder}/${file}`, anchor ?? '')
        const at = await $.process.run(hostArgv(host, find), { timeoutMs: Math.min(HUMAN_READ_TIMEOUT_MS, remaining) })
        const line = at.exitCode === 0 ? toolLineOf(at.stdout) : null
        if (line === null) continue
        const time = await left()
        if (time <= 0) break
        const found = await $.process.run(hostArgv(host, humanReadBefore(`${folder}/${file}`, line)), { timeoutMs: Math.min(HUMAN_READ_TIMEOUT_MS, time) })
        if (found.exitCode !== 0 || found.isStdoutTruncated) continue
        const before = humanItems(found.stdout)
        if (summary === null) return before
        if (before.length > 0) return [...before, ...copied]
      }
      return summary === null ? null : copied
    }
    let best: { items: HumanItem[]; matched: number } = { items: [], matched: 0 }
    for (const file of files) {
      const remaining = await left()
      if (remaining <= 0) break
      const found = await read(`${folder}/${file}`, Math.min(HUMAN_READ_TIMEOUT_MS, remaining))
      if (found.exitCode !== 0 || found.isStdoutTruncated) continue
      const part = forkItems(humanItems(found.stdout), rows)
      if (part.matched > best.matched) best = part
      if (best.matched === want) break
    }
    return best.matched > 0 ? best.items : null
  } catch {
    return null
  }
}

// The rep's drafts kept in every session's record (`recDrafts`) and those of records the
// store has let go, so a draft the owner sent is known in a session forked from the one that
// drew it, or reopened after its own record was let go. The records are read before the kept
// list, the reverse of `saveRec`'s order, so a record let go between the two reads is in one.
async function storedDrafts($: EngineInterface): Promise<string[]> {
  const all = await $.store.get('sessions')
  const out = await droppedDrafts($)
  if (typeof all !== 'object' || all === null) return out
  for (const r of Object.values(all as Record<string, unknown>)) if (isRec(r)) out.push(...recDrafts(r))
  return out
}

// A session the rep holds no record of has none of the owner's messages: one reopened after its
// record fell out of the newest SESSIONS_MAX, one forked with a new id, one from before the mod was
// installed. The owner's messages are then read from the session's transcript file in its order, the
// ones the owner typed while the agent worked included (heldItems; when it cannot be read nothing is
// seeded), and recorded in that order as `prompt.submit` records them, each with the agent's last
// words before it from the session's rows, none when no row holds it (typedFromItems), a draft the
// owner sent split off as the rep's, matched against the drafts of every record in the store, those
// it holds among their messages included, and those of records let go. A session with no rows yet (a
// new one) is not read; one whose rows hold nothing the owner typed (one reopened after a compaction
// the owner has typed nothing since) is read all the same, since the file holds what the rows lost.
// It does nothing when the record holds a message or a note of the owner's, so it never adds to a
// live record. Says whether it recorded any. One read per session at a time: a seed asked for while
// one runs (the start's, when the owner sends a prompt at once) is that one, and `prompt.submit`
// waits for it, so their live prompt is numbered after it.
const seeding = new Map<string, Promise<boolean>>()
function seedOwner($: EngineInterface, sid: string): Promise<boolean> {
  const running = seeding.get(sid)
  if (running !== undefined) return running
  const seed = seedOnce($, sid).finally(() => seeding.delete(sid))
  seeding.set(sid, seed)
  return seed
}
async function seedOnce($: EngineInterface, sid: string): Promise<boolean> {
  const has = (rec: Rec) => rec.owner.some(m => m.kind !== 'draft')
  if (has(await loadRec($, sid))) return false
  const rows = await $.session.messages().catch(() => [])
  if (rows.length === 0) return false
  const items = await heldItems($, sid, rows)
  if (items === null) return false
  const typed = typedFromItems(items, rows)
  if (typed.length === 0) return false
  const others = await storedDrafts($)
  return changeRec($, sid, rec => {
    if (has(rec)) return false
    for (const t of typed) {
      const split = draftSplitAny(t.text, [...rec.drafts, rec.lastBrief?.message ?? '', ...others])
      if (split === null) pushOwner(rec, 'his', t.text, t.prior)
      else {
        pushOwner(rec, 'draft', split.draft, t.prior)
        if (split.his !== '') pushOwner(rec, 'his', split.his, t.prior)
      }
    }
    return has(rec)
  })
}

// A note to the rep, typed behind the prefix: recorded as the owner's, marked
// as said to the rep, and read at once. The agent never sees it.
async function takeNote($: EngineInterface, sid: string, note: string): Promise<void> {
  await changeRec($, sid, rec => pushOwner(rec, 'note', note))
}

// "Tell the rep": the prefix goes into the owner's own prompt box, the owner
// types after it and presses Enter; the prompt.submit hook takes the note and
// drops it, so the agent never sees it.
async function tellRep($: EngineInterface): Promise<void> {
  const box = await $.prompt.read()
  if (box.text.trim() !== '') {
    $.ui.toast('Your prompt box has text in it. Send or clear it, then press again.')
    return
  }
  const filled = await $.prompt.fill({ text: `${NOTE_PREFIX} `, mode: 'replace' })
  if (!filled.isFilled) {
    $.ui.toast('The prompt box did not take it. Press again.')
    return
  }
  $.ui.toast('Type what the rep should know after the prefix and press Enter. Only the rep reads it.')
}

// What another mod showed in the strip, kept so the rep never repeats it.
let lastOther = ''
async function rememberOther($: EngineInterface, text: string): Promise<void> {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line === '' || line === lastOther) return
  lastOther = line
  const id = await sessionId($)
  await changeRec($, id, rec => {
    if (!rec.others.some(o => same(o, line))) rec.others = [...rec.others, fit(line, 400)].slice(-OTHERS_MAX)
  })
}

async function clearNote($: EngineInterface): Promise<void> {
  await update($, noteA, () => null)
  await update($, viewA, () => 'row')
}

// Whether a tree another mod or the engine returned for the band draws
// anything the person can see: text, a control or a picture. Empty boxes,
// fragments and empty text draw nothing.
function drawsSomething(tree: unknown): boolean {
  if (tree === undefined || tree === null || typeof tree === 'boolean') return false
  if (typeof tree === 'string') return tree.trim() !== ''
  if (typeof tree === 'number') return true
  if (Array.isArray(tree)) return tree.some(drawsSomething)
  if (typeof tree === 'object') {
    const t = tree as { type?: unknown; props?: { children?: unknown }; children?: unknown }
    const kids = t.props?.children ?? t.children
    switch (t.type) {
      case 'Button':
      case 'Input':
      case 'Select':
      case 'Image':
      case 'Raster':
      case 'Svg':
      case 'Client':
      case 'Code':
      case 'Markdown':
      case 'Link':
        return true
      default:
        return drawsSomething(kids)
    }
  }
  return false
}

// The session on screen. A /clear or a resume goes on in this same process
// under a new id, and no session.start fires for it, so the id is read on
// every call and a new one is taken up as a start would take it up. `ended`
// is set when a /clear or a resume ended the session on screen: until the next
// id is read, no session is on screen, so a run the old one started draws nothing.
let currentId = ''
let ended = false
async function sessionId($: EngineInterface): Promise<string> {
  const id = await $.session.id()
  if (id !== currentId || ended) {
    const isNew = ended || currentId !== ''
    currentId = id
    ended = false
    if (isNew) await enterSession($, id)
  }
  return id
}
const onScreen = (id: string): boolean => !ended && id === currentId

// A session taken up: its objective on the row; when the rep holds no record of
// it, the owner's typed messages read from the session and the objective
// written from them when any were found; and, when it has messages of theirs
// and no objective yet (a write that never landed, or one saved by an older
// build), a write started now.
async function enterSession($: EngineInterface, id: string): Promise<void> {
  const rec = await loadRec($, id)
  if (onScreen(id)) await update($, readingA, () => rec.objective)
  seedOwner($, id)
    .then(seeded => (seeded ? rebuildObjective($, id, 'load') : undefined))
    .catch(() => undefined)
  if (rec.objective === null && hisFrom(rec, jobOf(rec)).length > 0) {
    rebuildObjective($, id, 'load').catch(() => undefined)
  }
}

// A session left by a /clear or a resume: what the screen and this module hold
// is the ended session's, so the next one starts from nothing of it.
async function leaveSession($: EngineInterface): Promise<void> {
  ended = true
  lastAnswer = ''
  lastInstant = null
  lastOther = ''
  await update($, readingA, () => null)
  await update($, briefA, () => null)
  await update($, noteA, () => null)
  await update($, helpersA, () => [])
  await update($, nowA, () => IDLE)
  await update($, viewA, () => 'row')
}

export const register: Register = on => {
  let lastDoing = ''
  let promptsPastNote = 0
  const inFlight = new Set<string>()

  on('session.start', async ($, e, next) => {
    try {
      currentId = await $.session.id()
      ended = false
      await enterSession($, currentId)
      await update($, viewA, v => (v === 'reading' ? 'row' : (v ?? 'row')))
      await setNow($, { isWorking: false, doing: 'idle', mark: '' })
    } catch {
      // The row still draws with defaults.
    }
    return next(e)
  })

  // Where Claude Code saves the session's transcript, read by heldItems.
  on('classic.SessionStart', ($, e, next) => {
    holdTranscript(e.session_id, e.transcript_path)
    return next(e)
  })
  on('classic.UserPromptSubmit', ($, e, next) => {
    holdTranscript(e.session_id, e.transcript_path)
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // The engine stamps the origin; the test kit's own submit carries none.
    const kind = e.origin?.kind ?? 'composer'
    if (kind === 'composer' || kind === 'bridge') {
      // A note to the rep, alone or typed after a prompt to the agent. A slash
      // command's line is the command's: the engine applies no rewrite to it, so
      // a prefix in its arguments is never split off as a note.
      const noted = e.command === undefined ? noteSplit(e.text) : null
      // The look reads a note against the work at once.
      const lookAtNote = (id: string) => {
        if (inFlight.has('note')) return
        inFlight.add('note')
        look($, id, 'note', '')
          .catch(() => undefined)
          .finally(() => inFlight.delete('note'))
      }
      if (noted !== null && noted.before === '') {
        const note = noted.note
        if (note === '') return { drop: 'Owner rep: nothing after the prefix, so nothing noted.' }
        try {
          const id = await sessionId($)
          // The owner's messages read from the session first, so the note is numbered after them.
          await seedOwner($, id).catch(() => false)
          await takeNote($, id, note)
          // The note is the owner's and can move the objective: the writer reads it first.
          rebuildObjective($, id, 'note').catch(() => undefined)
          // A dropped prompt stays in the box for editing; a note the rep has
          // taken must not, or the next digit lands after it as text. A fill
          // made now is undone by the drop, so it is made once the drop has landed.
          $.clock.after(NOTE_CLEAR_MS, () => {
            $.prompt.fill({ text: '', mode: 'replace' }).catch(() => undefined)
          })
          lookAtNote(id)
        } catch {
          // The note is dropped either way; the agent never sees it.
        }
        return { drop: 'Owner rep: noted, and reading again. The agent did not see this.' }
      }
      // A note typed after other text: the text before it is a prompt to the
      // agent and goes the normal way below; the note goes to the rep only, and
      // the agent gets the prompt without it. Nothing is dropped, so the box
      // needs no emptying.
      const text = noted === null ? e.text : noted.before
      const note = noted === null ? '' : noted.note
      try {
        const id = await sessionId($)
        // A session the rep holds no record of has the owner's messages read from the
        // session first (or the start's read finished), so this prompt is numbered
        // after them.
        const seeded = await seedOwner($, id).catch(() => false)
        const view = await read($, viewA)
        const { rec, split, isHis } = await changeRec($, id, async rec => {
          // A message the rep drafted and the owner sent is recorded as the rep's
          // words, marked, never as the owner's: the model must not grade against a job
          // the rep wrote. It is matched against the last few cards' messages as
          // stored, so it survives a reload and a newer card; what the owner added
          // after the draft is their own message, numbered after it.
          const split = draftSplitAny(text, [...rec.drafts, rec.lastBrief?.message ?? ''])
          const isHis = split === null || split.his !== ''
          if (split === null) pushOwner(rec, 'his', text)
          else {
            pushOwner(rec, 'draft', split.draft)
            if (split.his !== '') pushOwner(rec, 'his', split.his)
            rec.lastSent = { text: split.draft, at: Date.now() }
            // A draft is the rep's words: it moves the step it asks for and nothing else.
            if (rec.objective !== null) rec.objective = { ...rec.objective, step: firstSentence(split.draft) }
            if (view === 'brief') await update($, viewA, () => 'row')
          }
          if (view === 'note') {
            promptsPastNote += 1
            if (promptsPastNote >= CLEAR_AFTER_PROMPTS) {
              promptsPastNote = 0
              rec.typedPast += 1
              rec.skip = skipAfter(rec.typedPast)
              await clearNote($)
            }
          }
          return { rec, split, isHis }
        })
        if (split !== null && onScreen(id)) await update($, readingA, () => rec.objective)
        // The note is numbered after the prompt it was typed behind.
        if (note !== '') await takeNote($, id, note)
        // A message of the owner's can move the objective: the writer reads it, never the agent's words.
        if (isHis || note !== '' || seeded) rebuildObjective($, id, note !== '' ? 'note' : 'message').catch(() => undefined)
        if (note !== '') {
          lookAtNote(id)
          $.ui.toast('Owner rep: the part after "Owner rep:" went to the rep only; the agent got the rest.')
        }
      } catch {
        // Recording is best effort; the prompt goes on.
      }
      // A prefix with nothing after it, behind a prompt: nothing is noted, and the owner is told so.
      if (noted !== null && note === '') $.ui.toast('Owner rep: nothing after the prefix, so nothing noted. The agent got the rest.')
      // The agent never sees the note, even when recording it failed.
      if (noted !== null) return next({ ...e, text })
    }
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    lastDoing = 'thinking'
    await setNow($, { isWorking: true, doing: 'thinking', mark: '' }).catch(() => undefined)
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const tool = String(e.tool)
    const doing = doingFor(tool, e as unknown as Record<string, unknown>)
    const waits = tool === 'AskUserQuestion' || tool === 'ExitPlanMode'
    try {
      if (doing !== lastDoing || waits) {
        lastDoing = doing
        await setNow($, waits ? { doing, mark: doing } : { doing })
      }
    } catch {
      // Drawing is best effort.
    }
    try {
      return await next(e)
    } finally {
      if (waits) {
        lastDoing = 'working'
        await setNow($, { doing: 'working', mark: '' }).catch(() => undefined)
      }
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    const id = result.agentId
    if (id !== undefined) {
      await update($, helpersA, ids => [...(ids ?? []), id]).catch(() => undefined)
      await update($, nowA, n => ({ ...(n ?? IDLE), helpers: (n?.helpers ?? 0) + 1 })).catch(() => undefined)
    }
    return result
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    if (e.index > 0 && e.index % CHECK_EVERY === 0 && !inFlight.has('look')) {
      inFlight.add('look')
      sessionId($)
        .then(id => look($, id, 'step', e.turnId))
        .catch(() => undefined)
        .finally(() => inFlight.delete('look'))
    }
    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      const gone = e.agentId
      await update($, helpersA, ids => (ids ?? []).filter(i => i !== gone)).catch(() => undefined)
      await update($, nowA, n => ({ ...(n ?? IDLE), helpers: Math.max(0, (n?.helpers ?? 0) - 1) })).catch(
        () => undefined,
      )
      return next(e)
    }
    lastAnswer = e.answer
    const asking = /\?\s*$/.test(e.answer.trim())
    const doing = e.isAborted ? 'stopped by you' : asking ? 'asking you' : 'stopped, waiting on you'
    lastDoing = doing
    await setNow($, { isWorking: false, doing, mark: e.isAborted ? '' : asking ? 'asking' : 'stopped' }).catch(
      () => undefined,
    )
    if (!e.isAborted && !inFlight.has('look')) {
      inFlight.add('look')
      sessionId($)
        .then(id => look($, id, 'stop', e.turnId))
        .catch(() => undefined)
        .finally(() => inFlight.delete('look'))
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop' && e.surface !== 'vscode') return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const cols = Math.max(20, e.props.bodyColumns)
    // Each line's width in columns on the terminal; none on a surface whose band is a
    // scrolling box in a proportional font (`sizesInColumns`), where a line fills the box.
    const inColumns = sizesInColumns(e.surface)
    const w = (n: number): number | undefined => (inColumns ? n : undefined)
    // The empty line above the rep parts it from the agent's text on the terminal; the
    // editor's box has its own title and padding, so there it is dropped.
    const gap = inColumns ? 1 : 0
    const view = (await read($, viewA)) ?? 'row'
    const reading = await read($, readingA)
    const now = (await read($, nowA)) ?? IDLE
    const note = await read($, noteA)
    const brief = await read($, briefA)

    // The band is one strip shared with every other mod, "You should know"
    // among them, and this mod draws first. Whatever is beneath is kept under
    // the row. While another mod's note is showing, the rep's own note waits,
    // so only one set of digit buttons is ever on screen. The briefing, which
    // the owner asked for, takes the strip alone.
    const beneath = await next(e)
    const hasBeneath = drawsSomething(beneath)
    if (hasBeneath) rememberOther($, textOf(beneath)).catch(() => undefined)

    // A press reads the id then, so one made just after a /clear is the new session's.
    const onPress = () => {
      sessionId($)
        .then(id => pressBrief($, id))
        .catch(() => undefined)
    }
    const tell = () => {
      tellRep($).catch(() => undefined)
    }
    const close = () => {
      update($, viewA, () => 'row').catch(() => undefined)
    }

    // The shape "You should know" draws in: a lead glyph, a dim tag, a dot,
    // then text that wraps under itself; a choices row beneath with wide gaps.
    const isReading = view === 'reading'
    const marked = now.mark !== ''
    const lead = (glyph: string, color: string, tag: string, text: string) => (
      // The glyph and the text share one line: the row never wraps, and where the
      // text has no width it stretches beside the glyph and shrinks to fit. The space
      // after the glyph is a no-break one there, since the editor drops a plain space at
      // the end of a span.
      <Box flexDirection="row" flexWrap="nowrap">
        <Text color={color}>{glyph}{inColumns ? ' ' : '\u00A0'}</Text>
        <Box flexDirection="column" width={w(cols - 2)} flexGrow={inColumns ? undefined : 1} flexShrink={inColumns ? undefined : 1}>
          <Text wrap="wrap">
            <Text dimColor>{tag} · </Text>
            {text}
          </Text>
        </Box>
      </Box>
    )
    const status = isReading
      ? 'reading the whole session…'
      : now.doing + (now.helpers > 0 ? `, ${now.helpers} helper${now.helpers === 1 ? '' : 's'} running` : '')
    const statusText = (
      <Text color={marked ? 'warning' : isReading ? 'suggestion' : undefined} dimColor={!marked && !isReading}>
        {status}
      </Text>
    )
    const choices = (...buttons: RenderNodeList) => (
      <Box flexDirection="row" gap={3} paddingLeft={2}>
        {buttons}
      </Box>
    )
    // From the prompt box only a bare digit presses a band button, so every
    // button carries a digit. While another mod's note is beneath, its digits
    // win and the row's buttons are drawn without any, for the mouse alone.
    const digit = (d: string): string | undefined => (hasBeneath ? undefined : d)
    const repButton = (
      <Button key="rep" plain hotkey={digit(PRESS_HOTKEY)} label="Brief me" onPress={onPress} />
    )
    const tellButton = <Button key="tell" plain hotkey={digit('2')} label="Tell the rep" onPress={tell} />
    const tellButton4 = <Button key="tell" plain hotkey="4" label="Tell the rep" onPress={tell} />
    const headGlyph = marked ? '◆' : '◇'
    const headColor = marked ? 'warning' : 'suggestion'
    // The row shows the result; so does the card's head, with the count line under it
    // and the objective whole at the card's end when the rows allow.
    const placeholder = 'working out the result you want from your messages…'
    const head = lead(headGlyph, headColor, 'Owner rep', reading?.result ?? placeholder)

    if (view === 'note' && note !== null && !hasBeneath) {
      const clear = () => {
        clearNote($).catch(() => undefined)
      }
      // The heads-up draws above the row, never in its place: the row stays on screen
      // beneath it as approved, its buttons for the mouse alone since the note's own carry
      // the digits (restored 23 Oct 2026; the row had been hidden under a note since
      // 13 Oct, a choice no one asked for).
      return (
        <Box flexDirection="column" marginTop={gap}>
          {lead('◆', 'warning', 'Heads up', note.line)}
          {note.why !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {note.why}
              </Text>
            </Box>
          ) : undefined}
          {choices(
            <Button key="brief" plain hotkey="1" label="Brief me" onPress={onPress} />,
            <Button key="fine" plain hotkey="2" label="Fine" onPress={clear} />,
            <Button key="later" plain hotkey="0" label="Later" onPress={clear} />,
          )}
          {head}
          {choices(statusText, <Button key="rep" plain label="Brief me" onPress={onPress} />, <Button key="tell" plain label="Tell the rep" onPress={tell} />)}
          {beneath}
        </Box>
      )
    }

    if (view === 'brief' && brief !== null) {
      // The card filled to the band's rows in order of importance, so its buttons
      // stay where a digit reaches them; the Put button still carries the whole
      // message. On a surface whose band scrolls (`sizesInColumns` false) the card is
      // drawn whole instead, nothing cut. A card pressed before an objective was held
      // takes the one held now.
      const held = brief.reading !== ''
      const result = held ? (brief.result ?? firstSentence(brief.reading)) : reading === null ? placeholder : firstSentence(objectiveText(reading))
      const objective = held ? brief.reading : reading === null ? '' : objectiveText(reading)
      const whole = {
        ...brief,
        result,
        count: held ? (brief.count ?? '') : countLine(reading),
        // The objective whole is drawn only when it says more than the head.
        reading: objective === result ? '' : objective,
      }
      const shown = inColumns ? fillCard(whole, e.props.maxRows, cols) : whole
      const cardHead = lead(headGlyph, headColor, 'Owner rep', shown.result)
      const section = (label: string, text: string) =>
        text === '' ? undefined : (
          <Box paddingLeft={2} width={w(cols)}>
            <Text wrap="wrap">
              <Text bold>{label} </Text>
              {text}
            </Text>
          </Box>
        )
      return (
        <Box flexDirection="column" marginTop={gap}>
          {cardHead}
          {shown.count !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.count}
              </Text>
            </Box>
          ) : undefined}
          {shown.revised !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.revised}
              </Text>
            </Box>
          ) : undefined}
          {shown.well !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text color="success" wrap="wrap">
                {shown.well}
              </Text>
            </Box>
          ) : undefined}
          {section('Stands:', shown.stands)}
          {section('Means:', shown.means)}
          {shown.leftOut.length > 0 ? (
            <Box flexDirection="column" paddingLeft={2} width={w(cols)}>
              <Text bold>Left out:</Text>
              {shown.leftOut.map((item, i) => (
                <Text key={`left-${i}`} wrap="wrap">
                  {'  - '}
                  {item}
                </Text>
              ))}
            </Box>
          ) : undefined}
          {section('Next:', shown.next)}
          {shown.checked !== null ? (
            <Box flexDirection="column" paddingLeft={2} width={w(cols)}>
              <Text bold>Checked against the record and the files:</Text>
              {shown.checked.holds.map((item, i) => (
                <Text key={`holds-${i}`} wrap="wrap">
                  {'  '}
                  <Text color="success">holds</Text>
                  {'  '}
                  {item}
                </Text>
              ))}
              {shown.checked.wrong.map((item, i) => (
                <Text key={`wrong-${i}`} wrap="wrap">
                  {'  '}
                  <Text color="error">false</Text>
                  {'  '}
                  {item}
                </Text>
              ))}
              {shown.checked.notShown.map((item, i) => (
                <Text key={`notshown-${i}`} wrap="wrap">
                  {'  '}
                  <Text color="warning">not shown</Text>
                  {'  '}
                  {item}
                </Text>
              ))}
              {shown.checked.changed.map((item, i) => (
                <Text key={`changed-${i}`} wrap="wrap">
                  {'  '}
                  <Text color="suggestion">since then</Text>
                  {'  '}
                  {item}
                </Text>
              ))}
              {shown.checked.looked !== '' ? (
                <Text dimColor wrap="wrap">
                  {shown.checked.looked}
                </Text>
              ) : undefined}
              <Text dimColor wrap="wrap">
                {refusedLine(shown.checked.refused)}
              </Text>
            </Box>
          ) : undefined}
          {shown.isChecking ? (
            <Box paddingLeft={2}>
              <Text color="suggestion">Checking the record and the files… the card updates when it is done.</Text>
            </Box>
          ) : undefined}
          {shown.checked === null && !shown.isChecking && shown.checkNote === '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.checkCost}
              </Text>
            </Box>
          ) : undefined}
          {shown.checkNote !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.checkNote}
              </Text>
            </Box>
          ) : undefined}
          {shown.message !== '' ? (
            <Box marginLeft={2} width={w(cols - 2)} flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
              <Text wrap="wrap">{shown.message}</Text>
            </Box>
          ) : undefined}
          {shown.does !== '' && shown.message !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.does}
              </Text>
            </Box>
          ) : undefined}
          {shown.reading !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.reading}
              </Text>
            </Box>
          ) : undefined}
          {choices(
            shown.checked === null && !shown.isChecking && !checkBarred(shown.checkNote) ? (
              <Button
                key="check"
                plain
                hotkey="3"
                label="Check it"
                onPress={() => {
                  sessionId($)
                    .then(id => pressCheck($, id))
                    .catch(() => undefined)
                }}
              />
            ) : undefined,
            brief.message !== '' ? (
              <Button
                key="put"
                plain
                hotkey="1"
                label="Put message in prompt"
                onPress={() => {
                  putMessage($, brief.message).catch(() => undefined)
                }}
              />
            ) : undefined,
            <Button key="close" plain hotkey="2" label="Fine, close" onPress={close} />,
            tellButton4,
            <Button key="later" plain hotkey="0" label="Later" onPress={close} />,
            brief.size !== '' ? <Text dimColor>{brief.size}</Text> : undefined,
          )}
          {shown.spent !== '' ? (
            <Box paddingLeft={2} width={w(cols)}>
              <Text dimColor wrap="wrap">
                {shown.spent}
              </Text>
            </Box>
          ) : undefined}
        </Box>
      )
    }

    return (
      <Box flexDirection="column" marginTop={gap}>
        {head}
        {choices(statusText, repButton, tellButton)}
        {beneath}
      </Box>
    )
  })

  on('session.end', async ($, e, next) => {
    try {
      await changeRec($, e.sessionId, () => undefined)
    } catch {
      // Nothing to save.
    }
    // After a /clear or a resume the process goes on under another session.
    if (e.reason === 'clear' || e.reason === 'resume') {
      lastDoing = ''
      promptsPastNote = 0
      await leaveSession($).catch(() => undefined)
    }
    return next(e)
  })
}
