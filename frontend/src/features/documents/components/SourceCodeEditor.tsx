import React, { useEffect, useRef } from 'react'
import clsx from 'clsx'
import styles from './SourceCodeEditor.module.css'

export interface SourceCodeEditorProps {
  value: string
  onChange: (newValue: string) => void
  onSave?: () => void
  disabled?: boolean
  documentSlug?: string
}

export const SourceCodeEditor: React.FC<SourceCodeEditorProps> = ({
  value,
  onChange,
  onSave,
  disabled = false,
  documentSlug,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onSave?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const updated = value.substring(0, start) + '  ' + value.substring(end)
      onChange(updated)

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }

  const lines = value.split('\n')
  const fileName = documentSlug ? `${documentSlug}.nanko` : 'document.nanko'

  return (
    <div className={clsx(styles.sourceEditorPanel, 'source-editor-panel')} data-qa="source-code-editor">
      {/* En-tête de l'onglet code */}
      <div className={clsx(styles.sourceEditorHeader, 'source-editor-header')}>
        <div className={clsx(styles.sourceEditorTab, 'source-editor-tab')}>
          <span className={clsx(styles.tabBadgeNanko, 'tab-badge-nanko')}>NANKO</span>
          <span>{fileName}</span>
        </div>
        <span className={clsx(styles.sourceEditorHints, 'source-editor-hints')}>
          {lines.length} {lines.length === 1 ? 'ligne' : 'lignes'} &middot; Tab = 2 espaces &middot; Cmd+S
        </span>
      </div>

      {/* Corps avec numérotation et zone d'écriture */}
      <div className={clsx(styles.sourceEditorBody, 'source-editor-body')}>
        <div className={clsx(styles.editorLineNumbers, 'editor-line-numbers')} aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i} className={clsx(styles.editorLineNumber, 'editor-line-number')}>
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className={clsx(styles.editorTextarea, 'editor-textarea')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="@id mon-document&#10;@layer 0&#10;&#10;rectangle app &quot;Application&quot;&#10;circle db &quot;Database&quot;&#10;app -> db &quot;requêtes SQL&quot;"
          disabled={disabled}
          spellCheck={false}
          data-qa="source-code-textarea"
        />
      </div>
    </div>
  )
}
