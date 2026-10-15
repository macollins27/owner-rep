import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

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
  checkCopiesDir,
  checkCopyDir,
  checkSettings,
  refusedLine,
  checkPrompt,
  doingFor,
  firstSentence,
  fitCard,
  fit,
  noteTyped,
  draftSplit,
  askAgain,
  gateVerdict,
  mergeConditions,
  OBJECTIVE_MAX_TOKENS,
  OBJECTIVE_MODEL,
  objectivePrompt,
  objectiveText,
  openConditions,
  parseBrief,
  parseCheck,
  parseObjective,
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
  lastBrief?: { at: number; next: string; message: string }
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
  const ids = Object.keys(all).sort((a, b) => (all[b]?.at ?? 0) - (all[a]?.at ?? 0))
  const kept: Record<string, Rec> = {}
  for (const k of ids.slice(0, SESSIONS_MAX)) kept[k] = all[k] as Rec
  await $.store.set('sessions', kept)
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
// The numbers of his own messages and notes from `from` on: never a draft's.
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

// The writer does not see the conversation, so a condition it marks shown is
// taken only as already held shown, and one it marks closed only when the
// number cited is one of his own messages on the job; otherwise it is open.
function honest(proposed: Condition[], held: Condition[], his: readonly number[]): Condition[] {
  return proposed.map(c => {
    const h = held.find(x => same(x.text, c.text))
    if (c.state === 'shown' && h?.state !== 'shown' && h?.state !== 'closed') return { ...c, state: 'open', by: '' }
    if (c.state === 'closed' && !his.includes(Number(c.by.slice(1))) && h?.state !== 'closed') return { ...c, state: 'open', by: '' }
    return c
  })
}

// Applies the objective writer's answer to the record. `saw` is the number of
// the last of his messages the writer was shown. The objective moves only on
// his own words: an answer from a writer that saw no message of his or note
// beyond what the held objective was built from is refused, so a draft never
// moves it, and a write that lands after a newer one cannot take its place. A
// correction rebuilds the result, the purpose and the step whole and keeps
// every held condition the writer let go without a message of his that says
// so; a new job closes the old objective into `past`. True when it changed.
function takeObjective(rec: Rec, a: ObjectiveAnswer, now: number, saw: number): boolean {
  if (a === null || a.kind === 'holds') return false
  const held = rec.objective
  if (held === null) {
    const his = hisFrom(rec, rec.jobStart).filter(n => n <= saw)
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
      done: honest(a.parts.done, [], hisFrom(rec, since)),
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
  const his = hisFrom(rec, held.since)
  rec.objective = {
    ...held,
    result: a.parts.result,
    purpose: a.parts.purpose,
    step: a.parts.step,
    done: mergeConditions(held.done, honest(a.parts.done, held.done, his), a.dropped, his),
    from: saw,
    movedAt: now,
    cause: a.cause,
    revisions: held.revisions + 1,
    versions: [...held.versions, version].slice(-VERSIONS_MAX),
  }
  return true
}

// Applies a look's or a briefing's marks to the held conditions: one the
// conversation showed, with where, becomes shown; one he closed in a message
// of his own on the job becomes closed with that number. A draft's number
// closes nothing, and a shown mark without a where is not taken. True when a
// condition moved.
function applyMarks(
  rec: Rec,
  shown: Array<{ text: string; by: string }>,
  closed: Array<{ text: string; by: number | null }>,
): boolean {
  const o = rec.objective
  if (o === null) return false
  const his = hisFrom(rec, o.since)
  let changed = false
  const done = o.done.map((c): Condition => {
    const close = closed.find(x => x.by !== null && his.includes(x.by) && same(x.text, c.text))
    if (close !== undefined && c.state !== 'closed') {
      changed = true
      return { ...c, state: 'closed', by: `#${close.by}` }
    }
    const show = shown.find(x => x.by !== '' && same(x.text, c.text))
    if (show !== undefined && (c.state === 'open' || c.state === 'not-shown')) {
      changed = true
      return { ...c, state: 'shown', by: show.by }
    }
    return c
  })
  if (changed) rec.objective = { ...o, done }
  return changed
}

// The objective writer running for a session, one at a time per session, and
// whether a message of his or a note asked for a write while it ran.
type Writing = { run: Promise<void>; again: boolean }
const writing = new Map<string, Writing>()

// The objective writer: a plain completion of its own over his messages on the
// job, never the conversation, so nothing the agent says can move what it
// writes. A request while one runs joins it, and a message or note that joins
// is written after the write in hand. A load or a press asks only for the
// first objective, and a message or a note for a rebuild. Never awaited by the
// prompt hook that starts it, so the agent is never slowed.
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
  // nothing of his past it makes no call.
  let shown = -1
  for (;;) {
    entry.again = false
    const rec = await loadRec($, sid)
    const saw = rec.counter
    const due = !(onlyFirst && rec.objective !== null) && hisFrom(rec, Math.max(jobOf(rec), shown + 1)).length > 0
    if (due) {
      shown = saw
      const result = await $.model
        .complete({
          model: OBJECTIVE_MODEL,
          prompt: objectivePrompt({ objective: rec.objective, owner: jobMsgs(rec), past: rec.past }),
          maxTokens: OBJECTIVE_MAX_TOKENS,
          effort: 'high',
          timeoutMs: 60000,
        })
        .catch(() => null)
      // A call that threw changed nothing, so nothing is saved.
      if (result !== null) {
        const after = await changeRec($, sid, r => {
          r.objectiveCalls += 1
          r.objectiveTokens += tokensOf(result.usage)
          if (result.isAnswered) takeObjective(r, parseObjective(result.text), Date.now(), saw)
          return r
        })
        // The row shows what the record holds, whichever write put it there.
        await update($, readingA, () => after.objective)
      }
    }
    onlyFirst = false
    // A message of his or a note that came in during the write is written now:
    // one whose request joined this run, or one saved after the write was shown
    // the messages. The check and the release are one step, so a request that
    // comes after it starts a run of its own.
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
  const result = await $.model.fork({ prompt: watchPrompt({ ...memoryOf(rec), context: await contextOf($) }, reason) })
  const usage = 'usage' in result ? result.usage : null
  await changeRec($, sid, async after => {
    after.calls += 1
    after.tokens += tokensOf(usage)
    after.cached += cachedOf(usage)
    if (!result.isAnswered) return
    const answer = parseWatch(result.text)
    if (applyMarks(after, answer.shown, answer.closed)) await update($, readingA, () => after.objective)
    const view = await read($, viewA)
    if (answer.flag !== null && view === 'row' && ![...after.seen].some(s => same(s, answer.flag ?? ''))) {
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
    // No objective yet: it is written first, so the briefing measures against it.
    if ((await loadRec($, sid)).objective === null) await rebuildObjective($, sid, 'press')
    const context = await contextOf($)
    // One read of the conversation: its spend counted, and when it answered,
    // its marks applied and its verdict through the gate, against the
    // conditions still open after them.
    const ask = async (extra: string) => {
      const rec = await loadRec($, sid)
      const prompt = briefPrompt({ ...memoryOf(rec), context })
      const result = await $.model.fork({ prompt: extra === '' ? prompt : `${prompt}\n\n${extra}` })
      const usage = 'usage' in result ? result.usage : null
      return changeRec($, sid, async after => {
        after.calls += 1
        after.tokens += tokensOf(usage)
        after.cached += cachedOf(usage)
        if (!result.isAnswered) return { reason: result.reason }
        const parsed = parseBrief(result.text)
        if (applyMarks(after, parsed.shown, parsed.closed)) await update($, readingA, () => after.objective)
        const left = openConditions(after.objective)
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
    // A stop or a going-well line while a condition is open is refused, and
    // the brief is asked once more with the open conditions named; that
    // answer passes the same gate. Two reads at most: when the second does
    // not answer, the first one's gated answer stands.
    let taken = first
    if (first.refused) {
      const again = await ask(askAgain(first.open))
      if (!('reason' in again)) taken = again
    }
    const a = taken.answer
    const brief = await changeRec($, sid, after => {
      const brief: Brief = {
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
        spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens, after.objectiveCalls, after.objectiveTokens),
        size: context === undefined ? '' : `conversation at ${context.percent} percent of its window`,
        isChecking: false,
        checked: null,
        checkNote: '',
        checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs, after.lastCheckRefused),
      }
      after.lastBrief = { at: brief.at, next: brief.next, message: brief.message }
      return brief
    })
    await update($, noteA, () => null)
    await update($, briefA, () => brief)
    await update($, viewA, () => 'brief')
    lastInstant = { at: brief.at, answer: a }
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
// The instant read the card was drawn from, kept for "Check it".
let lastInstant: { at: number; answer: BriefAnswer } | null = null

// "Check it": the owner chose to pay for the check on the card that is up.
async function pressCheck($: EngineInterface, sid: string): Promise<void> {
  const b = await read($, briefA)
  if (b === null || lastInstant === null || lastInstant.at !== b.at) {
    $.ui.toast('Owner rep: press Brief me first, then Check it.')
    return
  }
  if (b.isChecking) return
  await update($, briefA, x => (x === null ? x : { ...x, isChecking: true, checkNote: '' }))
  await runCheck($, sid, b.at, lastInstant.answer)
}
async function runCheck($: EngineInterface, sid: string, at: number, instant: BriefAnswer): Promise<void> {
  const epoch = ++checkEpoch
  activeCheck?.stop()
  activeCheck = null
  const isStale = async (): Promise<boolean> => {
    const b = await read($, briefA)
    return epoch !== checkEpoch || b === null || b.at !== at
  }
  const finish = async (patch: Partial<Brief>): Promise<void> => {
    if (await isStale()) return
    await update($, briefA, b => (b === null ? b : { ...b, ...patch, isChecking: false }))
  }
  try {
    const rec = await loadRec($, sid)
    const cwd = await $.session.cwd()
    const home = (await $.env.get('HOME')) ?? '/tmp'
    const copy = await makeCopy($, home, sid, cwd)
    const prompt = checkPrompt({
      sessionId: sid,
      cwd,
      copy,
      reading: rec.objective === null ? '' : objectiveText(rec.objective),
      conditions: openConditions(rec.objective),
      owner: jobMsgs(rec),
      brief: instant,
      writtenAt: new Date(at).toISOString(),
    })
    const startedAt = Date.now()
    const stream = $.process.spawn({ argv: checkArgv(prompt, checkSettings(home, cwd)), cwd: copy })
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
      if (copy !== cwd) $.process.run(['rm', '-rf', copy], { timeoutMs: 120000 }).catch(() => undefined)
    }
    if (timedOut) return finish({ checkNote: `The check ran out of time (${CHECK_TIMEOUT_WORDS}) and was stopped.` })
    const got = resultOf(stdout)
    if (got === null) {
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
      const c = parseCheck(got.text)
      // A condition the check saw shown, or he closed, moves under the same rule as a look's.
      const marked = applyMarks(after, c.shown, c.closed)
      if (marked) await update($, readingA, () => after.objective)
      const checked: Checked = { holds: c.holds, wrong: c.wrong, notShown: c.notShown, changed: c.changed, looked: c.looked, refused: got.refused }
      const hasLeft = parts_hasLeft(got.text)
      // The card the check leaves, each part the checker's where it gave one
      // and the instant read's where it did not, verdict and going-well line
      // included, goes through the same gate as the briefing: a stop or a
      // going-well line while a condition is still open after the check's
      // marks is refused. The check is not asked again.
      const card = gateVerdict(
        {
          verdict: c.verdict ?? instant.verdict,
          shown: [],
          closed: [],
          well: instant.well,
          stands: c.stands === '' ? instant.stands : c.stands,
          means: c.means === '' ? instant.means : c.means,
          leftOut: hasLeft ? c.leftOut : instant.leftOut,
          next: c.next === '' ? instant.next : c.next,
          message: c.message === '' ? instant.message : c.message,
          does: c.does === '' ? instant.does : c.does,
        },
        openConditions(after.objective),
      ).answer
      const patch: Partial<Brief> = {
        checked,
        ...(marked && after.objective !== null ? { reading: objectiveText(after.objective) } : {}),
        well: card.well,
        stands: card.stands,
        means: card.means,
        leftOut: card.leftOut,
        next: card.next,
        message: card.message,
        does: card.does,
        spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens, after.objectiveCalls, after.objectiveTokens),
        checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs, after.lastCheckRefused),
      }
      after.lastBrief = { at, next: patch.next ?? '', message: patch.message ?? '' }
      return patch
    })
    await finish(patch)
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    await finish({ checkNote: `The check failed: ${fit(why, 160)}` }).catch(() => undefined)
  }
}

// The throwaway copy the check runs in: an APFS clone (cp -c) of the agent's folder as it
// stands, uncommitted work included, made in a moment and taking no space until written
// to (a 6.5 GB project cloned in 14 s on 15 Oct 2026). When the clone cannot be made the
// check runs in the agent's own folder with writes there denied by the room, and the
// brief says so.
async function makeCopy($: EngineInterface, home: string, sid: string, cwd: string): Promise<string> {
  const copy = checkCopyDir(home, sid)
  try {
    await $.process.run(['rm', '-rf', copy], { timeoutMs: 120000 })
    await $.process.run(['mkdir', '-p', checkCopiesDir(home)], { timeoutMs: 30000 })
    const made = await $.process.run(['cp', '-Rc', cwd, copy], { timeoutMs: 600000 })
    if (made.exitCode === 0) return copy
  } catch {
    // fall through: no copy
  }
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

// Records one owner message with the next number and the agent's last answer.
function pushOwner(rec: Rec, kind: OwnerKind, text: string): void {
  rec.owner = trimOwner(
    [...rec.owner, { n: ++rec.counter, kind, text: fit(text, OWNER_CUT), prior: fit(lastAnswer, PRIOR_CUT) }],
    jobOf(rec),
  )
}

// A note to the rep, typed behind the prefix: recorded as his, marked as said
// to the rep, and read at once. The agent never sees it.
async function takeNote($: EngineInterface, sid: string, note: string): Promise<void> {
  await changeRec($, sid, rec => pushOwner(rec, 'note', note))
}

// "Tell the rep": the prefix goes into the owner's own prompt box, he types
// after it and presses Enter; the prompt.submit hook takes the note and drops
// it, so the agent never sees it.
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
async function rememberOther($: EngineInterface, id: string, text: string): Promise<void> {
  const line = text.replace(/\s+/g, ' ').trim()
  if (line === '' || line === lastOther || id === '') return
  lastOther = line
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

// The session's id, read once per load of the module.
let sid = ''
async function sessionId($: EngineInterface): Promise<string> {
  if (sid === '') sid = await $.session.id()
  return sid
}

export const register: Register = on => {
  let lastDoing = ''
  let promptsPastNote = 0
  const inFlight = new Set<string>()

  on('session.start', async ($, e, next) => {
    try {
      const id = await sessionId($)
      const rec = await loadRec($, id)
      await update($, readingA, () => rec.objective)
      // A record with messages of his and no objective yet (a write that never
      // landed, or one saved by an older build) is written now.
      if (rec.objective === null && hisFrom(rec, jobOf(rec)).length > 0) {
        rebuildObjective($, id, 'load').catch(() => undefined)
      }
      await update($, viewA, v => (v === 'reading' ? 'row' : (v ?? 'row')))
      await setNow($, { isWorking: false, doing: 'idle', mark: '' })
    } catch {
      // The row still draws with defaults.
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // The engine stamps the origin; the test kit's own submit carries none.
    const kind = e.origin?.kind ?? 'composer'
    if (kind === 'composer' || kind === 'bridge') {
      const note = noteTyped(e.text)
      if (note !== null) {
        if (note === '') return { drop: 'Owner rep: nothing after the prefix, so nothing noted.' }
        try {
          const id = await sessionId($)
          await takeNote($, id, note)
          // The note is his and can move the objective: the writer reads it first.
          rebuildObjective($, id, 'note').catch(() => undefined)
          // A dropped prompt stays in the box for editing; a note the rep has
          // taken must not, or the next digit lands after it as text. A fill
          // made now is undone by the drop, so it is made once the drop has landed.
          $.clock.after(NOTE_CLEAR_MS, () => {
            $.prompt.fill({ text: '', mode: 'replace' }).catch(() => undefined)
          })
          // The look reads the note against the work at once.
          if (!inFlight.has('note')) {
            inFlight.add('note')
            look($, id, 'note', '')
              .catch(() => undefined)
              .finally(() => inFlight.delete('note'))
          }
        } catch {
          // The note is dropped either way; the agent never sees it.
        }
        return { drop: 'Owner rep: noted, and reading again. The agent did not see this.' }
      }
      try {
        const id = await sessionId($)
        const view = await read($, viewA)
        const { rec, split, isHis } = await changeRec($, id, async rec => {
          // A message the rep drafted and he sent is recorded as the rep's words,
          // marked, never as his: the model must not grade against a job the rep wrote.
          // It is matched against the stored briefing, so it survives a reload; what
          // he added after the draft is his own message, numbered after it.
          const split = draftSplit(e.text, rec.lastBrief?.message ?? '')
          const isHis = split === null || split.his !== ''
          if (split === null) pushOwner(rec, 'his', e.text)
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
        if (split !== null) await update($, readingA, () => rec.objective)
        // A message of his can move the objective: the writer reads it, never the agent's words.
        if (isHis) rebuildObjective($, id, 'message').catch(() => undefined)
      } catch {
        // Recording is best effort; the prompt goes on.
      }
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
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const cols = Math.max(20, e.props.bodyColumns)
    const view = (await read($, viewA)) ?? 'row'
    const reading = await read($, readingA)
    const now = (await read($, nowA)) ?? IDLE
    const note = await read($, noteA)
    const brief = await read($, briefA)
    const id = sid

    // The band is one strip shared with every other mod, "You should know"
    // among them, and this mod draws first. Whatever is beneath is kept under
    // the row. While another mod's note is showing, the rep's own note waits,
    // so only one set of digit buttons is ever on screen. The briefing, which
    // the owner asked for, takes the strip alone.
    const beneath = await next(e)
    const hasBeneath = drawsSomething(beneath)
    if (hasBeneath) rememberOther($, id, textOf(beneath)).catch(() => undefined)

    const onPress = () => {
      pressBrief($, id).catch(() => undefined)
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
      <Box flexDirection="row">
        <Text color={color}>{glyph} </Text>
        <Box flexDirection="column" width={cols - 2}>
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
    // The row shows the result; the card shows the objective whole.
    const placeholder = 'working out the result you want from your messages…'
    const readingText = reading === null ? placeholder : objectiveText(reading)
    const head = lead(headGlyph, headColor, 'Owner rep', reading?.result ?? placeholder)

    if (view === 'note' && note !== null && !hasBeneath) {
      const clear = () => {
        clearNote($).catch(() => undefined)
      }
      return (
        <Box flexDirection="column" marginTop={1}>
          {lead('◆', 'warning', 'Heads up', note.line)}
          {note.why !== '' ? (
            <Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {note.why}
              </Text>
            </Box>
          ) : undefined}
          {choices(
            <Button key="brief" plain hotkey="1" label="Brief me" onPress={onPress} />,
            <Button key="fine" plain hotkey="2" label="Fine" onPress={clear} />,
            <Button key="later" plain hotkey="0" label="Later" onPress={clear} />,
            statusText,
          )}
        </Box>
      )
    }

    if (view === 'brief' && brief !== null) {
      // The card folded to the band's rows, so its buttons stay where a digit
      // reaches them; the Put button still carries the whole message.
      const shown = fitCard({ ...brief, reading: brief.reading === '' ? readingText : brief.reading }, e.props.maxRows, cols)
      const cardHead = lead(headGlyph, headColor, 'Owner rep', shown.reading)
      const section = (label: string, text: string) =>
        text === '' ? undefined : (
          <Box paddingLeft={2} width={cols}>
            <Text wrap="wrap">
              <Text bold>{label} </Text>
              {text}
            </Text>
          </Box>
        )
      return (
        <Box flexDirection="column" marginTop={1}>
          {cardHead}
          {shown.revised !== '' ? (
            <Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {shown.revised}
              </Text>
            </Box>
          ) : undefined}
          {shown.well !== '' ? (
            <Box paddingLeft={2} width={cols}>
              <Text color="success" wrap="wrap">
                {shown.well}
              </Text>
            </Box>
          ) : undefined}
          {section('Stands:', shown.stands)}
          {section('Means:', shown.means)}
          {shown.leftOut.length > 0 ? (
            <Box flexDirection="column" paddingLeft={2} width={cols}>
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
            <Box flexDirection="column" paddingLeft={2} width={cols}>
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
            <Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {shown.checkCost}
              </Text>
            </Box>
          ) : undefined}
          {shown.checkNote !== '' ? (
            <Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {shown.checkNote}
              </Text>
            </Box>
          ) : undefined}
          {shown.message !== '' ? (
            <Box marginLeft={2} width={cols - 2} flexDirection="column" borderStyle="round" borderDimColor paddingX={1}>
              <Text wrap="wrap">{shown.message}</Text>
            </Box>
          ) : undefined}
          {shown.does !== '' && shown.message !== '' ? (
            <Box paddingLeft={2} width={cols}>
              <Text dimColor wrap="wrap">
                {shown.does}
              </Text>
            </Box>
          ) : undefined}
          {choices(
            shown.checked === null && !shown.isChecking ? (
              <Button
                key="check"
                plain
                hotkey="3"
                label="Check it"
                onPress={() => {
                  pressCheck($, id).catch(() => undefined)
                }}
              />
            ) : undefined,
            shown.message !== '' ? (
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
          <Box paddingLeft={2}>
            <Text dimColor>{shown.spent}</Text>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" marginTop={1}>
        {head}
        {choices(statusText, repButton, tellButton)}
        {beneath}
      </Box>
    )
  })

  on('session.end', async ($, e, next) => {
    try {
      const id = await sessionId($)
      await changeRec($, id, () => undefined)
    } catch {
      // Nothing to save.
    }
    return next(e)
  })
}
