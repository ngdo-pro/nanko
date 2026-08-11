<?php

declare(strict_types=1);

namespace App\Tests\Unit\Dto;

use App\Dto\CreateMilestonePayload;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateMilestonePayloadTest extends TestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator();
    }

    /**
     * @return iterable<string, array{0: CreateMilestonePayload}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing label' => [new CreateMilestonePayload(occursOn: '2026-03-01')];
        yield 'empty label' => [new CreateMilestonePayload(label: '', occursOn: '2026-03-01')];
        yield 'malformed occurs_on' => [new CreateMilestonePayload(label: 'Launch', occursOn: 'not-a-date')];
        yield 'occurs_on with time' => [new CreateMilestonePayload(label: 'Launch', occursOn: '2026-03-01T00:00:00')];
    }

    #[Test]
    #[DataProvider('invalidPayloadProvider')]
public function it rejects an invalid payload(CreateMilestonePayload $payload): void    {        // WHEN validating an invalid payload
        $violations = $this->validator->validate($payload);

        // THEN it is rejected
        self::assertGreaterThan(0, $violations->count());
    }

    #[Test]
    public function it accepts a valid payload(): void
    {
        // GIVEN a valid payload
        $payload = new CreateMilestonePayload(label: 'Launch', occursOn: '2026-03-01');

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it accepts a payload without occurs on(): void
    {
        // GIVEN a payload with no occurs_on
        $payload = new CreateMilestonePayload(label: 'Launch');

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it converts a blank occurs on to null(): void
    {
        // WHEN creating a payload with a blank occurs_on
        $payload = new CreateMilestonePayload(label: 'Launch', occursOn: '   ');

        // THEN it is normalized to null
        self::assertNull($payload->occursOn);
    }
}
