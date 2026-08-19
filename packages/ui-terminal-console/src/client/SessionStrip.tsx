/**
 * Horizontal session strip: the workspace's top tab bar. Brand seat
 * (clock/wordmark) on the left, then one numbered conversation tab per
 * session — "conversation 1 | conversation 2 | conversation 3 | add new
 * session" — scrolling horizontally when they overflow. The strip's height
 * wraps its content: no fixed row height, so the tabs size themselves.
 */
import { Fragment } from 'react'
import type {
  PropsLocale, PropsRenderSlots, PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionStripInjected } from './index.ts'
import css from './SessionStrip.module.css'

/** The strip's composed props. */
export type SessionStripProps =
  PropsRuntime<'sidebar'>
  & Partial<PropsRenderSlots<'sidebar.brand'>>
  & PropsLocale<'sidebar'>
  & SessionStripInjected

/** One conversation tab: numbered label, running marker, active highlight. */
function ConversationTab({
  label, running, active, onOpen,
}: {
  label: string
  running: boolean
  active: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className={css.tab}
      data-active={active ? '' : undefined}
      data-running={running ? '' : undefined}
      onClick={onOpen}
      title={label}
    >
      <span className={css.tabTitle}>{label}</span>
      {running && <span className={css.running}>▶</span>}
    </button>
  )
}

/** The horizontal session strip (the workspace's conversation tab bar). */
export function SessionStrip({
  useSessions, useWorkspaces, renderSlot, t, openSession, newSession,
}: SessionStripProps) {
  const sessions = useSessions(s => s)
  const workspaces = useWorkspaces(s => s)

  // Flat tab order: every live session in host-list order, archived hidden,
  // numbered "conversation N" by position.
  const archived = new Set(workspaces.archivedSessionIds)
  const tabs = sessions.ids.filter(id => !archived.has(id) && sessions.byId[id] !== undefined)

  return (
    <div className={css.strip} data-testid="session-strip">
      {renderSlot && <div className={css.brand}>{renderSlot('sidebar.brand', {})}</div>}
      <div className={css.tabs}>
        {tabs.map((id, index) => {
          const summary = sessions.byId[id]
          return (
            <Fragment key={id}>
              {index > 0 && <span className={css.sep} aria-hidden="true">|</span>}
              <ConversationTab
                label={`conversation ${index + 1}`}
                running={summary?.running === true}
                active={sessions.current === id}
                onOpen={() => { openSession(id) }}
              />
            </Fragment>
          )
        })}
        <span className={css.sep} aria-hidden="true">|</span>
        <button
          type="button"
          className={css.newSession}
          onClick={newSession}
          aria-label={t('session.new.label')}
        >
          + {t('session.new.label')}
        </button>
      </div>
    </div>
  )
}
