import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./env', () => ({
  env: {
    otel: {
      exporterUrl: 'http://localhost:44318/v1/traces',
      logsExporterUrl: 'http://localhost:44318/v1/logs',
      serviceName: 'nanko-frontend',
      environment: 'test',
      logLevel: 'warn',
    },
  },
}))

import { logger } from './logger'

describe('Frontend Logger Module', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'debug').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('prints logs to console with corresponding levels', () => {
    logger.debug('Debug message', { key: 'val' })
    expect(console.debug).toHaveBeenCalledWith('[Nanko:DEBUG] Debug message', { key: 'val' })

    logger.info('Info message')
    expect(console.info).toHaveBeenCalledWith('[Nanko:INFO] Info message', {})

    logger.warn('Warning message')
    expect(console.warn).toHaveBeenCalledWith('[Nanko:WARN] Warning message', {})

    const incidentId = logger.error('Error message')
    expect(console.error).toHaveBeenCalledWith('[Nanko:ERROR] Error message', {})
    expect(incidentId).toMatch(/^[0-9a-f]{32}$/)
  })

  it('transmits error logs to OTLP endpoint with valid payload structure', async () => {
    let capturedUrl = ''
    let capturedBody = ''

    globalThis.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = String(url)
      capturedBody = String(options.body)
      return Promise.resolve(new Response('{}', { status: 200 }))
    })

    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHclpkw'
    const incidentId = logger.error('Critical render failure', {
      password: 'mypassword',
      authorization: `Bearer ${jwt}`,
      component: 'AppHeader',
    })

    expect(globalThis.fetch).toHaveBeenCalled()
    expect(capturedUrl).toContain('/v1/logs')

    const parsed = JSON.parse(capturedBody)
    expect(parsed.resourceLogs).toBeDefined()
    expect(parsed.resourceLogs[0].resource.attributes).toEqual(
      expect.arrayContaining([
        { key: 'service.name', value: { stringValue: 'nanko-frontend' } },
      ])
    )

    const logRecord = parsed.resourceLogs[0].scopeLogs[0].logRecords[0]
    expect(logRecord.body.stringValue).toBe('Critical render failure')
    expect(logRecord.severityText).toBe('ERROR')
    expect(logRecord.severityNumber).toBe(17)
    expect(logRecord.traceId).toBe(incidentId)

    // Verify sanitization
    const attributes = logRecord.attributes as Array<{ key: string; value: { stringValue?: string } }>
    const passwordAttr = attributes.find((a) => a.key === 'password')
    const authAttr = attributes.find((a) => a.key === 'authorization')
    const compAttr = attributes.find((a) => a.key === 'component')

    expect(passwordAttr?.value.stringValue).toBe('[REDACTED]')
    expect(authAttr?.value.stringValue).toBe('[REDACTED]')
    expect(compAttr?.value.stringValue).toBe('AppHeader')
  })

  it('guarantees fail-open resilience when fetch fails', () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error('Network error or Collector down'))
    })

    expect(() => {
      const id = logger.error('Network crash test')
      expect(id).toBeDefined()
    }).not.toThrow()
  })
})
