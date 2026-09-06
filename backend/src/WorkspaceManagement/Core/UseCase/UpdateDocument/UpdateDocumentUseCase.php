<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\UpdateDocument;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Parser\NankoParser;
use App\WorkspaceManagement\Core\Port\Document\Repository as DocumentRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentNotFoundException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;

final readonly class UpdateDocumentUseCase
{
    public function __construct(
        private DocumentRepository $documentRepository,
        private ProjectRepository $projectRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
    ) {}

    public function execute(UpdateDocumentCommand $command): Document
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
            throw new AccessDeniedException('Action non autorisée sur ce document.');
        }

        $ast = NankoParser::parse($command->sourceCode)->toArray();

        $document->updateSourceCode($command->sourceCode, $ast);

        $this->documentRepository->save($document);

        return $document;
    }
}
