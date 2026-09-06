<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driven\Persistence\Document;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\Port\Document\Repository;
use Doctrine\DBAL\Connection;

final readonly class DoctrineRepository implements Repository
{
    public function __construct(private Connection $connection) {}

    public function findById(DocumentId $id): ?Document
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, project_id, name, slug, layer, source_code, ast, created_at, updated_at
             FROM document
             WHERE id = :id',
            ['id' => $id->toString()],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    public function findByProjectAndSlug(ProjectId $projectId, string $slug): ?Document
    {
        $row = $this->connection->fetchAssociative(
            'SELECT id, project_id, name, slug, layer, source_code, ast, created_at, updated_at
             FROM document
             WHERE project_id = :project_id AND slug = :slug',
            [
                'project_id' => $projectId->toString(),
                'slug' => $slug,
            ],
        );

        if ($row === false) {
            return null;
        }

        return $this->hydrate($row);
    }

    /**
     * @return list<Document>
     */
    public function listByProjectId(ProjectId $projectId): array
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, project_id, name, slug, layer, source_code, ast, created_at, updated_at
             FROM document
             WHERE project_id = :project_id
             ORDER BY created_at ASC',
            ['project_id' => $projectId->toString()],
        );

        return array_map(fn(array $row): Document => $this->hydrate($row), $rows);
    }

    public function save(Document $document): void
    {
        $this->connection->executeStatement(
            'INSERT INTO document (id, project_id, name, slug, layer, source_code, ast, created_at, updated_at)
             VALUES (:id, :project_id, :name, :slug, :layer, :source_code, :ast, :created_at, :updated_at)
             ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 slug = EXCLUDED.slug,
                 layer = EXCLUDED.layer,
                 source_code = EXCLUDED.source_code,
                 ast = EXCLUDED.ast,
                 updated_at = EXCLUDED.updated_at',
            [
                'id' => $document->id()->toString(),
                'project_id' => $document->projectId()->toString(),
                'name' => $document->name(),
                'slug' => $document->slug(),
                'layer' => $document->layer()->toInt(),
                'source_code' => $document->sourceCode(),
                'ast' => json_encode($document->ast(), JSON_THROW_ON_ERROR),
                'created_at' => $document->createdAt()->format(\DateTimeInterface::ATOM),
                'updated_at' => $document->updatedAt()->format(\DateTimeInterface::ATOM),
            ],
        );
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): Document
    {
        $id = $row['id'];
        $projectId = $row['project_id'];
        $name = $row['name'];
        $slug = $row['slug'];
        $layer = $row['layer'];
        $sourceCode = $row['source_code'];
        $ast = $row['ast'];
        $createdAt = $row['created_at'];
        $updatedAt = $row['updated_at'];

        assert(is_string($id));
        assert(is_string($projectId));
        assert(is_string($name));
        assert(is_string($slug));
        assert(is_int($layer) || is_numeric($layer));
        assert(is_string($sourceCode));
        assert(is_string($createdAt));
        assert(is_string($updatedAt));

        $decodedAst = [];
        if (is_string($ast)) {
            $decoded = json_decode($ast, true, 512, JSON_THROW_ON_ERROR);
            if (is_array($decoded)) {
                $decodedAst = $decoded;
            }
        } elseif (is_array($ast)) {
            $decodedAst = $ast;
        }

        /** @var array<string, mixed> $safeAst */
        $safeAst = [];
        foreach ($decodedAst as $k => $v) {
            $safeAst[(string) $k] = $v;
        }

        return new Document(
            id: DocumentId::fromString($id),
            projectId: ProjectId::fromString($projectId),
            name: $name,
            slug: $slug,
            layer: Layer::fromInt((int) $layer),
            sourceCode: $sourceCode,
            ast: $safeAst,
            createdAt: new \DateTimeImmutable($createdAt),
            updatedAt: new \DateTimeImmutable($updatedAt),
        );
    }
}
