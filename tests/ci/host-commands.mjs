// Runs the commands the mod runs, built by the mod's own builders in hooks/rep.ts and named
// for this system by its own hostArgv, against a scratch folder of fixtures, and reads each
// answer with the mod's own parsers. A test of the kit stubs `$.process.run`, so only a run
// like this one shows that the argv the mod builds is one this system's programs take and
// that what they print is what the mod reads. Run by GitHub on Ubuntu, macOS and Windows:
//
//   node --experimental-strip-types tests/ci/host-commands.mjs
//
// On Windows the commands are Git for Windows' coreutils, found as the mod finds them
// (lookUpHost in hooks/register.tsx: the first candidate whose `mkdir.exe --version` exits 0).
// The transcript reads must pass on every system. The check's commands must pass on macOS and
// Linux; on Windows one that does not is reported as skipped, with what it printed, because
// the check never starts there (CHECK_NO_ROOM in hooks/rep.ts).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// hooks/rep.ts sits in a folder with no package.json saying it is a module, so Node warns
// once on importing it. The warning says nothing about the mod; it is dropped so the step's
// output is the checks alone.
const emitWarning = process.emitWarning
process.emitWarning = function (warning, ...rest) {
  const code = typeof rest[0] === 'object' && rest[0] !== null ? rest[0].code : rest[1]
  if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return
  return emitWarning.call(process, warning, ...rest)
}

const {
  PATH_HOST,
  WINDOWS_OS,
  hostArgv,
  slashed,
  winPosixBinCandidates,
  windowsOs,
  humanRead,
  humanItems,
  humanReadBefore,
  startFind,
  summaryStart,
  toolLineFind,
  toolLineOf,
  summaryLineFind,
  wholeArgv,
  wholeAnswer,
  gitUpArgv,
  gitInsideArgv,
  worktreesArgv,
  gitFoldersOf,
  worktreeDirsOf,
  pathLinksArgv,
  copyArgvs,
} = await import(new URL('../../hooks/rep.ts', import.meta.url).href)

const env = process.env
const onWindows = windowsOs(env.OS ?? '', env.SystemRoot ?? '', env.windir ?? '', process.cwd()) === WINDOWS_OS
// A path as the mod writes it on this system: on Windows with forward slashes.
const local = p => (onWindows ? slashed(p) : p)
const plain = s => (s ?? '').replace(/\r/g, '')

const SUMMARY_ID = '0123abcd-0000-4000-8000-00000000cafe'
const TOOL_ID = 'toolu_01HOSTCHECK'
const FIRST = 'Create a file named hello.txt in this folder that says hello.'

let total = 0
let passed = 0
let skipped = 0
let failed = 0

function run(argv) {
  const r = spawnSync(argv[0], argv.slice(1), { encoding: 'utf8', shell: false, timeout: 30000 })
  return { argv, status: r.status, signal: r.signal, error: r.error, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}

function report(r) {
  console.log(`  argv: ${JSON.stringify(r.argv)}`)
  console.log(`  exit: ${r.status}${r.signal ? ` (signal ${r.signal})` : ''}${r.error ? ` (${r.error.message})` : ''}`)
  console.log(`  stdout: ${JSON.stringify(r.stdout)}`)
  console.log(`  stderr: ${JSON.stringify(r.stderr)}`)
}

// One answer judged: `ok <name>`, or the failure with the argv, its exit code, stdout and
// stderr. `mayFailOnWindows` marks a command of the check, which on Windows is skipped
// rather than failed.
function judge(name, r, ok, mayFailOnWindows = false) {
  total += 1
  let good = false
  let threw = ''
  try {
    good = r.error === undefined && ok(r) === true
  } catch (e) {
    threw = String(e)
  }
  if (good) {
    passed += 1
    console.log(`ok ${name}`)
    return true
  }
  if (mayFailOnWindows && onWindows) {
    skipped += 1
    console.log(`skipped on Windows: the check is refused there: ${name}`)
    report(r)
    return false
  }
  failed += 1
  console.log(`FAIL ${name}${threw === '' ? '' : `: ${threw}`}`)
  report(r)
  return false
}

const check = (name, argv, ok, mayFailOnWindows = false) => {
  const r = run(argv)
  judge(name, r, ok, mayFailOnWindows)
  return r
}

// A sign of the system, judged with no command run.
function sign(name, ok) {
  judge(name, { argv: [], status: 0, signal: null, error: undefined, stdout: '', stderr: '' }, () => ok)
}

const keysOf = stdout => humanItems(stdout).map(i => i.key)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lines = stdout => plain(stdout).split('\n').filter(l => l.trim() !== '')

function hostOfThisSystem() {
  if (!onWindows) return { host: PATH_HOST, label: 'PATH' }
  const tried = []
  for (const bin of winPosixBinCandidates(env.PROGRAMFILES, env['ProgramFiles(x86)'], env.LOCALAPPDATA)) {
    const r = run([`${bin}/mkdir.exe`, '--version'])
    if (r.status === 0) return { host: { os: WINDOWS_OS, posixBin: bin, claude: '' }, label: bin }
    tried.push(r)
  }
  console.log('FAIL no Git coreutils answered')
  tried.forEach(report)
  return null
}

function main() {
  const found = hostOfThisSystem()
  if (found === null) return 1
  const { host, label } = found
  const scratch = local(fs.mkdtempSync(path.join(os.tmpdir(), 'owner-rep-host-')))
  try {
    // The transcripts, as Claude Code writes them: one JSON object a line, each ended by
    // '\n'. A Windows checkout may give the fixtures '\r\n' ends, which no transcript has.
    const fixture = name => fs.readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8').replace(/\r\n/g, '\n')
    const config = `${scratch}/config`
    const folder = `${config}/projects/p1`
    const file = `${folder}/aaaa-bbbb.jsonl`
    const parent = `${folder}/parent.jsonl`
    const copyOfParent = `${folder}/cccc-dddd.jsonl`
    fs.mkdirSync(folder, { recursive: true })
    // The parent first, then the copy that begins at its summary, then the session's own
    // file, each given an older time than the next, so `ls -t` lists the session's first.
    const now = Date.now() / 1000
    fs.writeFileSync(parent, fixture('parent.jsonl'))
    fs.utimesSync(parent, now - 20, now - 20)
    fs.writeFileSync(copyOfParent, fixture('parent.jsonl').split('\n').slice(1).join('\n'))
    fs.utimesSync(copyOfParent, now - 10, now - 10)
    fs.writeFileSync(file, fixture('session.jsonl'))
    fs.utimesSync(file, now, now)
    // A git-like layout for the check's questions, and a command folder with one program.
    for (const f of [`${scratch}/copy/.git/HEAD`, `${scratch}/copy/sub/.git/HEAD`]) {
      fs.mkdirSync(path.dirname(f), { recursive: true })
      fs.writeFileSync(f, 'ref: refs/heads/main\n')
    }
    fs.mkdirSync(`${scratch}/copy/.git/worktrees/w1`, { recursive: true })
    fs.writeFileSync(`${scratch}/copy/.git/worktrees/w1/gitdir`, `${scratch}/w1/.git\n`)
    fs.mkdirSync(`${scratch}/path/bin`, { recursive: true })
    fs.writeFileSync(`${scratch}/path/bin/tool`, 'a regular file\n')

    // The transcript reads: what heldItems in hooks/register.tsx runs. Each must pass here.
    check('humanRead: his four messages in order, the queued one marked, the picture data blanked', hostArgv(host, humanRead(file)), r =>
      r.status === 0 &&
      same(keysOf(r.stdout), [FIRST, 'Here is the picture.', 'Also add a README.', 'Reply with the single word done.']) &&
      same(humanItems(r.stdout).map(i => i.queued), [false, false, true, false]) &&
      plain(r.stdout).includes('"data":""') &&
      !r.stdout.includes('AAAAAAAA'))
    check('startFind: a file that begins with a line he typed has no summary, line 1', hostArgv(host, startFind(file)), r =>
      r.status === 0 && summaryStart(r.stdout) === null && toolLineOf(r.stdout) === 1)
    check('startFind: a copy that begins at a summary names the summary line', hostArgv(host, startFind(copyOfParent)), r =>
      r.status === 0 && summaryStart(r.stdout) === SUMMARY_ID)
    check('toolLineFind: the tool call is on line 2', hostArgv(host, toolLineFind(file, TOOL_ID)), r =>
      r.status === 0 && toolLineOf(r.stdout) === 2)
    check('humanReadBefore: the lines before line 5 hold his first two messages', hostArgv(host, humanReadBefore(file, 5)), r =>
      r.status === 0 && same(keysOf(r.stdout), [FIRST, 'Here is the picture.']))
    check('summaryLineFind: the parent holds the summary line on line 2', hostArgv(host, summaryLineFind(parent, SUMMARY_ID)), r =>
      r.status === 0 && toolLineOf(r.stdout) === 2)
    check('humanReadBefore: the parent before its summary holds one message', hostArgv(host, humanReadBefore(parent, 2)), r =>
      r.status === 0 && same(keysOf(r.stdout), ['Before the summary.']))
    check('find: the session file found by name under the config folder', hostArgv(host, ['find', `${config}/projects`, '-maxdepth', '2', '-name', 'aaaa-bbbb.jsonl']), r =>
      r.status === 0 && lines(r.stdout).length === 1 && lines(r.stdout)[0].trim().endsWith('/p1/aaaa-bbbb.jsonl'))
    check('ls -t: the session file listed first', hostArgv(host, ['ls', '-t', folder]), r =>
      r.status === 0 && lines(r.stdout)[0]?.trim() === 'aaaa-bbbb.jsonl')

    // The check's commands: what gitRepos, pathLinks and makeCopy run. On Windows the check
    // is refused, so one that fails there is skipped with what it printed.
    const whole = argv => hostArgv(host, wholeArgv(host, argv))
    const answered = r => wholeAnswer({ stdout: r.stdout, isStdoutTruncated: false })
    const holds = (list, wanted) => wanted.every(w => list.includes(w))
    check('gitUpArgv: the .git in the folder and the one above it', whole(gitUpArgv([`${scratch}/copy/sub`])), r => {
      const a = answered(r)
      return a !== null && holds(gitFoldersOf(a), [`${scratch}/copy/sub/.git`, `${scratch}/copy/.git`])
    }, true)
    check('gitInsideArgv: both .git folders inside the copy', whole(gitInsideArgv(`${scratch}/copy`)), r => {
      const a = answered(r)
      return a !== null && holds(gitFoldersOf(a), [`${scratch}/copy/sub/.git`, `${scratch}/copy/.git`])
    }, true)
    check('worktreesArgv: the worktree the git folder lists', whole(worktreesArgv([`${scratch}/copy/.git`])), r => {
      const a = answered(r)
      return a !== null && same(worktreeDirsOf([], a), [`${scratch}/w1`])
    }, true)
    check('pathLinksArgv: the command folders asked to their end', whole(pathLinksArgv(`${scratch}/home`, `${scratch}/path/bin`)), r =>
      answered(r) !== null, true)
    check('mkdir -p: the copies folder made', hostArgv(host, ['mkdir', '-p', `${scratch}/made/deep`]), r =>
      r.status === 0 && fs.statSync(`${scratch}/made/deep`).isDirectory(), true)
    const target = `${scratch}/made/deep/c`
    const copied = () => fs.existsSync(`${target}/sub/.git/HEAD`)
    const [clone, plainCopy] = copyArgvs(host, `${scratch}/copy`, target)
    const cloned = run(clone)
    if (cloned.status === 0) {
      judge('copyArgvs: the clone made the copy', cloned, copied, true)
    } else {
      check(`copyArgvs: the clone refused (exit ${cloned.status}), the copy's folder made`, hostArgv(host, ['mkdir', target]), r => r.status === 0, true)
      check('copyArgvs: the plain copy made the copy', plainCopy, r => r.status === 0 && copied(), true)
    }
    check('rm -rf: the copies folder removed', hostArgv(host, ['rm', '-rf', `${scratch}/made`]), r =>
      r.status === 0 && !fs.existsSync(`${scratch}/made`), true)

    // The signs the mod reads Windows by (windowsOs), on the system that has them and on the
    // two that do not.
    if (process.platform === 'win32') {
      const drive = /^[A-Za-z]:[\\/]/
      sign('Windows: OS is Windows_NT', env.OS === WINDOWS_OS)
      sign('Windows: SystemRoot is a drive path', drive.test(env.SystemRoot ?? ''))
      sign('Windows: windir is a drive path', drive.test(env.windir ?? ''))
      sign('Windows: the working folder is a drive path', drive.test(process.cwd()))
      sign('Windows: SystemRoot alone reads as Windows', windowsOs('', env.SystemRoot ?? '', '', '') === WINDOWS_OS)
      sign('Windows: windir alone reads as Windows', windowsOs('', '', env.windir ?? '', '') === WINDOWS_OS)
      sign('Windows: the working folder alone reads as Windows', windowsOs('', '', '', process.cwd()) === WINDOWS_OS)
      sign('Windows: the home slashed has no backslash', (env.USERPROFILE ?? '') !== '' && !slashed(env.USERPROFILE).includes('\\'))
    } else {
      sign(`${process.platform}: OS is not set`, env.OS === undefined)
      sign(`${process.platform}: the four signs read as no Windows`, windowsOs(env.OS ?? '', env.SystemRoot ?? '', env.windir ?? '', process.cwd()) === '')
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }
  const answeredCount = total - skipped
  const where = `${process.platform} (${label})`
  const skips = skipped === 0 ? '' : `; ${skipped} of the check's commands skipped: the check is refused on Windows`
  const fails = failed === 0 ? '' : `; ${failed} did not`
  console.log(`host commands: ${passed} of ${answeredCount} answered as the mod expects on ${where}${fails}${skips}`)
  return failed === 0 ? 0 : 1
}

process.exitCode = main()
