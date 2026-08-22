/**
 * Bottom-right preview pane: renders the file selected in the bottom-left
 * browser — text files open a vim-capable CodeMirror editor (see EditorPane),
 * images and videos render from their data: payloads, and a message shows for
 * everything else. Empty until a file is selected.
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { FilesState } from '../shared/types.ts'
import css from './PreviewPane.module.css'
import { EditorPane } from './EditorPane.tsx'

/** The file's display name from its path. */
function fileName(path: string): string {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(index + 1) : path
}

/** The bottom-right content (rendered inside the eDEX shell's bottom-right cell). */
export function PreviewPane({
  useFiles, markDirty, saveEditor, confirmDiscard, cancelDiscard,
}: {
  useFiles: SnapshotSelectorHook<FilesState>
  /** Mark the open buffer dirty (called by the editor on doc changes). */
  markDirty: () => void
  /** Persist the editor buffer through the host `writeFile` Remote. */
  saveEditor: (content: string) => void
  /** Discard the dirty buffer and continue the paused navigation. */
  confirmDiscard: () => void
  /** Keep the dirty buffer and cancel the paused navigation. */
  cancelDiscard: () => void
}) {
  const files = useFiles(s => s)
  const preview = files.preview
  const editor = files.editor

  return (
    <div className={css.pane} data-testid="edex-preview-pane">
      <div className={css.header}>
        <span className={css.title}>PREVIEW</span>
        {preview !== null && (
          <span className={css.file} title={preview.path}>{fileName(preview.path)}</span>
        )}
      </div>
      <div className={css.body}>
        {preview === null && <div className={css.hint}>NO FILE SELECTED</div>}
        {preview !== null && preview.error !== null && (
          <div className={css.error}>{preview.error}</div>
        )}
        {preview !== null && preview.error === null && preview.kind === 'text' && (
          <EditorPane
            key={preview.path}
            path={preview.path}
            content={preview.text ?? ''}
            readOnly={preview.truncated}
            editor={editor}
            onMarkDirty={markDirty}
            onSave={saveEditor}
            onDiscard={confirmDiscard}
            onCancelDiscard={cancelDiscard}
          />
        )}
        {preview !== null && preview.error === null && preview.kind === 'image' && preview.dataUrl !== null && (
          <img className={css.media} src={preview.dataUrl} alt={fileName(preview.path)} />
        )}
        {preview !== null && preview.error === null && preview.kind === 'video' && preview.dataUrl !== null && (
          <video className={css.media} src={preview.dataUrl} controls />
        )}
        {preview !== null && preview.error === null && preview.kind === 'unsupported' && (
          <div className={css.error}>CANNOT PREVIEW THIS FILE TYPE</div>
        )}
        {preview !== null && preview.truncated && preview.kind !== 'text' && (
          <div className={css.truncated}>PREVIEW TRUNCATED ({preview.sizeBytes} BYTES)</div>
        )}
      </div>
    </div>
  )
}