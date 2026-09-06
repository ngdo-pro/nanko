<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as MemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\CreateProject\CreateProjectCommand;
use App\WorkspaceManagement\Core\UseCase\CreateProject\CreateProjectUseCase;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectSlugAlreadyExistsException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class CreateProjectUseCaseTest extends TestCase
{
    public function testExecuteSuccess(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::OWNER));

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findByOrganisationAndSlug')
            ->with($orgId, 'new-project')
            ->willReturn(null);
        $projectRepo->expects(self::once())
            ->method('save')
            ->with(self::isInstanceOf(Project::class));

        $useCase = new CreateProjectUseCase($memberRepo, $projectRepo);
        $command = new CreateProjectCommand($orgId, $userId, 'New Project', 'new-project');

        $project = $useCase->execute($command);

        self::assertSame('New Project', $project->name());
        self::assertSame('new-project', $project->slug());
        self::assertTrue($project->organisationId()->equals($orgId));
    }

    public function testExecuteFailsWhenUserIsNotMember(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(null);

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::never())->method('save');

        $useCase = new CreateProjectUseCase($memberRepo, $projectRepo);
        $command = new CreateProjectCommand($orgId, $userId, 'New Project', 'new-project');

        $this->expectException(AccessDeniedException::class);
        $this->expectExceptionMessage('Action non autorisée sur cette organisation.');

        $useCase->execute($command);
    }

    public function testExecuteFailsWhenSlugAlreadyExists(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::MEMBER));

        $existingProject = Project::create(ProjectId::generate(), $orgId, 'Existing Project', 'existing-project');
        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findByOrganisationAndSlug')
            ->with($orgId, 'existing-project')
            ->willReturn($existingProject);
        $projectRepo->expects(self::never())->method('save');

        $useCase = new CreateProjectUseCase($memberRepo, $projectRepo);
        $command = new CreateProjectCommand($orgId, $userId, 'Duplicate Project', 'existing-project');

        $this->expectException(ProjectSlugAlreadyExistsException::class);
        $this->expectExceptionMessage('Un projet avec ce slug existe déjà dans cette organisation.');

        $useCase->execute($command);
    }
}
