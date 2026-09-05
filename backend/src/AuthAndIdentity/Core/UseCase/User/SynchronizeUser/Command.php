<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser;

use App\AuthAndIdentity\Core\Domain\User\KeycloakId;

final readonly class Command
{
    public function __construct(
        public KeycloakId $keycloakId,
        public string $email,
    ) {}
}
