<?php

declare(strict_types=1);

namespace App\Tests\Unit\Dto;

use App\Dto\CreateRelationPayload;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateRelationPayloadTest extends TestCase
{
    private const string MILESTONE_ID = '00000000-0000-0000-0000-000000000002';
    private const string SOURCE_ELEMENT_ID = '00000000-0000-0000-0000-000000000003';
    private const string TARGET_ELEMENT_ID = '00000000-0000-0000-0000-000000000004';

    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator();
    }

    /**
     * @return iterable<string, array{0: CreateRelationPayload}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing milestone_id' => [
            new CreateRelationPayload(sourceElementId: self::SOURCE_ELEMENT_ID, targetElementId: self::TARGET_ELEMENT_ID),
        ];
        yield 'missing source_element_id' => [
            new CreateRelationPayload(milestoneId: self::MILESTONE_ID, targetElementId: self::TARGET_ELEMENT_ID),
        ];
        yield 'missing target_element_id' => [
            new CreateRelationPayload(milestoneId: self::MILESTONE_ID, sourceElementId: self::SOURCE_ELEMENT_ID),
        ];
    }

    #[Test]
    #[DataProvider('invalidPayloadProvider')]
    public function it rejects an invalid payload(CreateRelationPayload $payload): void
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
        $payload = new CreateRelationPayload(
            milestoneId: self::MILESTONE_ID,
            sourceElementId: self::SOURCE_ELEMENT_ID,
            targetElementId: self::TARGET_ELEMENT_ID,
        );

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it trims the milestone and element ids(): void
    {
        // WHEN creating a payload with padded values
        $payload = new CreateRelationPayload(
            milestoneId: '  ' . self::MILESTONE_ID . '  ',
            sourceElementId: '  ' . self::SOURCE_ELEMENT_ID . '  ',
            targetElementId: '  ' . self::TARGET_ELEMENT_ID . '  ',
        );

        // THEN the values are trimmed
        self::assertSame(self::MILESTONE_ID, $payload->milestoneId);
        self::assertSame(self::SOURCE_ELEMENT_ID, $payload->sourceElementId);
        self::assertSame(self::TARGET_ELEMENT_ID, $payload->targetElementId);
    }

    #[Test]
    public function it converts blank optional fields to null(): void
    {
        // WHEN creating a payload with blank optional fields
        $payload = new CreateRelationPayload(
            milestoneId: self::MILESTONE_ID,
            sourceElementId: self::SOURCE_ELEMENT_ID,
            targetElementId: self::TARGET_ELEMENT_ID,
            label: '  ',
            technology: '  ',
        );

        // THEN the optional fields are normalized to null
        self::assertNull($payload->label);
        self::assertNull($payload->technology);
    }

    #[Test]
    public function it accepts a payload with no anchor(): void
    {
        // GIVEN a payload that does not specify an anchor
        $payload = new CreateRelationPayload(
            milestoneId: self::MILESTONE_ID,
            sourceElementId: self::SOURCE_ELEMENT_ID,
            targetElementId: self::TARGET_ELEMENT_ID,
        );

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted, and the anchor fields stay null
        self::assertCount(0, $violations);
        self::assertNull($payload->sourceHandle);
        self::assertNull($payload->targetHandle);
    }

    #[Test]
    public function it accepts a payload with a valid anchor on each end(): void
    {
        // GIVEN a payload anchored from the source's left edge to the target's center
        $payload = new CreateRelationPayload(
            milestoneId: self::MILESTONE_ID,
            sourceElementId: self::SOURCE_ELEMENT_ID,
            targetElementId: self::TARGET_ELEMENT_ID,
            sourceHandle: 'left',
            targetHandle: 'center',
        );

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it rejects a payload with an unknown anchor value(): void
    {
        // GIVEN a payload with a nonsensical anchor
        $payload = new CreateRelationPayload(
            milestoneId: self::MILESTONE_ID,
            sourceElementId: self::SOURCE_ELEMENT_ID,
            targetElementId: self::TARGET_ELEMENT_ID,
            sourceHandle: 'diagonal',
        );

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is rejected
        self::assertGreaterThan(0, $violations->count());
    }
}
