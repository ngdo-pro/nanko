import { test, expect } from '@playwright/test'
import { env } from '../../config/env'
import { getOrSetupTestUser, createOrResetKeycloakUser } from '../helpers/keycloak'

test.describe('Gestion des Organisations et des Projets (WorkspaceManagement)', () => {
  test('Auto-provisioning solo transparent et création de projet', async ({ page }) => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const baseUser = await getOrSetupTestUser()
    const isLocal = !env.testUser.username

    // En local, on crée un nouvel utilisateur dédié pour tester le premier accès transparent
    const email = isLocal ? `workspace-${uniqueSuffix}@nanko.dev` : baseUser.email
    const password = baseUser.password
    if (isLocal) {
      await createOrResetKeycloakUser(email, password)
    }

    const projectName = isLocal ? 'Microservices Core' : `Microservices Core ${uniqueSuffix}`
    const projectSlug = isLocal ? 'microservices-core' : `microservices-core-${uniqueSuffix}`

    await page.goto('/')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()
    await loginButton.click()

    // Mire Keycloak
    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)
    const usernameInput = page.locator('#username')
    const passwordInput = page.locator('#password')
    const submitButton = page.locator('#kc-login')

    await expect(usernameInput).toBeVisible()
    await usernameInput.fill(email)
    await passwordInput.fill(password)
    await submitButton.click()

    // Redirection vers le tableau de bord
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)
    const dashboardView = page.getByTestId('dashboard-view')
    await expect(dashboardView).toBeVisible()

    // Scénario 1 : Première connexion solo transparente
    // L'organisation switcher est masqué en mode solo
    const orgSwitcher = page.getByTestId('organisation-switcher')
    await expect(orgSwitcher).not.toBeVisible()

    // "Mon premier projet" est présent et actif
    const initialProjectCard = page.getByTestId('project-card-mon-premier-projet')
    await expect(initialProjectCard).toBeVisible()
    await expect(initialProjectCard.getByTestId('active-project-badge')).toBeVisible()

    // Le projet actif est également reflété dans la barre de navigation
    const activeProjectSelect = page.getByTestId('active-project-select')
    await expect(activeProjectSelect).toBeVisible()
    await expect(activeProjectSelect).toHaveValue(/^[0-9a-f-]+$/)

    // Scénario 2 : Création d'un nouveau projet
    const newProjectBtn = page.getByTestId('new-project-button')
    await expect(newProjectBtn).toBeVisible()
    await newProjectBtn.click()

    // Modale de création
    const modal = page.getByTestId('create-project-modal')
    await expect(modal).toBeVisible()

    const nameInput = page.getByTestId('project-name-input')
    const slugInput = page.getByTestId('project-slug-input')

    await nameInput.fill(projectName)
    await expect(slugInput).toHaveValue(projectSlug)

    const submitCreateBtn = page.getByTestId('submit-create-project')
    await submitCreateBtn.click()

    // La modale se ferme
    await expect(modal).not.toBeVisible()

    // Le nouveau projet apparaît et devient actif
    const newProjectCard = page.getByTestId(`project-card-${projectSlug}`)
    await expect(newProjectCard).toBeVisible()
    await expect(newProjectCard.getByTestId('active-project-badge')).toBeVisible()

    // Le sélecteur de projet du header affiche le nouveau projet sélectionné
    const selectedOption = activeProjectSelect.locator('option:checked')
    await expect(selectedOption).toHaveText(projectName)
  })
})
