import React, { useEffect, useRef } from 'react'

export interface SourceCodeEditorProps {
  value: string
  onChange: (newValue: string) => void
  onSave?: () => void
  disabled?: boolean
}

export const SourceCodeEditor: React.FC<SourceCodeEditorProps> = ({
  value,
  onChange,
  onSave,
  disabled = false,
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

  return (
    <div className="flex h-full font-mono text-sm bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
      {/* Numérotation des lignes */}
      <div
        className="select-none py-4 px-3 bg-slate-900/50 text-slate-600 text-right border-r border-slate-800/80 font-mono text-xs leading-relaxed"
        aria-hidden="true"
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Zone d'édition du code */}
      <textarea
        ref={textareaRef}
        className="flex-1 w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 resize-none outline-none font-mono text-sm leading-relaxed focus:ring-0 selection:bg-brand/30"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="@id mon-document&#10;@layer 0&#10;&#10;rectangle app &quot;Application&quot;&#10;circle db &quot;Database&quot;&#10;app -> db &quot;requêtes SQL&quot;"
        disabled={disabled}
        spellCheck={false}
        data-qa="source-code-textarea"
      />
    </div>
  )
}
