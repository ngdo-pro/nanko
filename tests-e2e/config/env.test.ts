import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { e2eEnvSchema } from './env.ts'
import { frontendEnvSchema } from '../../frontend/src/config/env.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '../..')

describe('Spécifications 003 : Centralisation et Validation Zod des Variables d\'Environnement', () => {
  describe('Scénario 1 : Initialisation nominale du frontend avec valeurs par défaut', () => {
    it('doit appliquer les valeurs par défaut attendues', () => {
      const parsed = frontendEnvSchema.safeParse({})
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.VITE_API_BASE_URL, 'http://localhost:48000')
        assert.equal(parsed.data.VITE_KEYCLOAK_URL, 'http://localhost:48080')
        assert.equal(parsed.data.VITE_KEYCLOAK_REALM, 'nanko')
        assert.equal(parsed.data.VITE_KEYCLOAK_CLIENT_ID, 'nanko-web')
        assert.equal(parsed.data.VITE_OTEL_EXPORTER_URL, '')
        assert.equal(parsed.data.VITE_OTEL_SERVICE_NAME, 'nanko-frontend')
        assert.equal(parsed.data.VITE_APP_ENV, 'local')
      }
    })

    it('doit accepter une URL valide pour VITE_OTEL_EXPORTER_URL', () => {
      const parsed = frontendEnvSchema.safeParse({
        VITE_OTEL_EXPORTER_URL: 'http://localhost:44318/v1/traces',
      })
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.VITE_OTEL_EXPORTER_URL, 'http://localhost:44318/v1/traces')
      }
    })
  })

  describe('Scénario 2 : Interruption immédiate (Fail-Fast) sur variable frontend invalide', () => {
    it('doit échouer si VITE_API_BASE_URL n\'est pas une URL valide', () => {
      const parsed = frontendEnvSchema.safeParse({
        VITE_API_BASE_URL: 'pas-une-url',
      })
      assert.equal(parsed.success, false)
      if (!parsed.success) {
        const issues = parsed.error.issues
        assert.ok(issues.some((i) => i.path.includes('VITE_API_BASE_URL')))
      }
    })

    it('doit échouer si VITE_KEYCLOAK_URL n\'est pas une URL valide', () => {
      const parsed = frontendEnvSchema.safeParse({
        VITE_KEYCLOAK_URL: 'invalid-url',
      })
      assert.equal(parsed.success, false)
      if (!parsed.success) {
        const issues = parsed.error.issues
        assert.ok(issues.some((i) => i.path.includes('VITE_KEYCLOAK_URL')))
      }
    })

    it('doit échouer si un identifiant Keycloak est vide', () => {
      const parsed = frontendEnvSchema.safeParse({
        VITE_KEYCLOAK_REALM: '',
      })
      assert.equal(parsed.success, false)
    })

    it('doit échouer si VITE_OTEL_EXPORTER_URL n\'est ni vide ni une URL valide', () => {
      const parsed = frontendEnvSchema.safeParse({
        VITE_OTEL_EXPORTER_URL: 'not-a-valid-url',
      })
      assert.equal(parsed.success, false)
      if (!parsed.success) {
        const issues = parsed.error.issues
        assert.ok(issues.some((i) => i.path.includes('VITE_OTEL_EXPORTER_URL')))
      }
    })
  })

  describe('Scénario 3 : Initialisation nominale des tests E2E avec détection CI', () => {
    it('doit appliquer les valeurs par défaut E2E', () => {
      const parsed = e2eEnvSchema.safeParse({})
      assert.equal(parsed.success, true)
      if (parsed.success) {
        assert.equal(parsed.data.APP_BASE_URL, 'http://localhost:45173')
        assert.equal(parsed.data.LIBRARY_BASE_URL, 'http://localhost:45174')
        assert.equal(parsed.data.KEYCLOAK_URL, 'http://localhost:48080')
        assert.equal(parsed.data.KEYCLOAK_ADMIN_USER, 'admin')
        assert.equal(parsed.data.KEYCLOAK_ADMIN_PASSWORD, 'admin')
        assert.equal(parsed.data.CI, false)
      }
    })

    it('doit transformer CI="true" et CI="1" en booléen true', () => {
      const parsedTrue = e2eEnvSchema.safeParse({ CI: 'true' })
      assert.equal(parsedTrue.success, true)
      if (parsedTrue.success) {
        assert.equal(parsedTrue.data.CI, true)
      }

      const parsedOne = e2eEnvSchema.safeParse({ CI: '1' })
      assert.equal(parsedOne.success, true)
      if (parsedOne.success) {
        assert.equal(parsedOne.data.CI, true)
      }

      const parsedOther = e2eEnvSchema.safeParse({ CI: 'false' })
      assert.equal(parsedOther.success, true)
      if (parsedOther.success) {
        assert.equal(parsedOther.data.CI, false)
      }
    })

    it('doit accepter les variables optionnelles PREPROD_HTTP_USER et PREPROD_HTTP_PASSWORD', () => {
      const parsedWithout = e2eEnvSchema.safeParse({})
      assert.equal(parsedWithout.success, true)
      if (parsedWithout.success) {
        assert.equal(parsedWithout.data.PREPROD_HTTP_USER, undefined)
        assert.equal(parsedWithout.data.PREPROD_HTTP_PASSWORD, undefined)
      }

      const parsedWith = e2eEnvSchema.safeParse({
        PREPROD_HTTP_USER: 'nanko',
        PREPROD_HTTP_PASSWORD: 'secret-password',
      })
      assert.equal(parsedWith.success, true)
      if (parsedWith.success) {
        assert.equal(parsedWith.data.PREPROD_HTTP_USER, 'nanko')
        assert.equal(parsedWith.data.PREPROD_HTTP_PASSWORD, 'secret-password')
      }
    })
  })

  describe('Scénario 4 : Vérification d\'absence d\'accès direct sauvage', () => {
    function scanFiles(dir: string, extensions: string[]): string[] {
      let results: string[] = []
      const list = fs.readdirSync(dir)
      for (const file of list) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
            results = results.concat(scanFiles(fullPath, extensions))
          }
        } else if (extensions.some((ext) => file.endsWith(ext))) {
          results.push(fullPath)
        }
      }
      return results
    }

    it('frontend/src ne doit contenir aucun import.meta.env hors config/env.ts', () => {
      const frontendSrc = path.join(rootDir, 'frontend/src')
      const files = scanFiles(frontendSrc, ['.ts', '.tsx', '.js', '.jsx'])
      for (const file of files) {
        if (file.endsWith('config/env.ts')) {
          continue
        }
        const content = fs.readFileSync(file, 'utf-8')
        assert.ok(
          !content.includes('import.meta.env'),
          `Accès direct sauvage à import.meta.env détecté dans ${path.relative(rootDir, file)}`,
        )
      }
    })

    it('tests-e2e ne doit contenir aucun process.env hors config/env.ts', () => {
      const e2eDir = path.join(rootDir, 'tests-e2e')
      const files = scanFiles(e2eDir, ['.ts', '.js'])
      for (const file of files) {
        if (file.endsWith('config/env.ts') || file.endsWith('config/env.test.ts')) {
          continue
        }
        const content = fs.readFileSync(file, 'utf-8')
        assert.ok(
          !content.includes('process.env'),
          `Accès direct sauvage à process.env détecté dans ${path.relative(rootDir, file)}`,
        )
      }
    })
  })
})
