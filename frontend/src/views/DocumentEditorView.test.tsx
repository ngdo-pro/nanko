import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/testing/test-utils'
import { DocumentEditorView } from './DocumentEditorView'
import * as documentHooks from '@/features/documents'

vi.mock('@/features/documents', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/documents')>()
  return {
    ...actual,
    useDocument: vi.fn(),
    useUpdateDocument: vi.fn(),
  }
})

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useParams: vi.fn(() => ({
      projectId: 'proj-123',
      documentId: 'doc-456',
    })),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

describe('DocumentEditorView', () => {
  const mockMutateAsync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(documentHooks.useUpdateDocument).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof documentHooks.useUpdateDocument>)
  })

  it('affiche le document, son layer et son inspecteur AST', () => {
    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: {
        id: 'doc-456',
        projectId: 'proj-123',
        name: 'Architecture Test',
        slug: 'architecture-test',
        layer: 1,
        sourceCode: 'rectangle front "Front"',
        ast: {
          shapes: [{ id: 'front', type: 'rectangle', label: 'Front' }],
          connectors: [],
          layout: {},
        },
        createdAt: '2026-09-06T12:00:00Z',
        updatedAt: '2026-09-06T12:00:00Z',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof documentHooks.useDocument>)

    renderWithProviders(<DocumentEditorView />)

    expect(screen.getByTestId('document-title')).toHaveTextContent('Architecture Test')
    expect(screen.getByTestId('document-layer-badge')).toHaveTextContent('Layer 1')
    expect(screen.getByTestId('source-code-textarea')).toHaveValue('rectangle front "Front"')
    expect(screen.getByTestId('ast-shape-front')).toBeInTheDocument()
    expect(screen.getByTestId('saved-status-badge')).toBeInTheDocument()
  })

  it('intercepte beforeunload en cas de modifications non enregistrées', async () => {
    const user = userEvent.setup()

    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: {
        id: 'doc-456',
        projectId: 'proj-123',
        name: 'Architecture Test',
        slug: 'architecture-test',
        layer: 0,
        sourceCode: 'initial',
        ast: { shapes: [], connectors: [], layout: {} },
        createdAt: '2026-09-06T12:00:00Z',
        updatedAt: '2026-09-06T12:00:00Z',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof documentHooks.useDocument>)

    renderWithProviders(<DocumentEditorView />)

    const textarea = screen.getByTestId('source-code-textarea')
    await user.type(textarea, ' modification')

    expect(screen.getByTestId('unsaved-changes-badge')).toBeInTheDocument()

    // Déclenchement de l'événement beforeunload
    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true })
    const preventDefaultSpy = vi.spyOn(beforeUnloadEvent, 'preventDefault')

    window.dispatchEvent(beforeUnloadEvent)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('affiche un écran d erreur si le document est introuvable', () => {
    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    } as unknown as ReturnType<typeof documentHooks.useDocument>)

    renderWithProviders(<DocumentEditorView />)

    expect(screen.getByTestId('document-error-view')).toBeInTheDocument()
    expect(screen.getByText(/Document introuvable/i)).toBeInTheDocument()
  })
})
