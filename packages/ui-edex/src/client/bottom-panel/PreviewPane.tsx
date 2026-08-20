/**
 * Bottom-right preview pane: renders the file selected in the bottom-left
 * browser — text as a monospace terminal log, images and videos from their
 * data: payloads, and a message for everything else. Empty until a file is
 * selected.
 */
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { FilesState } from '../shared/types.ts'
import css from './PreviewPane.module.css'

/** The file's display name from its path. */
function fileName(path: string): string {
  const index = path.lastIndexOf('/')
  return index >= 0 ? path.slice(index + 1) : path
}

/** The bottom-right content (rendered inside the eDEX shell's bottom-right cell). */
export function PreviewPane({ useFiles }: { useFiles: SnapshotSelectorHook<FilesState> }) {
  const files = useFiles(s => s)
  const preview = files.preview

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
          <pre className={css.text}>{preview.text ?? ''}</pre>
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
        {preview !== null && preview.truncated && (
          <div className={css.truncated}>PREVIEW TRUNCATED ({preview.sizeBytes} BYTES)</div>
        )}
      </div>
    </div>
  )
}
