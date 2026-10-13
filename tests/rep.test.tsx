import { expect, mock, test } from 'claude-code/testing'

import { doingFor, fit, parseBrief, parseWatch, same } from '../hooks/rep'

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
})

test('the row draws on both surfaces with the Rep button and a placeholder goal', async ($, on) => {
  mock.store(on, {})
  quietBand(on)
  on('session.id', () => ({ value: 'test-session' }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'owner-rep', surface, ...BAND })
    const button = await ui.find({ key: 'rep' })
    expect(button).toBeDefined()
    expect(button?.props.hotkey).toBe('r')
    expect(button?.props.action).toBe('app:toggleDiffPreSession')
    expect(await ui.find({ type: 'Text', text: /working out the result/ })).toBeDefined()
    expect(await ui.find({ key: 'put' })).toBeUndefined()
    await ui.unmount()
  }
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
  const ui = await $.ui.mount({ plugin: 'owner-rep', surface: 'terminal', ...BAND })
  await ui.press({ key: 'rep' })
  expect(await ui.find({ type: 'Text', text: /A judge mod that briefs you plainly/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Load the mod in a real session/ })).toBeDefined()
  expect((await ui.find({ key: 'put' }))?.props.hotkey).toBe('1')
  expect((await ui.find({ key: 'goal' }))?.props.hotkey).toBe('g')
  expect(await ui.find({ type: 'Text', text: /1 look/ })).toBeDefined()
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
