import { test, expect } from '@playwright/test'
import { env } from '../../config/env'

test.describe('En-têtes de sécurité et durcissement infrastructure (013)', () => {
  test.skip(
    !env.appBaseUrl.includes('preprod.nanko.dev'),
    'Les en-têtes durcis, la restriction admin Keycloak et OTLP sont validés contre l\'environnement de préproduction.',
  )

  test('La page d\'accueil expose les en-têtes durcis (CSP, Referrer, Permissions, HSTS sans preload)', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()

    const csp = headers['content-security-policy'] || headers['content-security-policy-report-only']
    expect(csp, 'En-tête CSP ou CSP-Report-Only attendu').toBeDefined()
    expect(csp?.toLowerCase()).toContain("frame-ancestors 'none'")

    const referrer = headers['referrer-policy']
    expect(referrer).toBe('strict-origin-when-cross-origin')

    const permissions = headers['permissions-policy']
    expect(permissions).toBeDefined()
    expect(permissions).toContain('camera=()')

    const hsts = headers['strict-transport-security']
    expect(hsts).toBeDefined()
    expect(hsts).toContain('max-age=31536000')
    expect(hsts?.toLowerCase()).not.toContain('preload')
  })

  test('Console admin Keycloak et realm master bloqués (403), realm nanko accessible (200)', async () => {
    // 1. Console d'administration master bloquée pour toute IP hors allowlist
    const adminRes = await fetch('https://auth.preprod.nanko.dev/admin/master/console/')
    expect(adminRes.status).toBe(403)

    // 2. Configuration OIDC du realm master bloquée
    const masterRes = await fetch('https://auth.preprod.nanko.dev/realms/master/.well-known/openid-configuration')
    expect(masterRes.status).toBe(403)

    // 3. Configuration OIDC du realm nanko accessible au public
    const nankoRes = await fetch('https://auth.preprod.nanko.dev/realms/nanko/.well-known/openid-configuration')
    expect(nankoRes.status).toBe(200)
    const nankoConfig = await nankoRes.json()
    expect(nankoConfig).toHaveProperty('issuer')
  })

  test('Surface OTLP réduite : chemin bloqué en 404, CORS restreint aux origines autorisées', async () => {
    // 1. Chemin non allowlisté
    const blockedRes = await fetch('https://otlp.nanko.dev/debug/tracez')
    expect(blockedRes.status).toBe(404)

    // 2. Origine inconnue / malveillante refusée (pas d'en-tête Access-Control-Allow-Origin)
    const evilRes = await fetch('https://otlp.nanko.dev/v1/traces', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'POST',
      },
    })
    const evilCors = evilRes.headers.get('access-control-allow-origin')
    expect(evilCors).toBeNull()

    // 3. Origine Nanko préproduction autorisée
    const nankoPreprodRes = await fetch('https://otlp.nanko.dev/v1/traces', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.preprod.nanko.dev',
        'Access-Control-Request-Method': 'POST',
      },
    })
    const nankoCors = nankoPreprodRes.headers.get('access-control-allow-origin')
    expect(nankoCors).toBe('https://app.preprod.nanko.dev')
  })

  test('Interface SigNoz protégée par sas HTTP Basic Auth', async () => {
    const response = await fetch('https://signoz.nanko.dev/')
    expect(response.status).toBe(401)
    const authHeader = response.headers.get('www-authenticate') ?? ''
    expect(authHeader.toLowerCase()).toContain('basic')
  })

  test('Absence de violation CSP en console lors de la navigation', async ({ page }) => {
    const cspViolations: string[] = []
    page.on('console', (msg) => {
      const text = msg.text()
      if (text.includes('Content Security Policy') || text.includes('Refused to load')) {
        cspViolations.push(text)
      }
    })

    await page.goto('/')
    expect(cspViolations).toEqual([])
  })
})
