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
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tmpDir = join(pkgDir, '.types-check')

/** @param {string} dir @param {string[]} out */
function walkDts(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkDts(full, out)
    else if (full.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const referencePathRE = /(\/\/\/\s*<reference\s+path=["'][^"']+?)\.d\.ts(["'])/g

rmSync(tmpDir, { recursive: true, force: true })
// Write each emitted `.d.ts` into the temp dir as `.ts` (preserving the dir
// layout so relative imports resolve). Only declarations need checking, so we
// skip everything else — and avoid `fs.cpSync` (unsupported on Node 20.19).
for (const dir of ['dist', 'types']) {
  for (const file of walkDts(join(pkgDir, dir))) {
    const rel = relative(pkgDir, file).slice(0, -'.d.ts'.length) + '.ts'
    const dest = join(tmpDir, rel)
    // Rewrite `/// <reference path="x.d.ts" />` to point at the renamed `.ts`.
    const code = readFileSync(file, 'utf8').replace(referencePathRE, '$1.ts$2')
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, code)
  }
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

// Resolve TypeScript's own entry rather than a `.bin/tsc` path: `typescript`
// is hoisted to the workspace root, so `packages/vite/node_modules/.bin/tsc`
// does not exist under a clean (strict) pnpm install.
const tscBin = createRequire(import.meta.url).resolve('typescript/bin/tsc')
const res = spawnSync(
  process.execPath,
  [tscBin, '--project', join(tmpDir, 'tsconfig.json')],
  { cwd: pkgDir, stdio: 'inherit' },
)
rmSync(tmpDir, { recursive: true, force: true })
if (res.error) {
  console.error(res.error)
  process.exit(1)
}
process.exit(res.status ?? 1)
