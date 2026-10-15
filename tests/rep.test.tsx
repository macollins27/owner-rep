import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

import { CHECK_EVERY, CHECK_TIMEOUT_MS, CLEAR_AFTER_PROMPTS, LONG_SESSION_PERCENT, NOTE_CLEAR_MS, SESSIONS_MAX, TYPED_PAST_FREE, briefPrompt, cardRows, contextLine, checkArgv, checkCostText, checkPrompt, doingFor, firstSentence, fit, fitCard, noteTyped, parseBrief, parseCheck, parseWatch, programOf, resultOf, revisedLine, rowsOf, same, textOf, watchPrompt } from '../hooks/rep'

// A band with room for a whole card; the fold-to-fit test narrows it.
const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 40, bodyColumns: 96, scroll: { offset: 0, bodyRows: 39 }, view: {} },
} as const

// In a session the engine draws nothing of its own in the band; a test says so
// with an empty tree beneath the plugins.
const quietBand = (on: On) => on('ui.render', { component: 'AbovePrompt' }, () => <></>)

const USAGE = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 }

test('a watch answer with no flag parses to the reading, the state and no note', async () => {
  const a = parseWatch('reading: A mod that briefs you plainly, so you can oversee agents.\nmoved: first reading\nstate: working\nflag: none\n')
  expect(a.reading).toEqual({ kind: 'moved', text: 'A mod that briefs you plainly, so you can oversee agents.', cause: 'first reading', isNewJob: false })
  expect(a.state).toBe('working')
  expect(a.flag).toBe(null)
  expect(parseWatch('reading: holds\nstate: working\nflag: none').reading).toEqual({ kind: 'holds' })
  expect(parseWatch('reading: Holds.\nstate: working\nflag: none').reading).toEqual({ kind: 'holds' })
  expect(parseWatch('state: working\nflag: none').reading).toBe(null)
  const n = parseWatch('reading: The licence file, full text, so the repository is usable.\nmoved: New job: he asked for the licence after closing the README.\nstate: stopped\nflag: none').reading
  expect(n?.kind === 'moved' && n.isNewJob).toBe(true)
})

test('a watch answer with a flag parses the flag and the why', async () => {
  const a = parseWatch('reading: "The judge rebuilt."\nstate: stopped\nflag: The agent says the tests pass, but it never ran them.\nwhy: No test output appears after the last edit.')
  expect(a.reading).toEqual({ kind: 'moved', text: 'The judge rebuilt.', cause: '', isNewJob: false })
  expect(a.state).toBe('stopped')
  expect(a.flag).toBe('The agent says the tests pass, but it never ran them.')
  expect(a.why).toBe('No test output appears after the last edit.')
})

test('a briefing parses every part, the message block whole, and "- nothing" as no items', async () => {
  const text = [
    'reading: holds',
    'well:',
    'stands: The mod draws but was never run live.',
    'means: "Done" here means written, not shown working.',
    'left:',
    '- the live run you asked for',
    '- the type check was skipped',
    'next: Have it drive the mod in a real terminal.',
    'message:',
    'Before calling this done, load the mod in a real session.',
    'Press each button idle and mid-turn, and show me what appeared.',
    'end',
    'does: Makes the agent prove the mod live instead of moving on.',
  ].join('\n')
  const b = parseBrief(text)
  expect(b.reading).toEqual({ kind: 'holds' })
  expect(b.well).toBe('')
  expect(b.stands).toBe('The mod draws but was never run live.')
  expect(b.leftOut).toEqual(['the live run you asked for', 'the type check was skipped'])
  expect(b.message).toBe(
    'Before calling this done, load the mod in a real session.\nPress each button idle and mid-turn, and show me what appeared.',
  )
  expect(b.does).toBe('Makes the agent prove the mod live instead of moving on.')
  expect(parseBrief('reading: x\nwell: Going well.\nleft:\n- nothing\nmessage:\nend\ndoes:').leftOut).toEqual([])
})

test('helpers: fit cuts with an ellipsis, same ignores case and a final period, doingFor names the work', async () => {
  expect(fit('a long sentence here', 10)).toBe('a long se…')
  expect(fit('short', 10)).toBe('short')
  expect(same('The tests pass.', 'the tests pass')).toBe(true)
  expect(doingFor('Edit', { file_path: '/a/b/register.tsx' })).toBe('editing register.tsx')
  expect(doingFor('Bash', { command: 'git status --short' })).toBe('running git')
  expect(doingFor('mcp__agentsview__search_content', {})).toBe('using agentsview')
  expect(doingFor('Agent', {})).toBe('starting a helper')
  expect(noteTyped('Owner rep: the tests matter more than speed')).toBe('the tests matter more than speed')
  expect(noteTyped('Owner rep goal: a judge that works')).toBe('a judge that works')
  expect(noteTyped('owner rep:')).toBe('')
  expect(noteTyped('fix the tests')).toBe(null)
  expect(noteTyped('the owner rep: is it confused?')).toBe(null)
  expect(firstSentence('A public project employers can inspect. Right now that means the licence file.')).toBe('A public project employers can inspect.')
  expect(firstSentence('working out the result you want from your messages…')).toBe('working out the result you want from your messages…')
  expect(revisedLine(null)).toBe('')
  expect(revisedLine({ text: 'x', openedAt: 0, since: 0, from: 1, movedAt: null, cause: '', revisions: 0 })).toBe('')
  expect(revisedLine({ text: 'x', openedAt: 0, since: 0, from: 2, movedAt: new Date(2026, 9, 14, 15, 12).getTime(), cause: 'he asked for tests as well', revisions: 1 })).toBe('Reading revised at 3:12 pm: he asked for tests as well')
  expect(revisedLine({ text: 'x', openedAt: 0, since: 1, from: 2, movedAt: new Date(2026, 9, 14, 9, 5).getTime(), cause: 'new job, the licence', revisions: 0 })).toBe('New job since 9:05 am: new job, the licence')
})

// The command from the owner's screenshot of 14 Oct 2026: it starts by setting
// variables, and the strip showed the first of them as code.
const CHAIN =
  'export PATH="$HOME/.local/bin:$PATH"; LOGF=~/Library/Logs/agentsview/serve.launchd.log; D=~/.agentsview/debug.log; ' +
  'mark=$(wc -c < "$LOGF"); before=$(wc -l < "$D"); (agentsview sync >/dev/null 2>&1 &); W=""; for i in $(seq 1 90); do ' +
  'W=$(ps -eo pid,command | grep -E "[a]gentsview sync-worker" | grep -v grep); done'

test('a shell status names the program and never shows the command: a chain that starts by setting a variable', async () => {
  expect(doingFor('Bash', { command: CHAIN })).toBe('running agentsview')
  expect(doingFor('Bash', { command: CHAIN })).not.toMatch(/[$="'~\/]/)
  expect(programOf('FOO=bar npm test')).toBe('npm')
  expect(programOf('cd /x/y && pnpm build')).toBe('pnpm')
  expect(programOf('sudo ./scripts/deploy.sh --now')).toBe('deploy.sh')
  expect(programOf('export PATH="$HOME/.local/bin:$PATH"')).toBe('')
  expect(programOf('"$HOME/bin/tool" --x')).toBe('')
  expect(programOf('echo hi > out.txt')).toBe('')
  expect(programOf('$env:PATH = "C:\\x"; Get-ChildItem')).toBe('Get-ChildItem')
  expect(programOf(undefined)).toBe('')
  expect(doingFor('Bash', {})).toBe('running a command')
  expect(doingFor('Read', { file_path: '/a/an-unreasonably-long-file-name-for-the-strip.md' })).toBe('reading an-unreasonably-long-fi…')
})

test('the strip reads plainly while the agent runs a command that starts by setting a variable', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('tool.call', { tool: 'Bash' }, () => ({ result: '' }))
  await $.tool.call({ tool: 'Bash', command: CHAIN })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^running agentsview$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /PATH|\$HOME|export|LOGF/ })).toBeUndefined()
  await ui.unmount()
})

test('the text of another mod\'s note is read from its tree, buttons left out', async () => {
  const tree = {
    type: 'Box',
    props: {
      children: [
        { type: 'Text', props: { children: ['Heads up', ' · ', 'The pages leave out real customers.'] } },
        { type: 'Button', props: { label: 'Learn more', children: ['Learn more'] } },
      ],
    },
  }
  expect(textOf(tree)).toBe('Heads up · The pages leave out real customers.')
})

test('rule: a note to the rep is dropped before the agent sees it and cleared from the box, listed to the model as said to the rep, and read at once', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.toast', () => ({ value: undefined }))
  let reached = false
  on('prompt.submit', ($, e) => {
    reached = true
    return { text: e.text }
  })
  const prompts: string[] = []
  on('model.fork', ($, e) => {
    prompts.push(String(e.prompt))
    return { value: { isAnswered: true, text: 'reading: The strip reads plainly in every state, so he can trust it at a glance.\nmoved: first reading\nstate: stopped\nflag: none', usage: USAGE } }
  })
  const fills: string[] = []
  on('prompt.fill', ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  const clock = mock.clock(on)
  const result = await $.prompt.submit({ text: 'Owner rep: the tests matter more to me than speed', wait: false, origin: { kind: 'composer' } })
  expect(reached).toBe(false)
  expect(result.drop).toMatch(/noted/)
  // The box is emptied once the drop has landed: a dropped prompt would otherwise stay in it.
  expect(fills).toEqual([])
  await clock.advance(NOTE_CLEAR_MS + 1)
  expect(fills).toEqual([''])
  // The look the note started settles while the strip is drawn, as in a session.
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.unmount()
  expect(prompts).toHaveLength(1)
  expect(prompts[0]).toMatch(/told you something directly/)
  expect(prompts[0]).toMatch(/- \(to the rep\) the tests matter more to me than speed/)
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · The strip reads plainly in every state, so he can trust it at a glance\.$/ })).toBeDefined()
  await ui.unmount()
  // The old prefix is a note too, and an empty note is dropped without a look.
  expect((await $.prompt.submit({ text: 'Owner rep goal: x', wait: false, origin: { kind: 'composer' } })).drop).toMatch(/noted/)
  expect((await $.prompt.submit({ text: 'Owner rep:', wait: false, origin: { kind: 'composer' } })).drop).toMatch(/nothing noted/)
  expect(reached).toBe(false)
  await (await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })).unmount()
  expect(prompts).toHaveLength(2)
})

test('the checker: its prompt names the session, its tools are read-only, and its answer parses', async () => {
  const brief = parseBrief('reading: holds\nstands: s\nmeans: m\nleft:\n- a\nnext: n\nmessage:\nhello\nend\ndoes: d')
  const prompt = checkPrompt({ sessionId: 'abc-123', cwd: '/tmp/x', reading: 'the result', owner: ['first ask'], brief, writtenAt: '2026-10-13T23:05:00.000Z' })
  expect(prompt).toContain('abc-123')
  expect(prompt).toContain('2026-10-13T23:05:00.000Z')
  expect(prompt).toContain('changed:')
  expect(prompt).toContain('the result')
  expect(prompt).toContain('first ask')
  expect(prompt).toContain('stands: s')
  expect(prompt).toContain('--direction desc --limit 40')
  expect(prompt).not.toContain('--from -40')
  const argv = checkArgv(prompt)
  expect(argv[0]).toBe('claude')
  expect(argv[1]).toBe('-p')
  const allowed = argv[argv.indexOf('--allowedTools') + 1] ?? ''
  expect(allowed).toContain('Bash(agentsview:*)')
  expect(allowed).toContain('Bash(~/Library/pnpm/tsc:*)')
  expect(allowed).toContain('Bash(npx tsc:*)')
  expect(allowed).not.toContain('Write')
  const disallowed = argv[argv.indexOf('--disallowedTools') + 1] ?? ''
  expect(disallowed).toContain('Edit')
  expect(disallowed).toContain('SendMessage')
  const c = parseCheck('holds:\n- the file exists\nfalse:\n- tests passed; the last run printed 2 failures\nnotshown:\n- nothing\nchanged:\n- the helper finished at 23:17\nstands: Two tests fail.\nmeans: Not done.\nleft:\n- the live run\nnext: Fix them.\nmessage:\nTwo tests fail. Fix them and show the run.\nend\ndoes: Makes it fix the tests.\nlooked: Read the record and ran the tests; could not open the helper logs.')
  expect(c.holds).toEqual(['the file exists'])
  expect(c.changed).toEqual(['the helper finished at 23:17'])
  expect(c.means).toBe('Not done.')
  expect(c.leftOut).toEqual(['the live run'])
  expect(c.wrong).toEqual(['tests passed; the last run printed 2 failures'])
  expect(c.notShown).toEqual([])
  expect(c.stands).toBe('Two tests fail.')
  expect(c.message).toBe('Two tests fail. Fix them and show the run.')
  expect(c.looked).toContain('could not open the helper logs')
  const out = resultOf('noise\n' + JSON.stringify({ type: 'result', result: 'holds:\n- x', usage: { input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 1, cache_creation_input_tokens: 2 } }))
  expect(out?.text).toBe('holds:\n- x')
  expect(out?.tokens).toBe(15)
  expect(resultOf('not json')).toBe(null)
  expect(checkCostText(0, 0, 0)).toContain('210k fresh tokens plus 2.3 million re-read from cache, in 2 minutes')
  expect(checkCostText(850000, 800000, 95000)).toContain('50k fresh tokens plus 800k re-read from cache, in 2 minutes')
  expect(out?.cached).toBe(1)
})

test('the row draws on both surfaces with the Rep button and a placeholder goal', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface, ...BAND })
    const button = await ui.find({ key: 'rep' })
    expect(button).toBeDefined()
    expect(button?.props.hotkey).toBe('1')
    expect(button?.props.action).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /working out the result/ })).toBeDefined()
    expect(await ui.find({ key: 'put' })).toBeUndefined()
    await ui.unmount()
  }
})

test('an empty tree beneath the row leaves the digits on the row buttons', async ($, on) => {
  mock.store(on, {})
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text>{''}</Text>
      </Box>
    )
  })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBe('1')
  expect((await ui.find({ key: 'tell' }))?.props.hotkey).toBe('2')
  await ui.unmount()
})

test('the row keeps what another mod draws beneath it in the shared strip', async ($, on) => {
  mock.store(on, {})
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text key="other">You should know · a note from another mod</Text>
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface, ...BAND })
    expect(await ui.find({ key: 'rep' })).toBeDefined()
    expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /a note from another mod/ })).toBeDefined()
    await ui.unmount()
  }
})

test('pressing Rep reads the conversation and draws the briefing with the message and its buttons', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  const answer = [
    'reading: A judge mod that briefs you plainly.',
    'well:',
    'stands: Written, not yet run.',
    'means: Done means written.',
    'left:',
    '- the live run',
    'next: Run it live.',
    'message:',
    'Load the mod in a real session and show me what appeared.',
    'end',
    'does: Makes the agent prove it live.',
  ].join('\n')
  on('model.fork', () => ({ value: { isAnswered: true, text: answer, usage: USAGE } }))
  on('session.cwd', () => ({ value: '/tmp/x' }))
  const checked = JSON.stringify({
    type: 'result',
    result: 'holds:\n- nothing\nfalse:\n- the mod was run live; nothing in the record shows a run\nnotshown:\n- nothing\nchanged:\n- the agent started a test run after the briefing\nstands: Written and never run.\nmeans: Done means written.\nleft:\n- nothing\nnext: Run it live.\nmessage:\nShow me the live run.\nend\ndoes: Makes the agent run it.\nlooked: Read the record; ran nothing.',
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  })
  mock.clock(on)
  on('process.spawn', async function* () {
    yield { stream: 'stdout', text: checked }
    return { value: { code: 0, signal: null } }
  })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /A judge mod that briefs you plainly/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /nothing in the record shows a run/ })).toBeUndefined()
  expect((await ui.find({ key: 'check' }))?.props.hotkey).toBe('3')
  expect(await ui.find({ type: 'Text', text: /re-read from cache, in 2 minutes/ })).toBeDefined()
  await ui.press({ key: 'check' })
  expect(await ui.find({ key: 'check' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /nothing in the record shows a run/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /started a test run after the briefing/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Left out:$/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Show me the live run/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 check/ })).toBeDefined()
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  expect((await ui.find({ key: 'tell' }))?.props.hotkey).toBe('4')
  expect(await ui.find({ type: 'Text', text: /1 look, 1 check/ })).toBeDefined()
  await ui.unmount()
})

test('a briefing that says the work is going well still shows the full picture and the check button', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('model.fork', () => ({
    value: {
      isAnswered: true,
      text: 'reading: x\nwell: The agent is doing what you asked and showing it.\nstands: The tests pass and the change is on main.\nmeans: Nothing is waiting on you.\nleft:\n- nothing\nnext: Let it carry on.\nmessage:\nend\ndoes:',
      usage: USAGE,
    },
  }))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /doing what you asked/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /change is on main/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Let it carry on/ })).toBeDefined()
  expect(await ui.find({ key: 'check' })).toBeDefined()
  expect(await ui.find({ key: 'put' })).toBeUndefined()
  await ui.unmount()
})

test('a model that does not answer leaves the row and says so in a toast', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'nothing-to-fork' } }))
  const toasts: string[] = []
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ key: 'rep' })).toBeDefined()
  expect(await ui.find({ key: 'put' })).toBeUndefined()
  expect(toasts.some(t => /nothing to read yet/.test(t))).toBe(true)
  await ui.unmount()
})

// --- Sequence rules: what the hooks do over several events, driven through the kit. ---

const watchAnswer = (flag: string | null) =>
  `reading: A mod that briefs you plainly.\nstate: stopped\nflag: ${flag ?? 'none'}\nwhy: ${flag === null ? '' : 'No test output appears after the last edit.'}`

const stop = (turnId: string, answer = 'Done.', isAborted = false) =>
  ({ answer, durationMs: 1, isAborted, turnId, reason: isAborted ? 'aborted' : 'answer' }) as const

const typed = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

// The watch, the strip and the store in one place, for the tests below.
const session = (on: On, store: Record<string, unknown> = {}) => {
  mock.store(on, store)
  on('session.id', () => ({ value: 'test-session' }))
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.toast', () => ({ value: undefined }))
}

test('rule: a flag already shown is not shown again as a note', async ($, on) => {
  session(on)
  quietBand(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: watchAnswer('The agent says the tests pass, but never ran them.'), usage: USAGE } }))
  await $.turn.complete(stop('t1'))
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /never ran them/ })).toBeDefined()
  await ui.press({ key: 'fine' })
  expect(await ui.find({ type: 'Text', text: /never ran them/ })).toBeUndefined()
  await ui.unmount()
  await $.turn.complete(stop('t2'))
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /never ran them/ })).toBeUndefined()
  expect(await ui.find({ key: 'rep' })).toBeDefined()
  await ui.unmount()
})

test('rule: typing past notes backs the watch off, after the free ones', async ($, on) => {
  session(on)
  quietBand(on)
  let forks = 0
  on('model.fork', () => {
    forks += 1
    return { value: { isAnswered: true, text: watchAnswer(`Flag number ${forks}.`), usage: USAGE } }
  })
  // Each cycle: a stop shows a note, then the owner types past it.
  for (let i = 0; i < TYPED_PAST_FREE + 1; i++) {
    await $.turn.complete(stop(`t${i}`))
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
    expect(await ui.find({ type: 'Text', text: new RegExp(`Flag number ${i + 1}`) })).toBeDefined()
    await ui.unmount()
    for (let k = 0; k < CLEAR_AFTER_PROMPTS; k++) await $.prompt.submit(typed(`carry on ${i} ${k}`))
  }
  expect(forks).toBe(TYPED_PAST_FREE + 1)
  // One past the free ones: the next look is skipped, the one after runs. The
  // strip is drawn between stops, as a session draws it, so each look settles.
  const settle = async () => (await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })).unmount()
  await settle()
  await $.turn.complete(stop('skipped'))
  await settle()
  expect(forks).toBe(TYPED_PAST_FREE + 1)
  await $.turn.complete(stop('runs'))
  await settle()
  expect(forks).toBe(TYPED_PAST_FREE + 2)
})

const BRIEF = (stands: string) =>
  `reading: A judge mod.\nwell:\nstands: ${stands}\nmeans: Done means written.\nleft:\n- nothing\nnext: Run it live.\nmessage:\nShow me the run.\nend\ndoes: Makes the agent run it.`

const CHECKED = (stands: string) =>
  JSON.stringify({
    type: 'result',
    result: `holds:\n- nothing\nfalse:\n- nothing\nnotshown:\n- nothing\nchanged:\n- nothing\nstands: ${stands}\nmeans:\nleft:\n- nothing\nnext:\nmessage:\nend\ndoes:\nlooked: Read the record.`,
    usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
  })

// A check run the test holds open and releases when it chooses.
const heldCheck = (on: On, text: () => string) => {
  let release: () => void = () => undefined
  on('process.spawn', async function* () {
    await new Promise<void>(r => (release = r))
    yield { stream: 'stdout', text: text() }
    return { value: { code: 0, signal: null } }
  })
  return () => release()
}

test('rule: a newer press makes an older check stale; its answer does not rewrite the card', async ($, on) => {
  session(on)
  quietBand(on)
  on('session.cwd', () => ({ value: '/tmp/x' }))
  mock.clock(on)
  let briefs = 0
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF(`Card ${++briefs}.`), usage: USAGE } }))
  const release = heldCheck(on, () => CHECKED('OLD-CHECK: the first card, checked.'))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /Card 1\./ })).toBeDefined()
  const check = ui.press({ key: 'check' })
  await ui.press({ key: 'close' })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /Card 2\./ })).toBeDefined()
  release()
  await check
  expect(await ui.find({ type: 'Text', text: /Card 2\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /OLD-CHECK/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Read the record/ })).toBeUndefined()
  expect(await ui.find({ key: 'check' })).toBeDefined()
  await ui.unmount()
})

test('rule: a stop while the card is up and a check runs leaves the card; the flag does not replace it', async ($, on) => {
  session(on)
  quietBand(on)
  on('session.cwd', () => ({ value: '/tmp/x' }))
  mock.clock(on)
  let calls = 0
  on('model.fork', () => {
    calls += 1
    return { value: { isAnswered: true, text: calls === 1 ? BRIEF('The card.') : watchAnswer('A flag from the watch.'), usage: USAGE } }
  })
  const release = heldCheck(on, () => CHECKED('Checked and standing.'))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  const check = ui.press({ key: 'check' })
  await $.turn.complete(stop('t1'))
  expect(await ui.find({ type: 'Text', text: /The card\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /A flag from the watch/ })).toBeUndefined()
  release()
  await check
  expect(await ui.find({ type: 'Text', text: /Checked and standing/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /A flag from the watch/ })).toBeUndefined()
  await ui.unmount()
})

test('rule: the status names each kind of work, and a stop or a question marks the row', async ($, on) => {
  session(on)
  quietBand(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: watchAnswer(null), usage: USAGE } }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: '' }))
  const status = async (text: RegExp, glyph: string) => {
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
    expect(await ui.find({ type: 'Text', text })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: new RegExp(`^${glyph} $`) })).toBeDefined()
    await ui.unmount()
  }
  await $.turn.start({ turnId: 't1', prompt: 'go', messageCount: 1 } as never)
  await status(/^thinking$/, '◇')
  await $.tool.call({ tool: 'Read', file_path: '/a/notes.md' })
  await status(/^reading notes\.md$/, '◇')
  await $.tool.call({ tool: 'Grep', pattern: 'x' } as never)
  await status(/^searching files$/, '◇')
  await $.tool.call({ tool: 'mcp__agentsview__search_content', query: 'x' } as never)
  await status(/^using agentsview$/, '◇')
  await $.turn.complete(stop('t1', 'Which one do you want?'))
  await status(/^asking you$/, '◆')
  await $.turn.complete(stop('t2', 'Done.'))
  await status(/^stopped, waiting on you$/, '◆')
  await $.turn.complete(stop('t3', '', true))
  await status(/^stopped by you$/, '◇')
})

// Another mod drawing in the strip, switchable from the test.
const otherMod = (on: On) => {
  const other = { draws: true }
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return other.draws ? <Text key="other">You should know · a note from another mod</Text> : <></>
  })
  return other
}

test('rule: the note waits while another mod draws beneath, and shows once the strip is free', async ($, on) => {
  session(on)
  const other = otherMod(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: watchAnswer('The agent skipped the tests.'), usage: USAGE } }))
  await $.turn.complete(stop('t1'))
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /a note from another mod/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /skipped the tests/ })).toBeUndefined()
  expect(await ui.find({ key: 'fine' })).toBeUndefined()
  await ui.unmount()
  other.draws = false
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /skipped the tests/ })).toBeDefined()
  expect((await ui.find({ key: 'fine' }))?.props.hotkey).toBe('2')
  await ui.unmount()
})

test('rule: the digit hotkeys leave the row while another mod draws, and come back after', async ($, on) => {
  session(on)
  const other = otherMod(on)
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBeUndefined()
  expect((await ui.find({ key: 'tell' }))?.props.hotkey).toBeUndefined()
  await ui.unmount()
  other.draws = false
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBe('1')
  expect((await ui.find({ key: 'tell' }))?.props.hotkey).toBe('2')
  await ui.unmount()
})

test('rule: the store keeps only the newest SESSIONS_MAX sessions', async ($, on) => {
  // The test's own store, so it can read back what the rep saved.
  const store: Record<string, unknown> = { sessions: {} }
  const old = store.sessions as Record<string, unknown>
  for (let i = 0; i < SESSIONS_MAX; i++) old[`s${i}`] = { id: `s${i}`, at: 1000 + i, reading: null, owner: [], past: [], seen: [], others: [] }
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('store.set', ($, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  on('session.id', () => ({ value: 'test-session' }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  quietBand(on)
  await $.prompt.submit(typed('a prompt from the newest session'))
  const kept = store.sessions as Record<string, { owner: string[] }>
  expect(Object.keys(kept)).toHaveLength(SESSIONS_MAX)
  expect(kept['test-session']?.owner).toEqual(['a prompt from the newest session'])
  expect(kept.s0).toBeUndefined()
  expect(kept.s1).toBeDefined()
})

// --- The card fits the band's rows, so its buttons are always where a digit reaches them. ---

const LONG = (word: string) => Array.from({ length: 30 }, (_, i) => `${word} sentence number ${i + 1} of the model's text.`).join(' ')

test('fitCard folds the body in order, never the buttons, until the card fits the rows', async () => {
  const card = {
    reading: LONG('Goal'),
    revised: 'Reading revised at 3:12 pm: he asked for the tests as well as the README.',
    well: '',
    stands: LONG('Stands'),
    means: LONG('Means'),
    leftOut: ['one thing left out', 'another thing left out', 'a third'],
    next: LONG('Next'),
    checked: null,
    isChecking: false,
    checkNote: '',
    checkCost: 'Check it starts a separate read-only run. The first one measured used 210k fresh tokens plus 2.3 million re-read from cache, in 2 minutes.',
    message: LONG('Message'),
    does: 'Makes the agent prove it.',
    spent: '3 looks',
  }
  expect(cardRows(card, 96)).toBeGreaterThan(40)
  for (const rows of [40, 20, 12, 8, 6]) {
    const c = fitCard(card, rows, 96)
    expect(cardRows(c, 96)).toBeLessThanOrEqual(rows)
    expect(c.message).not.toBe('')
  }
  // At twelve rows the spend line and the "does" line go first, the lists fold, the message keeps a row.
  const twelve = fitCard(card, 12, 96)
  expect(twelve.spent).toBe('')
  expect(twelve.does).toBe('')
  // The revision line outlasts the parts that restate the agent's work.
  expect(twelve.revised).toMatch(/^Reading revised at 3:12 pm/)
  expect(fitCard(card, 6, 96).revised).toBe('')
  expect(twelve.leftOut).toHaveLength(1)
  expect(twelve.leftOut[0]).toMatch(/one thing left out; another/)
  expect(twelve.stands).toMatch(/…$/)
  expect(twelve.message).toMatch(/^Message sentence number 1/)
  // A card that fits is left alone.
  const small = { ...card, reading: 'Short.', stands: 'Short.', means: 'Short.', next: 'Short.', message: 'Short.', leftOut: [] }
  expect(fitCard(small, 40, 96)).toEqual(small)
})

test('rule: with few rows in the band the card still draws its buttons and folds the body', async ($, on) => {
  session(on)
  quietBand(on)
  on('model.fork', () => ({
    value: {
      isAnswered: true,
      text: `reading: ${LONG('Goal')}\nwell:\nstands: ${LONG('Stands')}\nmeans: ${LONG('Means')}\nleft:\n- one thing\n- another\nnext: ${LONG('Next')}\nmessage:\n${LONG('Message')}\nend\ndoes: Makes the agent prove it.`,
      usage: USAGE,
    },
  }))
  const narrow = { ...BAND, props: { ...BAND.props, maxRows: 8, scroll: { offset: 0, bodyRows: 7 } } }
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...narrow })
  await ui.press({ key: 'rep' })
  expect((await ui.find({ key: 'close' }))?.props.hotkey).toBe('2')
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  expect(await ui.find({ type: 'Text', text: /Means sentence number 30/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Message sentence number 1/ })).toBeDefined()
  const texts = (await ui.findAll({ type: 'Text' })).map(t => t.text ?? '')
  const longest = Math.max(...texts.map(t => t.length))
  expect(longest).toBeLessThan(96 * 3)
  // The digit closes the card: the row is back.
  await ui.press({ key: 'close' })
  expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBe('1')
  await ui.unmount()
})

// --- The brief judges against the sum of the owner's messages, and calls a session long only by a figure. ---

test('the brief carries the whole-ask rule, the size as a figure, and the green line tied to the sum', async () => {
  const m = { reading: null, owner: ['make this serious, with many tests', 'now just add a licence'], past: [], seen: [], others: [] }
  const p = briefPrompt({ ...m, context: { tokens: 242500, window: 500000, percent: 48 } })
  expect(p).toMatch(/His messages on a job add up/)
  expect(p).toMatch(/Not written yet\. Write it now/)
  expect(p).toMatch(/48 percent of its window \(243k of 500k tokens\), which is not long/)
  expect(p).toMatch(new RegExp(`long only past ${LONG_SESSION_PERCENT} percent`))
  expect(p).toMatch(/well: <only when nothing in the reading is still outstanding/)
  expect(p).toMatch(/means: <.*measured against the whole result/)
  expect(p).toMatch(/never started/)
  expect(contextLine(m)).toBe('not known')
  expect(contextLine({ ...m, context: { tokens: 400000, window: 500000, percent: 80 } })).toMatch(/80 percent.*which is long$/)
})

test('rule: pressing Rep gives the model the session size the engine reports', async ($, on) => {
  session(on)
  quietBand(on)
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 242500, window: 500000, percent: 48 }, rateLimits: [] } }))
  let prompt = ''
  on('model.fork', ($, e) => {
    prompt = String(e.prompt)
    return { value: { isAnswered: true, text: BRIEF('Fine.'), usage: USAGE } }
  })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(prompt).toMatch(/48 percent of its window \(243k of 500k tokens\)/)
  expect(await ui.find({ type: 'Text', text: /conversation at 48 percent of its window/ })).toBeDefined()
  await ui.unmount()
})

// --- The remaining hook paths: helpers, the prompt box, the goal field, the check's failures, the session's end. ---

test('rule: a helper the agent starts is counted in the status until its turn completes', async ($, on) => {
  session(on)
  quietBand(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: watchAnswer(null), usage: USAGE } }))
  on('agent.spawn', () => ({ model: 'm', agentId: 'helper-1' }))
  on('tool.call', () => ({ result: '' }))
  await $.agent.spawn({ tool_use_id: 'tu1', prompt: 'look into x', description: 'a helper', subagentType: 'general-purpose', provider: { kind: 'model', model: 'm' } } as never)
  await $.tool.call({ tool: 'Read', file_path: '/a/b.md' })
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^reading b\.md, 1 helper running$/ })).toBeDefined()
  await ui.unmount()
  await $.turn.complete({ ...stop('h1'), agentId: 'helper-1' })
  await $.tool.call({ tool: 'Read', file_path: '/a/c.md' })
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^reading c\.md$/ })).toBeDefined()
  await ui.unmount()
})

// A card with a message, ready for the prompt-box tests.
const cardUp = async ($: Engine, on: On, toasts: string[]) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.toast', ($, e) => {
    toasts.push(String(e.text))
    return { value: undefined }
  })
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF('The card.'), usage: USAGE } }))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ key: 'put' })).toBeDefined()
  return ui
}

test('rule: the message is not put into a prompt box that has text in it', async ($, on) => {
  const toasts: string[] = []
  let filled = ''
  on('prompt.read', () => ({ value: { text: 'half-typed', cursor: 4 } }))
  on('prompt.fill', ($, e) => {
    filled = e.text
    return { isFilled: true }
  })
  const ui = await cardUp($, on, toasts)
  await ui.press({ key: 'put' })
  expect(toasts.some(t => /prompt box has text in it/.test(t))).toBe(true)
  expect(filled).toBe('')
  expect(await ui.find({ key: 'put' })).toBeDefined()
  await ui.unmount()
})

test('rule: a prompt box that refuses the fill is reported, and one that takes it closes the card', async ($, on) => {
  const toasts: string[] = []
  let refused = true
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('prompt.fill', () => (refused ? { isFilled: false, refusal: 'dialog' } : { isFilled: true }))
  const ui = await cardUp($, on, toasts)
  await ui.press({ key: 'put' })
  // The engine keeps a refusal's cause to itself (a hook's own is stripped), so the plain wording is what shows here.
  expect(toasts.some(t => /The prompt box did not take the message/.test(t))).toBe(true)
  expect(await ui.find({ key: 'put' })).toBeDefined()
  refused = false
  await ui.press({ key: 'put' })
  expect(toasts.some(t => /The message is in your prompt box/.test(t))).toBe(true)
  expect(await ui.find({ key: 'put' })).toBeUndefined()
  expect((await ui.find({ key: 'rep' }))?.props.hotkey).toBe('1')
  await ui.unmount()
})

test('rule: Tell the rep puts the prefix in the prompt box, from the row and from the card', async ($, on) => {
  let filled = ''
  session(on)
  quietBand(on)
  on('prompt.read', () => ({ value: { text: '', cursor: 0 } }))
  on('prompt.fill', ($, e) => {
    filled = e.text
    return { isFilled: true }
  })
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF('The card.'), usage: USAGE } }))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'tell' })
  expect(filled).toBe('Owner rep: ')
  filled = ''
  await ui.press({ key: 'rep' })
  expect((await ui.find({ key: 'tell' }))?.props.hotkey).toBe('4')
  await ui.press({ key: 'tell' })
  expect(filled).toBe('Owner rep: ')
  await ui.unmount()
})

// A card with the check pressed, the check's run answered by `spawn`.
const checkWith = async ($: Engine, on: On, spawn: () => AsyncGenerator<unknown, unknown>) => {
  session(on)
  quietBand(on)
  on('session.cwd', () => ({ value: '/tmp/x' }))
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF('The card.'), usage: USAGE } }))
  on('process.spawn', spawn as never)
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  return ui
}

test('rule: a check that prints no result says it could not run, with the exit code and the last error line', async ($, on) => {
  mock.clock(on)
  const ui = await checkWith($, on, async function* () {
    yield { stream: 'stderr', text: 'claude: not logged in\n' }
    return { value: { code: 2, signal: null } }
  })
  await ui.press({ key: 'check' })
  expect(await ui.find({ type: 'Text', text: /The check could not run \(exit 2\): claude: not logged in\./ })).toBeDefined()
  expect(await ui.find({ key: 'check' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /The card\./ })).toBeDefined()
  await ui.unmount()
})

test('rule: a check that outlasts its five minutes is stopped and says so', async ($, on) => {
  const clock = mock.clock(on)
  let kill: () => void = () => undefined
  const ui = await checkWith($, on, async function* () {
    // A run that never prints; it ends only when the rep's timeout kills it.
    await new Promise<void>(r => (kill = r))
    return { value: { code: null, signal: 'SIGTERM' } }
  })
  const press = ui.press({ key: 'check' })
  await clock.advance(CHECK_TIMEOUT_MS + 1)
  kill()
  await press
  expect(await ui.find({ type: 'Text', text: /ran out of time \(five minutes\) and was stopped/ })).toBeDefined()
  await ui.unmount()
})

test('rule: a check whose run cannot start reports the failure on the card', async ($, on) => {
  mock.clock(on)
  const ui = await checkWith($, on, async function* () {
    throw new Error('spawn refused by policy')
  })
  await ui.press({ key: 'check' })
  expect(await ui.find({ type: 'Text', text: /The check failed: / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /The card\./ })).toBeDefined()
  await ui.unmount()
})

test('rule: the session end saves the record, so the next session finds the reading and the owner\'s messages', async ($, on) => {
  const store: Record<string, unknown> = {}
  let saves = 0
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('store.set', ($, e) => {
    store[e.key] = e.value
    if (e.key === 'sessions') saves += 1
    return { value: undefined }
  })
  on('session.id', () => ({ value: 'test-session' }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('model.fork', () => ({ value: { isAnswered: true, text: 'reading: The reading kept across sessions.\nmoved: first reading\nstate: stopped\nflag: none', usage: USAGE } }))
  quietBand(on)
  await $.prompt.submit(typed('build the thing'))
  await $.turn.complete(stop('t1'))
  await (await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })).unmount()
  const savesBefore = saves
  await $.session.end({ reason: 'other', sessionId: 'test-session', resume: { id: 'test-session' } } as never)
  expect(saves).toBe(savesBefore + 1)
  const rec = (store.sessions as Record<string, { at: number; reading: { text: string } | null; owner: string[] }>)['test-session']
  expect(rec?.reading?.text).toBe('The reading kept across sessions.')
  expect(rec?.owner).toEqual(['build the thing'])
})

// --- The held reading: the rep's own account of what the owner wants, kept for the job and moved only by his words. ---

// A watch answer that proposes a reading, with its cause.
const reads = (text: string, cause = '') => `reading: ${text}\n${cause === '' ? '' : `moved: ${cause}\n`}state: stopped\nflag: none`
const HOLDS = 'reading: holds\nstate: stopped\nflag: none'

// The strip drawn and taken down, so a look the hook started settles.
const settle = async ($: Engine) => (await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })).unmount()

test('rule: the reading is kept when the answer says it holds, and the row shows only its first sentence', async ($, on) => {
  session(on)
  quietBand(on)
  let answer = reads('A public project employers can inspect as careful work. Right now that means the README.', 'first reading')
  on('model.fork', () => ({ value: { isAnswered: true, text: answer, usage: USAGE } }))
  await $.prompt.submit(typed('make this a serious public repository; start with the README'))
  await $.turn.complete(stop('t1'))
  await settle($)
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · A public project employers can inspect as careful work\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Right now that means/ })).toBeUndefined()
  await ui.unmount()
  answer = HOLDS
  await $.turn.complete(stop('t2'))
  await settle($)
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · A public project employers can inspect as careful work\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /holds/ })).toBeUndefined()
  // The card shows the whole reading and no revision line.
  answer = BRIEF('Fine.').replace('reading: A judge mod.', 'reading: holds')
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /Right now that means the README\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Reading revised|New job since/ })).toBeUndefined()
  await ui.unmount()
})

test("rule: the agent's words never move the reading; one of the owner's does, and the card says so", async ($, on) => {
  session(on)
  quietBand(on)
  let answer = reads('The first reading.', 'first reading')
  on('model.fork', () => ({ value: { isAnswered: true, text: answer, usage: USAGE } }))
  await $.prompt.submit(typed('build the strip'))
  await $.turn.complete(stop('t1'))
  await settle($)
  // The agent worked on and the model proposes a revision; nothing new from the owner: refused.
  answer = reads('A revision the agent talked the model into.', 'the agent finished the strip and moved to tests')
  await $.turn.complete(stop('t2'))
  await settle($)
  let ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · The first reading\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /talked the model into/ })).toBeUndefined()
  await ui.unmount()
  // The owner corrects: the same revision is now taken, with its cause on the card.
  await $.prompt.submit(typed('also the tests, as many as possible'))
  answer = reads('The strip and as many tests as possible. Right now that means the tests.', 'he asked for the tests as well')
  await $.turn.complete(stop('t3'))
  await settle($)
  ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · The strip and as many tests as possible\.$/ })).toBeDefined()
  answer = BRIEF('Fine.').replace('reading: A judge mod.', 'reading: holds')
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /^Reading revised at \d+:\d\d [ap]m: he asked for the tests as well$/ })).toBeDefined()
  await ui.unmount()
})

test("rule: a new job closes the old reading; the earlier job's messages leave the brief and its reading is listed as closed", async ($, on) => {
  session(on)
  quietBand(on)
  const prompts: string[] = []
  let answer = reads('The strip reads plainly in every state.', 'first reading')
  on('model.fork', ($, e) => {
    prompts.push(String(e.prompt))
    return { value: { isAnswered: true, text: answer, usage: USAGE } }
  })
  await $.prompt.submit(typed('fix the strip so it never shows code'))
  await $.turn.complete(stop('t1'))
  await settle($)
  await $.prompt.submit(typed('that is done; now a licence file with the full MIT text'))
  answer = reads('A licence file with the full MIT text, so the repository is usable.', 'new job: he closed the strip work and asked for the licence')
  await $.turn.complete(stop('t2'))
  await settle($)
  answer = BRIEF('Fine.').replace('reading: A judge mod.', 'reading: holds')
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /^Owner rep · A licence file with the full MIT text, so the repository is usable\.$/ })).toBeDefined()
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /^New job since \d+:\d\d [ap]m: new job: he closed the strip work/ })).toBeDefined()
  await ui.unmount()
  const last = prompts[prompts.length - 1] ?? ''
  const onJob = last.slice(last.indexOf('His own messages on this job'), last.indexOf('Jobs before this one'))
  expect(onJob).toMatch(/- that is done; now a licence file/)
  expect(onJob).not.toMatch(/fix the strip so it never shows code/)
  expect(last).toMatch(/Jobs before this one[^]*- The strip reads plainly in every state\./)
})

test('rule: while the rep reads, the row says so and a second press starts no second read', async ($, on) => {
  session(on)
  quietBand(on)
  let forks = 0
  let release: () => void = () => undefined
  on('model.fork', async () => {
    forks += 1
    await new Promise<void>(r => (release = r))
    return { value: { isAnswered: true, text: BRIEF('The card.'), usage: USAGE } }
  })
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  const press = ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /^reading the whole session…$/ })).toBeDefined()
  await ui.press({ key: 'rep' })
  expect(forks).toBe(1)
  release()
  await press
  expect(await ui.find({ type: 'Text', text: /The card\./ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /reading the whole session/ })).toBeUndefined()
  await ui.unmount()
})

test('rowsOf counts rows as the band wraps them, at words', () => {
  // Three words of five in nine cells: a row ends where the next word would not fit.
  expect(rowsOf('aaaaa bbbbb ccccc', 9)).toBe(3)
  expect(Math.ceil('aaaaa bbbbb ccccc'.length / 9)).toBe(2)
  // A word longer than the width breaks across rows; a paragraph break starts a row.
  expect(rowsOf('a'.repeat(25), 10)).toBe(3)
  expect(rowsOf('one\ntwo', 40)).toBe(2)
  expect(rowsOf('', 40)).toBe(0)
})

test('rule: when the checked card folds, the claims that hold become a count before the failed ones go', async ($, on) => {
  session(on)
  quietBand(on)
  on('session.cwd', () => ({ value: '/tmp/x' }))
  mock.clock(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF(LONG('Stands')), usage: USAGE } }))
  on('process.spawn', async function* () {
    yield {
      stream: 'stdout',
      text: JSON.stringify({
        type: 'result',
        result: `holds:\n- the file exists\nfalse:\n- the tests passed; two fail\nnotshown:\n- the live run\nchanged:\n- the helper finished\nstands: ${LONG('Checked')}\nmeans:\nleft:\n- nothing\nnext:\nmessage:\nend\ndoes:\nlooked: Read the record.`,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      }),
    }
    return { value: { code: 0, signal: null } }
  })
  // One row short of the whole list: the holding claim folds to a count, the three that failed stay.
  const narrow = { ...BAND, props: { ...BAND.props, maxRows: 14, scroll: { offset: 0, bodyRows: 13 } } }
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...narrow })
  await ui.press({ key: 'rep' })
  await ui.press({ key: 'check' })
  expect(await ui.find({ type: 'Text', text: /^Checked: 1 hold\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /the file exists/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /the tests passed; two fail/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /the live run/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /the helper finished/ })).toBeDefined()
  expect((await ui.find({ key: 'close' }))?.props.hotkey).toBe('2')
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  await ui.unmount()
})

test('rule: the checked card folds its lists to counts on a small band and keeps its buttons', async ($, on) => {
  session(on)
  quietBand(on)
  on('session.cwd', () => ({ value: '/tmp/x' }))
  mock.clock(on)
  on('model.fork', () => ({ value: { isAnswered: true, text: BRIEF(LONG('Stands')), usage: USAGE } }))
  on('process.spawn', async function* () {
    yield {
      stream: 'stdout',
      text: JSON.stringify({
        type: 'result',
        result: `holds:\n- the file exists\nfalse:\n- the tests passed; two fail\nnotshown:\n- the live run\nchanged:\n- the helper finished\nstands: ${LONG('Checked')}\nmeans:\nleft:\n- nothing\nnext:\nmessage:\nend\ndoes:\nlooked: Read the record.`,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      }),
    }
    return { value: { code: 0, signal: null } }
  })
  const narrow = { ...BAND, props: { ...BAND.props, maxRows: 12, scroll: { offset: 0, bodyRows: 11 } } }
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...narrow })
  await ui.press({ key: 'rep' })
  await ui.press({ key: 'check' })
  expect(await ui.find({ type: 'Text', text: /^Checked: 1 hold, 1 false, 1 not shown, 1 changed since\.$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /the tests passed; two fail/ })).toBeUndefined()
  expect((await ui.find({ key: 'close' }))?.props.hotkey).toBe('2')
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  expect(await ui.find({ key: 'check' })).toBeUndefined()
  await ui.unmount()
})

test('rule: the watch looks every CHECK_EVERY model requests of a turn, through turn.step', async ($, on) => {
  session(on)
  quietBand(on)
  let forks = 0
  on('model.fork', () => {
    forks += 1
    return { value: { isAnswered: true, text: watchAnswer(null), usage: USAGE } }
  })
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  const step = async (index: number) => {
    const stream = $.turn.step({ turnId: 't1', index, model: 'm', messageCount: index + 1 })
    for await (const _ of stream) {
      // The step's chunks are the engine's; the hook passes them on.
    }
    await settle($)
  }
  for (let i = 0; i < CHECK_EVERY; i++) await step(i)
  expect(forks).toBe(0)
  await step(CHECK_EVERY)
  expect(forks).toBe(1)
  await step(CHECK_EVERY + 1)
  expect(forks).toBe(1)
  await step(CHECK_EVERY * 2)
  expect(forks).toBe(2)
  expect(watchPrompt({ reading: null, owner: [], past: [], seen: [], others: [] }, 'step')).toMatch(/in the middle of working/)
})

// Two looks in flight at once, one from a stop and one from a note, released in
// the given order: the one that saw the note wins either way.
const raceTest = (noteFirst: boolean) =>
  test(`rule: a look that lands late cannot take a newer look's place (${noteFirst ? 'note' : 'stop'} answers first)`, async ($, on) => {
    const store: Record<string, unknown> = {}
    let onSave: (() => void) | null = null
    on('store.get', ($, e) => ({ value: store[e.key] }))
    on('store.set', ($, e) => {
      store[e.key] = e.value
      if (e.key === 'sessions') onSave?.()
      return { value: undefined }
    })
    on('session.id', () => ({ value: 'race' }))
    on('turn.complete', () => ({ text: '' }))
    on('prompt.submit', ($, e) => ({ text: e.text }))
    on('ui.toast', () => ({ value: undefined }))
    on('prompt.fill', () => ({ isFilled: true }))
    quietBand(on)
    mock.clock(on)
    // The first look writes the reading at once; the two that race are held open.
    const held: Array<{ release: () => void; seesNote: boolean }> = []
    let onHeld: (() => void) | null = null
    let forks = 0
    on('model.fork', async ($, e) => {
      forks += 1
      if (forks === 1) return { value: { isAnswered: true, text: reads('The README alone.', 'first reading'), usage: USAGE } }
      const seesNote = /- \(to the rep\) the tests matter most/.test(String(e.prompt))
      await new Promise<void>(release => {
        held.push({ release, seesNote })
        onHeld?.()
      })
      return { value: { isAnswered: true, text: reads(seesNote ? 'The tests matter most; the licence can wait.' : 'The README and a licence file.', seesNote ? 'his note put the tests first' : 'he asked for a licence'), usage: USAGE } }
    })
    await $.prompt.submit(typed('a README'))
    await $.turn.complete(stop('t1'))
    await settle($)
    // The licence message; its stop's look has read the record and is at the
    // model when the note arrives, so the two looks saw different messages.
    await $.prompt.submit(typed('now a licence file'))
    const stopHeld = new Promise<void>(r => (onHeld = r))
    const stopLook = $.turn.complete(stop('t2'))
    await stopHeld
    const noteHeld = new Promise<void>(r => (onHeld = r))
    const note = $.prompt.submit(typed('Owner rep: the tests matter most; the licence can wait'))
    await noteHeld
    expect(held.map(h => h.seesNote)).toEqual([false, true])
    const [releaseStop, releaseNote] = held.map(h => h.release) as [() => void, () => void]
    const release = async (r: () => void) => {
      const saved = new Promise<void>(done => (onSave = done))
      r()
      await saved
    }
    await release(noteFirst ? releaseNote : releaseStop)
    await release(noteFirst ? releaseStop : releaseNote)
    await stopLook
    await note
    await settle($)
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
    expect(await ui.find({ type: 'Text', text: /^Owner rep · The tests matter most; the licence can wait\.$/ })).toBeDefined()
    await ui.unmount()
    const rec = (store.sessions as Record<string, { reading: { from: number; cause: string } }>).race
    expect(rec?.reading.cause).toBe('his note put the tests first')
    expect(rec?.reading.from).toBe(3)
  })
raceTest(true)
raceTest(false)
