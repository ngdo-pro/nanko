<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\ListProjects;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Organisation\Repository as OrganisationRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\OrganisationNotFoundException;
use Symfony\Component\Uid\Uuid;

final readonly class ListProjectsUseCase
{
    public function __construct(
        private OrganisationRepository $organisationRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
        private ProjectRepository $projectRepository,
    ) {}

    /**
     * @return list<Project>
     */
    public function execute(OrganisationId $organisationId, Uuid $userId): array
    {
        $org = $this->organisationRepository->findById($organisationId);
        if ($org === null) {
            throw new OrganisationNotFoundException();
        }

        $member = $this->organisationMemberRepository->findByOrganisationAndUser($organisationId, $userId);
        if ($member === null) {
            throw new AccessDeniedException();
        }

        return $this->projectRepository->listByOrganisationId($organisationId);
    }
}
