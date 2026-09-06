import { test, expect } from '@playwright/test'
import { getOrSetupTestUser, createOrResetKeycloakUser } from '../helpers/keycloak'

test.describe('Gestion des Documents et Édition .nanko (014)', () => {
  test('Création nominale, édition .nanko, persistance AST et rechargement', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !process.env.E2E_USERNAME

    const email = isLocal ? `doc-test-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Architecture E-Commerce ${uniqueSuffix}`
    const docSlug = `arch-ecom-${uniqueSuffix}`

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

    // Redirection Dashboard et attente du chargement complet du projet actif
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)
    const dashboardView = page.getByTestId('dashboard-view')
    await expect(dashboardView).toBeVisible()
    await expect(page.getByTestId('active-project-badge')).toBeVisible()

    // 2. Création d'un nouveau document
    const newDocButton = page.getByTestId('new-document-button')
    await expect(newDocButton).toBeVisible()
    await newDocButton.click()

    // Modale de création
    const modal = page.getByTestId('create-document-modal')
    await expect(modal).toBeVisible()

    const nameInput = page.getByTestId('document-name-input')
    const slugInput = page.getByTestId('document-slug-input')

    await nameInput.fill(docName)
    // Saisie explicite du slug
    await slugInput.fill(docSlug)

    const submitBtn = page.getByTestId('submit-create-document')
    await expect(submitBtn).toBeEnabled()
    await submitBtn.click()

    // 3. Redirection automatique vers l'éditeur de document
    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const editorView = page.getByTestId('document-editor-view')
    await expect(editorView).toBeVisible()

    // Vérification de l'en-tête du document
    await expect(page.getByTestId('document-title')).toHaveText(docName)
    await expect(page.getByTestId('document-layer-badge')).toHaveText('Layer 0')

    // 4. Édition du code source .nanko
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    const nankoCode = [
      'rectangle front "Storefront Next.js"',
      'circle api "Catalogue API"',
      'front -> api "fetch products"',
    ].join('\n')

    await textarea.fill(nankoCode)

    // Vérifier l'indicateur de modifications non enregistrées
    const unsavedBadge = page.getByTestId('unsaved-changes-badge')
    await expect(unsavedBadge).toBeVisible()

    // 5. Sauvegarde
    const saveButton = page.getByTestId('save-document-button')
    await saveButton.click()

    // Statut enregistré
    const savedBadge = page.getByTestId('saved-status-badge')
    await expect(savedBadge).toBeVisible()

    // 6. Vérification de l'AST inspecté
    const shapeFront = page.getByTestId('ast-shape-front')
    const shapeApi = page.getByTestId('ast-shape-api')
    const connector = page.getByTestId('ast-connector-front-api')

    await expect(shapeFront).toBeVisible()
    await expect(shapeFront).toContainText('Storefront Next.js')
    await expect(shapeApi).toBeVisible()
    await expect(shapeApi).toContainText('Catalogue API')
    await expect(connector).toBeVisible()
    await expect(connector).toContainText('front')
    await expect(connector).toContainText('api')

    // 7. Persistance après rafraîchissement
    await page.reload()
    await expect(editorView).toBeVisible()
    await expect(page.getByTestId('source-code-textarea')).toHaveValue(nankoCode)
    await expect(shapeFront).toBeVisible()
    await expect(shapeApi).toBeVisible()
    await expect(connector).toBeVisible()

    // 8. Retour au Dashboard et présence du document dans la liste
    const backButton = page.getByTestId('back-to-project-button')
    await backButton.click()
    await expect(dashboardView).toBeVisible()

    const docCard = page.getByTestId(`document-card-${docSlug}`)
    await expect(docCard).toBeVisible()
    await expect(docCard).toContainText(docName)
  })

  test('Détection d une erreur de syntaxe .nanko et préservation de la saisie', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !process.env.E2E_USERNAME

    const email = isLocal ? `doc-err-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Doc Syntax Error ${uniqueSuffix}`
    const docSlug = `doc-err-${uniqueSuffix}`

    await page.goto('/')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    await page.locator('#username').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#kc-login').click()

    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)
    await expect(page.getByTestId('dashboard-view')).toBeVisible()
    await expect(page.getByTestId('active-project-badge')).toBeVisible()

    // Création
    await page.getByTestId('new-document-button').click()
    const modal = page.getByTestId('create-document-modal')
    await expect(modal).toBeVisible()

    await page.getByTestId('document-name-input').fill(docName)
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    // Code avec référence cible inexistante
    const invalidCode = 'rectangle app "Mon App"\napp -> service_inconnu "call"'
    await textarea.fill(invalidCode)

    await page.getByTestId('save-document-button').click()

    // Vérification de la bannière d'erreur de syntaxe
    const syntaxErrorBanner = page.getByTestId('syntax-error-alert')
    await expect(syntaxErrorBanner).toBeVisible()
    await expect(syntaxErrorBanner).toContainText('service_inconnu')

    // Le code reste intact dans l'éditeur
    await expect(textarea).toHaveValue(invalidCode)
  })

  test('Rejet d un slug de document en doublon dans le même projet', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !process.env.E2E_USERNAME

    const email = isLocal ? `doc-dup-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docSlug = `unique-slug-${uniqueSuffix}`

    await page.goto('/')
    await page.getByTestId('login-button').click()

    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    await page.locator('#username').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#kc-login').click()

    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)
    await expect(page.getByTestId('dashboard-view')).toBeVisible()
    await expect(page.getByTestId('active-project-badge')).toBeVisible()

    // 1. Création premier doc
    await page.getByTestId('new-document-button').click()
    const modal = page.getByTestId('create-document-modal')
    await expect(modal).toBeVisible()

    await page.getByTestId('document-name-input').fill('Premier Document')
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)

    // Retour Dashboard
    await page.getByTestId('back-to-project-button').click()
    await expect(page.getByTestId('dashboard-view')).toBeVisible()

    // 2. Tentative de création avec le même slug
    // Comme des documents existent déjà, le bouton "+ Nouveau Document" est dans l'en-tête de la liste
    await page.getByTestId('new-document-button').click()
    await expect(page.getByTestId('create-document-modal')).toBeVisible()

    await page.getByTestId('document-name-input').fill('Deuxième Document')
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    // Erreur de conflit affichée
    const formError = page.getByTestId('document-form-error')
    await expect(formError).toBeVisible()
    await expect(formError).toContainText('existe déjà dans ce projet')
  })
})
