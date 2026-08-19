/**
 * Real-composition guard for the terminal bridge: the service class boots
 * from a test-only cordis.yml through the actual Loader + Include path with
 * a fake terminals seam, and its Remote methods resolve and settle.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import { TerminalSessionId } from '@deepseek-ai/dsh-terminal'
import TerminalUIBridgeService from '../src/index.ts'

/** Test-only terminals seam provider mounted beside the bridge. */
const fakeTerminalsPlugin = {
  name: 'fake-terminals',
  apply: (ctx: Context) => {
    ctx.provide('terminals', {
      async spawn() {
        return { sessionId: TerminalSessionId('pty-c'), motd: 'composed', type: 'bash', status: { kind: 'running' } }
      },
      read() {
        return { text: '', totalLines: 0, lineBegin: 0, lineEnd: 0, truncated: false }
      },
      write: async () => {},
      signal: async () => ({ delivered: true as const, targetPgid: 1 }),
      kill: async () => true,
      list: () => [],
    })
  },
}

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('terminal-bridge real composition', () => {
  it('boots from cordis.yml and serves open/read through the Loader path', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-terminal-bridge-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      '- id: fake-terminals',
      '  name: fake-terminals',
      '- id: terminal-bridge',
      "  name: '@deepseek-ai/dsh-host-terminal-bridge'",
      '',
    ].join('\n'))

    const ctx = new Context()
    context = ctx
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['fake-terminals', fakeTerminalsPlugin],
      ['@deepseek-ai/dsh-host-terminal-bridge', TerminalUIBridgeService],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>
    await ctx.loader.create({
      name: 'cordis:include',
      config: { path: pathToFileURL(configPath).href },
    })
    await ctx.loader.await()

    const bridge = ctx.get('terminalUI') as TerminalUIBridgeService
    expect(bridge).toBeInstanceOf(TerminalUIBridgeService)
    const opened = await bridge.open({ id: 'agent-1' } as never, {})
    expect(opened.motd).toBe('composed')
    const read = bridge.read({ id: 'agent-1' } as never, { id: opened.id })
    expect(read.exited).toBe(false)
    const closed = await bridge.close({ id: 'agent-1' } as never, { id: opened.id })
    expect(closed).toBe(true)
  })
})
