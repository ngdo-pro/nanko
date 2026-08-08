export async function register() {
  // Unset OTEL_EXPORTER_OTLP_ENDPOINT (the default) => no tracing overhead at all.
  // Set it (see .env.example) and run `docker compose up jaeger` to see spans
  // for each API call, with the underlying pg queries nested inside via
  // @opentelemetry/instrumentation-pg — no manual span wrapping needed.
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // OTEL node SDK doesn't run on the edge runtime

  const { registerOTel } = await import("@vercel/otel");
  const { PgInstrumentation } = await import("@opentelemetry/instrumentation-pg");

  registerOTel({
    serviceName: "nanko",
    instrumentations: [new PgInstrumentation()],
  });
}
