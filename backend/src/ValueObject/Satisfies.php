<?php

declare(strict_types=1);

namespace App\ValueObject;

/**
 * Informational compatibility declaration towards a version range of another Layer.
 * Never used to resolve which Version to display — see ADR-0002.
 */
final class Satisfies
{
    public function __construct(
        public readonly string $layer,
        public readonly string $range,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            layer: (string) $data['layer'],
            range: (string) $data['range'],
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'layer' => $this->layer,
            'range' => $this->range,
        ];
    }
}
