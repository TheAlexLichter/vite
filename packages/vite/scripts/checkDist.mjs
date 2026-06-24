// @ts-check
// Final validation of the emitted public-API declarations.
//
// `tsc --project tsconfig.check.json` over the raw `dist/**/*.d.ts` spends ~95%
// of its time re-checking the *internals* of transitive node_modules `.d.ts`
// (rolldown, postcss, lightningcss, …). Those declarations ship from their
// authors already valid, so deep-checking them on every build is wasted work,
// but it cannot be turned off with `skipLibCheck` because Vite's own emitted
// files are `.d.ts` too — `skipLibCheck` would skip them as well and the check
// would validate nothing.
//
// Instead, copy the emitted declarations into a temp dir as `.ts`, then run the
// same strict check with `skipLibCheck: true`. Vite's declarations are now
// regular source files (still checked), while node_modules `.d.ts` internals
// are skipped. Same errors are caught (e.g. TS1264 from a bad dts emit), at a
// fraction of the cost.
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = join(pkgDir, '.types-check')

/** @param {string} dir */
function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

rmSync(tmpDir, { recursive: true, force: true })
mkdirSync(tmpDir, { recursive: true })
cpSync(join(pkgDir, 'dist'), join(tmpDir, 'dist'), { recursive: true })
cpSync(join(pkgDir, 'types'), join(tmpDir, 'types'), { recursive: true })

const referencePathRE = /(\/\/\/\s*<reference\s+path=["'][^"']+?)\.d\.ts(["'])/g
for (const file of walk(tmpDir)) {
  if (!file.endsWith('.d.ts')) continue
  // Rewrite `/// <reference path="x.d.ts" />` to point at the renamed `.ts`.
  const code = readFileSync(file, 'utf8').replace(referencePathRE, '$1.ts$2')
  const renamed = file.slice(0, -'.d.ts'.length) + '.ts'
  writeFileSync(file, code)
  renameSync(file, renamed)
}

writeFileSync(
  join(tmpDir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'es2020',
        moduleResolution: 'node16',
        module: 'node16',
        lib: ['ES2020'],
        types: [],
        noEmit: true,
        skipLibCheck: true,
        exactOptionalPropertyTypes: true,
      },
      include: ['dist/**/*', 'types/**/*'],
    },
    null,
    2,
  ),
)

const tsc = resolve(pkgDir, 'node_modules/.bin/tsc')
const res = spawnSync(tsc, ['--project', join(tmpDir, 'tsconfig.json')], {
  cwd: pkgDir,
  stdio: 'inherit',
})
rmSync(tmpDir, { recursive: true, force: true })
process.exit(res.status ?? 1)
