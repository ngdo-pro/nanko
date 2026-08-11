<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\DuplicateSlugException;
use App\Repository\ProjectNotFoundException;
use App\Repository\ProjectRepositoryInterface;

final class InMemoryProjectRepository implements ProjectRepositoryInterface
{
    /** @var array<string, array<string, mixed>> keyed by slug, in insertion order */
    private array $projects = [];

    public function create(string $name, string $slug): array
    {
        if (isset($this->projects[$slug])) {
            throw new DuplicateSlugException($slug);
        }

        $now = (new \DateTimeImmutable())->format('Y-m-d\TH:i:s.uP');

        $project = [
            'id' => self::uuidV4(),
            'name' => $name,
            'slug' => $slug,
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $this->projects[$slug] = $project;

        return $project;
    }

    public function findAll(): array
    {
        return array_values($this->projects);
    }

    public function delete(string $id): void
    {
        foreach ($this->projects as $slug => $project) {
            if ($project['id'] === $id) {
                unset($this->projects[$slug]);

                return;
            }
        }

        throw new ProjectNotFoundException($id);
    }

    private static function uuidV4(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }
}
