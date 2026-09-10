<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document\Parser;

final readonly class Shape
{
    public function __construct(
        public string $id,
        public string $type,
        public string $label,
        public ?string $desc = null,
    ) {}

    /**
     * @return array{id: string, type: string, label: string, desc: string|null}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'label' => $this->label,
            'desc' => $this->desc,
        ];
    }
}
