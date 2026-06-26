// @ts-check
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bin = (name) => resolve(pkgDir, 'node_modules/.bin', name)

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} label
 * @returns {Promise<void>}
 */
function run(cmd, args, label) {
  return new Promise((res, rej) => {
    const child = spawn(cmd, args, {
      cwd: pkgDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', rej)
    child.on('exit', (code) => {
      if (code === 0) res()
      else rej(new Error(`${label} exited with code ${code}`))
    })
  })
}

// The JS bundle (dist/node/*.js) and the type pipeline (dist/node/*.d.ts) are
// independent: tsc checks the emitted .d.ts, never the .js. Run the bundle in
// parallel with `dts -> check` so the bundle overlaps the long type-check.
const bundle = run(
  bin('rolldown'),
  ['--config', 'rolldown.config.ts'],
  'build-bundle',
)

const types = run(
  bin('rolldown'),
  ['--config', 'rolldown.dts.config.ts'],
  'build-types-roll',
).then(() =>
  run(
    process.execPath,
    [resolve(pkgDir, 'scripts/checkDist.mjs')],
    'build-types-check',
  ),
)

const results = await Promise.allSettled([bundle, types])
const failed = results.filter((r) => r.status === 'rejected')
if (failed.length) {
  for (const f of failed)
    console.error(String(/** @type {PromiseRejectedResult} */ (f).reason))
  process.exit(1)
}
