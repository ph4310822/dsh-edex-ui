/**
 * CodeMirror 6 editor with vim keybindings, a terminal-green-on-black theme
 * driven by the shell's `--edex-*` CSS variables, syntax highlighting by
 * file extension, a status bar (mode, line:col, dirty, save status), and a
 * discard-confirm prompt when navigating away from an unsaved buffer.
 * The editor is re-created (key = path) when the selected file changes.
 */
import { useEffect, useRef, useState } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState as CMState, type Extension } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { vim, getCM, Vim } from '@replit/codemirror-vim'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { css as cssLang } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import type { EditorStatus } from '../shared/types.ts'
import css from './EditorPane.module.css'

/** The CM6 theme — built on `var(--edex-*)` so it follows the shell palette. */
const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--edex-green)',
    backgroundColor: 'transparent',
    fontSize: '12px',
    height: '100%',
  },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-content': {
    caretColor: 'var(--edex-green)',
    fontFamily: 'var(--edex-font, "JetBrains Mono", "Fira Code", Consolas, Menlo, monospace)',
    fontSize: '12px',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--edex-green)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-gutters': {
    backgroundColor: 'var(--edex-panel-2)',
    color: 'var(--edex-dim)',
    border: 'none',
  },
  '.cm-activeLine': { backgroundColor: 'rgba(53, 224, 106, 0.06)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--edex-green)' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(53, 224, 106, 0.2)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(53, 224, 106, 0.25)',
    outline: '1px solid var(--edex-border)',
  },
  '.cm-searchMatch': { backgroundColor: 'rgba(53, 224, 106, 0.2)' },
})

/** Pick a CodeMirror language extension from the file path extension. */
function languageOf(path: string): Extension {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'js': case 'jsx': case 'ts': case 'tsx': case 'mjs': case 'cjs':
      return javascript({ jsx: ext === 'jsx' || ext === 'tsx', typescript: ext === 'ts' || ext === 'tsx' })
    case 'json': case 'jsonc': return json()
    case 'py': return python()
    case 'md': case 'markdown': return markdown()
    case 'css': return cssLang()
    case 'html': case 'htm': return html()
    case 'sh': case 'bash': case 'zsh': return StreamLanguage.define(shell)
    case 'yaml': case 'yml': return StreamLanguage.define(yaml)
    case 'toml': return StreamLanguage.define(toml)
    default: return []
  }
}

/** Map the vim internal mode name to a short display label. */
function modeLabel(mode: string): string {
  switch (mode) {
    case 'insert': return 'INSERT'
    case 'visual': return 'VISUAL'
    case 'replace': return 'REPLACE'
    default: return 'NORMAL'
  }
}

export function EditorPane({
  path, content, readOnly, editor, onMarkDirty, onSave, onDiscard, onCancelDiscard,
}: {
  path: string
  content: string
  readOnly: boolean
  editor: EditorStatus
  onMarkDirty: () => void
  onSave: (content: string) => void
  onDiscard: () => void
  onCancelDiscard: () => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onSaveRef = useRef(onSave)
  const onMarkDirtyRef = useRef(onMarkDirty)
  const [mode, setMode] = useState('normal')
  const [status, setStatus] = useState('')
  const [line, setLine] = useState(1)
  const [col, setCol] = useState(1)

  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  useEffect(() => { onMarkDirtyRef.current = onMarkDirty }, [onMarkDirty])

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return

    const save = (): void => {
      const view = viewRef.current
      if (view !== null) onSaveRef.current(view.state.doc.toString())
    }

    const view = new EditorView({
      parent: host,
      state: CMState.create({
        doc: content,
        extensions: [
          CMState.readOnly.of(readOnly),
          basicSetup,
          vim(),
          languageOf(path),
          keymap.of([{ key: 'Mod-s', preventDefault: true, run: () => { save(); return true } }]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onMarkDirtyRef.current()
            const cm = getCM(update.view)
            setMode(cm?.state.vim?.mode ?? 'normal')
            setStatus(cm?.state.vim?.status ?? '')
            const head = update.state.selection.main.head
            const docLine = update.state.doc.lineAt(head)
            setLine(docLine.number)
            setCol(head - docLine.from + 1)
          }),
          editorTheme,
        ],
      }),
    })
    viewRef.current = view

    // Register :w ex-command (Vim.defineEx is global, safe to call per mount).
    Vim.defineEx('write', 'w', () => { save() })
    const cm = getCM(view)
    setMode(cm?.state.vim?.mode ?? 'normal')

    view.focus()
    return () => { view.destroy(); viewRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return (
    <div className={css.editorPane}>
      <div className={css.cmHost} ref={hostRef} />
      <div className={css.statusBar}>
        {/* Vim mode + ex command status */}
        <span className={css.mode}>{status !== '' ? status : modeLabel(mode)}</span>
        <span className={css.sep}>|</span>
        <span className={css.pos}>{line}:{col}</span>

        {editor.saving && <span className={css.saving}>SAVING…</span>}

        {editor.savedAt !== null && !editor.dirty && (
          <span className={css.saved}>WROTE {editor.savedAt.sizeBytes} BYTES</span>
        )}

        {editor.error !== null && <span className={css.error}>{editor.error}</span>}

        {readOnly && <span className={css.ro}>READ ONLY</span>}

        {editor.dirty && !editor.pendingDiscard && <span className={css.dirty}>DIRTY</span>}

        {editor.pendingDiscard && (
          <span className={css.discardPrompt}>
            UNSAVED CHANGES —
            <button type="button" className={css.discardBtn} onClick={onDiscard}>DISCARD</button>
            <button type="button" className={css.keepBtn} onClick={onCancelDiscard}>KEEP</button>
          </span>
        )}
      </div>
    </div>
  )
}