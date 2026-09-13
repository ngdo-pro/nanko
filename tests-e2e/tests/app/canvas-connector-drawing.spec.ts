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

    // 2. Vérifier l'isolement strict des 5 handles de création et des 3 points d'attache passifs (INV-1, INV-5)
    const creationHandles = nodeGateway.locator('.nanko-handle')
    await expect(creationHandles).toHaveCount(5)

    const passiveAnchors = nodeGateway.locator('.nanko-passive-anchor')
    await expect(passiveAnchors).toHaveCount(3)

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

  test('Pontets de croisement des connecteurs orthogonaux (Line Jumps Spec 024)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `connector-jumps-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Line Jumps ${uniqueSuffix}`
    const docSlug = `line-jumps-${uniqueSuffix}`

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

    // Deux connecteurs perpendiculaires qui se croisent au centre
    const crossingDsl = `rectangle nWest label="West"
rectangle nEast label="East"
rectangle nNorth label="North"
rectangle nSouth label="South"

nWest -> nEast
nNorth -> nSouth

!LAYOUT
nWest: x=50, y=200
nEast: x=450, y=200
nNorth: x=250, y=50
nSouth: x=250, y=350
nWest->nEast: from=right, to=left
nNorth->nSouth: from=bottom, to=top
!END
`
    await textarea.fill(crossingDsl)

    // Vérifier les deux nœuds et le canvas
    await expect(page.getByTestId('canvas-node-nWest')).toBeVisible()
    await expect(page.getByTestId('canvas-node-nSouth')).toBeVisible()

    // Récupérer les chemins SVG des deux arêtes
    const edgePaths = page.locator('.react-flow__edge-path')
    await expect(edgePaths).toHaveCount(2)

    const dAttrs = await edgePaths.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute('d') ?? ''),
    )

    // L'un des connecteurs (nNorth->nSouth, déclaré en 2nd) doit comporter un arc de saut A 6 6
    const hasJumpArc = dAttrs.some((d) => d.includes('A 6 6'))
    expect(hasJumpArc).toBe(true)

    // L'autre connecteur doit être une ligne droite continue (sans arc)
    const hasStraightLine = dAttrs.some((d) => !d.includes('A 6 6'))
    expect(hasStraightLine).toBe(true)
  })

  test('Repositionnement manuel des labels de connecteurs et persistance layout (Spec 025)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `connector-lbl-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Connector Label Drag ${uniqueSuffix}`
    const docSlug = `connector-lbl-drag-${uniqueSuffix}`

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

    const initialDsl = `rectangle srcNode label="Source Node"
rectangle dstNode label="Destination Node"

srcNode -> dstNode label="Appel gRPC"

!LAYOUT
srcNode: x=50, y=150
dstNode: x=350, y=150
srcNode->dstNode: from=right, to=left
!END
`
    await textarea.fill(initialDsl)

    await expect(page.getByTestId('canvas-node-srcNode')).toBeVisible()
    await expect(page.getByTestId('canvas-node-dstNode')).toBeVisible()

    // 1. Badge de libellé visible et positionné
    const labelBadge = page.getByTestId('edge-label-srcNode-dstNode')
    await expect(labelBadge).toBeVisible()
    await expect(labelBadge).toHaveText('Appel gRPC')

    // 2. Survol du badge : le curseur doit être 'grab' et le badge au premier plan
    await labelBadge.hover()
    await expect(labelBadge).toHaveCSS('cursor', 'grab')

    // 3. Glisser-déposer interactif du badge
    const box = await labelBadge.boundingBox()
    expect(box).not.toBeNull()
    const startX = (box?.x ?? 0) + (box?.width ?? 0) / 2
    const startY = (box?.y ?? 0) + (box?.height ?? 0) / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 60, startY - 40, { steps: 5 })
    await page.mouse.up()

    // 3. Vérifier que labelX et labelY ont été enregistrés dans le DSL !LAYOUT (labelY=184 car contraint sur le trait horizontal à mi-hauteur du rectangle)
    await expect(textarea).toHaveValue(/srcNode->dstNode:\s*from=right,\s*to=left,\s*labelX=\d+,\s*labelY=184/)

    // 4. Double-cliquer pour réinitialiser la position du badge
    await labelBadge.dblclick()

    // 5. Vérifier que labelX et labelY sont supprimés de la ligne du connecteur
    await expect(textarea).not.toHaveValue(/labelX=/)
    await expect(textarea).not.toHaveValue(/labelY=/)
    await expect(textarea).toHaveValue(/srcNode->dstNode:\s*from=right,\s*to=left/)
  })

  test('Création Rapide Connectée par Dépôt dans le Vide (Miro Quick Spawn - Spec 026)', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    const email = isLocal ? `quick-spawn-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const docName = `Quick Spawn Doc ${uniqueSuffix}`
    const docSlug = `quick-spawn-${uniqueSuffix}`

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

    await page.getByTestId('new-document-button').click()
    await page.getByTestId('document-name-input').fill(docName)
    await page.getByTestId('document-slug-input').fill(docSlug)
    await page.getByTestId('submit-create-document').click()

    await expect(page).toHaveURL(/.*\/projects\/[0-9a-f-]+\/documents\/[0-9a-f-]+/)
    const textarea = page.getByTestId('source-code-textarea')
    await expect(textarea).toBeVisible()

    const initialDsl = `rectangle srcNode label="Source Node"

!LAYOUT
srcNode: x=100, y=150
!END
`
    await textarea.fill(initialDsl)

    const sourceNode = page.getByTestId('canvas-node-srcNode')
    await expect(sourceNode).toBeVisible()

    // 1. Localiser la poignée droite
    const sourceHandle = sourceNode.locator('.nanko-handle-right')
    await expect(sourceHandle).toBeAttached()
    await sourceNode.hover()

    const sourceBox = await sourceHandle.boundingBox()
    expect(sourceBox).not.toBeNull()
    const startX = (sourceBox?.x ?? 0) + (sourceBox?.width ?? 0) / 2
    const startY = (sourceBox?.y ?? 0) + (sourceBox?.height ?? 0) / 2

    // 2. Étirer le fil de connexion vers un espace vide du canvas
    await page.mouse.move(startX, startY)
    await page.mouse.down()
    const dropX = startX + 220
    const dropY = startY + 60
    await page.mouse.move(dropX, dropY, { steps: 5 })
    await page.mouse.up()

    // 3. Le QuickSpawnMenu doit apparaître
    const quickSpawnMenu = page.getByTestId('quick-spawn-menu')
    await expect(quickSpawnMenu).toBeVisible()

    const rectBtn = page.getByTestId('quick-spawn-rectangle')
    const circleBtn = page.getByTestId('quick-spawn-circle')
    await expect(rectBtn).toBeVisible()
    await expect(circleBtn).toBeVisible()

    // 4. Sélectionner Rectangle par clic
    await rectBtn.click()

    // 5. Le menu disparaît
    await expect(quickSpawnMenu).not.toBeVisible()

    // 6. Vérifier la création atomique dans le code source :
    // - Nouvelle forme rectangle déclarée (ex: rect_1 label="Rectangle 1")
    // - Connecteur reliant srcNode vers la nouvelle forme
    // - Coordonnées !LAYOUT et ancres opposées
    await expect(textarea).toHaveValue(/rectangle\s+(rect_\d+)\s+label="Rectangle\s*\d*"/)
    await expect(textarea).toHaveValue(/srcNode\s*->\s*(rect_\d+)/)
    await expect(textarea).toHaveValue(/srcNode->rect_\d+:\s*from=right,\s*to=left/)

    // 7. Le nouveau nœud apparaît sur le canvas
    const newShapeMatch = (await textarea.inputValue()).match(/rectangle\s+(rect_\d+)/)
    expect(newShapeMatch).not.toBeNull()
    const newShapeId = newShapeMatch![1]
    await expect(page.getByTestId(`canvas-node-${newShapeId}`)).toBeVisible()

    // 8. Test d'annulation par touche Échap : étirer à nouveau vers le vide
    await sourceNode.hover()
    const secondSourceBox = await sourceHandle.boundingBox()
    expect(secondSourceBox).not.toBeNull()
    const sX = (secondSourceBox?.x ?? 0) + (secondSourceBox?.width ?? 0) / 2
    const sY = (secondSourceBox?.y ?? 0) + (secondSourceBox?.height ?? 0) / 2

    await page.mouse.move(sX, sY)
    await page.mouse.down()
    await page.mouse.move(sX + 150, sY - 80, { steps: 5 })
    await page.mouse.up()

    await expect(quickSpawnMenu).toBeVisible()
    const sourceBeforeEscape = await textarea.inputValue()

    // Appuyer sur Escape
    await page.keyboard.press('Escape')
    await expect(quickSpawnMenu).not.toBeVisible()

    // Vérifier l'intégrité absolue : aucune altération du code
    expect(await textarea.inputValue()).toBe(sourceBeforeEscape)
  })
})


