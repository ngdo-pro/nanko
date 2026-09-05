import { trace, context } from '@opentelemetry/api'
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { env } from './env'

let initialized = false
let tracerProvider: WebTracerProvider | null = null

export function initTelemetry(): void {
  if (initialized) {
    return
  }
  initialized = true

  try {
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: env.otel.serviceName,
      'deployment.environment': env.otel.environment,
    })

    const exporterUrl = env.otel.exporterUrl?.trim()
    if (!exporterUrl) {
      // Mode sans exporteur : no-op local sécurisé
      tracerProvider = new WebTracerProvider({ resource })
      tracerProvider.register()
      return
    }

    const exporter = new OTLPTraceExporter({
      url: exporterUrl,
      timeoutMillis: 2000,
    })

    const processor = new BatchSpanProcessor(exporter)
    tracerProvider = new WebTracerProvider({
      resource,
      spanProcessors: [processor],
    })
    tracerProvider.register()

    registerInstrumentations({
      tracerProvider,
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [/.*/],
          clearTimingResources: true,
        }),
      ],
    })
  } catch (err) {
    // Fail-open absolu : aucune interruption de l'application
    console.warn('Télémétrie OpenTelemetry indisponible (fail-open) :', err)
  }
}

/**
 * Génère un identifiant hexadécimal aléatoire de N octets
 */
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

/**
 * Injecte l'en-tête W3C traceparent dans les headers d'une requête HTTP
 */
export function injectTraceContext(headers: Headers): void {
  try {
    if (headers.has('traceparent')) {
      return
    }

    const activeSpan = trace.getSpan(context.active())
    if (activeSpan) {
      const spanContext = activeSpan.spanContext()
      if (spanContext.traceId && spanContext.spanId) {
        headers.set('traceparent', `00-${spanContext.traceId}-${spanContext.spanId}-01`)
        return
      }
    }

    // Si aucun span actif n'est propagé dans le contexte synchrone,
    // injecter un identifiant de trace W3C valide
    const traceId = generateRandomHex(16)
    const spanId = generateRandomHex(8)
    headers.set('traceparent', `00-${traceId}-${spanId}-01`)
  } catch {
    // Fail-open silencieux
  }
}
