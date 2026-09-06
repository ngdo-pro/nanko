<?php

declare(strict_types=1);

namespace App\Tests\Integration\WorkspaceManagement\Persistence;

use App\WorkspaceManagement\Adapter\Driven\Persistence\Organisation\DoctrineRepository as OrganisationDoctrineRepository;
use App\WorkspaceManagement\Adapter\Driven\Persistence\OrganisationMember\DoctrineRepository as MemberDoctrineRepository;
use App\WorkspaceManagement\Adapter\Driven\Persistence\Project\DoctrineRepository as ProjectDoctrineRepository;
use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Id as MemberId;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\OrganisationMember;
use App\WorkspaceManagement\Core\Domain\OrganisationMember\Role;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Uid\Uuid;

final class DoctrineRepositoryTest extends KernelTestCase
{
    private OrganisationDoctrineRepository $orgRepo;
    private MemberDoctrineRepository $memberRepo;
    private ProjectDoctrineRepository $projectRepo;
    private Connection $conn;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        /** @var OrganisationDoctrineRepository $orgRepo */
        $orgRepo = $container->get(OrganisationDoctrineRepository::class);
        $this->orgRepo = $orgRepo;

        /** @var MemberDoctrineRepository $memberRepo */
        $memberRepo = $container->get(MemberDoctrineRepository::class);
        $this->memberRepo = $memberRepo;

        /** @var ProjectDoctrineRepository $projectRepo */
        $projectRepo = $container->get(ProjectDoctrineRepository::class);
        $this->projectRepo = $projectRepo;

        /** @var Connection $conn */
        $conn = $container->get('doctrine.dbal.default_connection');
        $this->conn = $conn;

        $this->conn->executeStatement('TRUNCATE TABLE project, organisation_member, organisation, app_user CASCADE');
    }

    public function testPersistenceCycle(): void
    {
        // 1. Create user in app_user
        $userId = Uuid::v7();
        $keycloakId = Uuid::v7();
        $now = (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM);
        $this->conn->executeStatement(
            'INSERT INTO app_user (id, keycloak_id, email, created_at, updated_at) VALUES (:id, :kid, :email, :created, :updated)',
            [
                'id' => $userId->toRfc4122(),
                'kid' => $keycloakId->toRfc4122(),
                'email' => 'workspace-test@nanko.dev',
                'created' => $now,
                'updated' => $now,
            ],
        );

        // 2. Test Organisation persistence
        $orgId = OrganisationId::generate();
        $org = Organisation::create($orgId, 'Espace personnel', 'personal-123', true);
        $this->orgRepo->save($org);

        $foundOrg = $this->orgRepo->findById($orgId);
        self::assertNotNull($foundOrg);
        self::assertSame('Espace personnel', $foundOrg->name());
        self::assertSame('personal-123', $foundOrg->slug());
        self::assertTrue($foundOrg->isPersonal());

        $foundBySlug = $this->orgRepo->findBySlug('personal-123');
        self::assertNotNull($foundBySlug);
        self::assertTrue($foundBySlug->id()->equals($orgId));

        // 3. Test OrganisationMember persistence
        $memberId = MemberId::generate();
        $member = OrganisationMember::create($memberId, $orgId, $userId, Role::OWNER);
        $this->memberRepo->save($member);

        $foundMember = $this->memberRepo->findByOrganisationAndUser($orgId, $userId);
        self::assertNotNull($foundMember);
        self::assertTrue($foundMember->id()->equals($memberId));
        self::assertSame(Role::OWNER, $foundMember->role());

        $members = $this->memberRepo->listByOrganisationId($orgId);
        self::assertCount(1, $members);

        // 4. Test listForUser and findPersonalOrganisationForUser
        $personalOrg = $this->orgRepo->findPersonalOrganisationForUser($userId);
        self::assertNotNull($personalOrg);
        self::assertTrue($personalOrg->id()->equals($orgId));

        $userOrgs = $this->orgRepo->listForUser($userId);
        self::assertCount(1, $userOrgs);
        self::assertSame('owner', $userOrgs[0]['role']);

        // 5. Test Project persistence
        $projectId = ProjectId::generate();
        $project = Project::create($projectId, $orgId, 'Mon premier projet', 'mon-premier-projet');
        $this->projectRepo->save($project);

        $foundProject = $this->projectRepo->findById($projectId);
        self::assertNotNull($foundProject);
        self::assertSame('Mon premier projet', $foundProject->name());
        self::assertSame('mon-premier-projet', $foundProject->slug());

        $foundByOrgAndSlug = $this->projectRepo->findByOrganisationAndSlug($orgId, 'mon-premier-projet');
        self::assertNotNull($foundByOrgAndSlug);
        self::assertTrue($foundByOrgAndSlug->id()->equals($projectId));

        $projects = $this->projectRepo->listByOrganisationId($orgId);
        self::assertCount(1, $projects);
    }
}
