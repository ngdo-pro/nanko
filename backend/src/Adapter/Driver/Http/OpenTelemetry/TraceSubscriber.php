<?php

declare(strict_types=1);

namespace App\Adapter\Driver\Http\OpenTelemetry;

use OpenTelemetry\API\Trace\Propagation\TraceContextPropagator;
use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Trace\SpanKind;
use OpenTelemetry\API\Trace\StatusCode;
use OpenTelemetry\API\Trace\TracerInterface;
use OpenTelemetry\Context\ScopeInterface;
use OpenTelemetry\Contrib\Otlp\SpanExporterFactory;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;
use OpenTelemetry\SDK\Trace\SpanProcessor\BatchSpanProcessorBuilder;
use OpenTelemetry\SDK\Trace\TracerProvider;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class TraceSubscriber implements EventSubscriberInterface
{
    private ?TracerProvider $tracerProvider = null;
    private ?TracerInterface $tracer = null;

    public function __construct(
        private readonly ?string $otlpEndpoint = null,
        private readonly string $serviceName = 'nanko-backend',
        private readonly string $environment = 'local',
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 1000],
            KernelEvents::RESPONSE => ['onKernelResponse', -1000],
            KernelEvents::EXCEPTION => ['onKernelException', 1000],
            KernelEvents::TERMINATE => ['onKernelTerminate', -1000],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        try {
            $request = $event->getRequest();
            $carrier = [];
            foreach ($request->headers->all() as $name => $values) {
                $carrier[$name] = $values;
            }

            $parentContext = TraceContextPropagator::getInstance()->extract($carrier);
            $tracer = $this->getTracer();

            $span = $tracer->spanBuilder($request->getMethod() . ' ' . $request->getPathInfo())
                ->setParent($parentContext)
                ->setSpanKind(SpanKind::KIND_SERVER)
                ->setAttribute('http.request.method', $request->getMethod())
                ->setAttribute('url.path', $request->getPathInfo())
                ->setAttribute('url.full', $request->getUri())
                ->setAttribute('server.address', $request->getHost())
                ->setAttribute('server.port', $request->getPort())
                ->startSpan();

            $scope = $span->activate();

            $request->attributes->set('_otel_span', $span);
            $request->attributes->set('_otel_scope', $scope);
        } catch (\Throwable) {
            // Fail-open: telemetry errors must never fail the HTTP request
        }
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        try {
            $request = $event->getRequest();
            $response = $event->getResponse();
            $span = $request->attributes->get('_otel_span');

            if ($span instanceof SpanInterface) {
                $statusCode = $response->getStatusCode();
                $span->setAttribute('http.response.status_code', $statusCode);

                if ($statusCode >= 500) {
                    $span->setStatus(StatusCode::STATUS_ERROR);
                } else {
                    $span->setStatus(StatusCode::STATUS_OK);
                }

                $context = $span->getContext();
                if ($context->isValid()) {
                    $traceparent = sprintf(
                        '00-%s-%s-%s',
                        $context->getTraceId(),
                        $context->getSpanId(),
                        $context->isSampled() ? '01' : '00'
                    );
                    $response->headers->set('traceparent', $traceparent);

                    $traceState = $context->getTraceState();
                    if ($traceState !== null && (string) $traceState !== '') {
                        $response->headers->set('tracestate', (string) $traceState);
                    }
                }
            }
        } catch (\Throwable) {
            // Fail-open
        }
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        try {
            $request = $event->getRequest();
            $span = $request->attributes->get('_otel_span');

            if ($span instanceof SpanInterface) {
                $throwable = $event->getThrowable();
                $span->recordException($throwable);
                $span->setStatus(StatusCode::STATUS_ERROR, $throwable->getMessage());
            }
        } catch (\Throwable) {
            // Fail-open
        }
    }

    public function onKernelTerminate(TerminateEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        try {
            $request = $event->getRequest();
            $span = $request->attributes->get('_otel_span');
            $scope = $request->attributes->get('_otel_scope');

            if ($span instanceof SpanInterface) {
                $span->end();
            }

            if ($scope instanceof ScopeInterface) {
                $scope->detach();
            }

            $this->tracerProvider?->shutdown();
        } catch (\Throwable) {
            // Fail-open
        }
    }

    private function getTracer(): TracerInterface
    {
        if ($this->tracer !== null) {
            return $this->tracer;
        }

        $resource = ResourceInfoFactory::defaultResource()->merge(
            ResourceInfo::create(Attributes::create([
                'service.name' => $this->serviceName,
                'deployment.environment' => $this->environment,
            ]))
        );

        if ($this->otlpEndpoint !== null && trim($this->otlpEndpoint) !== '') {
            $endpoint = trim($this->otlpEndpoint);
            $baseEndpoint = (string) preg_replace('#/v1/traces/?$#', '', $endpoint);
            $tracesEndpoint = str_ends_with($endpoint, '/v1/traces') ? $endpoint : rtrim($endpoint, '/') . '/v1/traces';

            putenv('OTEL_EXPORTER_OTLP_ENDPOINT=' . $baseEndpoint);
            $_SERVER['OTEL_EXPORTER_OTLP_ENDPOINT'] = $baseEndpoint;
            $_ENV['OTEL_EXPORTER_OTLP_ENDPOINT'] = $baseEndpoint;

            putenv('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=' . $tracesEndpoint);
            $_SERVER['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = $tracesEndpoint;
            $_ENV['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = $tracesEndpoint;

            $factory = new SpanExporterFactory();
            $exporter = $factory->create();
            $processor = (new BatchSpanProcessorBuilder($exporter))->build();
            $this->tracerProvider = new TracerProvider($processor, null, $resource);
        } else {
            $this->tracerProvider = new TracerProvider([], null, $resource);
        }

        $this->tracer = $this->tracerProvider->getTracer($this->serviceName);

        return $this->tracer;
    }
}
