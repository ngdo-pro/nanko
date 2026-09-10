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
        public int $dslVersion = 1,
    ) {}

    /**
     * @return array{
     *     dslVersion: int,
     *     shapes: list<array{id: string, type: string, label: string, desc: string|null}>,
     *     connectors: list<array{source: string, target: string, label: string|null, desc: string|null}>,
     *     layout: array<string, mixed>
     * }
     */
    public function toArray(): array
    {
        return [
            'dslVersion' => $this->dslVersion,
            'shapes' => array_map(static fn(Shape $s) => $s->toArray(), $this->shapes),
            'connectors' => array_map(static fn(Connector $c) => $c->toArray(), $this->connectors),
            'layout' => $this->layout,
        ];
    }
}
