<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\CreateProject;

use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectSlugAlreadyExistsException;

final readonly class CreateProjectUseCase
{
    public function __construct(
        private OrganisationMemberRepository $organisationMemberRepository,
        private ProjectRepository $projectRepository,
    ) {}

    public function execute(CreateProjectCommand $command): Project
    {
        $member = $this->organisationMemberRepository->findByOrganisationAndUser(
            $command->organisationId,
            $command->userId,
        );

        if ($member === null) {
            throw new AccessDeniedException('Action non autorisée sur cette organisation.');
        }

        $existing = $this->projectRepository->findByOrganisationAndSlug(
            $command->organisationId,
            $command->slug,
        );

        if ($existing !== null) {
            throw new ProjectSlugAlreadyExistsException('Un projet avec ce slug existe déjà dans cette organisation.');
        }

        $project = Project::create(
            id: ProjectId::generate(),
            organisationId: $command->organisationId,
            name: $command->name,
            slug: $command->slug,
        );

        $this->projectRepository->save($project);

        return $project;
    }
}
