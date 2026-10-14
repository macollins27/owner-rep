import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

type RenderNodeList = RenderChildren[]

import type { Brief, Checked, Note, Now, Reading, View } from '../types'
import {
  CHECK_EVERY,
  CHECK_TIMEOUT_MS,
  CLEAR_AFTER_PROMPTS,
  NOTE_MARK,
  NOTE_PREFIX,
  OWNER_CUT,
  OWNER_MAX,
  PAST_MAX,
  SEEN_MAX,
  SESSIONS_MAX,
  OTHERS_MAX,
  briefPrompt,
  cachedOf,
  checkArgv,
  checkCostText,
  checkPrompt,
  doingFor,
  firstSentence,
  fitCard,
  fit,
  noteTyped,
  parseBrief,
  parseCheck,
  parseWatch,
  resultOf,
  revisedLine,
  same,
  skipAfter,
  spentText,
  textOf,
  tokensOf,
  watchPrompt,
  type BriefAnswer,
  type Memory,
  type ReadingAnswer,
} from './rep'

// From the prompt box only a bare digit presses a band button.
const PRESS_HOTKEY = '1'

const IDLE: Now = { doing: 'idle', helpers: 0, isWorking: false, mark: '' }

const readingA = atom({ plugin: 'owner-rep', key: 'reading' } as const, null)
const nowA = atom({ plugin: 'owner-rep', key: 'now' } as const, IDLE)
const noteA = atom({ plugin: 'owner-rep', key: 'note' } as const, null)
const briefA = atom({ plugin: 'owner-rep', key: 'brief' } as const, null)
const viewA = atom({ plugin: 'owner-rep', key: 'view' } as const, 'row')
const helpersA = atom({ plugin: 'owner-rep', key: 'helperIds' } as const, [])

// What the rep remembers about a session between reloads and sessions ($.store).
type Rec = {
  id: string
  at: number
  reading: Reading | null
  owner: string[]
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
}

const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && typeof (v as Rec).id === 'string' && Array.isArray((v as Rec).owner)

const freshRec = (id: string): Rec => ({
  id,
  at: Date.now(),
  reading: null,
  owner: [],
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
})

async function loadRec($: EngineInterface, id: string): Promise<Rec> {
  const all = await $.store.get('sessions')
  const rec = typeof all === 'object' && all !== null ? (all as Record<string, unknown>)[id] : undefined
  return isRec(rec) ? { ...freshRec(id), ...rec } : freshRec(id)
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

const memoryOf = (rec: Rec): Memory => ({
  reading: rec.reading,
  owner: rec.owner,
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

// Applies what the model said about the reading to the record. The reading
// moves only on the owner's own words: a revision proposed when none of his
// messages has come since the reading was last built is refused, whatever the
// agent did meanwhile. A new job closes the old reading into `past`. Returns
// true when the record changed.
function takeReading(rec: Rec, a: ReadingAnswer, now: number): boolean {
  if (a === null || a.kind === 'holds') return false
  const held = rec.reading
  if (held === null) {
    rec.reading = { text: a.text, openedAt: now, since: 0, from: rec.owner.length, movedAt: null, cause: '', revisions: 0 }
    return true
  }
  if (rec.owner.length <= held.from) return false
  if (a.isNewJob) {
    rec.past = [...rec.past, firstSentence(held.text)].slice(-PAST_MAX)
    rec.reading = { text: a.text, openedAt: now, since: held.from, from: rec.owner.length, movedAt: now, cause: a.cause, revisions: 0 }
    return true
  }
  rec.reading = { ...held, text: a.text, from: rec.owner.length, movedAt: now, cause: a.cause, revisions: held.revisions + 1 }
  return true
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
    await saveRec($, { ...rec, skip: rec.skip - 1 })
    return
  }
  const result = await $.model.fork({ prompt: watchPrompt({ ...memoryOf(rec), context: await contextOf($) }, reason) })
  const after = await loadRec($, sid)
  after.calls += 1
  after.tokens += tokensOf('usage' in result ? result.usage : null)
  after.cached += cachedOf('usage' in result ? result.usage : null)
  if (!result.isAnswered) {
    await saveRec($, after)
    return
  }
  const answer = parseWatch(result.text)
  if (takeReading(after, answer.reading, Date.now())) await update($, readingA, () => after.reading)
  const view = await read($, viewA)
  if (answer.flag !== null && view === 'row' && ![...after.seen].some(s => same(s, answer.flag ?? ''))) {
    after.seen = [...after.seen, answer.flag].slice(-SEEN_MAX)
    const note: Note = { line: answer.flag, why: answer.why, shownAt: Date.now(), turnId }
    await update($, noteA, () => note)
    await update($, viewA, () => 'note')
  }
  await saveRec($, after)
}

// The press: an instant read over the same copy, drawn in the band.
async function pressBrief($: EngineInterface, sid: string): Promise<void> {
  const view = await read($, viewA)
  if (view === 'reading') return
  await update($, viewA, () => 'reading')
  await setNow($, { mark: '' }).catch(() => undefined)
  try {
    const rec = await loadRec($, sid)
    const context = await contextOf($)
    const result = await $.model.fork({ prompt: briefPrompt({ ...memoryOf(rec), context }) })
    const after = await loadRec($, sid)
    after.calls += 1
    after.tokens += tokensOf('usage' in result ? result.usage : null)
    after.cached += cachedOf('usage' in result ? result.usage : null)
    if (!result.isAnswered) {
      await saveRec($, after)
      await update($, viewA, () => 'row')
      $.ui.toast(
        result.reason === 'nothing-to-fork'
          ? 'Owner rep: nothing to read yet. Ask the agent something first.'
          : `Owner rep: the model did not answer (${result.reason}). Press again.`,
      )
      return
    }
    const a = parseBrief(result.text)
    if (takeReading(after, a.reading, Date.now())) await update($, readingA, () => after.reading)
    const brief: Brief = {
      reading: after.reading?.text ?? '',
      revised: revisedLine(after.reading),
      well: a.well,
      stands: a.stands,
      means: a.means,
      leftOut: a.leftOut,
      next: a.next,
      message: a.message,
      does: a.does,
      at: Date.now(),
      spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens),
      size: context === undefined ? '' : `conversation at ${context.percent} percent of its window`,
      isChecking: false,
      checked: null,
      checkNote: '',
      checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs),
    }
    after.lastBrief = { at: brief.at, next: brief.next, message: brief.message }
    await saveRec($, after)
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
    const prompt = checkPrompt({
      sessionId: sid,
      cwd,
      reading: rec.reading?.text ?? '',
      owner: rec.reading === null ? rec.owner : rec.owner.slice(rec.reading.since),
      brief: instant,
      writtenAt: new Date(at).toISOString(),
    })
    const startedAt = Date.now()
    const stream = $.process.spawn({ argv: checkArgv(prompt), cwd })
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
    }
    if (timedOut) return finish({ checkNote: 'The check ran out of time (five minutes) and was stopped.' })
    const got = resultOf(stdout)
    if (got === null) {
      const why = stderr.trim().split('\n').pop() ?? ''
      return finish({ checkNote: `The check could not run${end.code === null ? '' : ` (exit ${end.code})`}${why === '' ? '' : `: ${fit(why, 160)}`}.` })
    }
    const after = await loadRec($, sid)
    after.checks += 1
    after.checkTokens += got.tokens
    after.lastCheckTokens = got.tokens
    after.lastCheckCached = got.cached
    after.lastCheckMs = Date.now() - startedAt
    const c = parseCheck(got.text)
    const checked: Checked = { holds: c.holds, wrong: c.wrong, notShown: c.notShown, changed: c.changed, looked: c.looked }
    const hasLeft = parts_hasLeft(got.text)
    const patch: Partial<Brief> = {
      checked,
      stands: c.stands === '' ? instant.stands : c.stands,
      means: c.means === '' ? instant.means : c.means,
      leftOut: hasLeft ? c.leftOut : instant.leftOut,
      next: c.next === '' ? instant.next : c.next,
      message: c.message === '' ? instant.message : c.message,
      does: c.does === '' ? instant.does : c.does,
      spent: spentText(after.calls, after.tokens, after.cached, after.checks, after.checkTokens),
      checkCost: checkCostText(after.lastCheckTokens, after.lastCheckCached, after.lastCheckMs),
    }
    after.lastBrief = { at, next: patch.next ?? '', message: patch.message ?? '' }
    await saveRec($, after)
    await finish(patch)
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error)
    await finish({ checkNote: `The check failed: ${fit(why, 160)}` }).catch(() => undefined)
  }
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

// A note to the rep, typed behind the prefix: recorded as his, marked as said
// to the rep, and read at once. The agent never sees it.
async function takeNote($: EngineInterface, sid: string, note: string): Promise<void> {
  const rec = await loadRec($, sid)
  rec.owner = [...rec.owner, fit(`${NOTE_MARK}${note}`, OWNER_CUT)].slice(-OWNER_MAX)
  await saveRec($, rec)
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
  const rec = await loadRec($, id)
  if (rec.others.some(o => same(o, line))) return
  rec.others = [...rec.others, fit(line, 400)].slice(-OTHERS_MAX)
  await saveRec($, rec)
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
      await update($, readingA, () => rec.reading)
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
        const rec = await loadRec($, id)
        rec.owner = [...rec.owner, fit(e.text, OWNER_CUT)].slice(-OWNER_MAX)
        const view = await read($, viewA)
        const brief = await read($, briefA)
        if (brief !== null && brief.message !== '' && same(e.text, brief.message)) {
          rec.lastSent = { text: brief.message, at: Date.now() }
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
        await saveRec($, rec)
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
    // The row shows the reading's first sentence; the card shows it whole.
    const readingText = reading?.text ?? 'working out the result you want from your messages…'
    const head = lead(headGlyph, headColor, 'Owner rep', firstSentence(readingText))

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
      const rec = await loadRec($, id)
      await saveRec($, rec)
    } catch {
      // Nothing to save.
    }
    return next(e)
  })
}
