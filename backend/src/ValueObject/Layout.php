<?php

declare(strict_types=1);

namespace App\ValueObject;

final class Layout
{
    /**
     * @param LayoutPosition[] $positions
     */
    public function __construct(
        public readonly array $positions = [],
    ) {
    }

    /**
     * @param array{positions?: array<int, array<string, mixed>>} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            positions: array_map(LayoutPosition::fromArray(...), $data['positions'] ?? []),
        );
    }

    /**
     * @return array{positions: array<int, array<string, mixed>>}
     */
    public function toArray(): array
    {
        return [
            'positions' => array_map(static fn (LayoutPosition $position): array => $position->toArray(), $this->positions),
        ];
    }
}
