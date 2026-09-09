import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/testing/test-utils'
import { DocumentEditorView } from './DocumentEditorView'
import * as documentHooks from '@/features/documents'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

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

  it('permet de basculer entre les modes Split, Canvas et Code', async () => {
    const user = userEvent.setup()

    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: {
        id: 'doc-456',
        projectId: 'proj-123',
        name: 'Architecture Test',
        slug: 'architecture-test',
        layer: 0,
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

    // Mode initial : Split
    expect(screen.getByTestId('layout-mode-split')).toHaveClass('is-active')
    expect(screen.getByTestId('editor-topbar')).toHaveClass('is-static')
    expect(screen.getByTestId('source-code-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('nanko-canvas')).toBeInTheDocument()

    // Basculement vers Canvas
    await user.click(screen.getByTestId('layout-mode-canvas'))
    expect(screen.getByTestId('layout-mode-canvas')).toHaveClass('is-active')
    expect(screen.getByTestId('editor-topbar')).toHaveClass('is-floating')
    expect(screen.getByTestId('nanko-canvas')).toBeInTheDocument()
    expect(screen.queryByTestId('source-code-textarea')).not.toBeInTheDocument()

    // Basculement vers Code
    await user.click(screen.getByTestId('layout-mode-code'))
    expect(screen.getByTestId('layout-mode-code')).toHaveClass('is-active')
    expect(screen.getByTestId('editor-topbar')).toHaveClass('is-static')
    expect(screen.getByTestId('source-code-textarea')).toBeInTheDocument()
    expect(screen.queryByTestId('nanko-canvas')).not.toBeInTheDocument()

    // Retour vers Split
    await user.click(screen.getByTestId('layout-mode-split'))
    expect(screen.getByTestId('layout-mode-split')).toHaveClass('is-active')
    expect(screen.getByTestId('editor-topbar')).toHaveClass('is-static')
    expect(screen.getByTestId('source-code-textarea')).toBeInTheDocument()
    expect(screen.getByTestId('nanko-canvas')).toBeInTheDocument()
  })

  it('affiche correctement les shapes sur le canvas lors du clic sur le bouton Canvas après modification du code', async () => {
    const user = userEvent.setup()

    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: {
        id: 'doc-456',
        projectId: 'proj-123',
        name: 'Architecture Test',
        slug: 'architecture-test',
        layer: 0,
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

    // Modification du code dans l'éditeur
    const textarea = screen.getByTestId('source-code-textarea')
    await user.clear(textarea)
    await user.type(textarea, 'rectangle api "API Gateway"{enter}circle db "Database"')

    // Clic sur le bouton Canvas
    const canvasBtn = screen.getByTestId('layout-mode-canvas')
    await user.click(canvasBtn)

    // Le canvas doit afficher les nouvelles shapes même avant sauvegarde
    expect(screen.getByTestId('canvas-node-api')).toBeInTheDocument()
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByTestId('canvas-node-db')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
  })

  it('met à jour le code source et le canvas lors de la création d\'une shape via le canvas', async () => {
    vi.mocked(documentHooks.useDocument).mockReturnValue({
      data: {
        id: 'doc-456',
        projectId: 'proj-123',
        name: 'Architecture Test',
        slug: 'architecture-test',
        layer: 0,
        sourceCode: 'rectangle front "Front"',
        ast: {
          shapes: [{ id: 'front', type: 'rectangle', label: 'Front' }],
          connectors: [],
          layout: { front: { x: 10, y: 20 } },
        },
        createdAt: '2026-09-06T12:00:00Z',
        updatedAt: '2026-09-06T12:00:00Z',
      },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof documentHooks.useDocument>)

    renderWithProviders(<DocumentEditorView />)

    const canvas = screen.getByTestId('nanko-canvas')
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.pointerEnter(canvas, { clientX: 200, clientY: 200 })

    // Déclencher le raccourci direct 'c' pour créer un cercle
    fireEvent.keyDown(window, { key: 'c' })

    // Le code source dans le textarea doit maintenant contenir circle_1
    const textarea = screen.getByTestId('source-code-textarea') as HTMLTextAreaElement
    expect(textarea.value).toContain('circle circle_1 "Circle 1"')
    expect(textarea.value).toContain('circle_1: x=')

    // Le nouveau nœud doit être présent dans le rendu
    expect(screen.getByTestId('canvas-node-circle_1')).toBeInTheDocument()
  })
})


