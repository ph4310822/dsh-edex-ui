/**
 * Bottom panel content: the bottom-left filesystem browser — current path
 * header, icon grid of entries, and the storage usage bar. Clicking a file
 * selects it for the bottom-right preview pane (the selected cell is
 * highlighted); clicking a directory navigates into it.
 */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { FilesState } from '../shared/types.ts'
import css from './BottomPanel.module.css'

/** 16×16 folder glyph (closed), rendered in the theme color via currentColor. */
function FolderIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.25 3.75C2.25 3.33579 2.58579 3 3 3H5.5C5.76522 3 6.01957 3.10536 6.20711 3.29289L7.04289 4.12868C7.23043 4.31621 7.48478 4.42157 7.75 4.42157H13C13.4142 4.42157 13.75 4.75736 13.75 5.17157V12.25C13.75 12.6642 13.4142 13 13 13H3C2.58579 13 2.25 12.6642 2.25 12.25V3.75Z"
        fill="currentColor" fillOpacity="0.25"
      />
      <path
        d="M2.25 3.75C2.25 3.33579 2.58579 3 3 3H5.5C5.76522 3 6.01957 3.10536 6.20711 3.29289L7.04289 4.12868C7.23043 4.31621 7.48478 4.42157 7.75 4.42157H13C13.4142 4.42157 13.75 4.75736 13.75 5.17157V12.25C13.75 12.6642 13.4142 13 13 13H3C2.58579 13 2.25 12.6642 2.25 12.25V3.75Z"
        stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"
      />
    </svg>
  )
}

/** 16×16 file glyph (document with folded corner), rendered in the theme color via currentColor. */
function FileIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 1.75C3.5 1.33579 3.83579 1 4.25 1H9.08579C9.351 1 9.60536 1.10536 9.79289 1.29289L12.7071 4.20711C12.8946 4.39464 13 4.649 13 4.91421V14.25C13 14.6642 12.6642 15 12.25 15H4.25C3.83579 15 3.5 14.6642 3.5 14.25V1.75Z"
        fill="currentColor" fillOpacity="0.25"
      />
      <path
        d="M3.5 1.75C3.5 1.33579 3.83579 1 4.25 1H9.08579C9.351 1 9.60536 1.10536 9.79289 1.29289L12.7071 4.20711C12.8946 4.39464 13 4.649 13 4.91421V14.25C13 14.6642 12.6642 15 12.25 15H4.25C3.83579 15 3.5 14.6642 3.5 14.25V1.75Z"
        stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round"
      />
      <path d="M9 1.5V4.25C9 4.66421 9.33579 5 9.75 5H12.5" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** Icon glyph per entry kind. */
function glyph(isDirectory: boolean): ReactNode {
  return isDirectory ? <FolderIcon /> : <FileIcon />
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
