/**
 * Folder indicator: a classic-terminal prompt showing the current workspace
 * folder, rendered at the left edge of the composer row (the
 * `conversation.input.left` list slot). Follows the most recently active
 * workspace, so switching workspaces updates the prompt and the filesystem
 * browser together.
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import css from './FolderIndicator.module.css'

/** The last path segment. */
function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index >= 0 ? trimmed.slice(index + 1) : trimmed
}

/** The composer-row folder prompt (session-scope list entry). */
export function FolderIndicator({ useWorkspaces }: { useWorkspaces: SnapshotSelectorHook<WorkspaceListState> }) {
  const items = useWorkspaces(s => s.items)
  const recentId = useWorkspaces(s => s.recentWorkspaceId)
  const current = items.find(workspace => workspace.workspaceId === recentId) ?? items[0]
  const folder = current === undefined ? '' : basename(current.path)

  return (
    <span className={css.folder} data-testid="edex-folder-indicator" title={current?.path}>
      <span className={css.tilde}>~</span>
      {folder !== '' && (
        <>
          <span className={css.slash}>/</span>
          <span className={css.name}>{folder}</span>
        </>
      )}
    </span>
  )
}
