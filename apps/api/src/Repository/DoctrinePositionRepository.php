<?php

declare(strict_types=1);

namespace App\Repository;

use Doctrine\DBAL\Connection;

final class DoctrinePositionRepository implements PositionRepositoryInterface
{
    public function __construct(private readonly Connection $connection)
    {
    }

    public function upsert(string $elementId, ?string $milestoneId, float $x, float $y): array
    {
        /** @var array<string, mixed> */
        return $this->connection->transactional(function (Connection $conn) use (
            $elementId,
            $milestoneId,
            $x,
            $y,
        ): array {
            $projectId = $conn->fetchOne('SELECT project_id FROM element WHERE id = :id', ['id' => $elementId]);

            if ($projectId === false) {
                throw new ElementNotFoundException($elementId);
            }

            if ($milestoneId !== null && $conn->fetchOne(
                'SELECT 1 FROM milestone WHERE id = :id AND project_id = :project_id',
                ['id' => $milestoneId, 'project_id' => $projectId],
            ) === false) {
                throw new MilestoneNotFoundException($milestoneId);
            }

            /** @var array{id: string, element_id: string, milestone_id: string|null, x: float|string, y: float|string, updated_at: string} $row */
            $row = $conn->fetchAssociative(
                'INSERT INTO position (element_id, milestone_id, x, y)
                 VALUES (:element_id, :milestone_id, :x, :y)
                 ON CONFLICT ON CONSTRAINT position_unique DO UPDATE
                    SET x = EXCLUDED.x, y = EXCLUDED.y, updated_at = now()
                 RETURNING id, element_id, milestone_id, x, y, updated_at',
                [
                    'element_id' => $elementId,
                    'milestone_id' => $milestoneId,
                    'x' => $x,
                    'y' => $y,
                ],
            );

            return [
                'id' => $row['id'],
                'element_id' => $row['element_id'],
                'milestone_id' => $row['milestone_id'],
                'x' => (float) $row['x'],
                'y' => (float) $row['y'],
                'updated_at' => $row['updated_at'],
            ];
        });
    }

    public function findAllByProject(string $projectId): array
    {
        /** @var list<array{id: string, element_id: string, milestone_id: string|null, x: float|string, y: float|string, updated_at: string}> $rows */
        $rows = $this->connection->fetchAllAssociative(
            'SELECT p.id, p.element_id, p.milestone_id, p.x, p.y, p.updated_at
             FROM position p
             JOIN element e ON e.id = p.element_id
             WHERE e.project_id = :project_id',
            ['project_id' => $projectId],
        );

        return array_map(static fn (array $row): array => [
            'id' => $row['id'],
            'element_id' => $row['element_id'],
            'milestone_id' => $row['milestone_id'],
            'x' => (float) $row['x'],
            'y' => (float) $row['y'],
            'updated_at' => $row['updated_at'],
        ], $rows);
    }
}
