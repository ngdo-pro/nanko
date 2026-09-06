<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Document\Document;
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
use App\WorkspaceManagement\Core\UseCase\CreateDocument\CreateDocumentCommand;
use App\WorkspaceManagement\Core\UseCase\CreateDocument\CreateDocumentUseCase;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentSlugAlreadyExistsException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class CreateDocumentUseCaseTest extends TestCase
{
    public function testExecuteSuccess(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findById')
            ->with($projectId)
            ->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::OWNER));

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())
            ->method('findByProjectAndSlug')
            ->with($projectId, 'new-doc')
            ->willReturn(null);
        $docRepo->expects(self::once())
            ->method('save')
            ->with(self::isInstanceOf(Document::class));

        $useCase = new CreateDocumentUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new CreateDocumentCommand($projectId, $userId, 'New Doc', 'new-doc', Layer::fromInt(0));

        $doc = $useCase->execute($command);

        self::assertSame('New Doc', $doc->name());
        self::assertSame('new-doc', $doc->slug());
        self::assertSame(0, $doc->layer()->toInt());
        self::assertTrue($doc->projectId()->equals($projectId));
        self::assertNotEmpty($doc->sourceCode());
        self::assertArrayHasKey('shapes', $doc->ast());
    }

    public function testExecuteFailsWhenProjectNotFound(): void
    {
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findById')
            ->with($projectId)
            ->willReturn(null);

        $memberRepo = $this->createMock(MemberRepository::class);
        $docRepo = $this->createMock(DocumentRepository::class);

        $useCase = new CreateDocumentUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new CreateDocumentCommand($projectId, $userId, 'New Doc', 'new-doc', Layer::fromInt(0));

        $this->expectException(ProjectNotFoundException::class);
        $this->expectExceptionMessage('Projet introuvable.');

        $useCase->execute($command);
    }

    public function testExecuteFailsWhenUserIsNotMember(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())
            ->method('findById')
            ->with($projectId)
            ->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(null);

        $docRepo = $this->createMock(DocumentRepository::class);

        $useCase = new CreateDocumentUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new CreateDocumentCommand($projectId, $userId, 'New Doc', 'new-doc', Layer::fromInt(0));

        $this->expectException(AccessDeniedException::class);
        $this->expectExceptionMessage('Action non autorisée sur ce projet.');

        $useCase->execute($command);
    }

    public function testExecuteFailsWhenSlugAlreadyExists(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');

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

        $existing = Document::create(
            \App\WorkspaceManagement\Core\Domain\Document\Id::generate(),
            $projectId,
            'Existing',
            'existing-doc',
            Layer::fromInt(0),
            'code',
            [],
        );

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())
            ->method('findByProjectAndSlug')
            ->with($projectId, 'existing-doc')
            ->willReturn($existing);

        $useCase = new CreateDocumentUseCase($projectRepo, $memberRepo, $docRepo);
        $command = new CreateDocumentCommand($projectId, $userId, 'Duplicate', 'existing-doc', Layer::fromInt(0));

        $this->expectException(DocumentSlugAlreadyExistsException::class);
        $this->expectExceptionMessage('Un document avec ce slug existe déjà dans ce projet.');

        $useCase->execute($command);
    }
}
