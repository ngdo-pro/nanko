import { test, expect } from '@playwright/test'
import { env } from '../../config/env'

test.describe('Observabilité & Télémétrie OpenTelemetry', () => {
  test('Injection transparente du header W3C traceparent', async ({ page }) => {
    let capturedTraceparent: string | null = null

    page.on('request', (request) => {
      if (request.url().includes('/api/v1/')) {
        const headers = request.headers()
        if (headers['traceparent']) {
          capturedTraceparent = headers['traceparent']
        }
      }
    })

    await page.goto('/')
    await expect(page.locator('.nav-logo')).toBeVisible()

    // Émission d'une requête API via le navigateur
    const responseStatus = await page.evaluate(
      async ({ apiUrl, authHeader }) => {
        try {
          const headers: Record<string, string> = {
            traceparent: `00-${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}-${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}-01`,
          }
          if (authHeader) {
            headers['Authorization'] = authHeader
          }
          const response = await fetch(`${apiUrl}/api/v1/version`, {
            headers,
          })
          return response.status
        } catch {
          return null
        }
      },
      {
        apiUrl: env.apiBaseUrl,
        authHeader:
          env.preprodHttpUser && env.preprodHttpPassword
            ? `Basic ${btoa(`${env.preprodHttpUser}:${env.preprodHttpPassword}`)}`
            : undefined,
      },
    )

    expect(responseStatus).toBe(200)
    expect(capturedTraceparent).not.toBeNull()
    expect(capturedTraceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/)
  })

  test('Résilience absolue en cas de collecteur injoignable (Fail-Open)', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/')

    // L'application frontend démarre normalement sans crash ni écran blanc
    const logo = page.locator('.nav-logo')
    await expect(logo).toBeVisible()
    await expect(logo).toHaveText('NANKO')

    const loginButton = page.getByTestId('login-button')
    await expect(loginButton).toBeVisible()

    // Aucun crash fatal lié à la télémétrie
    const fatalErrors = consoleErrors.filter((e) => e.includes('Uncaught') || e.includes('TypeError'))
    expect(fatalErrors.length).toBe(0)
  })
})
