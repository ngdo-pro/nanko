<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Organisation\Repository as OrgRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as MemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\GetOrCreatePersonalOrganisation\GetOrCreatePersonalOrganisationUseCase;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class GetOrCreatePersonalOrganisationUseCaseTest extends TestCase
{
    public function testAutoProvisioningWhenUserHasNoPersonalOrg(): void
    {
        $userId = Uuid::v7();
        $orgId = OrganisationId::generate();
        $personalOrg = Organisation::create($orgId, 'Espace personnel', 'personal-12345678', true);

        $orgRepo = $this->createMock(OrgRepository::class);
        $memberRepo = $this->createMock(MemberRepository::class);
        $projectRepo = $this->createMock(ProjectRepository::class);

        $orgRepo->expects(self::once())
            ->method('findPersonalOrganisationForUser')
            ->with($userId)
            ->willReturn(null);

        $orgRepo->expects(self::once())
            ->method('save')
            ->with(self::isInstanceOf(Organisation::class));

        $memberRepo->expects(self::once())
            ->method('save');

        $projectRepo->expects(self::once())
            ->method('save')
            ->with(self::isInstanceOf(Project::class));

        $orgRepo->expects(self::once())
            ->method('listForUser')
            ->with($userId)
            ->willReturn([
                ['organisation' => $personalOrg, 'role' => 'owner'],
            ]);

        $project = Project::create(ProjectId::generate(), $orgId, 'Mon premier projet', 'mon-premier-projet');
        $projectRepo->expects(self::once())
            ->method('listByOrganisationId')
            ->with($orgId)
            ->willReturn([$project]);

        $useCase = new GetOrCreatePersonalOrganisationUseCase($orgRepo, $memberRepo, $projectRepo);
        $result = $useCase->execute($userId);

        self::assertCount(1, $result);
        self::assertSame('Espace personnel', $result[0]['name']);
        self::assertTrue($result[0]['isPersonal']);
        self::assertCount(1, $result[0]['projects']);
        self::assertSame('Mon premier projet', $result[0]['projects'][0]['name']);
    }

    public function testDoesNotRecreateWhenAlreadyExists(): void
    {
        $userId = Uuid::v7();
        $orgId = OrganisationId::generate();
        $existingOrg = Organisation::create($orgId, 'Espace personnel', 'personal-12345678', true);

        $orgRepo = $this->createMock(OrgRepository::class);
        $memberRepo = $this->createMock(MemberRepository::class);
        $projectRepo = $this->createMock(ProjectRepository::class);

        $orgRepo->expects(self::once())
            ->method('findPersonalOrganisationForUser')
            ->with($userId)
            ->willReturn($existingOrg);

        $orgRepo->expects(self::never())->method('save');
        $memberRepo->expects(self::never())->method('save');

        $orgRepo->expects(self::once())
            ->method('listForUser')
            ->with($userId)
            ->willReturn([
                ['organisation' => $existingOrg, 'role' => 'owner'],
            ]);

        $projectRepo->expects(self::once())
            ->method('listByOrganisationId')
            ->with($orgId)
            ->willReturn([]);

        $useCase = new GetOrCreatePersonalOrganisationUseCase($orgRepo, $memberRepo, $projectRepo);
        $result = $useCase->execute($userId);

        self::assertCount(1, $result);
        self::assertSame('Espace personnel', $result[0]['name']);
    }
}
