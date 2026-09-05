<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Core\Port\User;

use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\KeycloakId;
use App\AuthAndIdentity\Core\Domain\User\User;

interface Repository
{
    public function findById(Id $id): ?User;

    public function findByKeycloakId(KeycloakId $keycloakId): ?User;

    public function save(User $user): void;
}
