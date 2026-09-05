import { z } from 'zod'

export const e2eEnvSchema = z.object({
  APP_BASE_URL: z
    .string()
    .url('APP_BASE_URL doit être une URL valide')
    .default('http://localhost:45173'),
  LIBRARY_BASE_URL: z
    .string()
    .url('LIBRARY_BASE_URL doit être une URL valide')
    .default('http://localhost:45174'),
  KEYCLOAK_URL: z
    .string()
    .url('KEYCLOAK_URL doit être une URL valide')
    .default('http://localhost:48080'),
  KEYCLOAK_ADMIN_USER: z.string().min(1).default('admin'),
  KEYCLOAK_ADMIN_PASSWORD: z.string().min(1).default('admin'),
  E2E_USERNAME: z.string().optional(),
  E2E_PASSWORD: z.string().optional(),
  CI: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
})

const parsed = e2eEnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Erreur critique de configuration E2E :', parsed.error.format())
  throw new Error(`Configuration E2E invalide : ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`)
}

export const env = Object.freeze({
  appBaseUrl: parsed.data.APP_BASE_URL,
  libraryBaseUrl: parsed.data.LIBRARY_BASE_URL,
  keycloak: {
    url: parsed.data.KEYCLOAK_URL,
    adminUser: parsed.data.KEYCLOAK_ADMIN_USER,
    adminPassword: parsed.data.KEYCLOAK_ADMIN_PASSWORD,
  },
  testUser: {
    username: parsed.data.E2E_USERNAME,
    password: parsed.data.E2E_PASSWORD,
  },
  isCi: parsed.data.CI,
})

export type E2EEnv = typeof env
