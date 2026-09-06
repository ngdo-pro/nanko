<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Document\Repository as DocumentRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as MemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use App\WorkspaceManagement\Core\UseCase\ListDocuments\ListDocumentsCommand;
use App\WorkspaceManagement\Core\UseCase\ListDocuments\ListDocumentsUseCase;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class ListDocumentsUseCaseTest extends TestCase
{
    public function testExecuteSuccess(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');
        $doc1 = Document::create(DocumentId::generate(), $projectId, 'Doc 1', 'doc-1', Layer::fromInt(0), 'code1', []);
        $doc2 = Document::create(DocumentId::generate(), $projectId, 'Doc 2', 'doc-2', Layer::fromInt(1), 'code2', []);

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findById')
            ->with($projectId)
            ->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::MEMBER));

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())
            ->method('listByProjectId')
            ->with($projectId)
            ->willReturn([$doc1, $doc2]);

        $useCase = new ListDocumentsUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new ListDocumentsCommand($projectId, $userId);

        $results = $useCase->execute($command);

        self::assertCount(2, $results);
        self::assertSame('Doc 1', $results[0]->name());
        self::assertSame('Doc 2', $results[1]->name());
    }

    public function testExecuteFailsWhenProjectNotFound(): void
    {
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())->method('findById')->willReturn(null);

        $memberRepo = $this->createMock(MemberRepository::class);
        $docRepo = $this->createMock(DocumentRepository::class);

        $useCase = new ListDocumentsUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new ListDocumentsCommand($projectId, $userId);

        $this->expectException(ProjectNotFoundException::class);

        $useCase->execute($command);
    }

    public function testExecuteFailsWhenUserIsNotMember(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())->method('findById')->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(null);

        $docRepo = $this->createMock(DocumentRepository::class);

        $useCase = new ListDocumentsUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new ListDocumentsCommand($projectId, $userId);

        $this->expectException(AccessDeniedException::class);

        $useCase->execute($command);
    }
}
