import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(root, 'frontend')
const independent = join(root, '.venv-independent')
const pythonIn = (folder) =>
  join(folder, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
const python = pythonIn(existsSync(pythonIn(independent)) ? independent : join(root, '.venv'))
const npmCli = join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const [command = 'help', ...options] = process.argv.slice(2)
const evidence = {
  started_at: new Date().toISOString(),
  node: process.version,
  python,
  checks: [],
}

function run(program, args, cwd = root) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(program, args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONUTF8: '1' },
    })
    child.once('error', reject)
    child.once('exit', (code, signal) =>
      code === 0 ? resolveResult() : reject(new Error(`${args.join(' ')}: exit ${code ?? signal}`)),
    )
  })
}
async function check(name, program, args, cwd = root) {
  console.log(`\n[${name}]`)
  const started = Date.now()
  try {
    await run(program, args, cwd)
    evidence.checks.push({
      name,
      status: 'passed',
      duration_ms: Date.now() - started,
    })
  } catch (error) {
    evidence.checks.push({
      name,
      status: 'failed',
      duration_ms: Date.now() - started,
    })
    throw error
  } finally {
    mkdirSync(join(root, '.local/validation'), { recursive: true })
    writeFileSync(join(root, '.local/validation/latest.json'), JSON.stringify(evidence, null, 2))
  }
}
function requireFile(path) {
  if (!existsSync(path)) throw new Error(`Arquivo necessário não encontrado: ${path}`)
}
function available(port) {
  return new Promise((yes, no) => {
    const socket = createServer()
    socket.once('error', () =>
      no(new Error(`Porta ${port} ocupada. Encerre o servidor anterior antes de iniciar.`)),
    )
    socket.listen({ port, host: '127.0.0.1', exclusive: true }, () => socket.close(yes))
  })
}
async function start() {
  if (options.some((option) => option !== '--preview'))
    throw new Error('Use start ou start --preview.')
  requireFile(python)
  const vite = join(frontend, 'node_modules/vite/bin/vite.js')
  requireFile(vite)
  const preview = options.includes('--preview')
  if (preview) requireFile(join(frontend, 'dist/index.html'))
  await Promise.all([available(8000), available(preview ? 4173 : 5173)])
  const children = []
  let stopping = false
  const stop = (code = 0) => {
    if (stopping) return
    stopping = true
    for (const child of children) if (child.exitCode === null) child.kill()
    process.exitCode = code
  }
  process.on('SIGINT', () => stop())
  process.on('SIGTERM', () => stop())
  for (const [exe, args, cwd] of [
    [
      python,
      [
        '-m',
        'uvicorn',
        'app.main:app',
        '--app-dir',
        'backend',
        '--host',
        '127.0.0.1',
        '--port',
        '8000',
      ],
      root,
    ],
    [process.execPath, [vite, ...(preview ? ['preview'] : []), '--host', '127.0.0.1'], frontend],
  ]) {
    const child = spawn(exe, args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONUTF8: '1' },
    })
    children.push(child)
    child.once('error', (error) => {
      console.error(error.message)
      stop(1)
    })
    child.once('exit', (code) => {
      if (!stopping) stop(code || 1)
    })
  }
  console.log(
    `NekoStrike: http://127.0.0.1:${preview ? 4173 : 5173}/#lab\nCtrl+C encerra os dois servidores.\nPython: ${python}`,
  )
}

try {
  if (command === 'setup') {
    if (options.length !== 2 || options[0] !== '--python')
      throw new Error('Use setup --python "caminho do python.exe".')
    if (existsSync(independent))
      throw new Error('.venv-independent já existe. Preservado; nenhuma instalação foi alterada.')
    if (existsSync(join(frontend, 'node_modules')))
      throw new Error(
        'node_modules já existe. Faça o setup em uma cópia limpa para preservar as dependências atuais.',
      )
    requireFile(npmCli)
    await run(options[1], [
      '-c',
      'import sys; assert sys.version_info[:2] == (3, 12), "Use Python 3.12"',
    ])
    await run(options[1], ['-m', 'venv', independent])
    await run(pythonIn(independent), [
      '-m',
      'pip',
      'install',
      '--disable-pip-version-check',
      '-r',
      join(root, 'backend/requirements.lock.txt'),
    ])
    await run(process.execPath, [npmCli, 'ci'], frontend)
    console.log('Instalação concluída. Execute: node scripts/workspace.mjs check')
  } else if (command === 'check') {
    if (options.length) throw new Error('check não recebe opções.')
    requireFile(python)
    requireFile(npmCli)
    await check('backend-tests', python, [
      '-m',
      'pytest',
      '-c',
      'backend/pytest.ini',
      'backend/tests',
    ])
    await check('python-dependencies', python, ['-m', 'pip', 'check'])
    await check('frontend-tests', process.execPath, [npmCli, 'test'], frontend)
    await check('frontend-build', process.execPath, [npmCli, 'run', 'build'], frontend)
    await check(
      'frontend-format',
      process.execPath,
      [
        npmCli,
        'exec',
        '--',
        'prettier',
        '--config',
        '.prettierrc.json',
        '--check',
        'src',
        'tests',
        'vite.config.ts',
        '../scripts',
      ],
      frontend,
    )
    await check('isolated-demo', python, ['backend/tools/smoke_demo.py'])
    console.log('\nValidação concluída. Evidências em .local/validation/.')
  } else if (command === 'backup') {
    if (options.length) throw new Error('backup não recebe opções.')
    requireFile(python)
    await run(python, ['backend/tools/backup_data.py'])
  } else if (command === 'start') await start()
  else if (command === 'help')
    console.log(
      'NekoStrike\n  node scripts/workspace.mjs setup --python "C:/caminho/python.exe"  (cópia limpa)\n  node scripts/workspace.mjs check\n  node scripts/workspace.mjs backup\n  node scripts/workspace.mjs start [--preview]',
    )
  else throw new Error(`Comando desconhecido: ${command}`)
} catch (error) {
  console.error(`\nNekoStrike: ${error.message}`)
  process.exitCode = 1
}
