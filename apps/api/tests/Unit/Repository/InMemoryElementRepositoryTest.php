<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Repository\ElementRepositoryInterface;
use App\Tests\Support\ElementRepositoryTestCase;
use App\Tests\Support\InMemoryElementRepository;
use App\Tests\Support\InMemoryMilestoneRepository;
use App\Tests\Support\InMemoryProjectRepository;

final class InMemoryElementRepositoryTest extends ElementRepositoryTestCase
{
    private InMemoryElementRepository $inMemoryRepository;

    protected function createRepository(): ElementRepositoryInterface
    {
        $this->inMemoryRepository = new InMemoryElementRepository();

        return $this->inMemoryRepository;
    }

    protected function createProject(): string
    {
        $project = (new InMemoryProjectRepository())->create('Test project', uniqid('test-project-'));
        self::assertIsString($project['id']);

        $this->inMemoryRepository->registerProject($project['id']);

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
}
