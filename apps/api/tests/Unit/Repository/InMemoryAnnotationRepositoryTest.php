<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Repository\AnnotationRepositoryInterface;
use App\Tests\Support\AnnotationRepositoryTestCase;
use App\Tests\Support\InMemoryAnnotationRepository;
use App\Tests\Support\InMemoryElementRepository;
use App\Tests\Support\InMemoryMilestoneRepository;
use App\Tests\Support\InMemoryProjectRepository;
use App\Tests\Support\InMemoryRelationRepository;

final class InMemoryAnnotationRepositoryTest extends AnnotationRepositoryTestCase
{
    private InMemoryAnnotationRepository $inMemoryRepository;

    protected function createRepository(): AnnotationRepositoryInterface
    {
        $this->inMemoryRepository = new InMemoryAnnotationRepository();

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

    protected function createRelation(string $projectId, string $milestoneId, string $sourceId, string $targetId): string
    {
        $relationRepository = new InMemoryRelationRepository();
        $relationRepository->registerProject($projectId);
        $relationRepository->registerMilestone($milestoneId, $projectId);
        $relationRepository->registerElement($sourceId, $projectId);
        $relationRepository->registerElement($targetId, $projectId);
        $relation = $relationRepository->create($projectId, $milestoneId, $sourceId, $targetId, null, null);
        self::assertIsString($relation['id']);

        $this->inMemoryRepository->registerRelation($relation['id'], $projectId);

        return $relation['id'];
    }
}
