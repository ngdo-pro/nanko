import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initAnalytics,
  trackEvent,
  trackPageview,
  sanitizeAnalyticsProps,
  forbiddenPiiKeys,
} from './analytics'
import * as envModule from '@/config/env'

describe('Analytics Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    document.head.innerHTML = ''
    delete window.plausible
  })

  afterEach(() => {
    document.head.innerHTML = ''
    delete window.plausible
  })

  describe('sanitizeAnalyticsProps (Protection anti-PII RGPD/CNIL)', () => {
    it('filtre strictement toutes les clés PII interdites sans distinction de casse', () => {
      const input = {
        format: 'nanko',
        layers_count: 3,
        is_active: true,
        email: 'user@example.com',
        EMAIL: 'user2@example.com',
        User: 'john_doe',
        username: 'johndoe',
        password: 'secretPassword',
        token: 'eyJhbGciOi...',
        jwt: 'header.payload.sig',
        sub: '1234-uuid',
        id_token: 'token-val',
        phone: '+33600000000',
        ip: '192.168.1.1',
      }

      const result = sanitizeAnalyticsProps(input)

      expect(result).toEqual({
        format: 'nanko',
        layers_count: 3,
        is_active: true,
      })

      // Aucune clé PII ne doit être présente
      for (const piiKey of forbiddenPiiKeys) {
        expect(result).not.toHaveProperty(piiKey)
        expect(result).not.toHaveProperty(piiKey.toUpperCase())
      }
    })

    it('élimine les valeurs non primitives (objets complexes, fonctions, undefined)', () => {
      const input = {
        title: 'Mon Architecture',
        nested: { a: 1 },
        list: [1, 2, 3],
        fn: () => {},
        empty: undefined,
      }

      const result = sanitizeAnalyticsProps(input as Record<string, unknown>)
      expect(result).toEqual({
        title: 'Mon Architecture',
      })
    })

    it('renvoie undefined si aucun prop valide ou si input est vide', () => {
      expect(sanitizeAnalyticsProps(undefined)).toBeUndefined()
      expect(sanitizeAnalyticsProps({})).toBeUndefined()
      expect(sanitizeAnalyticsProps({ email: 'test@nanko.dev' })).toBeUndefined()
    })
  })

  describe('trackEvent', () => {
    it('appelle window.plausible avec les props assainies', () => {
      const plausibleMock = vi.fn()
      window.plausible = plausibleMock

      trackEvent('document_created', {
        format: 'nanko',
        email: 'forbidden@nanko.dev',
        layers_count: 4,
      })

      expect(plausibleMock).toHaveBeenCalledTimes(1)
      expect(plausibleMock).toHaveBeenCalledWith('document_created', {
        props: {
          format: 'nanko',
          layers_count: 4,
        },
      })
    })

    it('fonctionne en fail-open si window.plausible n est pas défini (ex. bloqué par un adblocker)', () => {
      delete window.plausible
      expect(() => {
        trackEvent('document_created', { format: 'nanko' })
      }).not.toThrow()
    })

    it('absorbe silencieusement les erreurs si window.plausible lève une exception', () => {
      window.plausible = vi.fn().mockImplementation(() => {
        throw new Error('Plausible internal failure')
      })

      expect(() => {
        trackEvent('document_created', { format: 'nanko' })
      }).not.toThrow()
    })
  })

  describe('trackPageview', () => {
    it('appelle window.plausible avec pageview et URL si fournie', () => {
      const plausibleMock = vi.fn()
      window.plausible = plausibleMock

      trackPageview('/projects/123')
      expect(plausibleMock).toHaveBeenCalledWith('pageview', { u: '/projects/123' })
    })

    it('reste fail-open sans lever d erreur si Plausible est indisponible', () => {
      delete window.plausible
      expect(() => trackPageview('/test')).not.toThrow()
    })
  })

  describe('initAnalytics', () => {
    it('ne crée aucun script si les variables d environnement Plausible sont absentes', () => {
      initAnalytics()
      const script = document.querySelector('script[data-analytics="plausible"]')
      expect(script).toBeNull()
    })

    it('injecte le script Plausible de manière asynchrone lorsque les variables sont configurées', () => {
      // Mock des variables d'environnement
      vi.spyOn(envModule, 'env', 'get').mockReturnValue({
        ...envModule.env,
        plausible: {
          domain: 'nanko.dev',
          apiHost: 'https://plausible.nanko.dev',
        },
      })

      initAnalytics()

      const script = document.querySelector<HTMLScriptElement>('script[data-analytics="plausible"]')
      expect(script).not.toBeNull()
      expect(script?.defer).toBe(true)
      expect(script?.dataset.domain).toBe('nanko.dev')
      expect(script?.dataset.api).toBe('https://plausible.nanko.dev/api/event')
      expect(script?.src).toBe('https://plausible.nanko.dev/js/script.tagged-events.js')
    })

    it('n injecte pas le script en double si déjà présent dans le DOM', () => {
      vi.spyOn(envModule, 'env', 'get').mockReturnValue({
        ...envModule.env,
        plausible: {
          domain: 'nanko.dev',
          apiHost: 'https://plausible.nanko.dev',
        },
      })

      initAnalytics()
      initAnalytics()

      const scripts = document.querySelectorAll('script[data-analytics="plausible"]')
      expect(scripts.length).toBe(1)
    })
  })
})
