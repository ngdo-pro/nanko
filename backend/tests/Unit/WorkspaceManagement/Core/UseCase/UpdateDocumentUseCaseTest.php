<?php

declare(strict_types=1);

namespace App\Tests\Unit\WorkspaceManagement\Core\UseCase;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Document\Parser\InvalidNankoSyntaxException;
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
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentNotFoundException;
use App\WorkspaceManagement\Core\UseCase\UpdateDocument\UpdateDocumentCommand;
use App\WorkspaceManagement\Core\UseCase\UpdateDocument\UpdateDocumentUseCase;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Uid\Uuid;

final class UpdateDocumentUseCaseTest extends TestCase
{
    public function testExecuteSuccess(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $docId = DocumentId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');
        $document = Document::create($docId, $projectId, 'Doc', 'doc', Layer::fromInt(0), 'initial', []);

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())
            ->method('findById')
            ->with($docId)
            ->willReturn($document);
        $docRepo->expects(self::once())
            ->method('save')
            ->with($document);

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

        $useCase = new UpdateDocumentUseCase($docRepo, $projectRepo, $memberRepo);
        $newCode = "rectangle s1 \"Service 1\"\ncircle db \"DB\"\ns1 -> db \"query\"\n";
        $command = new UpdateDocumentCommand($docId, $userId, $newCode);

        $updated = $useCase->execute($command);

        self::assertSame($newCode, $updated->sourceCode());
        self::assertCount(2, $updated->ast()['shapes']);
        self::assertCount(1, $updated->ast()['connectors']);
    }

    public function testExecuteFailsWhenDocumentNotFound(): void
    {
        $docId = DocumentId::generate();
        $userId = Uuid::v7();

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())->method('findById')->willReturn(null);

        $projectRepo = $this->createMock(ProjectRepository::class);
        $memberRepo = $this->createMock(MemberRepository::class);

        $useCase = new UpdateDocumentUseCase($docRepo, $projectRepo, $memberRepo);
        $command = new UpdateDocumentCommand($docId, $userId, 'some code');

        $this->expectException(DocumentNotFoundException::class);
        $this->expectExceptionMessage('Document introuvable.');

        $useCase->execute($command);
    }

    public function testExecuteFailsWhenUserIsNotMember(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $docId = DocumentId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');
        $document = Document::create($docId, $projectId, 'Doc', 'doc', Layer::fromInt(0), 'initial', []);

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())->method('findById')->willReturn($document);

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())->method('findById')->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(null);

        $useCase = new UpdateDocumentUseCase($docRepo, $projectRepo, $memberRepo);
        $command = new UpdateDocumentCommand($docId, $userId, 'some code');

        $this->expectException(AccessDeniedException::class);
        $this->expectExceptionMessage('Action non autorisée sur ce document.');

        $useCase->execute($command);
    }

    public function testExecuteFailsOnSyntaxError(): void
    {
        $orgId = OrganisationId::generate();
        $projectId = ProjectId::generate();
        $docId = DocumentId::generate();
        $userId = Uuid::v7();

        $project = Project::create($projectId, $orgId, 'Project', 'project');
        $document = Document::create($docId, $projectId, 'Doc', 'doc', Layer::fromInt(0), 'initial', []);

        $docRepo = $this->createMock(DocumentRepository::class);
        $docRepo->expects(self::once())->method('findById')->willReturn($document);
        $docRepo->expects(self::never())->method('save');

        $projectRepo = $this->createMock(ProjectRepository::class);
        $projectRepo->expects(self::once())->method('findById')->willReturn($project);

        $memberRepo = $this->createMock(MemberRepository::class);
        $memberRepo->expects(self::once())
            ->method('findByOrganisationAndUser')
            ->with($orgId, $userId)
            ->willReturn(OrganisationMember::create(MemberId::generate(), $orgId, $userId, Role::MEMBER));

        $useCase = new UpdateDocumentUseCase($docRepo, $projectRepo, $memberRepo);
        $invalidCode = "rectangle s1 \"S1\"\ns1 -> nonexistent \"link\"\n";
        $command = new UpdateDocumentCommand($docId, $userId, $invalidCode);

        $this->expectException(InvalidNankoSyntaxException::class);

        $useCase->execute($command);
    }
}
