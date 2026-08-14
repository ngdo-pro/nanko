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

    public function update(string $milestoneId, string $label, ?string $occursOn): array
    {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use ($milestoneId, $label, $occursOn): array {
            if ($conn->fetchOne('SELECT 1 FROM milestone WHERE id = :id', ['id' => $milestoneId]) === false) {
                throw new MilestoneNotFoundException($milestoneId);
            }

            $conn->executeStatement(
                'UPDATE milestone SET label = :label, occurs_on = :occurs_on WHERE id = :id',
                ['id' => $milestoneId, 'label' => $label, 'occurs_on' => $occursOn],
            );

            /** @var array{id: string, project_id: string, label: string, occurs_on: string|null, sort_order: int|string, created_at: string} $row */
            $row = $conn->fetchAssociative(
                'SELECT id, project_id, label, occurs_on, sort_order, created_at FROM milestone WHERE id = :id',
                ['id' => $milestoneId],
            );

            return array_merge($row, ['sort_order' => (int) $row['sort_order']]);
        });
    }

    public function reorder(string $projectId, array $orderedMilestoneIds): array
    {
        $this->connection->transactional(function (Connection $conn) use ($projectId, $orderedMilestoneIds): void {
            if ($conn->fetchOne('SELECT 1 FROM project WHERE id = :id', ['id' => $projectId]) === false) {
                throw new ProjectNotFoundException($projectId);
            }

            /** @var list<string> $existingIds */
            $existingIds = $conn->fetchFirstColumn(
                'SELECT id FROM milestone WHERE project_id = :project_id',
                ['project_id' => $projectId],
            );

            $sortedGiven = $orderedMilestoneIds;
            sort($sortedGiven);
            sort($existingIds);

            if ($sortedGiven !== $existingIds) {
                throw new InvalidMilestoneOrderException($projectId);
            }

            // A UNIQUE (project_id, sort_order) constraint is checked per
            // row, not at statement/transaction end — a single pass that
            // shifts positions can collide mid-update with a row not yet
            // moved. Two passes: first move every row to a distinct
            // negative placeholder (never collides with the existing
            // non-negative values), then to its final position.
            foreach ($orderedMilestoneIds as $index => $id) {
                $conn->executeStatement(
                    'UPDATE milestone SET sort_order = :sort_order WHERE id = :id',
                    ['id' => $id, 'sort_order' => -($index + 1)],
                );
            }

            foreach ($orderedMilestoneIds as $index => $id) {
                $conn->executeStatement(
                    'UPDATE milestone SET sort_order = :sort_order WHERE id = :id',
                    ['id' => $id, 'sort_order' => $index],
                );
            }
        });

        return $this->findAllByProject($projectId);
    }
}
