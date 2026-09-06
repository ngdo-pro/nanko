<?php

declare(strict_types=1);

namespace App\Tests\Unit\Adapter\Driver\Http\OpenTelemetry;

use App\Adapter\Driver\Http\OpenTelemetry\OtelLogHandler;
use Monolog\Level;
use Monolog\LogRecord;
use OpenTelemetry\API\Logs\LoggerInterface;
use OpenTelemetry\API\Logs\LogRecordBuilderInterface;
use Opentelemetry\Proto\Logs\V1\SeverityNumber;
use OpenTelemetry\SDK\Logs\LoggerProviderInterface;
use PHPUnit\Framework\TestCase;

final class OtelLogHandlerTest extends TestCase
{
    public function testLogsAreMappedAndEmittedWithCorrectSeverity(): void
    {
        $builder = $this->createMock(LogRecordBuilderInterface::class);
        $builder->expects(self::once())
            ->method('setBody')
            ->with('User logged in')
            ->willReturnSelf();

        $builder->expects(self::once())
            ->method('setSeverityNumber')
            ->with(SeverityNumber::SEVERITY_NUMBER_INFO)
            ->willReturnSelf();

        $builder->expects(self::once())
            ->method('setSeverityText')
            ->with('INFO')
            ->willReturnSelf();

        $builder->expects(self::once())
            ->method('setContext')
            ->willReturnSelf();

        $builder->expects(self::once())
            ->method('setTimestamp')
            ->willReturnSelf();

        $builder->expects(self::once())
            ->method('emit');

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects(self::once())
            ->method('logRecordBuilder')
            ->willReturn($builder);

        $provider = $this->createMock(LoggerProviderInterface::class);
        $provider->expects(self::once())
            ->method('getLogger')
            ->with('nanko-backend-logger')
            ->willReturn($logger);

        $handler = new OtelLogHandler(
            otlpEndpoint: 'http://collector:4318',
            serviceName: 'nanko-backend',
            environment: 'test',
            level: Level::Info,
            loggerProvider: $provider
        );

        $record = new LogRecord(
            datetime: new \DateTimeImmutable('2026-09-06 10:00:00'),
            channel: 'app',
            level: Level::Info,
            message: 'User logged in',
            context: [],
            extra: []
        );

        $handler->handle($record);
    }

    public function testSensitiveDataIsRedactedInAttributes(): void
    {
        $builder = $this->createStub(LogRecordBuilderInterface::class);
        $builder->method('setBody')->willReturnSelf();
        $builder->method('setSeverityNumber')->willReturnSelf();
        $builder->method('setSeverityText')->willReturnSelf();
        $builder->method('setContext')->willReturnSelf();
        $builder->method('setTimestamp')->willReturnSelf();

        $capturedAttributes = [];
        $builder->method('setAttribute')
            ->willReturnCallback(function (string $key, mixed $value) use (&$capturedAttributes, $builder) {
                $capturedAttributes[$key] = $value;

                return $builder;
            });

        $logger = $this->createStub(LoggerInterface::class);
        $logger->method('logRecordBuilder')->willReturn($builder);

        $provider = $this->createStub(LoggerProviderInterface::class);
        $provider->method('getLogger')->willReturn($logger);

        $handler = new OtelLogHandler(
            otlpEndpoint: 'http://collector:4318',
            level: Level::Debug,
            loggerProvider: $provider
        );

        $jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHclpkw';
        $record = new LogRecord(
            datetime: new \DateTimeImmutable(),
            channel: 'security',
            level: Level::Warning,
            message: 'Authentication failed',
            context: [
                'password' => 'superSecret123',
                'authorization' => 'Bearer ' . $jwt,
                'header_dump' => 'Header Bearer ' . $jwt . ' was sent',
                'user_id' => '01955f24-7b3b-7c99-b1d5-2a1d2f34e567',
                'nested' => [
                    'secret_key' => 'shhh',
                    'normal_key' => 'visible',
                ],
            ],
            extra: [
                'token' => 'xyz-token',
            ]
        );

        $handler->handle($record);

        self::assertSame('[REDACTED]', $capturedAttributes['password']);
        self::assertSame('[REDACTED]', $capturedAttributes['token']);
        self::assertSame('[REDACTED]', $capturedAttributes['authorization']);
        self::assertStringContainsString('Bearer [REDACTED]', (string) $capturedAttributes['header_dump']);
        self::assertSame('01955f24-7b3b-7c99-b1d5-2a1d2f34e567', $capturedAttributes['user_id']);

        $nested = json_decode((string) $capturedAttributes['nested'], true);
        self::assertIsArray($nested);
        self::assertSame('[REDACTED]', $nested['secret_key']);
        self::assertSame('visible', $nested['normal_key']);
    }

    public function testLevelFilteringIgnoresLowerSeverityRecords(): void
    {
        $provider = $this->createMock(LoggerProviderInterface::class);
        $provider->expects(self::never())->method('getLogger');

        $handler = new OtelLogHandler(
            otlpEndpoint: 'http://collector:4318',
            level: Level::Warning,
            loggerProvider: $provider
        );

        $record = new LogRecord(
            datetime: new \DateTimeImmutable(),
            channel: 'app',
            level: Level::Info,
            message: 'Informational notice',
            context: [],
            extra: []
        );

        $handled = $handler->handle($record);
        self::assertFalse($handled);
    }

    public function testFailOpenWhenProviderThrows(): void
    {
        $builder = $this->createStub(LogRecordBuilderInterface::class);
        $builder->method('setBody')->willReturnSelf();
        $builder->method('setSeverityNumber')->willReturnSelf();
        $builder->method('setSeverityText')->willReturnSelf();
        $builder->method('setContext')->willReturnSelf();
        $builder->method('setTimestamp')->willReturnSelf();
        $builder->method('emit')->willThrowException(new \RuntimeException('Connection refused to OTLP collector'));

        $logger = $this->createStub(LoggerInterface::class);
        $logger->method('logRecordBuilder')->willReturn($builder);

        $provider = $this->createStub(LoggerProviderInterface::class);
        $provider->method('getLogger')->willReturn($logger);

        $handler = new OtelLogHandler(
            otlpEndpoint: 'http://collector:4318',
            level: Level::Info,
            loggerProvider: $provider
        );

        $record = new LogRecord(
            datetime: new \DateTimeImmutable(),
            channel: 'app',
            level: Level::Error,
            message: 'Failure message',
            context: [],
            extra: []
        );

        // Fail-open: MUST NOT throw any exception
        $handler->handle($record);
        $handler->flush();
        $handler->close();
        self::assertTrue(true);
    }

    public function testFlushAndCloseTriggerProviderMethods(): void
    {
        $provider = $this->createMock(LoggerProviderInterface::class);
        $provider->expects(self::atLeastOnce())->method('forceFlush');
        $provider->expects(self::once())->method('shutdown');

        $handler = new OtelLogHandler(
            otlpEndpoint: 'http://collector:4318',
            level: Level::Info,
            loggerProvider: $provider
        );

        $handler->flush();
        $handler->close();
    }
}
