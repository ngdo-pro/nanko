<?php

declare(strict_types=1);

namespace App\ValueObject;

use App\Enum\ShapeType;

final class Shape
{
    public function __construct(
        public readonly string $id,
        public readonly ShapeType $type,
        public readonly string $label = '',
        public readonly string $content = '',
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
            type: ShapeType::from((string) $data['type']),
            label: (string) ($data['label'] ?? ''),
            content: (string) ($data['content'] ?? ''),
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
            'type' => $this->type->value,
            'label' => $this->label,
            'content' => $this->content,
            'color' => $this->color,
        ];
    }
}
