<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Repository\PositionRepositoryInterface;
use App\Tests\Support\InMemoryElementRepository;
use App\Tests\Support\InMemoryMilestoneRepository;
use App\Tests\Support\InMemoryPositionRepository;
use App\Tests\Support\InMemoryProjectRepository;
use App\Tests\Support\PositionRepositoryTestCase;

final class InMemoryPositionRepositoryTest extends PositionRepositoryTestCase
{
    private InMemoryPositionRepository $inMemoryRepository;

    protected function createRepository(): PositionRepositoryInterface
    {
        $this->inMemoryRepository = new InMemoryPositionRepository();

        return $this->inMemoryRepository;
    }

    protected function createProject(): string
    {
        $project = (new InMemoryProjectRepository())->create('Test project', uniqid('test-project-'));
        self::assertIsString($project['id']);

        return $project['id'];
    }

    protected function createMilestone(string $projectId): string
    {
        $milestoneRepository = new InMemoryMilestoneRepository();
        $milestoneRepository->registerProject($projectId);
        $milestone = $milestoneRepository->create($projectId, 'Test milestone', null);
        self::assertIsString($milestone['id']);

        $this->inMemoryRepository->registerMilestone($milestone['id'], $projectId);

        return $milestone['id'];
    }

    protected function createElement(string $projectId, string $milestoneId): string
    {
        $elementRepository = new InMemoryElementRepository();
        $elementRepository->registerProject($projectId);
        $elementRepository->registerMilestone($milestoneId, $projectId);
        $element = $elementRepository->create($projectId, $milestoneId, 'system', null, 'Test element', null, null, false);
        self::assertIsString($element['id']);

        $this->inMemoryRepository->registerElement($element['id'], $projectId);

        return $element['id'];
    }
}
