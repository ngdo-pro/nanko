import React, { useEffect, useRef } from 'react'

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
    <div className="source-editor-panel" data-qa="source-code-editor">
      {/* En-tête de l'onglet code */}
      <div className="source-editor-header">
        <div className="source-editor-tab">
          <span className="tab-badge-nanko">NANKO</span>
          <span>{fileName}</span>
        </div>
        <span className="source-editor-hints">
          {lines.length} {lines.length === 1 ? 'ligne' : 'lignes'} &middot; Tab = 2 espaces &middot; Cmd+S
        </span>
      </div>

      {/* Corps avec numérotation et zone d'écriture */}
      <div className="source-editor-body">
        <div className="editor-line-numbers" aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i} className="editor-line-number">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="editor-textarea"
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
