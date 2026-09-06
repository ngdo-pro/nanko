import { trace, context } from '@opentelemetry/api'
import { env } from './env'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITIES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const SEVERITY_NUMBERS: Record<LogLevel, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
}

const SEVERITY_TEXTS: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
}

interface OtelAnyValue {
  stringValue?: string
  intValue?: string
  doubleValue?: number
  boolValue?: boolean
}

interface OtelKeyValue {
  key: string
  value: OtelAnyValue
}

// Anti-flood: rate limit duplicate errors in a sliding window
const rateLimitMap = new Map<string, { count: number; firstSeen: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const MAX_DUPLICATE_LOGS_PER_WINDOW = 10

function shouldRateLimit(signature: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(signature)

  if (!entry || now - entry.firstSeen > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(signature, { count: 1, firstSeen: now })
    return false
  }

  entry.count += 1
  return entry.count > MAX_DUPLICATE_LOGS_PER_WINDOW
}

function generateRandomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < byteCount; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function getActiveTraceContext(): { traceId: string; spanId: string } {
  try {
    const activeSpan = trace.getSpan(context.active())
    if (activeSpan) {
      const spanContext = activeSpan.spanContext()
      if (spanContext.traceId && spanContext.spanId) {
        return {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
        }
      }
    }
  } catch {
    // Fail-open
  }

  return {
    traceId: generateRandomHex(16),
    spanId: generateRandomHex(8),
  }
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (/(?:password|secret|token|authorization|bearer|cookie|apiKey|private)/i.test(key)) {
    return '[REDACTED]'
  }

  if (typeof value === 'string') {
    let sanitized = value.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
    sanitized = sanitized.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    return sanitized
  }

  if (Array.isArray(value)) {
    return value.map((item, idx) => sanitizeValue(String(idx), item))
  }

  if (typeof value === 'object' && value !== null) {
    const obj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      obj[k] = sanitizeValue(k, v)
    }
    return obj
  }

  return value
}

function toOtlpAnyValue(value: unknown): OtelAnyValue {
  if (typeof value === 'string') {
    return { stringValue: value }
  }
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value }
  }
  if (typeof value === 'boolean') {
    return { boolValue: value }
  }
  if (value === null || value === undefined) {
    return { stringValue: String(value) }
  }
  return { stringValue: JSON.stringify(value) }
}

function getLogsEndpoint(): string {
  if (env.otel.logsExporterUrl && env.otel.logsExporterUrl.trim() !== '') {
    return env.otel.logsExporterUrl.trim()
  }

  if (env.otel.exporterUrl && env.otel.exporterUrl.trim() !== '') {
    const trimmed = env.otel.exporterUrl.trim()
    return trimmed.replace(/\/v1\/traces\/?$/, '/v1/logs')
  }

  return ''
}

function sendToOtlp(
  level: LogLevel,
  message: string,
  traceId: string,
  spanId: string,
  attributes: Record<string, unknown>,
): void {
  const configuredThreshold = env.otel.logLevel as LogLevel
  const minPriority = LOG_LEVEL_PRIORITIES[configuredThreshold] ?? LOG_LEVEL_PRIORITIES.warn
  const currentPriority = LOG_LEVEL_PRIORITIES[level]

  if (currentPriority < minPriority) {
    return
  }

  const endpoint = getLogsEndpoint()
  if (!endpoint) {
    return
  }

  const signature = `${level}:${message}`
  if (shouldRateLimit(signature)) {
    return
  }

  const sanitized = sanitizeValue('attributes', attributes) as Record<string, unknown>
  const otlpAttributes: OtelKeyValue[] = []

  for (const [key, value] of Object.entries(sanitized)) {
    otlpAttributes.push({
      key,
      value: toOtlpAnyValue(value),
    })
  }

  // Common browser telemetry attributes
  if (typeof window !== 'undefined') {
    otlpAttributes.push({
      key: 'url',
      value: { stringValue: window.location.href },
    })
  }

  const nowNanos = String(BigInt(Date.now()) * 1_000_000n)
  const payload = {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: env.otel.serviceName } },
            { key: 'deployment.environment', value: { stringValue: env.otel.environment } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: 'nanko-frontend-logger', version: '1.0.0' },
            logRecords: [
              {
                timeUnixNano: nowNanos,
                severityNumber: SEVERITY_NUMBERS[level],
                severityText: SEVERITY_TEXTS[level],
                body: { stringValue: message },
                traceId,
                spanId,
                attributes: otlpAttributes,
              },
            ],
          },
        ],
      },
    ],
  }

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Fail-open & Anti-recursion: completely silence any network/collector failure
    })
  } catch {
    // Fail-open
  }
}

export const logger = {
  debug(message: string, attributes: Record<string, unknown> = {}): void {
    const { traceId, spanId } = getActiveTraceContext()
    console.debug(`[Nanko:DEBUG] ${message}`, attributes)
    sendToOtlp('debug', message, traceId, spanId, attributes)
  },

  info(message: string, attributes: Record<string, unknown> = {}): void {
    const { traceId, spanId } = getActiveTraceContext()
    console.info(`[Nanko:INFO] ${message}`, attributes)
    sendToOtlp('info', message, traceId, spanId, attributes)
  },

  warn(message: string, attributes: Record<string, unknown> = {}): void {
    const { traceId, spanId } = getActiveTraceContext()
    console.warn(`[Nanko:WARN] ${message}`, attributes)
    sendToOtlp('warn', message, traceId, spanId, attributes)
  },

  /**
   * Logs an error and returns the correlation incident ID (Trace ID).
   */
  error(message: string, attributes: Record<string, unknown> = {}): string {
    const { traceId, spanId } = getActiveTraceContext()
    console.error(`[Nanko:ERROR] ${message}`, attributes)
    sendToOtlp('error', message, traceId, spanId, attributes)
    return traceId
  },
}
