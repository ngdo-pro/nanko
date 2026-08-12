<?php

declare(strict_types=1);

namespace App\Graph;

final class ResolvedGraph
{
    /**
     * @param list<array<string, mixed>>                             $elements
     * @param list<array<string, mixed>>                             $relations
     * @param array<string, array{x: float, y: float}>               $positions  keyed by element id
     * @param list<array{type: string, subject_id: ?string, message: string}> $warnings
     */
    public function __construct(
        public readonly array $elements,
        public readonly array $relations,
        public readonly array $positions,
        public readonly array $warnings,
    ) {
    }
}
