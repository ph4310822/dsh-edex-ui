/**
 * Bottom panel content: the bottom-left filesystem browser — current path
 * header, icon grid of entries, and the storage usage bar. Clicking a file
 * selects it for the bottom-right preview pane (the selected cell is
 * highlighted); clicking a directory navigates into it.
 */
import { useEffect } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { FilesState } from '../shared/types.ts'
import css from './BottomPanel.module.css'

/** Icon glyph per entry kind. */
function glyph(isDirectory: boolean): string {
  return isDirectory ? '▣' : '▤'
}

/** Grid cell for one entry. */
function EntryCell({
  name, isDirectory, selected, onOpen,
}: { name: string; isDirectory: boolean; selected: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={css.cell}
      data-selected={selected || undefined}
      onClick={onOpen}
      data-testid="edex-fs-entry"
    >
      <span className={css.icon}>{glyph(isDirectory)}</span>
      <span className={css.name}>{name}</span>
    </button>
  )
}

/** The bottom-left content (rendered inside the eDEX shell's bottom-left cell). */
export function BottomPanel({
  useFiles, refresh, navigate, selectFile,
}: {
  useFiles: SnapshotSelectorHook<FilesState>
  refresh: () => void
  navigate: (name: string) => void
  selectFile: (name: string) => void
}) {
  const files = useFiles(s => s)

  useEffect(() => {
    refresh()
  }, [refresh])

  const storagePct = files.storage.usedPct

  return (
    <div className={css.panel} data-testid="edex-bottom-panel">
      <div className={css.pathRow}>
        <span className={css.pathKey}>DIR</span>
        <span className={css.path} title={files.path}>{files.path === '' ? '—' : files.path}</span>
        <button type="button" className={css.upButton} onClick={() => { navigate('..') }} aria-label="Up">↑</button>
        <button type="button" className={css.upButton} onClick={refresh} aria-label="Refresh">⟳</button>
      </div>
      <div className={css.grid}>
        {files.error !== null && <div className={css.error}>{files.error}</div>}
        {files.error === null && files.phase === 'loading' && files.entries.length === 0 && (
          <div className={css.hint}>loading…</div>
        )}
        {files.entries.map(entry => (
          <EntryCell
            key={entry.name}
            name={entry.name}
            isDirectory={entry.isDirectory}
            selected={files.selected === entry.name}
            onOpen={() => {
              if (entry.isDirectory) navigate(entry.name)
              else selectFile(entry.name)
            }}
          />
        ))}
      </div>
      <div className={css.storageRow}>
        <span className={css.storageText}>
          MOUNT {files.storage.path === '' ? '—' : files.storage.path} used {storagePct}%
        </span>
        <div className={css.storageBar}>
          <div className={css.storageFill} style={{ width: `${Math.min(100, storagePct)}%` }} />
        </div>
      </div>
    </div>
  )
}
