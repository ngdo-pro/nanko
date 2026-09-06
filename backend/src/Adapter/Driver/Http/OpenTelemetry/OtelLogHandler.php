<?php

declare(strict_types=1);

namespace App\Adapter\Driver\Http\OpenTelemetry;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;
use OpenTelemetry\API\Common\Time\Clock;
use OpenTelemetry\API\Logs\LoggerInterface;
use OpenTelemetry\Context\Context;
use OpenTelemetry\Contrib\Otlp\LogsExporterFactory;
use Opentelemetry\Proto\Logs\V1\SeverityNumber;
use OpenTelemetry\SDK\Common\Attribute\Attributes;
use OpenTelemetry\SDK\Common\Instrumentation\InstrumentationScopeFactory;
use OpenTelemetry\SDK\Logs\LoggerProvider;
use OpenTelemetry\SDK\Logs\LoggerProviderInterface;
use OpenTelemetry\SDK\Logs\Processor\BatchLogRecordProcessor;
use OpenTelemetry\SDK\Resource\ResourceInfo;
use OpenTelemetry\SDK\Resource\ResourceInfoFactory;

final class OtelLogHandler extends AbstractProcessingHandler
{
    private ?LoggerProviderInterface $loggerProvider = null;
    private ?LoggerInterface $logger = null;

    /**
     * @param int|string|Level $level The minimum logging level at which this handler will be triggered
     */
    public function __construct(
        private readonly ?string $otlpEndpoint = null,
        private readonly string $serviceName = 'nanko-backend',
        private readonly string $environment = 'local',
        int|string|Level $level = Level::Info,
        bool $bubble = true,
        ?LoggerProviderInterface $loggerProvider = null,
    ) {
        $monologLevel = $level instanceof Level ? $level : match (strtoupper((string) $level)) {
            'DEBUG' => Level::Debug,
            'INFO' => Level::Info,
            'NOTICE' => Level::Notice,
            'WARNING', 'WARN' => Level::Warning,
            'ERROR' => Level::Error,
            'CRITICAL' => Level::Critical,
            'ALERT' => Level::Alert,
            'EMERGENCY' => Level::Emergency,
            default => is_int($level) ? (Level::tryFrom($level) ?? Level::Info) : Level::Info,
        };
        parent::__construct($monologLevel, $bubble);

        if ($loggerProvider !== null) {
            $this->loggerProvider = $loggerProvider;
        }
    }

    public function flush(): void
    {
        try {
            $this->loggerProvider?->forceFlush();
        } catch (\Throwable) {
            // Fail-open
        }
    }

    public function close(): void
    {
        try {
            $this->flush();
            $provider = $this->loggerProvider;
            $this->loggerProvider = null;
            $this->logger = null;
            $provider?->shutdown();
        } catch (\Throwable) {
            // Fail-open
        } finally {
            parent::close();
        }
    }

    protected function write(LogRecord $record): void
    {
        try {
            $logger = $this->getLogger();
            if ($logger === null) {
                return;
            }

            [$severityNumber, $severityText] = $this->mapSeverity($record->level);

            $builder = $logger->logRecordBuilder()
                ->setBody($record->message)
                ->setSeverityNumber($severityNumber)
                ->setSeverityText($severityText)
                ->setContext(Context::getCurrent());

            $timestampNanos = ($record->datetime->getTimestamp() * 1_000_000_000)
                + ((int) $record->datetime->format('u') * 1_000);
            $builder->setTimestamp($timestampNanos);

            // Redaction & attribute formatting
            $context = $record->context;
            if (isset($context['exception']) && $context['exception'] instanceof \Throwable) {
                $builder->setException($context['exception']);
                unset($context['exception']);
            }

            /** @var array<string, mixed> $mergedAttributes */
            $mergedAttributes = array_merge($record->extra, $context);
            $sanitizedAttributes = $this->sanitizeAttributes($mergedAttributes);

            foreach ($sanitizedAttributes as $key => $value) {
                $builder->setAttribute((string) $key, $this->formatAttributeValue($value));
            }

            $builder->emit();
        } catch (\Throwable) {
            // Fail-open: telemetry and logging errors must never interrupt application execution
        }
    }

    private function getLogger(): ?LoggerInterface
    {
        if ($this->logger !== null) {
            return $this->logger;
        }

        if ($this->loggerProvider !== null) {
            $this->logger = $this->loggerProvider->getLogger('nanko-backend-logger');

            return $this->logger;
        }

        if ($this->otlpEndpoint === null || trim($this->otlpEndpoint) === '') {
            return null;
        }

        try {
            $endpoint = trim($this->otlpEndpoint);
            $baseEndpoint = (string) preg_replace('#/v1/(traces|logs)/?$#', '', $endpoint);
            $logsEndpoint = rtrim($baseEndpoint, '/') . '/v1/logs';

            putenv('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=' . $logsEndpoint);
            $_SERVER['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] = $logsEndpoint;
            $_ENV['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'] = $logsEndpoint;

            $factory = new LogsExporterFactory();
            $exporter = $factory->create();
            $processor = new BatchLogRecordProcessor($exporter, Clock::getDefault());

            $resource = ResourceInfoFactory::defaultResource()->merge(
                ResourceInfo::create(Attributes::create([
                    'service.name' => $this->serviceName,
                    'deployment.environment' => $this->environment,
                ]))
            );

            $this->loggerProvider = new LoggerProvider(
                $processor,
                new InstrumentationScopeFactory(Attributes::factory()),
                $resource
            );
            $this->logger = $this->loggerProvider->getLogger('nanko-backend-logger');

            return $this->logger;
        } catch (\Throwable) {
            // Fail-open
            return null;
        }
    }

    /**
     * @return array{0: int, 1: string}
     */
    private function mapSeverity(Level $level): array
    {
        return match ($level) {
            Level::Debug => [SeverityNumber::SEVERITY_NUMBER_DEBUG, 'DEBUG'],
            Level::Info => [SeverityNumber::SEVERITY_NUMBER_INFO, 'INFO'],
            Level::Notice => [SeverityNumber::SEVERITY_NUMBER_INFO2, 'NOTICE'],
            Level::Warning => [SeverityNumber::SEVERITY_NUMBER_WARN, 'WARN'],
            Level::Error => [SeverityNumber::SEVERITY_NUMBER_ERROR, 'ERROR'],
            Level::Critical => [SeverityNumber::SEVERITY_NUMBER_FATAL, 'CRITICAL'],
            Level::Alert => [SeverityNumber::SEVERITY_NUMBER_FATAL2, 'ALERT'],
            Level::Emergency => [SeverityNumber::SEVERITY_NUMBER_FATAL3, 'EMERGENCY'],
        };
    }

    /**
     * @param array<string, mixed> $attributes
     *
     * @return array<string, mixed>
     */
    private function sanitizeAttributes(array $attributes): array
    {
        $sanitized = [];
        foreach ($attributes as $key => $value) {
            $sanitized[$key] = $this->sanitizeValue((string) $key, $value);
        }

        return $sanitized;
    }

    private function sanitizeValue(string $key, mixed $value): mixed
    {
        if (preg_match('/(?:password|secret|token|authorization|bearer|cookie|apiKey|private)/i', $key)) {
            return '[REDACTED]';
        }

        if (is_string($value)) {
            $value = preg_replace('/Bearer\s+[A-Za-z0-9\-_.]+/i', 'Bearer [REDACTED]', $value) ?? $value;
            $value = preg_replace('/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/', '[REDACTED_JWT]', $value) ?? $value;

            return $value;
        }

        if (is_array($value)) {
            $result = [];
            foreach ($value as $k => $v) {
                $result[$k] = $this->sanitizeValue((string) $k, $v);
            }

            return $result;
        }

        return $value;
    }

    private function formatAttributeValue(mixed $value): mixed
    {
        if (is_scalar($value) || $value === null) {
            return $value;
        }

        if (is_array($value)) {
            $isListOfScalars = array_is_list($value) && array_reduce(
                $value,
                static fn(bool $carry, mixed $item): bool => $carry && (is_scalar($item) || $item === null),
                true
            );

            if ($isListOfScalars) {
                return $value;
            }

            $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            return $encoded !== false ? $encoded : '[Array]';
        }

        if ($value instanceof \Stringable) {
            return (string) $value;
        }

        $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return $encoded !== false ? $encoded : '[Object]';
    }
}
