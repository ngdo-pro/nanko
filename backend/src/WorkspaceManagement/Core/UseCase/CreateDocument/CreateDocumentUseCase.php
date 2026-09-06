<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\CreateDocument;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Parser\NankoParser;
use App\WorkspaceManagement\Core\Port\Document\Repository as DocumentRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentSlugAlreadyExistsException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;

final readonly class CreateDocumentUseCase
{
    public function __construct(
        private ProjectRepository $projectRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
        private DocumentRepository $documentRepository,
    ) {}

    public function execute(CreateDocumentCommand $command): Document
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
            throw new AccessDeniedException('Action non autorisée sur ce projet.');
        }

        $existing = $this->documentRepository->findByProjectAndSlug($command->projectId, $command->slug);
        if ($existing !== null) {
            throw new DocumentSlugAlreadyExistsException('Un document avec ce slug existe déjà dans ce projet.');
        }

        $templateSourceCode = sprintf(
            "@id %s\n@layer %d\n\nrectangle app \"%s\"\n",
            $command->slug,
            $command->layer->toInt(),
            $command->name,
        );

        $ast = NankoParser::parse($templateSourceCode)->toArray();

        $document = Document::create(
            id: DocumentId::generate(),
            projectId: $command->projectId,
            name: $command->name,
            slug: $command->slug,
            layer: $command->layer,
            sourceCode: $templateSourceCode,
            ast: $ast,
        );

        $this->documentRepository->save($document);

        return $document;
    }
}
