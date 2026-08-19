// @vitest-environment jsdom
/** Client apply wiring: root + workspace registrations, chat assembly, dictionary. */

import { Context } from '@deepseek-ai/cordis'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ConversationEventRegistry, ConversationViewRegistry, SlotRegistry,
} from '@deepseek-ai/dsh-client-runtime/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'

/** Assemble a bench ctx with the services the terminal plugin injects. */
async function bench() {
  const ctx = new Context()
  const slotsFiber = ctx.plugin(SlotRegistry)
  ctx.provide('locale', new LocaleRuntime(ctx))
  ctx.provide('conversationEvents', new ConversationEventRegistry(ctx))
  ctx.provide('conversationViews', new ConversationViewRegistry(ctx))
  // The apply mounts its own Remote contributions via $mount; the fake mounts
  // the two namespaces the plugin then reads back through ctx.get.
  ctx.provide('remote', {
    $mount: async (contribution: { package: string }) => {
      if (contribution.package === '@deepseek-ai/dsh-host-system-metrics') {
        ctx.provide('remote.systemMetrics', { snapshot: vi.fn() } as never)
      }
      if (contribution.package === '@deepseek-ai/dsh-host-terminal-bridge') {
        ctx.provide('remote.terminalUI', { open: vi.fn(), write: vi.fn(), read: vi.fn(), signal: vi.fn(), close: vi.fn() } as never)
      }
      return async () => {}
    },
  } as never)
  ctx.provide('sessions', {
    open: vi.fn(),
    binding: () => undefined,
    list: { getSnapshot: () => ({ ids: [], byId: {}, current: undefined, phase: 'ready', subagentsByParent: {}, jobsBySession: {} }), subscribe: () => () => {} },
  } as never)
  ctx.provide('workspaces', { startSession: vi.fn() } as never)
  await slotsFiber.await()
  return ctx
}

describe('ui-terminal client apply', () => {
  it('declares its service dependencies', () => {
    expect(inject).toEqual([
      'slots', 'sessions', 'workspaces', 'locale',
      'conversationEvents', 'conversationViews', 'remote',
    ])
  })

  it('registers the frame into root and the workspace slot with its declaration', async () => {
    const ctx = await bench()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const slots = ctx.get('slots') as SlotRegistry
    expect(slots.entries('root')).toHaveLength(1)
    expect(slots.spec('terminal.workspace')).toEqual({ kind: 'single', scope: 'session-maybe' })
    expect(slots.entries('terminal.workspace')).toHaveLength(1)
    fiber.dispose()
  })

  it('registers the terminal chat dictionary', async () => {
    const ctx = await bench()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const locale = ctx.get('locale') as LocaleRuntime
    expect(locale.bind('terminal')('shell.chat')).toBe('对话')
    fiber.dispose()
  })

  it('disposal tears the registrations down', async () => {
    const ctx = await bench()
    const fiber = ctx.plugin({ inject, apply })
    await fiber.await()
    const slots = ctx.get('slots') as SlotRegistry
    fiber.dispose()
    await fiber.await()
    expect(slots.entries('root')).toHaveLength(0)
    expect(slots.entries('terminal.workspace')).toHaveLength(0)
  })
})

describe('ui-terminal node half', () => {
  it('node apply is a no-op', async () => {
    const { apply: nodeApply } = await import('../src/index.ts')
    expect(nodeApply()).toBeUndefined()
  })

  it('invariant companion installs without throwing', async () => {
    const ctx = new Context()
    ctx.provide('invariants', { register: vi.fn(() => () => {}) } as never)
    const { apply: invariantApply, inject: invariantInject, name } = await import('../src/invariant.ts')
    expect(name).toBe('client-ui-terminal-invariant')
    expect(invariantInject).toEqual(['invariants'])
    const disposer = invariantApply(ctx as never)
    await expect(disposer).resolves.toBeTypeOf('function')
  })
})
