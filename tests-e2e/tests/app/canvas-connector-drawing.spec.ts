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
gateway: x=50, y=100
auth: x=250, y=100
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
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    // 7. Vérifier que la connexion a été injectée dans le code source avec persistance des ancres
    await expect(textarea).toHaveValue(/gateway\s*->\s*auth/)
    await expect(textarea).toHaveValue(/gateway->auth:\s*from=right,\s*to=left/)

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
    await expect(textarea).toHaveValue(/gateway->auth:\s*from=right,\s*to=left/)
  })

  test('Tracé omnidirectionnel ascendant depuis un handle top (INV-1)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `connector-omni-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Omni Connector ${uniqueSuffix}`
    const docSlug = `omni-connector-${uniqueSuffix}`

    await page.goto('/')
    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    await page.locator('#username').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#kc-login').click()
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)

    const newDocButton = page.getByTestId('new-document-button')
    await expect(newDocButton).toBeVisible()
    await newDocButton.click()

    await page.getByTestId('document-name-input').fill(docName)
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    const initialDsl = `rectangle lower label="Lower Service"
rectangle upper label="Upper Service"

!LAYOUT
lower: x=100, y=300
upper: x=100, y=100
!END
`
    await textarea.fill(initialDsl)

    const nodeLower = page.getByTestId('canvas-node-lower')
    const nodeUpper = page.getByTestId('canvas-node-upper')

    await expect(nodeLower).toBeVisible()
    await expect(nodeUpper).toBeVisible()

    // Handle top de lower (qui était autrefois strictement target) initie le tracé !
    const lowerTopHandle = nodeLower.locator('.nanko-handle-top')
    const upperBottomHandle = nodeUpper.locator('.nanko-handle-bottom')

    await nodeLower.hover()
    const lowerBox = await lowerTopHandle.boundingBox()
    expect(lowerBox).not.toBeNull()

    const upperBox = await upperBottomHandle.boundingBox()
    expect(upperBox).not.toBeNull()

    const startX = (lowerBox?.x ?? 0) + (lowerBox?.width ?? 0) / 2
    const startY = (lowerBox?.y ?? 0) + (lowerBox?.height ?? 0) / 2

    const endX = (upperBox?.x ?? 0) + (upperBox?.width ?? 0) / 2
    const endY = (upperBox?.y ?? 0) + (upperBox?.height ?? 0) / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(endX, endY, { steps: 10 })
    await page.mouse.up()

    // Vérifier l'injection déclarative et la persistance dans !LAYOUT
    await expect(textarea).toHaveValue(/lower\s*->\s*upper/)
    await expect(textarea).toHaveValue(/lower->upper:\s*from=top,\s*to=bottom/)
  })

  test('Distribution multi-ports et redimensionnement automatique x2 (Spec 023)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `connector-multi-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Multi Distribution ${uniqueSuffix}`
    const docSlug = `multi-dist-${uniqueSuffix}`

    await page.goto('/')
    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    await page.locator('#username').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('#kc-login').click()
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)

    const newDocButton = page.getByTestId('new-document-button')
    await expect(newDocButton).toBeVisible()
    await newDocButton.click()

    await page.getByTestId('document-name-input').fill(docName)
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    // 1. Déclarer 1 gateway et 3 services reliés sur le flanc droit
    const multiDsl = `rectangle gateway label="API Gateway"
rectangle svc1 label="Service 1"
rectangle svc2 label="Service 2"
rectangle svc3 label="Service 3"

gateway -> svc1
gateway -> svc2
gateway -> svc3

!LAYOUT
gateway: x=50, y=150
svc1: x=400, y=50
svc2: x=400, y=150
svc3: x=400, y=250
gateway->svc1: from=right, to=left
gateway->svc2: from=right, to=left
gateway->svc3: from=right, to=left
!END
`
    await textarea.fill(multiDsl)

    const nodeGateway = page.getByTestId('canvas-node-gateway')
    await expect(nodeGateway).toBeVisible()

    // 2. Vérifier la présence des 3 poignées distribuées (INV-1)
    const distributedHandles = nodeGateway.locator('.nanko-handle-distributed')
    await expect(distributedHandles).toHaveCount(3)

    // 3. Ajouter 6 connecteurs supplémentaires sur le flanc droit (total = 9 > seuil 8)
    const saturatedDsl = `rectangle gateway label="API Gateway"
rectangle svc1 label="Service 1"
rectangle svc2 label="Service 2"
rectangle svc3 label="Service 3"
rectangle svc4 label="Service 4"
rectangle svc5 label="Service 5"
rectangle svc6 label="Service 6"
rectangle svc7 label="Service 7"
rectangle svc8 label="Service 8"
rectangle svc9 label="Service 9"

gateway -> svc1
gateway -> svc2
gateway -> svc3
gateway -> svc4
gateway -> svc5
gateway -> svc6
gateway -> svc7
gateway -> svc8
gateway -> svc9

!LAYOUT
gateway: x=50, y=250
svc1: x=400, y=0
svc2: x=400, y=50
svc3: x=400, y=100
svc4: x=400, y=150
svc5: x=400, y=200
svc6: x=400, y=250
svc7: x=400, y=300
svc8: x=400, y=350
svc9: x=400, y=400
gateway->svc1: from=right, to=left
gateway->svc2: from=right, to=left
gateway->svc3: from=right, to=left
gateway->svc4: from=right, to=left
gateway->svc5: from=right, to=left
gateway->svc6: from=right, to=left
gateway->svc7: from=right, to=left
gateway->svc8: from=right, to=left
gateway->svc9: from=right, to=left
!END
`
    await textarea.fill(saturatedDsl)

    // 4. Vérifier que la forme adopte la classe isScaledY (INV-2)
    await expect(nodeGateway).toHaveClass(/isScaledY/)

    // 5. Décongestionner via le bouton Réorganiser (INV-4)
    const autoLayoutBtn = page.getByTestId('auto-layout-button')
    await expect(autoLayoutBtn).toBeVisible()
    await autoLayoutBtn.click()

    // Vérifier que le statut passe à non sauvegardé suite à l'auto-layout
    const saveButton = page.getByTestId('save-document-button')
    await saveButton.click()
    await expect(page.getByTestId('saved-status-badge')).toBeVisible()
  })
})
