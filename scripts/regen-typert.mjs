#!/usr/bin/env node
/**
 * Regenerate the Typert artifacts (typert.host.*, typert.remote-client.*) for
 * this repo's host packages. The typert generator only runs inside the harness
 * workspace (this checkout's build has no generator), so a host API change
 * (new @Remote method, changed signatures) must re-run this script, then
 * commit the artifacts — they are versioned (see .gitignore).
 *
 * This repo has no node_modules of its own, so the script re-executes itself
 * through the harness checkout's tsx when tsx is not already on the loader
 * path; DSH_HARNESS overrides the default ../deepseek-harness.
 *
 * Usage: node scripts/regen-typert.mjs
 */
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HARNESS = resolve(process.env.DSH_HARNESS ?? join(ROOT, '../deepseek-harness'))

// Bootstrap: when run without the harness's tsx loader (the common case —
// `node scripts/regen-typert.mjs` from the repo root), re-exec through the
// harness checkout's tsx CLI, which resolves the generator's .ts imports.
if (process.env.DSH_REGEN_BOOTSTRAPPED !== '1') {
  const tsx = join(HARNESS, 'node_modules/.bin/tsx')
  const result = spawnSync(tsx, [fileURLToPath(import.meta.url)], {
    stdio: 'inherit',
    env: { ...process.env, DSH_REGEN_BOOTSTRAPPED: '1' },
  })
  process.exit(result.status ?? 1)
}

const { mkdirSync, writeFileSync } = await import('node:fs')

const { WorkspaceTypertGenerator } = await import(
  join(HARNESS, 'packages/typert/generator/src/workspace.ts')
)

/** One package manifest name per host package this repo ships. */
const PACKAGES = ['@danielng23/dsh-host-system-metrics']

const generator = new WorkspaceTypertGenerator(ROOT)
const artifacts = generator.generate(PACKAGES)

let written = 0
for (const artifact of artifacts) {
  const output = join(ROOT, artifact.packageRoot, 'lib')
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, `typert.${artifact.face}.js`), artifact.js)
  writeFileSync(join(output, `typert.${artifact.face}.d.ts`), artifact.dts)
  written += 2
  if (artifact.remote !== undefined) {
    writeFileSync(join(output, 'typert.remote-client.js'), artifact.remote.js)
    writeFileSync(join(output, 'typert.remote-client.d.ts'), artifact.remote.dts)
    writeFileSync(join(output, 'typert.remote-client.d.ts.map'), artifact.remote.dtsMap)
    written += 3
  }
  console.log(`regen-typert: ${artifact.package} (${artifact.face}) -> ${output}`)
}
console.log(`regen-typert: wrote ${written} artifacts for ${artifacts.length} package(s)`)
