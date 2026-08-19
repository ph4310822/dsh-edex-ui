/**
 * Terminal shell plugin, browser half: one register() call contributes
 * TerminalFrame into the runtime's built-in 'root' slot and declares the
 * per-session workspace slot; a second register fills that workspace. The
 * plugin also registers its own conversation Definitions + Chat builder (the
 * default ui-conversation is not composed in the terminal profile) and owns
 * the frame-level monitor poller.
 */
import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ctx.remote merge with the mounted Remote namespaces.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// The Host-generated Remote contributions this plugin's own host packages
// expose. apply() mounts both: $mount is what installs the traced
// `remote.<namespace>` services, so this plugin provides them itself instead
// of injecting them (injecting would wait on services only its own apply
// creates — see LOCAL_DEVELOPMENT.md, post-mortem 0001).
import systemMetricsRemote from '@deepseek-ai/dsh-host-system-metrics/remote'
import terminalUIRemote from '@deepseek-ai/dsh-host-terminal-bridge/remote'
import { IDLE_PTY_STATUS, type SystemMetricsRemote, type TerminalUIRemote } from './contract.ts'
import { createTerminalFrameStore, createTerminalSessionStore } from './stores.ts'
import { registerTerminalConversationNodes } from './conversation-nodes.ts'
import { MonitorPoller } from './monitor-poller.ts'
import { PtyClient } from './pty-client.ts'
import { en, NS, zh } from './locales.ts'
import { TerminalFrame, type TerminalFrameInjected } from './frame/TerminalFrame.tsx'
import {
  TerminalWorkspace, type TerminalWorkspaceInjected,
} from './workspace/TerminalWorkspace.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /**
     * The per-session terminal workspace (chat log, prompt, and shell panel).
     * Session-maybe: the occupant owns the no-session hint without changing
     * its React identity across a session switch.
     */
    'terminal.workspace': { kind: 'single'; scope: 'session-maybe'; owner: {} }
  }
}

/** Required services: slot registry, session/workspace verbs, and the Remote carrier. The two terminal namespaces are mounted by this plugin's own apply (see below). */
export const inject = [
  'slots', 'sessions', 'workspaces', 'locale',
  'conversationEvents', 'conversationViews', 'remote',
]

/** Static no-session sources for the workspace hooks compartment. */
const ABSENT_PTY_STATUS = {
  getSnapshot: () => IDLE_PTY_STATUS,
  subscribe: () => () => {},
}

/** The no-session workspace face (session-maybe inject with no current session). */
function absentWorkspaceFace(): TerminalWorkspaceInjected {
  return {
    send: () => {},
    cancel: () => {},
    pty: { open: () => {}, write: () => {}, close: () => {}, onOutput: null },
    hooks: { ptyStatus: ABSENT_PTY_STATUS },
  }
}

/**
 * Client plugin body: mount the two Host Remote contributions this plugin's
 * host packages expose (systemMetrics, terminalUI), then register the
 * terminal shell frame and workspace, assemble the chat, and start the
 * monitor poller.
 * @param ctx - client root context.
 * @returns disposer that unmounts the Remote namespaces on unload.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  // Mount the generated Host Remote contributions first: $mount installs the
  // traced `remote.<namespace>` services. This plugin both mounts and consumes
  // them in one fiber, so it cannot inject 'remote.<ns>' (that would wait on a
  // service only its own apply creates); the non-traced store lookup below is
  // the documented escape hatch (LOCAL_DEVELOPMENT.md, post-mortem 0001).
  const disposeSystemMetrics = await ctx.remote.$mount(systemMetricsRemote)
  const disposeTerminalUI = await ctx.remote.$mount(terminalUIRemote)
  let disposed = false
  const dispose = async (): Promise<void> => {
    if (disposed) return
    disposed = true
    await disposeTerminalUI()
    await disposeSystemMetrics()
  }
  const systemMetrics = ctx.get('remote.systemMetrics') as SystemMetricsRemote
  const terminalUI = ctx.get('remote.terminalUI') as TerminalUIRemote

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-terminal: dictionaries')
  registerTerminalConversationNodes(ctx)

  const monitor = new MonitorPoller(systemMetrics)
  ctx.effect(() => {
    monitor.start()
    return () => { monitor.stop() }
  }, 'ui-terminal: monitor poller')

  ctx.slots.register({
    name: 'root',
    // Shadow the default layout's AppFrame: ui-layout stays enabled (it
    // provides the `layout` service the app-shell entry injects) and registers
    // 'root' at the default priority 0; this frame registers at -1, and the
    // slot core renders the lowest-priority live entry, so the terminal shell
    // wins the built-in root cell without a same-priority clash.
    priority: -1,
    children: {
      'terminal.workspace': { kind: 'single', scope: 'session-maybe' },
    },
    store: createTerminalFrameStore,
    locale: NS,
    inject: (actions: BoundActions<ReturnType<typeof createTerminalFrameStore>>): TerminalFrameInjected => ({
      openSession: (id) => { ctx.sessions.open(id) },
      newSession: () => { ctx.workspaces.startSession() },
      hooks: { monitor: monitor.observationSource },
    }),
  }, TerminalFrame)

  ctx.slots.register({
    name: 'terminal.workspace',
    store: createTerminalSessionStore,
    locale: NS,
    inject: (
      sessionId: SessionId | undefined,
      _actions: BoundActions<ReturnType<typeof createTerminalSessionStore>> | undefined,
    ): TerminalWorkspaceInjected => {
      if (sessionId === undefined) return absentWorkspaceFace()
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) {
        throw new Error(`ui-terminal: session "${sessionId}" is unavailable`)
      }
      const pty = new PtyClient(sessionId, terminalUI)
      return {
        send: (text) => {
          void session.prompt([{ type: 'text', text }], 'queue')
        },
        cancel: () => {
          void session.cancel()
        },
        pty,
        hooks: { ptyStatus: pty.statusSource },
      }
    },
  }, TerminalWorkspace)

  return dispose
}
