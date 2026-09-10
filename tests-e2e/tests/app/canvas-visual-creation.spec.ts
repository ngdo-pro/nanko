import { test, expect } from '@playwright/test'
import { env } from '../../config/env'
import { getOrSetupTestUser, createOrResetKeycloakUser } from '../helpers/keycloak'

test.describe('Création Visuelle d\'Éléments sur le Canvas par Roue Radiale et Raccourcis (017)', () => {
  test('Création via la Roue Radiale, raccourcis directs, synchronisation et persistance', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `radial-test-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Visual Creation Architecture ${uniqueSuffix}`
    const docSlug = `visual-creation-${uniqueSuffix}`

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

    // 4. Test de la Roue Radiale : survol du canvas et maintien de la touche 'a'
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()

    const targetX = (canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) / 2
    const targetY = (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) / 2

    await page.mouse.move(targetX, targetY)
    await page.keyboard.down('a')

    // La roue radiale doit apparaître
    const radialMenu = page.getByTestId('radial-menu')
    await expect(radialMenu).toBeVisible()

    const itemRect = page.getByTestId('radial-item-rectangle')
    const itemCircle = page.getByTestId('radial-item-circle')

    await expect(itemRect).toBeVisible()
    await expect(itemCircle).toBeVisible()
    await expect(page.getByTestId('radial-item-text')).not.toBeVisible()

    // Survol du secteur Rectangle puis relâchement de la touche 'a' (marking menu sans clic supplémentaire)
    await itemRect.hover()
    await page.keyboard.up('a')

    // La roue radiale doit disparaître immédiatement
    await expect(radialMenu).not.toBeVisible()

    // Le nouveau rectangle 'rect_1' doit être rendu sur le canvas
    const nodeRect = page.getByTestId('canvas-node-rect_1')
    await expect(nodeRect).toBeVisible()

    // Le code source doit être enrichi
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toHaveValue(/rectangle rect_1 label="Rectangle 1"/)
    await expect(textarea).toHaveValue(/rect_1:\s*x=\d+,\s*y=\d+/)

    // 5. Test du raccourci direct 'c' (création immédiate d'un cercle)
    await page.mouse.move(targetX + 80, targetY + 80)
    await page.keyboard.press('c')

    const nodeCircle = page.getByTestId('canvas-node-circle_1')
    await expect(nodeCircle).toBeVisible()
    await expect(textarea).toHaveValue(/circle circle_1 label="Circle 1"/)

    // 6. Sauvegarde manuelle et vérification de la persistance
    const saveButton = page.getByTestId('save-document-button')
    await saveButton.click()
    await expect(page.getByTestId('saved-status-badge')).toBeVisible()

    // 7. Rechargement de la page et vérification que les 2 éléments sont toujours là
    await page.reload()
    await expect(page.getByTestId('canvas-node-rect_1')).toBeVisible()
    await expect(page.getByTestId('canvas-node-circle_1')).toBeVisible()
  })
})
