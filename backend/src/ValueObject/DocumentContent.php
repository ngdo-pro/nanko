<?php

declare(strict_types=1);

namespace App\ValueObject;

final class DocumentContent
{
    /**
     * @param Shape[]     $shapes
     * @param Connector[] $connectors
     */
    public function __construct(
        public readonly array $shapes = [],
        public readonly array $connectors = [],
    ) {
    }

    /**
     * @param array{shapes?: array<int, array<string, mixed>>, connectors?: array<int, array<string, mixed>>} $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            shapes: array_map(Shape::fromArray(...), $data['shapes'] ?? []),
            connectors: array_map(Connector::fromArray(...), $data['connectors'] ?? []),
        );
    }

    /**
     * @return array{shapes: array<int, array<string, mixed>>, connectors: array<int, array<string, mixed>>}
     */
    public function toArray(): array
    {
        return [
            'shapes' => array_map(static fn (Shape $shape): array => $shape->toArray(), $this->shapes),
            'connectors' => array_map(static fn (Connector $connector): array => $connector->toArray(), $this->connectors),
        ];
    }
}
