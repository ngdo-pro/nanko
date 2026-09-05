import { test, expect } from '@playwright/test'
import { getOrSetupTestUser } from '../helpers/keycloak'

test.describe('Authentification avec Keycloak', () => {
  test('Connexion utilisateur réussie via Keycloak', async ({ page }) => {
    const { email, password } = await getOrSetupTestUser()

    await page.goto('/')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()

    await loginButton.click()

    // Redirection vers la mire Keycloak
    await expect(page).toHaveURL(/.*\/realms\/nanko\/protocol\/openid-connect\/auth.*/)

    const usernameInput = page.locator('#username')
    const passwordInput = page.locator('#password')
    const submitButton = page.locator('#kc-login')

    await expect(usernameInput).toBeVisible()
    await usernameInput.fill(email)
    await passwordInput.fill(password)
    await submitButton.click()

    // Redirection vers Nanko et affichage du profil
    await expect(page).toHaveURL(/.*localhost:45173.*|.*app.*nanko\.dev.*/)

    const userMenu = page.getByTestId('user-menu')
    await expect(userMenu).toBeVisible()
    const userEmail = page.getByTestId('user-email')
    await expect(userEmail).toContainText(email)
  })
})
