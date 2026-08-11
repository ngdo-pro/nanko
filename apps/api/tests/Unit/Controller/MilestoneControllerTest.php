<?php

declare(strict_types=1);

namespace App\Tests\Unit\Controller;

use App\Controller\MilestoneController;
use App\Dto\CreateMilestonePayload;
use App\Tests\Support\InMemoryMilestoneRepository;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class MilestoneControllerTest extends TestCase
{
    #[Test]
    public function it returns 404 when creating a milestone for an unknown project(): void
    {
        // GIVEN a controller backed by an empty repository
        $repository = new InMemoryMilestoneRepository();
        $controller = new MilestoneController($repository);

        // WHEN creating a milestone for an unregistered project
        $response = $controller->create(
            '00000000-0000-0000-0000-000000000000',
            new CreateMilestonePayload(label: 'Launch'),
        );

        // THEN the request is rejected with a 404 and an error body
        self::assertSame(404, $response->getStatusCode());
        $body = json_decode((string) $response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        self::assertIsArray($body);
        self::assertArrayHasKey('error', $body);
    }
}
