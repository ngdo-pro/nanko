<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\DuplicateSlugException;
use App\Repository\ProjectNotFoundException;
use App\Repository\ProjectRepositoryInterface;
use PHPUnit\Framework\Attributes\Test;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Shared behavioral contract for every ProjectRepositoryInterface implementation.
 *
 * Each concrete implementation (InMemory, Doctrine, ...) must pass every test
 * here unmodified, so a fake used in fast unit tests can never silently drift
 * from the real adapter's behavior.
 */
abstract class ProjectRepositoryTestCase extends KernelTestCase
{
    protected ProjectRepositoryInterface $repository;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repository = $this->createRepository();
    }

    abstract protected function createRepository(): ProjectRepositoryInterface;

    #[Test]
    public function it returns an empty array when no project exists(): void
    {
        // GIVEN no project exists

        // WHEN listing projects
        $projects = $this->repository->findAll();

        // THEN the list is empty
        self::assertSame([], $projects);
    }

    #[Test]
    public function it returns the created project with an id and timestamps(): void
    {
        // GIVEN no project exists

        // WHEN creating a project
        $project = $this->repository->create('Nanko', 'nanko');

        // THEN the created project is returned with a generated id and timestamps
        self::assertSame('Nanko', $project['name']);
        self::assertSame('nanko', $project['slug']);
        self::assertIsString($project['id']);
        self::assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $project['id'],
        );
        self::assertArrayHasKey('created_at', $project);
        self::assertArrayHasKey('updated_at', $project);
    }

    #[Test]
    public function a created project appears in the list(): void
    {
        // GIVEN a project was created
        $this->repository->create('Nanko', 'nanko');

        // WHEN listing projects
        $projects = $this->repository->findAll();

        // THEN the created project appears in the list
        self::assertCount(1, $projects);
        self::assertSame('nanko', $projects[0]['slug']);
    }

    #[Test]
    public function creating a project with a duplicate slug throws(): void
    {
        // GIVEN a project already exists
        $this->repository->create('Nanko', 'nanko');

        // WHEN creating another project with the same slug
        // THEN a DuplicateSlugException is thrown
        $this->expectException(DuplicateSlugException::class);
        $this->repository->create('Nanko again', 'nanko');
    }

    #[Test]
    public function a duplicate slug does not create a second project(): void
    {
        // GIVEN a project already exists
        $this->repository->create('Nanko', 'nanko');

        // WHEN attempting to create another project with the same slug
        try {
            $this->repository->create('Nanko again', 'nanko');
        } catch (DuplicateSlugException) {
            // expected
        }

        // THEN the list still contains a single entry
        self::assertCount(1, $this->repository->findAll());
    }

    #[Test]
    public function a deleted project no longer appears in the list(): void
    {
        // GIVEN a project was created
        $project = $this->repository->create('Nanko', 'nanko');
        self::assertIsString($project['id']);

        // WHEN deleting it
        $this->repository->delete($project['id']);

        // THEN the list is empty
        self::assertSame([], $this->repository->findAll());
    }

    #[Test]
    public function deleting an unknown project throws(): void
    {
        // GIVEN no project exists

        // WHEN deleting an unknown id
        // THEN a ProjectNotFoundException is thrown
        $this->expectException(ProjectNotFoundException::class);
        $this->repository->delete('00000000-0000-0000-0000-000000000000');
    }
}
