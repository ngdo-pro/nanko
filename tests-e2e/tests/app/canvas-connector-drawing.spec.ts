import { test, expect } from '@playwright/test'
import { env } from '../../config/env'
import { getOrSetupTestUser, createOrResetKeycloakUser } from '../helpers/keycloak'

test.describe('Tracé de Connecteur par Glisser & Magnétisme Automatique (021)', () => {
  test('Tracé complet de connecteur, magnétisme, mise à jour DSL et persistance', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `connector-test-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Connector Architecture ${uniqueSuffix}`
    const docSlug = `connector-drawing-${uniqueSuffix}`

    // 1. Connexion
    await page.goto('/')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    // Formulaire Keycloak
    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    await page.locator('#username').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#kc-login').click()

    // Redirection Dashboard
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)
    const dashboardView = page.getByTestId('dashboard-view')
    await expect(dashboardView).toBeVisible()

    // 2. Création d'un document vierge
    const newDocButton = page.getByTestId('new-document-button')
    await expect(newDocButton).toBeVisible()
    await newDocButton.click()

    const modal = page.getByTestId('create-document-modal')
    await expect(modal).toBeVisible()

    const nameInput = page.getByTestId('document-name-input')
    const slugInput = page.getByTestId('document-slug-input')

    await nameInput.fill(docName)
    await slugInput.fill(docSlug)

    const submitBtn = page.getByTestId('submit-create-document')
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // 3. Arrivée dans l'éditeur
    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const editorView = page.getByTestId('document-editor-view')
    await expect(editorView).toBeVisible()

    const canvas = page.getByTestId('nanko-canvas')
    await expect(canvas).toBeVisible()

    // 4. Définir deux formes distinctes positionnées sur le canvas
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    const initialDsl = `rectangle gateway label="API Gateway"
circle auth label="Auth Service"

!LAYOUT
gateway: x=100, y=150
auth: x=450, y=150
!END
`
    await textarea.fill(initialDsl)

    const nodeGateway = page.getByTestId('canvas-node-gateway')
    const nodeAuth = page.getByTestId('canvas-node-auth')

    await expect(nodeGateway).toBeVisible()
    await expect(nodeAuth).toBeVisible()

    // 5. Localiser les handles d'ancrage source et cible
    const sourceHandle = nodeGateway.locator('.nanko-handle-right')
    const targetHandle = nodeAuth.locator('.nanko-handle-left')

    await expect(sourceHandle).toBeAttached()
    await expect(targetHandle).toBeAttached()

    // Survol du nœud source pour révéler les poignées (style Miro)
    await nodeGateway.hover()
    const sourceBox = await sourceHandle.boundingBox()
    expect(sourceBox).not.toBeNull()

    const targetBox = await targetHandle.boundingBox()
    expect(targetBox).not.toBeNull()

    const startX = (sourceBox?.x ?? 0) + (sourceBox?.width ?? 0) / 2
    const startY = (sourceBox?.y ?? 0) + (sourceBox?.height ?? 0) / 2

    const endX = (targetBox?.x ?? 0) + (targetBox?.width ?? 0) / 2
    const endY = (targetBox?.y ?? 0) + (targetBox?.height ?? 0) / 2

    // 6. Glisser depuis le handle source vers le handle cible
    await page.mouse.move(startX, startY)
    await page.mouse.down()

    // Déplacement intermédiaire vers la cible pour déclencher l'aimantation
    await page.mouse.move(endX - 10, endY, { steps: 5 })
    await page.mouse.move(endX, endY, { steps: 5 })

    // Relâcher sur la cible
    await page.mouse.up()

    // 7. Vérifier que la connexion a été injectée dans le code source
    await expect(textarea).toHaveValue(/gateway\s*->\s*auth/)

    // 8. Vérifier que l'état non enregistré est actif
    const unsavedBadge = page.getByTestId('unsaved-changes-badge')
    await expect(unsavedBadge).toBeVisible()

    // 9. Enregistrer le document
    const saveButton = page.getByTestId('save-document-button')
    await saveButton.click()
    await expect(page.getByTestId('saved-status-badge')).toBeVisible()

    // 10. Recharger la page et vérifier la persistance du connecteur
    await page.reload()
    await expect(page.getByTestId('canvas-node-gateway')).toBeVisible()
    await expect(page.getByTestId('canvas-node-auth')).toBeVisible()
    await expect(textarea).toHaveValue(/gateway\s*->\s*auth/)
  })
})
