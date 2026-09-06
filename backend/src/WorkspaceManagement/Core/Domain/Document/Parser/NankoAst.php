<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document\Parser;

final readonly class NankoAst
{
    /**
     * @param list<Shape> $shapes
     * @param list<Connector> $connectors
     * @param array<string, mixed> $layout
     */
    public function __construct(
        public array $shapes,
        public array $connectors,
        public array $layout = [],
    ) {}

    /**
     * @return array{
     *     shapes: list<array{id: string, type: string, label: string}>,
     *     connectors: list<array{source: string, target: string, label: string|null}>,
     *     layout: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'shapes' => array_map(static fn(Shape $s) => $s->toArray(), $this->shapes),
            'connectors' => array_map(static fn(Connector $c) => $c->toArray(), $this->connectors),
            'layout' => $this->layout,
        ];
    }
}
