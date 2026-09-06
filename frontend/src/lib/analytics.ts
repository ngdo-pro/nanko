import { z } from 'zod'
import { env } from '@/config/env'

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean>
        callback?: () => void
        u?: string
      },
    ) => void
  }
}

// Événements métier autorisés
export type AnalyticsEventName =
  | 'login_initiated'
  | 'logout_initiated'
  | 'workspace_created'
  | 'project_created'
  | 'document_created'
  | 'document_exported'
  | 'architecture_layer_toggled'
  | 'landing_cta_app_click'
  | 'landing_docs_click'
  | 'landing_theme_toggle'

// Clés PII strictement interdites pour préserver l'exemption de consentement CNIL/RGPD
export const forbiddenPiiKeys = [
  'email',
  'user',
  'username',
  'name',
  'password',
  'token',
  'jwt',
  'sub',
  'id_token',
  'phone',
  'ip',
]

export const analyticsPropsSchema = z.record(
  z.string().refine((key) => !forbiddenPiiKeys.includes(key.toLowerCase()), {
    message: "Détection d'une clé interdite (PII) non conforme aux règles d'exemption RGPD",
  }),
  z.union([z.string(), z.number(), z.boolean()]),
)

export type AnalyticsProps = Record<string, string | number | boolean>

/**
 * Assainit un dictionnaire de propriétés en éliminant toute clé PII interdite
 * et toute valeur non primitive (objets complexes, fonctions, etc.).
 */
export function sanitizeAnalyticsProps(props?: Record<string, unknown>): AnalyticsProps | undefined {
  if (!props) return undefined

  const sanitized: AnalyticsProps = {}
  for (const [key, value] of Object.entries(props)) {
    const isPii = forbiddenPiiKeys.includes(key.toLowerCase())
    const isPrimitive =
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

    if (!isPii && isPrimitive) {
      sanitized[key] = value
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

/**
 * Initialise Plausible Analytics de façon dynamique et résiliente (fail-open).
 */
export function initAnalytics(): void {
  if (!env.plausible.domain || !env.plausible.apiHost) {
    return
  }

  if (typeof document === 'undefined') return

  const existingScript = document.querySelector('script[data-analytics="plausible"]')
  if (existingScript) return

  try {
    const script = document.createElement('script')
    script.defer = true
    script.dataset.analytics = 'plausible'
    script.dataset.domain = env.plausible.domain
    script.dataset.api = `${env.plausible.apiHost}/api/event`
    script.src = `${env.plausible.apiHost}/js/script.tagged-events.js`

    script.onerror = () => {
      // Fail-open : Bloqueur de pub uBlock/Brave ou indisponibilité réseau, aucune rupture applicative
    }

    document.head.appendChild(script)
  } catch {
    // Fail-open absolu
  }
}

/**
 * Déclenche un événement personnalisé typé avec validation et assainissement anti-PII.
 */
export function trackEvent(name: AnalyticsEventName | string, props?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined' || typeof window.plausible !== 'function') {
      return
    }

    const sanitizedProps = sanitizeAnalyticsProps(props)
    window.plausible(name, sanitizedProps ? { props: sanitizedProps } : undefined)
  } catch {
    // Fail-open : Toute anomalie d'analytics est silencieuse
  }
}

/**
 * Déclenche manuellement un pageview si nécessaire (la navigation SPA pushState est
 * déjà interceptée automatiquement par script.js / script.tagged-events.js).
 */
export function trackPageview(url?: string): void {
  try {
    if (typeof window === 'undefined' || typeof window.plausible !== 'function') {
      return
    }

    window.plausible('pageview', url ? { u: url } : undefined)
  } catch {
    // Fail-open absolu
  }
}
