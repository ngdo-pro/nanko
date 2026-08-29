<?php

declare(strict_types=1);

namespace App\ValueObject;

final class LayoutPosition
{
    public function __construct(
        public readonly string $shapeId,
        public readonly float $x,
        public readonly float $y,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            shapeId: (string) $data['shapeId'],
            x: (float) $data['x'],
            y: (float) $data['y'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'shapeId' => $this->shapeId,
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
}
