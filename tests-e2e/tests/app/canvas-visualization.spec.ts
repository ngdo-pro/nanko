import { test, expect } from '@playwright/test'
import { env } from '../../config/env'
import { getOrSetupTestUser, createOrResetKeycloakUser } from '../helpers/keycloak'

test.describe('Visualisation Graphique en Canvas Interactif avec React Flow (015)', () => {
  test('Rendu Split, basculement de modes, drag & drop, auto-layout et persistance', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `canvas-test-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Canvas Architecture ${uniqueSuffix}`
    const docSlug = `canvas-arch-${uniqueSuffix}`

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
    await expect(page.getByTestId('active-project-badge')).toBeVisible()

    // 2. Création d'un document
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

    // 3. Arrivée dans l'éditeur de document
    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const editorView = page.getByTestId('document-editor-view')
    await expect(editorView).toBeVisible()

    // Vérification de la disposition pleine largeur (Spec 016)
    const mainContainer = page.locator('main.app-main')
    await expect(mainContainer).toHaveClass(/app-main-fullscreen/)
    const topbar = page.getByTestId('editor-topbar')
    await expect(topbar).toHaveClass(/is-static/)

    // 4. Édition du code source avec 2 shapes et 1 connecteur
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    const nankoCode = [
      '@dsl-version 1',
      'rectangle app label="Application Web" desc="Frontend React SPA haute performance"',
      'circle db label="Base PostgreSQL" desc="Cluster primaire de données"',
      'app -> db label="requêtes SQL" desc="Pool PgBouncer port 5432"',
    ].join('\n')

    await textarea.fill(nankoCode)

    // Sauvegarde initiale
    const saveButton = page.getByTestId('save-document-button')
    await saveButton.click()
    await expect(page.getByTestId('saved-status-badge')).toBeVisible()

    // 5. Validation du Rendu Nominal sur le Canvas en vue Split (Spec 019 : label, desc et tooltips)
    const canvas = page.getByTestId('nanko-canvas')
    await expect(canvas).toBeVisible()

    const nodeApp = page.getByTestId('canvas-node-app')
    const nodeDb = page.getByTestId('canvas-node-db')
    await expect(nodeApp).toBeVisible()
    await expect(nodeDb).toBeVisible()
    await expect(nodeApp).toContainText('Application Web')
    await expect(nodeApp.locator('.nanko-node-desc')).toHaveText('Frontend React SPA haute performance')
    await expect(nodeDb).toContainText('Base PostgreSQL')
    await expect(nodeDb.locator('.nanko-node-desc')).toHaveText('Cluster primaire de données')

    // Survol du nœud app pour déclencher le tooltip Blueprint (délai > 300 ms)
    await nodeApp.hover()
    const nodeTooltip = page.getByTestId('node-tooltip-app')
    await expect(nodeTooltip).toBeVisible({ timeout: 2000 })
    await expect(nodeTooltip).toContainText('Frontend React SPA haute performance')

    // Transition interactive vers le tooltip pendant le délai de grâce (Warhammer pin)
    await nodeTooltip.hover()
    await expect(nodeTooltip).toBeVisible()

    // Un clic sur le tooltip ne sélectionne pas le nœud parent
    await nodeTooltip.click()
    await expect(nodeApp).not.toHaveClass(/is-selected/)

    // Départ du curseur -> disparition du tooltip après délai de grâce
    await page.mouse.move(0, 0)
    await expect(nodeTooltip).not.toBeVisible()

    // Survol du badge de connecteur app -> db pour déclencher le tooltip de connecteur
    const connectorBadge = page.getByTestId('ast-connector-app-db')
    await expect(connectorBadge).toBeVisible()
    await expect(connectorBadge).toContainText('requêtes SQL')
    await expect(connectorBadge).not.toContainText('app → db')
    await expect(page.getByTestId('edge-desc-indicator-app-db')).toBeVisible()

    await connectorBadge.hover()
    const edgeTooltip = page.getByTestId('edge-tooltip-app-db')
    await expect(edgeTooltip).toBeVisible({ timeout: 2000 })
    await expect(edgeTooltip).toContainText('Pool PgBouncer port 5432')

    // Départ du curseur -> disparition du tooltip de connecteur
    await page.mouse.move(0, 0)
    await expect(edgeTooltip).not.toBeVisible()

    // 6. Basculement des modes d'affichage (Split, Canvas, Code)
    const modeCanvasBtn = page.getByTestId('layout-mode-canvas')
    const modeCodeBtn = page.getByTestId('layout-mode-code')
    const modeSplitBtn = page.getByTestId('layout-mode-split')

    // Mode Canvas plein écran avec barre de commandes flottante
    await modeCanvasBtn.click()
    await expect(modeCanvasBtn).toHaveClass(/is-active/)
    await expect(topbar).toHaveClass(/is-floating/)
    await expect(canvas).toBeVisible()
    await expect(textarea).not.toBeVisible()

    // Mode Code plein écran avec barre ancrée
    await modeCodeBtn.click()
    await expect(modeCodeBtn).toHaveClass(/is-active/)
    await expect(topbar).toHaveClass(/is-static/)
    await expect(textarea).toBeVisible()
    await expect(canvas).not.toBeVisible()

    // Retour en Mode Split avec barre ancrée
    await modeSplitBtn.click()
    await expect(modeSplitBtn).toHaveClass(/is-active/)
    await expect(topbar).toHaveClass(/is-static/)
    await expect(textarea).toBeVisible()
    await expect(canvas).toBeVisible()

    // 7. Déplacement d'un nœud (Drag & Drop)
    const appBox = await nodeApp.boundingBox()
    expect(appBox).not.toBeNull()

    if (appBox) {
      await page.mouse.move(appBox.x + appBox.width / 2, appBox.y + appBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(appBox.x + appBox.width / 2 + 120, appBox.y + appBox.height / 2 + 60, { steps: 8 })
      await page.mouse.up()
    }

    // Vérification de la mise à jour immédiate du bloc !LAYOUT dans le code source
    await expect(textarea).toHaveValue(/!LAYOUT[\s\S]*app:\s*x=\d+,\s*y=\d+[\s\S]*!END/)
    await expect(page.getByTestId('unsaved-changes-badge')).toBeVisible()

    // 8. Réorganisation automatique (Auto-Layout)
    const autoLayoutBtn = page.getByTestId('auto-layout-button')
    await expect(autoLayoutBtn).toBeVisible()
    await autoLayoutBtn.click()

    // Vérifier que !LAYOUT contient à la fois app et db
    await expect(textarea).toHaveValue(/!LAYOUT[\s\S]*app:[\s\S]*db:[\s\S]*!END/)

    // 9. Sauvegarde et persistance après rechargement
    await saveButton.click()
    await expect(page.getByTestId('saved-status-badge')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('document-editor-view')).toBeVisible()
    await expect(page.getByTestId('canvas-node-app')).toBeVisible()
    await expect(page.getByTestId('canvas-node-db')).toBeVisible()
    await expect(page.getByTestId('source-code-textarea')).toHaveValue(/!LAYOUT[\s\S]*!END/)
  })
})
