/**
 * Bottom panel content: the bottom-left filesystem browser — current path
 * header, icon grid of entries, and the storage usage bar.
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
function EntryCell({ name, isDirectory, onOpen }: { name: string; isDirectory: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={css.cell} onClick={onOpen} data-testid="edex-fs-entry">
      <span className={css.icon}>{glyph(isDirectory)}</span>
      <span className={css.name}>{name}</span>
    </button>
  )
}

/** The bottom-left content (rendered inside the eDEX shell's bottom-left cell). */
export function BottomPanel({
  useFiles, refresh, navigate,
}: {
  useFiles: SnapshotSelectorHook<FilesState>
  refresh: () => void
  navigate: (name: string) => void
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
            onOpen={() => { if (entry.isDirectory) navigate(entry.name) }}
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
