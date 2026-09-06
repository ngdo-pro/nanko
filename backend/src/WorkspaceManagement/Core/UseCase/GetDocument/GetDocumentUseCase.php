<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\GetDocument;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Port\Document\Repository as DocumentRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentNotFoundException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;

final readonly class GetDocumentUseCase
{
    public function __construct(
        private DocumentRepository $documentRepository,
        private ProjectRepository $projectRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
    ) {}

    public function execute(GetDocumentCommand $command): Document
    {
        $document = $this->documentRepository->findById($command->documentId);
        if ($document === null) {
            throw new DocumentNotFoundException('Document introuvable.');
        }

        $project = $this->projectRepository->findById($document->projectId());
        if ($project === null) {
            throw new ProjectNotFoundException('Projet introuvable.');
        }

        $member = $this->organisationMemberRepository->findByOrganisationAndUser(
            $project->organisationId(),
            $command->userId,
        );

        if ($member === null) {
            throw new AccessDeniedException('Accès refusé à ce document.');
        }

        return $document;
    }
}
