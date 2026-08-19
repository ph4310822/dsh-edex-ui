/**
 * Per-session terminal workspace: the chat log, the prompt line, and the
 * embedded PTY panel, switching on the frame's active-panel owner props.
 *
 * The workspace slot is session-maybe: the framework omits the entry's
 * `useStore`/`actions` seats while no session is current (the store is a
 * per-session instance), so the entry component itself only uses the
 * always-present standard hooks (useSession/useSessions — session-maybe
 * bound) and renders the no-session hint; the store-owning UI lives in the
 * session child, which mounts only once a session exists.
 */
import { useEffect, useMemo } from 'react'
import type {
  InjectFace, PropsLocale, PropsRuntime, PropsStore, TranslateNS,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { PtyStatus } from '../contract.ts'
import type { ObservableSource } from '../pty-client.ts'
import type { createTerminalSessionStore } from '../stores.ts'
import { renderChatLines } from '../chat-lines.ts'
import { TerminalChat } from './chat/TerminalChat.tsx'
import { TerminalPrompt } from './prompt/TerminalPrompt.tsx'
import { TerminalPanel, type TerminalPanelPty } from './pty/TerminalPanel.tsx'
import css from './TerminalWorkspace.module.css'

/** Frame-owned panel switch passed as owner props to the workspace slot. */
export interface TerminalWorkspaceOwnerProps {
  panel: 'chat' | 'pty'
  onSetPanel: (panel: 'chat' | 'pty') => void
}

/** The workspace entry's inject face: session verbs plus the PTY controller. */
export interface TerminalWorkspaceInjected {
  /** Send one prompt into the session (fire-and-forget; failures land in snapshot.promptError). */
  send: (text: string) => void
  /** Cancel the running turn. */
  cancel: () => void
  /** Embedded-PTY controller backed by the per-session client. */
  pty: TerminalPanelPty
  /** Bare observable PTY status bound to the `usePtyStatus` hook by the renderer. */
  hooks: { ptyStatus: ObservableSource<PtyStatus> }
}

/** Full composed props of the workspace entry. */
export type TerminalWorkspaceProps =
  & PropsRuntime<'terminal.workspace'>
  & PropsStore<ReturnType<typeof createTerminalSessionStore>>
  & PropsLocale<'terminal'>
  & TerminalWorkspaceOwnerProps
  & InjectFace<TerminalWorkspaceInjected>

/** The session child's props: the always-present outer hooks plus the store seats. */
export type TerminalSessionWorkspaceProps =
  & Pick<TerminalWorkspaceProps,
    | 'panel' | 'onSetPanel' | 'useStore' | 'actions'
    | 'send' | 'cancel' | 'pty' | 'usePtyStatus'>
  & {
    sessionId: SessionId
    snapshot: ConversationSnapshot
    cwd: string | undefined
    t: TranslateNS<'terminal'>
  }

/** No-session hint rendered by the session-maybe workspace. */
function NoSession({ t }: { t: TranslateNS<'terminal'> }) {
  return (
    <div className={css.noSession} data-testid="terminal-no-session">
      <div className={css.noSessionText}>$ select a session or create one</div>
      <div className={css.noSessionHint}>{t('shell.newSession')} →</div>
    </div>
  )
}

/** Transient/error session hint: honest about openState instead of the no-session face. */
function SessionHint({ text, error, t }: { text: string; error?: string; t: TranslateNS<'terminal'> }) {
  return (
    <div className={css.noSession} data-testid="terminal-session-hint">
      <div className={css.noSessionText}>{text}</div>
      {error !== undefined && <div className={css.noSessionHint}>{error}</div>}
    </div>
  )
}

/** The store-owning workspace body; mounted only while a session is current. */
function SessionWorkspace({
  sessionId, snapshot, cwd, t, panel, onSetPanel,
  useStore, actions, send, cancel, pty, usePtyStatus,
}: TerminalSessionWorkspaceProps) {
  const status = usePtyStatus(s => s)
  const store = useStore(s => s)

  // Close the session's PTY when the workspace unmounts (session switch or
  // plugin unload); the panel additionally closes it when hidden.
  useEffect(() => {
    return () => { pty.close() }
  }, [pty])

  const lines = useMemo(() => {
    const nodes = snapshot.chat.order
      .map(key => snapshot.chat.nodes.get(key))
      .filter((node): node is NonNullable<typeof node> => node !== undefined)
    return renderChatLines({ nodes, pending: snapshot.pending })
  }, [snapshot])

  return (
    <div className={css.workspace} data-testid="terminal-workspace">
      {panel === 'chat'
        ? (
          <>
            <TerminalChat lines={lines} running={snapshot.running} t={t} />
            <TerminalPrompt
              draft={store.draft}
              onDraft={(text) => { actions.setDraft(text) }}
              onSubmit={() => {
                const text = store.draft.trim()
                if (text === '') return
                actions.submitDraft()
                send(text)
              }}
              onHistoryUp={() => { actions.historyUp() }}
              onHistoryDown={() => { actions.historyDown() }}
              onCancel={cancel}
              busy={snapshot.running}
              t={t}
            />
          </>
        )
        : <TerminalPanel pty={pty} cwd={cwd} status={status} t={t} />}
      <div className={css.tabStrip}>
        <button
          type="button"
          className={css.tab}
          data-active={panel === 'chat' ? '' : undefined}
          onClick={() => { onSetPanel('chat') }}
        >
          {t('shell.chat')}
        </button>
        <button
          type="button"
          className={css.tab}
          data-active={panel === 'pty' ? '' : undefined}
          onClick={() => { onSetPanel('pty') }}
        >
          {t('shell.shell')}
        </button>
      </div>
    </div>
  )
}

/** The session-maybe workspace entry. */
export function TerminalWorkspace({
  sessionId, useSession, useSessions, t, ...session
}: TerminalWorkspaceProps) {
  // useSession is session-maybe bound: call it unconditionally — it snapshots
  // undefined while no session is current (conditional hook calls would break
  // hook order across the no-session → session transition).
  const snapshot = useSession(s => s)
  const cwd = useSessions(s => sessionId === undefined ? undefined : s.byId[sessionId]?.cwd)

  if (sessionId === undefined || snapshot === undefined) {
    return <NoSession t={t} />
  }
  // Honest transient/error states: the default surface shows a loading
  // skeleton or the open error, so mirror that instead of the no-session face
  // (openState 'cold'/'loading' are transient; 'error' carries openError).
  if (snapshot.openState === 'cold' || snapshot.openState === 'loading') {
    return <SessionHint text="loading history…" t={t} />
  }
  if (snapshot.openState === 'error') {
    return (
      <SessionHint
        text="failed to open session"
        error={snapshot.openError?.message ?? 'unknown error'}
        t={t}
      />
    )
  }
  return <SessionWorkspace sessionId={sessionId} snapshot={snapshot} cwd={cwd} t={t} {...session} />
}
