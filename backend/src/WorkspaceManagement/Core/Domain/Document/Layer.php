<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document;

final readonly class Layer
{
    public function __construct(public int $value) {}

    public static function fromInt(int $value): self
    {
        return new self($value);
    }

    public function toInt(): int
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
