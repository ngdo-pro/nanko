<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception\ForeignKeyConstraintViolationException;

final class DoctrineMilestoneRepository implements MilestoneRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function create(string $projectId, string $label, ?string $occursOn): array
    {
        try {
            /** @var array<string, mixed> $row */
            $row = $this->connection->fetchAssociative(
                'INSERT INTO milestone (project_id, label, occurs_on, sort_order)
                 SELECT :project_id, :label, :occurs_on, COALESCE(MAX(sort_order) + 1, 0)
                 FROM milestone WHERE project_id = :project_id
                 RETURNING id, project_id, label, occurs_on, sort_order, created_at',
                ['project_id' => $projectId, 'label' => $label, 'occurs_on' => $occursOn],
            );
        } catch (ForeignKeyConstraintViolationException) {
            throw new ProjectNotFoundException($projectId);
        }

        return $row;
    }

    public function findAllByProject(string $projectId): array
    {
        /** @var list<array{id: string, project_id: string, label: string, occurs_on: string|null, sort_order: int|string, created_at: string}> $rows */
        $rows = $this->connection->fetchAllAssociative(
            'SELECT id, project_id, label, occurs_on, sort_order, created_at
             FROM milestone WHERE project_id = :project_id ORDER BY sort_order ASC',
            ['project_id' => $projectId],
        );

        return array_map(static fn (array $row): array => [
            'id' => $row['id'],
            'project_id' => $row['project_id'],
            'label' => $row['label'],
            'occurs_on' => $row['occurs_on'],
            'sort_order' => (int) $row['sort_order'],
            'created_at' => $row['created_at'],
        ], $rows);
    }
}
