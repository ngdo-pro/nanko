import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceCodeEditor } from './SourceCodeEditor'

describe('SourceCodeEditor', () => {
  it('affiche le code source et la numérotation des lignes', () => {
    const code = 'rectangle app "App"\ncircle db "DB"'
    render(<SourceCodeEditor value={code} onChange={vi.fn()} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue(code)
  })

  it('appelle onChange lorsque l utilisateur saisit du texte', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<SourceCodeEditor value="" onChange={handleChange} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'a')

    expect(handleChange).toHaveBeenCalled()
  })

  it('déclenche onSave lors de la combinaison de touches Cmd+S', () => {
    const handleSave = vi.fn()
    render(<SourceCodeEditor value="test" onChange={vi.fn()} onSave={handleSave} />)

    fireEvent.keyDown(window, { key: 's', metaKey: true })
    expect(handleSave).toHaveBeenCalledTimes(1)
  })

  it('déclenche onSave lors de la combinaison de touches Ctrl+S', () => {
    const handleSave = vi.fn()
    render(<SourceCodeEditor value="test" onChange={vi.fn()} onSave={handleSave} />)

    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(handleSave).toHaveBeenCalledTimes(1)
  })

  it('insère 2 espaces lors de l appui sur Tab', () => {
    const handleChange = vi.fn()
    render(<SourceCodeEditor value="hello" onChange={handleChange} />)

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    textarea.selectionStart = 5
    textarea.selectionEnd = 5

    fireEvent.keyDown(textarea, { key: 'Tab' })
    expect(handleChange).toHaveBeenCalledWith('hello  ')
  })
})
