#!/usr/bin/env node
/**
 * Repair a session log corrupted by a second harness process seeding a
 * session another process owns.
 *
 * Symptom (from the host history reader):
 *   corrupt session log: seq gap in committed region at line N
 *   (expected X, got X)          — a duplicated sequence number
 *
 * Cause: two `dsh` instances share one `$DSH_HOME` session store; the second
 * process opening a session the first one owns appends its own seed events
 * (`session/end-seed`) numbered from ITS counter, colliding with the owner's
 * concurrent appends. The log then has a duplicate seq and every fresh reader
 * (including the owner after a restart) refuses to serve history.
 *
 * This script removes exactly those foreign `session/end-seed` rows: it scans
 * with the harness's own validator, and each time the scanner reports a seq
 * gap it drops the reported line IF it is a `session/end-seed` (the second
 * writer's signature), then rescans. It stops and prints the remaining error
 * if the reported line is anything else (a genuinely different corruption).
 *
 * SAFETY: run only while NO harness instance is running against this store —
 * the file is live-owned by the process that writes it, and swapping it
 * mid-write loses events. The original file is kept as `<file>.corrupt.bak`.
 *
 * Usage:
 *   node scripts/repair-session-log.mjs <session.jsonl.zstd>
 *   DSH_HARNESS=/path/to/deepseek-harness node scripts/repair-session-log.mjs <...>
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const HARNESS = resolve(process.env.DSH_HARNESS ?? join(HERE, '..', '..', 'deepseek-harness'))

const [logPathArg] = process.argv.slice(2)
if (logPathArg === undefined) {
  console.error('usage: node scripts/repair-session-log.mjs <session.jsonl.zstd>')
  process.exit(2)
}
const logPath = resolve(logPathArg)
if (!existsSync(logPath)) {
  console.error(`session log not found: ${logPath}`)
  process.exit(2)
}

const { scanLog } = await import(
  join(HARNESS, 'packages/session/session-persistence-jsonl/lib/types/format.js')
)

/** Decompress to a temp text file; returns its path. */
function decompress(source) {
  const out = `${source}.repair.jsonl`
  execFileSync('zstd', ['-d', '-f', source, '-o', out], { stdio: 'ignore' })
  return out
}

/** Recompress a text file over the original path (original preserved as backup). */
function recompress(textPath, target) {
  execFileSync('zstd', ['-f', '-q', textPath, '-o', target], { stdio: 'ignore' })
}

const textPath = decompress(logPath)
const lines = readFileSync(textPath, 'utf8').split('\n')
if (lines[lines.length - 1] === '') lines.pop() // trailing newline

/** 1-based line the scanner reported. */
function reportedLine(error) {
  const match = /at line (\d+)/.exec(String(error?.message ?? error))
  return match === null ? undefined : Number(match[1])
}

let removed = 0
for (let pass = 1; pass <= 8; pass++) {
  const buffer = Buffer.from(lines.join('\n') + '\n', 'utf8')
  let scan
  try {
    scan = scanLog(buffer)
    console.log(`pass ${pass}: CLEAN — ${scan.events.length} contiguous events`)
    break
  } catch (error) {
    const line = reportedLine(error)
    if (line === undefined) {
      console.error(`pass ${pass}: cannot locate the reported line:\n${error.message}`)
      process.exit(1)
    }
    const row = lines[line - 1]
    let kind
    try {
      kind = JSON.parse(row)?.type
    } catch {
      kind = undefined
    }
    if (kind !== 'session/end-seed') {
      console.error(
        `pass ${pass}: line ${line} is "${kind ?? 'unparsable'}" — not a foreign seed row;\n`
        + `this log has a different corruption. Leaving the file untouched.\n${error.message}`,
      )
      process.exit(1)
    }
    console.log(`pass ${pass}: dropping foreign seed row at line ${line}`)
    lines.splice(line - 1, 1)
    removed += 1
  }
}

if (removed === 0) {
  console.log('no foreign seed rows found — nothing to repair (log already clean)')
  process.exit(0)
}

writeFileSync(textPath, lines.join('\n') + '\n', 'utf8')
renameSync(logPath, `${logPath}.corrupt.bak`)
recompress(textPath, logPath)
// The decompressed working copy is transient; drop it after the swap.
execFileSync('rm', ['-f', textPath], { stdio: 'ignore' })
console.log(`repaired: removed ${removed} foreign session/end-seed row(s)`)
console.log(`backup of the original: ${logPath}.corrupt.bak`)
