import { z } from 'zod'

export const frontendEnvSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url('VITE_API_BASE_URL doit être une URL valide (ex: http://localhost:48000)')
    .default('http://localhost:48000'),
  VITE_KEYCLOAK_URL: z
    .string()
    .url('VITE_KEYCLOAK_URL doit être une URL valide (ex: http://localhost:48080)')
    .default('http://localhost:48080'),
  VITE_KEYCLOAK_REALM: z
    .string()
    .min(1, 'VITE_KEYCLOAK_REALM ne peut pas être vide')
    .default('nanko'),
  VITE_KEYCLOAK_CLIENT_ID: z
    .string()
    .min(1, 'VITE_KEYCLOAK_CLIENT_ID ne peut pas être vide')
    .default('nanko-web'),
  VITE_OTEL_EXPORTER_URL: z
    .string()
    .url('VITE_OTEL_EXPORTER_URL doit être une URL valide')
    .optional()
    .or(z.literal(''))
    .default(''),
  VITE_OTEL_SERVICE_NAME: z.string().min(1).default('nanko-frontend'),
  VITE_APP_ENV: z.string().min(1).default('local'),
})

// Extraction explicite pour permettre la substitution statique par Vite
const rawEnv = {
  VITE_API_BASE_URL: import.meta.env?.VITE_API_BASE_URL,
  VITE_KEYCLOAK_URL: import.meta.env?.VITE_KEYCLOAK_URL,
  VITE_KEYCLOAK_REALM: import.meta.env?.VITE_KEYCLOAK_REALM,
  VITE_KEYCLOAK_CLIENT_ID: import.meta.env?.VITE_KEYCLOAK_CLIENT_ID,
  VITE_OTEL_EXPORTER_URL: import.meta.env?.VITE_OTEL_EXPORTER_URL,
  VITE_OTEL_SERVICE_NAME: import.meta.env?.VITE_OTEL_SERVICE_NAME,
  VITE_APP_ENV: import.meta.env?.VITE_APP_ENV,
}

// Validation sécurisée et export typé
const parsed = frontendEnvSchema.safeParse(rawEnv)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
  console.error('❌ Erreur critique de configuration environnement :', parsed.error.format())

  if (typeof document !== 'undefined') {
    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background-color: #0f172a; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; padding: 1.5rem;">
          <div style="max-width: 36rem; width: 100%; background-color: #1e293b; border: 1px solid #ef4444; border-radius: 0.75rem; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; color: #ef4444;">
              <span style="font-size: 1.5rem; font-weight: bold;">[!]</span>
              <h1 style="font-size: 1.25rem; font-weight: 700; margin: 0;">Erreur de configuration de l'application</h1>
            </div>
            <p style="margin-bottom: 1.25rem; color: #cbd5e1; line-height: 1.5;">
              Impossible de démarrer l'application : des variables d'environnement requises sont absentes ou mal formées.
            </p>
            <div style="margin-bottom: 1.25rem;">
              <span style="font-size: 0.875rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Détails techniques :</span>
              <div style="margin-top: 0.5rem; background-color: #0f172a; border: 1px solid #334155; border-radius: 0.5rem; padding: 1rem; font-family: ui-monospace, monospace; font-size: 0.875rem; color: #f87171;">
                <ul style="margin: 0; padding-left: 1.25rem;">
                  ${issues.map((issue) => `<li style="margin-bottom: 0.25rem;">${issue}</li>`).join('')}
                </ul>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: #64748b; line-height: 1.4;">
              Veuillez vérifier votre fichier .env ou la configuration du serveur.
            </p>
          </div>
        </div>
      `
    }
  }

  throw new Error(`Configuration Frontend invalide : ${issues.join(', ')}`)
}

export const env = Object.freeze({
  api: {
    baseUrl: parsed.data.VITE_API_BASE_URL,
  },
  keycloak: {
    url: parsed.data.VITE_KEYCLOAK_URL,
    realm: parsed.data.VITE_KEYCLOAK_REALM,
    clientId: parsed.data.VITE_KEYCLOAK_CLIENT_ID,
  },
  otel: {
    exporterUrl: parsed.data.VITE_OTEL_EXPORTER_URL,
    serviceName: parsed.data.VITE_OTEL_SERVICE_NAME,
    environment: parsed.data.VITE_APP_ENV,
  },
})

export type AppEnv = typeof env
