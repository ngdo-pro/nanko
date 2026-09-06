import { test, expect } from '@playwright/test'
import { env } from '../../config/env'

test.describe('Protection anti-indexation et directives robots en préproduction', () => {
  test.skip(
    !env.appBaseUrl.includes('preprod.nanko.dev'),
    'Les en-têtes X-Robots-Tag et le fichier /robots.txt Caddy sont déployés sur l\'environnement de préproduction.',
  )

  test('Présence obligatoire de l\'en-tête X-Robots-Tag sur l\'application web', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()
    const robotsHeader = headers['x-robots-tag']

    expect(robotsHeader).toBeDefined()
    expect(robotsHeader.toLowerCase()).toContain('noindex')
    expect(robotsHeader.toLowerCase()).toContain('nofollow')
  })

  test('Consultation de robots.txt sans authentification préalable', async () => {
    // Émission d'une requête HTTP sans identifiants pour valider l'exemption de Basic Auth
    const response = await fetch(`${env.appBaseUrl}/robots.txt`)

    expect(response.status).toBe(200)
    const contentType = response.headers.get('content-type') ?? ''
    expect(contentType).toContain('text/plain')

    const body = await response.text()
    expect(body).toContain('User-agent: *')
    expect(body).toContain('Disallow: /')
  })

  test('Présence de l\'en-tête X-Robots-Tag sur la mire Keycloak de préproduction', async () => {
    const keycloakAuthUrl = 'https://auth.preprod.nanko.dev/realms/nanko/protocol/openid-connect/auth'
    const response = await fetch(keycloakAuthUrl)
    const robotsHeader = response.headers.get('x-robots-tag')

    expect(robotsHeader).not.toBeNull()
    expect(robotsHeader?.toLowerCase()).toMatch(/noindex|none/)
  })
})
