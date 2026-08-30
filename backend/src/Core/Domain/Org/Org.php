<?php

declare(strict_types=1);

namespace App\Core\Domain\Org;

final class Org
{
    private string $name;

    private function __construct(private readonly Id $id, string $name)
    {
        $this->rename($name);
    }

    public static function create(Id $id, string $name): self
    {
        return new self($id, $name);
    }

    public function id(): Id
    {
        return $this->id;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function rename(string $name): void
    {
        $name = trim($name);
        if ($name === '') {
            throw new \InvalidArgumentException('Org name cannot be empty.');
        }

        $this->name = $name;
    }
}
