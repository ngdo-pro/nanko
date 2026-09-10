<?php

declare(strict_types=1);

namespace App\Tests\Integration\WorkspaceManagement\Persistence;

use App\WorkspaceManagement\Adapter\Driven\Persistence\Document\DoctrineRepository as DocumentDoctrineRepository;
use App\WorkspaceManagement\Adapter\Driven\Persistence\Organisation\DoctrineRepository as OrganisationDoctrineRepository;
use App\WorkspaceManagement\Adapter\Driven\Persistence\Project\DoctrineRepository as ProjectDoctrineRepository;
use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Organisation\Organisation;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class DocumentDoctrineRepositoryTest extends KernelTestCase
{
    private DocumentDoctrineRepository $docRepo;
    private OrganisationDoctrineRepository $orgRepo;
    private ProjectDoctrineRepository $projectRepo;
    private Connection $conn;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        /** @var DocumentDoctrineRepository $docRepo */
        $docRepo = $container->get(DocumentDoctrineRepository::class);
        $this->docRepo = $docRepo;

        /** @var OrganisationDoctrineRepository $orgRepo */
        $orgRepo = $container->get(OrganisationDoctrineRepository::class);
        $this->orgRepo = $orgRepo;

        /** @var ProjectDoctrineRepository $projectRepo */
        $projectRepo = $container->get(ProjectDoctrineRepository::class);
        $this->projectRepo = $projectRepo;

        /** @var Connection $conn */
        $conn = $container->get('doctrine.dbal.default_connection');
        $this->conn = $conn;

        $this->conn->executeStatement('TRUNCATE TABLE document, project, organisation_member, organisation, app_user CASCADE');
    }

    public function testDocumentPersistenceCycle(): void
    {
        $orgId = OrganisationId::generate();
        $org = Organisation::create($orgId, 'Test Org', 'test-org', true);
        $this->orgRepo->save($org);

        $projectId = ProjectId::generate();
        $project = Project::create($projectId, $orgId, 'Test Project', 'test-project');
        $this->projectRepo->save($project);

        $docId = DocumentId::generate();
        $ast = [
            'dslVersion' => 1,
            'shapes' => [
                ['id' => 's1', 'type' => 'rectangle', 'label' => 'Service 1', 'desc' => null],
            ],
            'connectors' => [],
            'layout' => [],
        ];

        $doc = Document::create(
            id: $docId,
            projectId: $projectId,
            name: 'Architecture Core',
            slug: 'architecture-core',
            layer: Layer::fromInt(0),
            sourceCode: 'rectangle s1 label="Service 1"',
            ast: $ast,
        );

        $this->docRepo->save($doc);

        $loaded = $this->docRepo->findById($docId);
        self::assertNotNull($loaded);
        self::assertSame('Architecture Core', $loaded->name());
        self::assertSame('architecture-core', $loaded->slug());
        self::assertSame(0, $loaded->layer()->toInt());
        self::assertSame('rectangle s1 label="Service 1"', $loaded->sourceCode());
        self::assertEquals($ast, $loaded->ast());

        $loadedBySlug = $this->docRepo->findByProjectAndSlug($projectId, 'architecture-core');
        self::assertNotNull($loadedBySlug);
        self::assertTrue($loadedBySlug->id()->equals($docId));

        $list = $this->docRepo->listByProjectId($projectId);
        self::assertCount(1, $list);

        // Test update
        $newAst = [
            'dslVersion' => 1,
            'shapes' => [
                ['id' => 's1', 'type' => 'rectangle', 'label' => 'Service 1', 'desc' => null],
                ['id' => 's2', 'type' => 'circle', 'label' => 'DB', 'desc' => null],
            ],
            'connectors' => [
                ['source' => 's1', 'target' => 's2', 'label' => 'query', 'desc' => null],
            ],
            'layout' => [],
        ];
        $loaded->updateSourceCode("rectangle s1 label=\"Service 1\"\ncircle s2 label=\"DB\"\ns1 -> s2 label=\"query\"", $newAst);
        $this->docRepo->save($loaded);

        $reloaded = $this->docRepo->findById($docId);
        self::assertNotNull($reloaded);
        self::assertCount(2, $reloaded->ast()['shapes']);
        self::assertCount(1, $reloaded->ast()['connectors']);
    }
}
