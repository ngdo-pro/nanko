<?php

declare(strict_types=1);

namespace App\ValueObject;

final class Connector
{
    public function __construct(
        public readonly string $id,
        public readonly string $fromShapeId,
        public readonly string $toShapeId,
        public readonly string $label = '',
        public readonly ?string $color = null,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            id: (string) $data['id'],
            fromShapeId: (string) $data['fromShapeId'],
            toShapeId: (string) $data['toShapeId'],
            label: (string) ($data['label'] ?? ''),
            color: isset($data['color']) ? (string) $data['color'] : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'fromShapeId' => $this->fromShapeId,
            'toShapeId' => $this->toShapeId,
            'label' => $this->label,
            'color' => $this->color,
        ];
    }
}
