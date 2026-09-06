import { test, expect } from '@playwright/test'

test.describe('Observabilité & Centralisation des Logs Applicatifs Fullstack', () => {
  test('Interception d un crash UI par l ErrorBoundary, affichage du Trace ID et émission OTLP', async ({ page }) => {
    const capturedLogPayloads: string[] = []

    // Intercepter l'appel vers l'endpoint OTLP logs
    await page.route('**/v1/logs', async (route) => {
      const postData = route.request().postData()
      if (postData) {
        capturedLogPayloads.push(postData)
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    // Navigation vers la page avec simulation de crash de composant React
    await page.goto('/?trigger_crash=true')

    // L'écran de secours AppErrorBoundary doit être rendu
    const fallback = page.getByTestId('error-boundary-fallback')
    await expect(fallback).toBeVisible({ timeout: 5000 })
    await expect(fallback).toContainText('Une anomalie inattendue est survenue')

    // L'identifiant d'incident (Trace ID W3C) doit être affiché à l'écran
    const incidentLabel = fallback.locator('text=Identifiant d\'incident :')
    await expect(incidentLabel).toBeVisible()

    const incidentIdElement = fallback.getByTestId('incident-id')
    await expect(incidentIdElement).toBeVisible()
    const displayedIncidentId = (await incidentIdElement.textContent())?.trim()

    expect(displayedIncidentId).toBeDefined()
    expect(displayedIncidentId).toMatch(/^[0-9a-f]{32}$/)

    // Vérifier les boutons d'action
    const reloadBtn = fallback.getByTestId('reload-button')
    const homeBtn = fallback.getByTestId('home-button')
    await expect(reloadBtn).toBeVisible()
    await expect(homeBtn).toBeVisible()

    // Vérifier que le payload OTLP /v1/logs correspondant à l'ErrorBoundary a été émis
    expect(capturedLogPayloads.length).toBeGreaterThan(0)
    const matchingPayload = capturedLogPayloads
      .map((p) => JSON.parse(p))
      .find((p) => {
        const record = p.resourceLogs?.[0]?.scopeLogs?.[0]?.logRecords?.[0]
        return record?.traceId === displayedIncidentId
      })

    expect(matchingPayload).toBeDefined()
    const resourceAttrs = matchingPayload.resourceLogs[0].resource.attributes
    expect(resourceAttrs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'service.name', value: { stringValue: 'nanko-frontend' } }),
      ])
    )

    const logRecord = matchingPayload.resourceLogs[0].scopeLogs[0].logRecords[0]
    expect(logRecord.severityText).toBe('ERROR')
    expect(logRecord.severityNumber).toBe(17)
    expect(logRecord.traceId).toBe(displayedIncidentId)
    expect(logRecord.body.stringValue).toContain('Uncaught React exception in AppErrorBoundary')
  })

  test('Résilience fail-open lorsque le collecteur OTLP renvoie une erreur 503 ou est indisponible', async ({ page }) => {
    // Simuler une défaillance serveur sur le collecteur OTLP
    await page.route('**/v1/logs', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      })
    })

    const unhandledErrors: string[] = []
    page.on('pageerror', (err) => {
      unhandledErrors.push(err.message)
    })

    // Navigation nominale
    await page.goto('/')

    // L'application fonctionne normalement sans blocage
    const logo = page.getByTestId('nav-logo')
    await expect(logo).toBeVisible({ timeout: 5000 })
    await expect(logo).toHaveText('NANKO')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()

    // Émettre un événement d'erreur simulé dans la page
    await page.evaluate(() => {
      window.dispatchEvent(new ErrorEvent('error', { message: 'Non-fatal simulated script issue' }))
    })

    // La page reste interactive et sans erreur fatale non gérée qui planterait la navigation
    await expect(loginButton).toBeEnabled()
    expect(unhandledErrors.filter((e) => e.includes('Service Unavailable')).length).toBe(0)
  })
})
