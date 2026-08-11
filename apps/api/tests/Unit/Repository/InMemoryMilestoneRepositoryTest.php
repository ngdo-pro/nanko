<?php

declare(strict_types=1);

namespace App\Tests\Unit\Repository;

use App\Repository\MilestoneRepositoryInterface;
use App\Tests\Support\InMemoryMilestoneRepository;
use App\Tests\Support\InMemoryProjectRepository;
use App\Tests\Support\MilestoneRepositoryTestCase;

final class InMemoryMilestoneRepositoryTest extends MilestoneRepositoryTestCase
{
    private InMemoryMilestoneRepository $inMemoryRepository;

    protected function createRepository(): MilestoneRepositoryInterface
    {
        $this->inMemoryRepository = new InMemoryMilestoneRepository();

        return $this->inMemoryRepository;
    }

    protected function createProject(): string
    {
        $project = (new InMemoryProjectRepository())->create('Test project', uniqid('test-project-'));
        self::assertIsString($project['id']);

        $this->inMemoryRepository->registerProject($project['id']);

        return $project['id'];
    }
}
