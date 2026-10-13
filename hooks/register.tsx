import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Brief, Note, Now, View } from '../types'
import {
  CHECK_EVERY,
  CLEAR_AFTER_PROMPTS,
  OWNER_CUT,
  OWNER_MAX,
  SEEN_MAX,
  SESSIONS_MAX,
  briefPrompt,
  cachedOf,
  doingFor,
  fit,
  parseBrief,
  parseWatch,
  same,
  skipAfter,
  spentText,
  tokensOf,
  watchPrompt,
  type Memory,
} from './rep'

// The chord that presses the Rep button from the prompt: `ctrl+x r`, bound in
// ~/.claude/keybindings.json to this engine action, which has no default key.
const PRESS_ACTION = 'app:toggleDiffPreSession'
const PRESS_HOTKEY = 'r'

const IDLE: Now = { doing: 'idle', helpers: 0, isWorking: false, mark: '' }

const goalA = atom({ plugin: 'owner-rep', key: 'goal' } as const, null)
const pinnedA = atom({ plugin: 'owner-rep', key: 'isPinned' } as const, false)
const nowA = atom({ plugin: 'owner-rep', key: 'now' } as const, IDLE)
const noteA = atom({ plugin: 'owner-rep', key: 'note' } as const, null)
const briefA = atom({ plugin: 'owner-rep', key: 'brief' } as const, null)
const viewA = atom({ plugin: 'owner-rep', key: 'view' } as const, 'row')
const helpersA = atom({ plugin: 'owner-rep', key: 'helperIds' } as const, [])

// What the rep remembers about a session between reloads and sessions ($.store).
type Rec = {
  id: string
  at: number
  goal: string | null
  isPinned: boolean
  owner: string[]
  seen: string[]
  lastBrief?: { at: number; next: string; message: string }
  lastSent?: { text: string; at: number }
  typedPast: number
  skip: number
  calls: number
  tokens: number
  cached: number
}

const isRec = (v: unknown): v is Rec =>
  typeof v === 'object' && v !== null && typeof (v as Rec).id === 'string' && Array.isArray((v as Rec).owner)

const freshRec = (id: string): Rec => ({
  id,
  at: Date.now(),
  goal: null,
  isPinned: false,
  owner: [],
  seen: [],
  typedPast: 0,
  skip: 0,
  calls: 0,
  tokens: 0,
  cached: 0,
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
  goal: rec.goal,
  isPinned: rec.isPinned,
  owner: rec.owner,
  seen: rec.seen,
  lastBrief: rec.lastBrief,
  lastSent: rec.lastSent,
})

async function setNow($: EngineInterface, patch: Partial<Now>): Promise<void> {
  await update($, nowA, n => ({ ...(n ?? IDLE), ...patch }))
}

// One look by the watch: the same cached copy of the conversation the agent
// works from, read by a fresh instance with the rep's brief. Never awaited by
// the hook that starts it, so the agent is never slowed.
async function look($: EngineInterface, sid: string, reason: 'step' | 'stop', turnId: string): Promise<void> {
  const rec = await loadRec($, sid)
  if (rec.skip > 0) {
    await saveRec($, { ...rec, skip: rec.skip - 1 })
    return
  }
  const result = await $.model.fork({ prompt: watchPrompt(memoryOf(rec), reason) })
  const after = await loadRec($, sid)
  after.calls += 1
  after.tokens += tokensOf('usage' in result ? result.usage : null)
  after.cached += cachedOf('usage' in result ? result.usage : null)
  if (!result.isAnswered) {
    await saveRec($, after)
    return
  }
  const answer = parseWatch(result.text)
  if (answer.goal !== null && !after.isPinned) {
    after.goal = answer.goal
    await update($, goalA, () => answer.goal)
  }
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
    const result = await $.model.fork({ prompt: briefPrompt(memoryOf(rec)) })
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
    if (a.goal !== null && !after.isPinned) {
      after.goal = a.goal
      await update($, goalA, () => a.goal)
    }
    const brief: Brief = {
      goal: after.goal ?? a.goal ?? '',
      well: a.well,
      stands: a.stands,
      means: a.means,
      leftOut: a.leftOut,
      next: a.next,
      message: a.message,
      does: a.does,
      at: Date.now(),
      spent: spentText(after.calls, after.tokens, after.cached),
    }
    after.lastBrief = { at: brief.at, next: brief.next, message: brief.message }
    await saveRec($, after)
    await update($, noteA, () => null)
    await update($, briefA, () => brief)
    await update($, viewA, () => 'brief')
  } catch {
    await update($, viewA, () => 'row')
    $.ui.toast('Owner rep: the reading failed. Press again.')
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

async function pinGoal($: EngineInterface, sid: string, text: string): Promise<void> {
  const goal = text.trim()
  const rec = await loadRec($, sid)
  if (goal === '') {
    rec.isPinned = false
    await update($, pinnedA, () => false)
    $.ui.toast('Owner rep will work the result out again from your messages.')
  } else {
    rec.goal = goal
    rec.isPinned = true
    await update($, goalA, () => goal)
    await update($, pinnedA, () => true)
    $.ui.toast('Pinned. The rep measures against your sentence now.')
  }
  await saveRec($, rec)
  await update($, viewA, () => 'row')
}

async function clearNote($: EngineInterface): Promise<void> {
  await update($, noteA, () => null)
  await update($, viewA, () => 'row')
}

// Whether a tree another mod or the engine returned for the band draws
// anything: an empty fragment or an empty box draws nothing.
function drawsSomething(tree: unknown): boolean {
  if (tree === undefined || tree === null || tree === false || tree === '') return false
  if (typeof tree === 'string' || typeof tree === 'number') return true
  if (Array.isArray(tree)) return tree.some(drawsSomething)
  if (typeof tree === 'object') {
    const t = tree as { type?: unknown; props?: { children?: unknown }; children?: unknown }
    const kids = t.props?.children ?? t.children
    if (t.type === 'Fragment' || t.type === 'Box' || t.type === undefined) return drawsSomething(kids)
    return true
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
      await update($, goalA, () => rec.goal)
      await update($, pinnedA, () => rec.isPinned)
      await update($, viewA, v => (v === 'reading' ? 'row' : (v ?? 'row')))
      await setNow($, { isWorking: false, doing: 'idle', mark: '' })
    } catch {
      // The row still draws with defaults.
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const kind = e.origin.kind
    if (kind === 'composer' || kind === 'bridge') {
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
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const cols = Math.max(20, e.props.bodyColumns)
    const view = (await read($, viewA)) ?? 'row'
    const goal = await read($, goalA)
    const now = (await read($, nowA)) ?? IDLE
    const note = await read($, noteA)
    const brief = await read($, briefA)
    const id = sid

    // The band is one strip shared with every other mod, "You should know"
    // among them, and this mod draws first. Whatever is beneath is kept under
    // the row. While another mod's note is showing, the rep's own note waits,
    // so only one set of digit buttons is ever on screen. The briefing and the
    // goal field, which the owner asked for, take the strip alone.
    const beneath = await next(e)
    const hasBeneath = drawsSomething(beneath)

    const onPress = () => {
      pressBrief($, id).catch(() => undefined)
    }

    // The row: mark, the result he wants, what the agent is doing now, the button.
    const isReading = view === 'reading'
    const marked = now.mark !== ''
    const right = isReading ? 'Owner rep is reading the whole session…' : now.doing + (now.helpers > 0 ? ` · ${now.helpers} helper${now.helpers === 1 ? '' : 's'}` : '')
    const button = `${PRESS_HOTKEY}: Rep`
    const sep = ' · '
    const goalText = goal ?? 'working out the result you want…'
    const room = cols - 2 - sep.length - right.length - button.length - 3
    const goalCut = fit(goalText, Math.max(8, room))
    const row = (
      <Box key="row" flexDirection="row">
        <Text color={marked ? 'warning' : 'subtle'}>{marked ? '● ' : '○ '}</Text>
        <Text bold={view === 'brief'} wrap="truncate-end">
          {goalCut}
        </Text>
        <Text dimColor>{sep}</Text>
        <Text color={marked || isReading ? 'warning' : undefined} dimColor={!marked && !isReading} wrap="truncate-end">
          {right}
        </Text>
        <Text> </Text>
        <Button key="rep" plain hotkey={PRESS_HOTKEY} action={PRESS_ACTION} label="Rep" onPress={onPress} />
      </Box>
    )

    if (view === 'goal') {
      return (
        <Box flexDirection="column">
          {row}
          <Input
            key="goal"
            label="The result you want: "
            value={goal ?? ''}
            placeholder="one plain sentence; Enter pins it, empty unpins"
            submitLabel="pin"
            autoFocus
            onSubmit={value => {
              pinGoal($, id, value).catch(() => undefined)
            }}
          />
        </Box>
      )
    }

    if (view === 'note' && note !== null && !hasBeneath) {
      return (
        <Box flexDirection="column">
          {row}
          <Text wrap="wrap">
            <Text color="warning">Heads up</Text>
            <Text dimColor> · </Text>
            {note.line}
          </Text>
          {note.why !== '' ? (
            <Text dimColor wrap="wrap">
              {note.why}
            </Text>
          ) : undefined}
          <Box flexDirection="row" gap={3}>
            <Button key="brief" plain hotkey="1" label="Brief me" onPress={onPress} />
            <Button
              key="fine"
              plain
              hotkey="2"
              label="Fine"
              onPress={() => {
                clearNote($).catch(() => undefined)
              }}
            />
            <Button
              key="later"
              plain
              hotkey="0"
              label="Later"
              onPress={() => {
                clearNote($).catch(() => undefined)
              }}
            />
          </Box>
        </Box>
      )
    }

    if (view === 'brief' && brief !== null) {
      const fixGoal = () => {
        update($, viewA, () => 'goal').catch(() => undefined)
      }
      const close = () => {
        update($, viewA, () => 'row').catch(() => undefined)
      }
      if (brief.well !== '') {
        return (
          <Box flexDirection="column">
            {row}
            <Text wrap="wrap">{brief.well}</Text>
            <Box flexDirection="row" gap={3}>
              <Button key="close" plain hotkey="2" label="Fine, close" onPress={close} />
              <Button key="goal" plain hotkey="g" label="Fix the goal" onPress={fixGoal} />
            </Box>
            <Text dimColor>{brief.spent}</Text>
          </Box>
        )
      }
      const line = (label: string, text: string) =>
        text === '' ? undefined : (
          <Text wrap="wrap">
            <Text bold>{label} </Text>
            {text}
          </Text>
        )
      return (
        <Box flexDirection="column">
          {row}
          {line('Stands:', brief.stands)}
          {line('Means:', brief.means)}
          {brief.leftOut.length > 0 ? (
            <Box flexDirection="column">
              <Text bold>Left out:</Text>
              {brief.leftOut.map((item, i) => (
                <Text key={`left-${i}`} wrap="wrap">
                  {'  - '}
                  {item}
                </Text>
              ))}
            </Box>
          ) : undefined}
          {line('Next:', brief.next)}
          {brief.message !== '' ? (
            <Box flexDirection="column" borderStyle="round" borderDimColor paddingX={1} marginTop={0}>
              <Text wrap="wrap">{brief.message}</Text>
            </Box>
          ) : undefined}
          {brief.does !== '' && brief.message !== '' ? <Text dimColor wrap="wrap">{brief.does}</Text> : undefined}
          <Box flexDirection="row" gap={3}>
            {brief.message !== '' ? (
              <Button
                key="put"
                plain
                hotkey="1"
                label="Put message in prompt"
                onPress={() => {
                  putMessage($, brief.message).catch(() => undefined)
                }}
              />
            ) : undefined}
            <Button key="close" plain hotkey="2" label="Fine, close" onPress={close} />
            <Button key="goal" plain hotkey="g" label="Fix the goal" onPress={fixGoal} />
            <Button key="later" plain hotkey="0" label="Later" onPress={close} />
          </Box>
          <Text dimColor>{brief.spent}</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {row}
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
