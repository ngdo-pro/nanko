<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\Domain\Project;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Project\Id;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use PHPUnit\Framework\TestCase;

final class ProjectTest extends TestCase
{
    public function testCreateProject(): void
    {
        $id = Id::generate();
        $orgId = OrganisationId::generate();
        $project = Project::create($id, $orgId, 'Nanko Architecture', 'nanko-architecture');

        self::assertTrue($project->id()->equals($id));
        self::assertTrue($project->organisationId()->equals($orgId));
        self::assertSame('Nanko Architecture', $project->name());
        self::assertSame('nanko-architecture', $project->slug());
        self::assertInstanceOf(\DateTimeImmutable::class, $project->createdAt());
    }

    public function testRenameProject(): void
    {
        $id = Id::generate();
        $orgId = OrganisationId::generate();
        $project = Project::create($id, $orgId, 'Old Project', 'old-project');
        $project->rename('New Project');

        self::assertSame('New Project', $project->name());
    }
}
