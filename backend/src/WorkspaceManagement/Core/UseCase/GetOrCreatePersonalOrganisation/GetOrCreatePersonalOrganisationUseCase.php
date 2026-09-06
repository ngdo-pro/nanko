<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\GetOrCreatePersonalOrganisation;

use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\Port\Organisation\Repository as OrganisationRepository;
use App\WorkspaceManagement\Core\Port\OrganisationMember\Repository as OrganisationMemberRepository;
use App\WorkspaceManagement\Core\Port\Project\Repository as ProjectRepository;
use Symfony\Component\Uid\Uuid;

final readonly class GetOrCreatePersonalOrganisationUseCase
{
    public function __construct(
        private OrganisationRepository $organisationRepository,
        private OrganisationMemberRepository $organisationMemberRepository,
        private ProjectRepository $projectRepository,
    ) {}

    /**
     * @return list<array{
     *     id: string,
     *     name: string,
     *     slug: string,
     *     isPersonal: bool,
     *     role: string,
     *     createdAt: string,
     *     projects: list<array{
     *         id: string,
     *         organisationId: string,
     *         name: string,
     *         slug: string,
     *         createdAt: string
     *     }>
     * }>
     */
    public function execute(Uuid $userId): array
    {
        $personalOrg = $this->organisationRepository->findPersonalOrganisationForUser($userId);

        if ($personalOrg === null) {
            $orgId = OrganisationId::generate();
            $slug = 'personal-' . $userId->toRfc4122();

            $personalOrg = Organisation::create(
                id: $orgId,
                name: 'Espace personnel',
                slug: $slug,
                isPersonal: true,
            );
            $this->organisationRepository->save($personalOrg);

            $member = OrganisationMember::create(
                id: MemberId::generate(),
                organisationId: $orgId,
                userId: $userId,
                role: Role::OWNER,
            );
            $this->organisationMemberRepository->save($member);

            $firstProject = Project::create(
                id: ProjectId::generate(),
                organisationId: $orgId,
                name: 'Mon premier projet',
                slug: 'mon-premier-projet',
            );
            $this->projectRepository->save($firstProject);
        }

        $orgEntries = $this->organisationRepository->listForUser($userId);

        $result = [];
        foreach ($orgEntries as $entry) {
            $org = $entry['organisation'];
            $role = $entry['role'];

            $projects = $this->projectRepository->listByOrganisationId($org->id());

            $result[] = [
                'id' => $org->id()->toString(),
                'name' => $org->name(),
                'slug' => $org->slug(),
                'isPersonal' => $org->isPersonal(),
                'role' => $role,
                'createdAt' => $org->createdAt()->format(\DateTimeInterface::ATOM),
                'projects' => array_map(static fn(Project $p): array => [
                    'id' => $p->id()->toString(),
                    'organisationId' => $p->organisationId()->toString(),
                    'name' => $p->name(),
                    'slug' => $p->slug(),
                    'createdAt' => $p->createdAt()->format(\DateTimeInterface::ATOM),
                ], $projects),
            ];
        }

        return $result;
    }
}
