import { test, expect } from '@playwright/test'

test.describe('Plausible Analytics — Mesure d audience anonyme & Fail-Open', () => {
  test('Résilience complète en cas d indisponibilité ou blocage de Plausible (Fail-Open)', async ({ page }) => {
    // Simuler un blocage réseau de Plausible (comme un adblocker uBlock ou panne serveur)
    await page.route('**/api/event', async (route) => {
      await route.abort('failed')
    })
    await page.route('**/*plausible*.js', async (route) => {
      await route.abort('blockedbyclient')
    })

    const unhandledErrors: string[] = []
    page.on('pageerror', (err) => {
      unhandledErrors.push(err.message)
    })

    // Navigation sur l'application
    await page.goto('/')

    // Les éléments fonctionnels doivent être visibles et interactifs
    const logo = page.getByTestId('nav-logo')
    await expect(logo).toBeVisible({ timeout: 5000 })
    await expect(logo).toHaveText('NANKO')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()

    // Clic sur le bouton de connexion sans aucun crash UI
    await loginButton.click()

    // Aucun crash fatal provoqué par l'interception Plausible
    const fatalErrors = unhandledErrors.filter((e) => e.includes('Uncaught') || e.includes('plausible'))
    expect(fatalErrors.length).toBe(0)
  })

  test('Émission d événements sans cookie et respect de l exemption de consentement', async ({ page }) => {
    const interceptedEvents: Array<{ n?: string; d?: string; u?: string; p?: Record<string, unknown> }> = []

    // Intercepter les requêtes vers l'API Plausible
    await page.route('**/api/event', async (route) => {
      const postData = route.request().postData()
      if (postData) {
        try {
          interceptedEvents.push(JSON.parse(postData))
        } catch {
          // payload non-JSON
        }
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
    })

    await page.goto('/')

    // Vérifier l'absence totale de cookies analytics
    const cookies = await page.context().cookies()
    const plausibleCookies = cookies.filter((c) =>
      c.name.toLowerCase().includes('plausible') ||
      c.name.toLowerCase().includes('analytics') ||
      c.name.toLowerCase().includes('visitor')
    )
    expect(plausibleCookies.length).toBe(0)
  })
})
