<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Organisation\Repository as OrgRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as MemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\OrganisationNotFoundException;
use App\WorkspaceManagement\Core\UseCase\ListProjects\ListProjectsUseCase;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class ListProjectsUseCaseTest extends TestCase
{
    public function testExecuteSuccess(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $orgRepo = $this->createMock(OrgRepository::class);
        $orgRepo->expects(self::once())
            ->method('findById')
            ->with($orgId)
            ->willReturn(Organisation::create($orgId, 'Acme', 'acme'));

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::OWNER));

        $project = Project::create(ProjectId::generate(), $orgId, 'Alpha', 'alpha');
        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('listByOrganisationId')
            ->with($orgId)
            ->willReturn([$project]);

        $useCase = new ListProjectsUseCase($orgRepo, $memberRepo, $projectRepo);
        $result = $useCase->execute($orgId, $userId);

        self::assertCount(1, $result);
        self::assertSame('Alpha', $result[0]->name());
    }

    public function testExecuteThrowsNotFoundWhenOrgDoesNotExist(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $orgRepo = $this->createMock(OrgRepository::class);
        $orgRepo->expects(self::once())
            ->method('findById')
            ->with($orgId)
            ->willReturn(null);

        $memberRepo = $this->createMock(MemberRepository::class);
        $projectRepo = $this->createMock(ProjectRepository::class);

        $useCase = new ListProjectsUseCase($orgRepo, $memberRepo, $projectRepo);

        $this->expectException(OrganisationNotFoundException::class);
        $useCase->execute($orgId, $userId);
    }

    public function testExecuteThrowsAccessDeniedWhenUserNotMember(): void
    {
        $orgId = OrganisationId::generate();
        $userId = Uuid::v7();

        $orgRepo = $this->createMock(OrgRepository::class);
        $orgRepo->expects(self::once())
            ->method('findById')
            ->with($orgId)
            ->willReturn(Organisation::create($orgId, 'Acme', 'acme'));

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(null);

        $projectRepo = $this->createMock(ProjectRepository::class);

        $useCase = new ListProjectsUseCase($orgRepo, $memberRepo, $projectRepo);

        $this->expectException(AccessDeniedException::class);
        $useCase->execute($orgId, $userId);
    }
}
