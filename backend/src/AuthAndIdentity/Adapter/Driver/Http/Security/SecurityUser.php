<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driver\Http\Security;

use App\AuthAndIdentity\Core\Domain\User\User;
use Symfony\Component\Security\Core\User\UserInterface;

final readonly class SecurityUser implements UserInterface
{
    public function __construct(public User $user) {}

    /**
     * @return list<string>
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    public function eraseCredentials(): void {}

    /**
     * @return non-empty-string
     */
    public function getUserIdentifier(): string
    {
        $id = $this->user->id->toString();
        assert($id !== '');

        return $id;
    }
}
