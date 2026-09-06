<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document\Parser;

final readonly class Connector
{
    public function __construct(
        public string $source,
        public string $target,
        public ?string $label = null,
    ) {}

    /**
     * @return array{source: string, target: string, label: string|null}
     */
    public function toArray(): array
    {
        return [
            'source' => $this->source,
            'target' => $this->target,
            'label' => $this->label,
        ];
    }
}
