<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\ListDocuments;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Port\Document\Repository as DocumentRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;

final readonly class ListDocumentsUseCase
{
    public function __construct(
        private ProjectRepository $projectRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
        private DocumentRepository $documentRepository,
    ) {}

    /**
     * @return list<Document>
     */
    public function execute(ListDocumentsCommand $command): array
    {
        $project = $this->projectRepository->findById($command->projectId);
        if ($project === null) {
            throw new ProjectNotFoundException('Projet introuvable.');
        }

        $member = $this->organisationMemberRepository->findByOrganisationAndUser(
            $project->organisationId(),
            $command->userId,
        );

        if ($member === null) {
            throw new AccessDeniedException('Accès refusé à ce projet.');
        }

        return $this->documentRepository->listByProjectId($command->projectId);
    }
}
