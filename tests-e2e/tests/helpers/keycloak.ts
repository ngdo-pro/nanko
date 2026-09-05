import { env } from '../../config/env'

export interface TestUserCredentials {
  email: string
  password: string
}

/**
 * Returns test user credentials:
 * - If E2E_USERNAME and E2E_PASSWORD are provided (e.g. CI against preprod), returns them directly.
 * - Otherwise (local development), ensures the test user exists via the local Keycloak Admin API.
 */
export async function getOrSetupTestUser(): Promise<TestUserCredentials> {
  const envEmail = env.testUser.username
  const envPassword = env.testUser.password

  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword }
  }

  const defaultEmail = 'user@nanko.dev'
  const defaultPassword = 'password123'

  await createOrResetKeycloakUser(defaultEmail, defaultPassword)

  return { email: defaultEmail, password: defaultPassword }
}

export async function createOrResetKeycloakUser(
  email: string,
  password = 'password123',
  realm = 'nanko',
): Promise<void> {
  const tokenRes = await fetch(`${env.keycloak.url}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: 'admin-cli',
      username: env.keycloak.adminUser,
      password: env.keycloak.adminPassword,
      grant_type: 'password',
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`Failed to get Keycloak admin token: ${tokenRes.statusText}`)
  }

  const tokenData = (await tokenRes.json()) as { access_token: string }
  const token = tokenData.access_token

  const searchRes = await fetch(
    `${env.keycloak.url}/admin/realms/${realm}/users?username=${encodeURIComponent(email)}&exact=true`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (searchRes.ok) {
    const existing = (await searchRes.json()) as Array<{ id: string }>
    if (existing.length > 0 && existing[0]?.id) {
      const userId = existing[0].id

      await fetch(`${env.keycloak.url}/admin/realms/${realm}/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: 'Nanko',
          lastName: 'User',
          emailVerified: true,
          requiredActions: [],
        }),
      })

      await fetch(`${env.keycloak.url}/admin/realms/${realm}/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password',
          value: password,
          temporary: false,
        }),
      })
      return
    }
  }

  const createRes = await fetch(`${env.keycloak.url}/admin/realms/${realm}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: email,
      email,
      firstName: 'Nanko',
      lastName: 'User',
      enabled: true,
      emailVerified: true,
      requiredActions: [],
      credentials: [
        {
          type: 'password',
          value: password,
          temporary: false,
        },
      ],
    }),
  })

  if (!createRes.ok && createRes.status !== 409) {
    throw new Error(`Failed to create Keycloak user ${email}: ${createRes.statusText}`)
  }
}
