import { test, expect } from '@playwright/test'

test.describe('Accueil et Identité Visuelle Nanko', () => {
  test('Affichage du portail Nanko pour un utilisateur non connecté et conformité des assets', async ({ page }) => {
    await page.goto('/')

    // Marque Nanko et logo visibles
    const navLogo = page.locator('.nav-logo')
    await expect(navLogo).toBeVisible()
    await expect(navLogo).toHaveText('NANKO')

    // Slogan Nanko et cartes visibles
    await expect(page.getByText(/Vos diagrammes d'architecture/i)).toBeVisible()
    await expect(page.getByText('nanko-platform.nanko')).toBeVisible()

    // Bouton de connexion CTA sur le portail
    const portalLoginBtn = page.getByTestId('portal-login-button')
    await expect(portalLoginBtn).toBeVisible()
    await expect(portalLoginBtn).toHaveText(/Se connecter \/ Créer un compte/)

    // Vérification du favicon Nanko
    const faviconLink = page.locator('link[rel="icon"]')
    await expect(faviconLink).toHaveAttribute('href', '/favicon.svg')
    const faviconResponse = await page.request.get('/favicon.svg')
    expect(faviconResponse.ok()).toBe(true)
    const faviconText = await faviconResponse.text()
    expect(faviconText).toContain('#2C4A3B') // Couleur de marque officielle Nanko
    expect(faviconText).toContain('#C0472B') // Couleur d'accent officielle Nanko

    // Vérification de l'absence totale de traces ou reliquats de démo Vite
    const bodyContent = await page.textContent('body')
    expect(bodyContent).not.toContain('Count is')
    expect(bodyContent).not.toContain('HMR')
    expect(bodyContent).not.toContain('Edit src/App.tsx')
    expect(bodyContent).not.toContain('Join the Vite community')
    expect(bodyContent).not.toContain('Explore Vite')
  })
})
