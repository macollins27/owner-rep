import { expect, mock, test } from 'claude-code/testing'

import { checkArgv, checkCostText, checkPrompt, doingFor, fit, goalTyped, parseBrief, parseCheck, parseWatch, resultOf, same, textOf } from '../hooks/rep'

const BAND = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 96, scroll: { offset: 0, bodyRows: 11 }, view: {} },
} as const

// In a session the engine draws nothing of its own in the band; a test says so
// with an empty tree beneath the plugins.
const quietBand = (on: Parameters<Parameters<typeof test>[1] extends (a: infer _A, b: infer B) => unknown ? (a: _A, b: B) => unknown : never>[1]) =>
  on('ui.render', { component: 'AbovePrompt' }, () => <></>)

const USAGE = { input_tokens: 10, output_tokens: 20, cache_read_input_tokens: 1000, cache_creation_input_tokens: 0 }

test('a watch answer with no flag parses to goal, state and no note', async () => {
  const a = parseWatch('goal: A mod that briefs you plainly, so you can oversee agents.\nstate: working\nflag: none\n')
  expect(a.goal).toBe('A mod that briefs you plainly, so you can oversee agents.')
  expect(a.state).toBe('working')
  expect(a.flag).toBe(null)
})

test('a watch answer with a flag parses the flag and the why', async () => {
  const a = parseWatch('goal: "The judge rebuilt."\nstate: stopped\nflag: The agent says the tests pass, but it never ran them.\nwhy: No test output appears after the last edit.')
  expect(a.goal).toBe('The judge rebuilt.')
  expect(a.state).toBe('stopped')
  expect(a.flag).toBe('The agent says the tests pass, but it never ran them.')
  expect(a.why).toBe('No test output appears after the last edit.')
})

test('a briefing parses every part, the message block whole, and "- nothing" as no items', async () => {
  const text = [
    'goal: The judge rebuilt so you can oversee agents.',
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
  expect(b.goal).toBe('The judge rebuilt so you can oversee agents.')
  expect(b.well).toBe('')
  expect(b.stands).toBe('The mod draws but was never run live.')
  expect(b.leftOut).toEqual(['the live run you asked for', 'the type check was skipped'])
  expect(b.message).toBe(
    'Before calling this done, load the mod in a real session.\nPress each button idle and mid-turn, and show me what appeared.',
  )
  expect(b.does).toBe('Makes the agent prove the mod live instead of moving on.')
  expect(parseBrief('goal: x\nwell: Going well.\nleft:\n- nothing\nmessage:\nend\ndoes:').leftOut).toEqual([])
})

test('helpers: fit cuts with an ellipsis, same ignores case and a final period, doingFor names the work', async () => {
  expect(fit('a long sentence here', 10)).toBe('a long se…')
  expect(fit('short', 10)).toBe('short')
  expect(same('The tests pass.', 'the tests pass')).toBe(true)
  expect(doingFor('Edit', { file_path: '/a/b/register.tsx' })).toBe('editing register.tsx')
  expect(doingFor('Bash', { command: 'git status --short' })).toBe('running git status')
  expect(doingFor('mcp__agentsview__search_content', {})).toBe('using agentsview')
  expect(doingFor('Agent', {})).toBe('starting a helper')
  expect(goalTyped('Owner rep goal: a judge that works')).toBe('a judge that works')
  expect(goalTyped('owner rep goal:')).toBe('')
  expect(goalTyped('fix the tests')).toBe(null)
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

test('a goal typed in the prompt box is pinned by the rep and dropped before the agent sees it', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('ui.toast', () => ({ value: undefined }))
  let reached = false
  on('prompt.submit', ($, e) => {
    reached = true
    return { text: e.text }
  })
  const result = await $.prompt.submit({ text: 'Owner rep goal: the judge rebuilt so you can oversee agents' })
  expect(reached).toBe(false)
  expect(result.drop).toMatch(/pinned/)
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /the judge rebuilt so you can oversee agents/ })).toBeDefined()
  await ui.unmount()
})

test('the checker: its prompt names the session, its tools are read-only, and its answer parses', async () => {
  const brief = parseBrief('goal: x\nstands: s\nmeans: m\nleft:\n- a\nnext: n\nmessage:\nhello\nend\ndoes: d')
  const prompt = checkPrompt({ sessionId: 'abc-123', cwd: '/tmp/x', goal: 'the result', owner: ['first ask'], brief })
  expect(prompt).toContain('abc-123')
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
  const c = parseCheck('holds:\n- the file exists\nfalse:\n- tests passed; the last run printed 2 failures\nnotshown:\n- nothing\nstands: Two tests fail.\nnext: Fix them.\nmessage:\nTwo tests fail. Fix them and show the run.\nend\ndoes: Makes it fix the tests.\nlooked: Read the record and ran the tests; could not open the helper logs.')
  expect(c.holds).toEqual(['the file exists'])
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
    expect(button?.props.action).toBe('app:toggleDiffPreSession')
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
  expect((await ui.find({ key: 'goal' }))?.props.hotkey).toBe('2')
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
    'goal: A judge mod that briefs you plainly.',
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
    result: 'holds:\n- nothing\nfalse:\n- the mod was run live; nothing in the record shows a run\nnotshown:\n- nothing\nstands: Written and never run.\nnext: Run it live.\nmessage:\nShow me the live run.\nend\ndoes: Makes the agent run it.\nlooked: Read the record; ran nothing.',
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
  expect(await ui.find({ type: 'Text', text: /Show me the live run/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 check/ })).toBeDefined()
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  expect((await ui.find({ key: 'goal' }))?.props.hotkey).toBe('4')
  expect(await ui.find({ type: 'Text', text: /1 look, 1 check/ })).toBeDefined()
  await ui.unmount()
})

test('a briefing that says the work is going well has no message and no put button', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  on('model.fork', () => ({ value: { isAnswered: true, text: 'goal: x\nwell: The agent is doing what you asked and showing it.\nleft:\n- nothing\nmessage:\nend\ndoes:', usage: USAGE } }))
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /doing what you asked/ })).toBeDefined()
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
