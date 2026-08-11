<?php

declare(strict_types=1);

namespace App\Tests\Unit\Dto;

use App\Dto\CreateProjectPayload;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateProjectPayloadTest extends TestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator();
    }

    /**
     * @return iterable<string, array{0: CreateProjectPayload}>
     */
    public static function invalidPayloadProvider(): iterable
    {
        yield 'missing name' => [new CreateProjectPayload(slug: 'a-b')];
        yield 'empty name' => [new CreateProjectPayload(name: '', slug: 'a-b')];
        yield 'missing slug' => [new CreateProjectPayload(name: 'A B')];
        yield 'empty slug' => [new CreateProjectPayload(name: 'A B', slug: '')];
        yield 'uppercase slug' => [new CreateProjectPayload(name: 'A B', slug: 'A-B')];
        yield 'leading dash' => [new CreateProjectPayload(name: 'A B', slug: '-a-b')];
        yield 'trailing dash' => [new CreateProjectPayload(name: 'A B', slug: 'a-b-')];
        yield 'double dash' => [new CreateProjectPayload(name: 'A B', slug: 'a--b')];
        yield 'underscore' => [new CreateProjectPayload(name: 'A B', slug: 'a_b')];
        yield 'space in slug' => [new CreateProjectPayload(name: 'A B', slug: 'a b')];
    }

    #[Test]
    #[DataProvider('invalidPayloadProvider')]
public function it rejects an invalid payload(CreateProjectPayload $payload): void    {        // WHEN validating an invalid payload
        $violations = $this->validator->validate($payload);

        // THEN it is rejected
        self::assertGreaterThan(0, $violations->count());
    }

    #[Test]
    public function it accepts a valid payload(): void
    {
        // GIVEN a valid payload
        $payload = new CreateProjectPayload(name: 'A B', slug: 'a-b');

        // WHEN validating it
        $violations = $this->validator->validate($payload);

        // THEN it is accepted
        self::assertCount(0, $violations);
    }

    #[Test]
    public function it trims the name and slug(): void
    {
        // WHEN creating a payload with padded values
        $payload = new CreateProjectPayload(name: '  A B  ', slug: '  a-b  ');

        // THEN the values are trimmed
        self::assertSame('A B', $payload->name);
        self::assertSame('a-b', $payload->slug);
    }
}
