<?php

declare(strict_types=1);

namespace App\Tests\Unit\Dto;

use App\Dto\CreateElementPayload;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateElementPayloadTest extends TestCase
{
    private const string MILESTONE_ID = '00000000-0000-0000-0000-000000000002';

    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator();
    }

    /**
     * @return iterable<string, array{0: CreateElementPayload}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing milestone_id' => [new CreateElementPayload(kind: 'system', name: 'Booking')];
        yield 'missing kind' => [new CreateElementPayload(milestoneId: self::MILESTONE_ID, name: 'Booking')];
        yield 'unsupported kind' => [new CreateElementPayload(milestoneId: self::MILESTONE_ID, kind: 'person', name: 'Client')];
        yield 'missing name' => [new CreateElementPayload(milestoneId: self::MILESTONE_ID, kind: 'system')];
        yield 'empty name' => [new CreateElementPayload(milestoneId: self::MILESTONE_ID, kind: 'system', name: '')];
    }

    #[Test]
    #[DataProvider('invalidPayloadProvider')]
    public function it rejects an invalid payload(CreateElementPayload $payload): void
    {
        // WHEN validating an invalid payload
        $violations = $this->validator->validate($payload);

        // THEN it is rejected
        self::assertGreaterThan(0, $violations->count());
    }

    #[Test]
    public function it accepts a valid payload(): void
    {
        // GIVEN a valid payload
        $payload = new CreateElementPayload(milestoneId: self::MILESTONE_ID, kind: 'system', name: 'Booking');

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it trims the name and milestone id(): void
    {
        // WHEN creating a payload with padded values
        $payload = new CreateElementPayload(milestoneId: '  ' . self::MILESTONE_ID . '  ', kind: 'system', name: '  Booking  ');

        // THEN the values are trimmed
        self::assertSame(self::MILESTONE_ID, $payload->milestoneId);
        self::assertSame('Booking', $payload->name);
    }

    #[Test]
    public function it converts blank optional fields to null(): void
    {
        // WHEN creating a payload with blank optional fields
        $payload = new CreateElementPayload(
            milestoneId: self::MILESTONE_ID,
            kind: 'system',
            name: 'Booking',
            parentId: '  ',
            description: '  ',
            technology: '  ',
        );

        // THEN the optional fields are normalized to null
        self::assertNull($payload->parentId);
        self::assertNull($payload->description);
        self::assertNull($payload->technology);
    }
}
