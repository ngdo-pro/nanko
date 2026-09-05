<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Core\UseCase\User\SynchronizeUser;

use App\AuthAndIdentity\Core\Domain\User\Id;
use App\AuthAndIdentity\Core\Domain\User\User;
use App\AuthAndIdentity\Core\Port\User\Repository;

final readonly class Handler
{
    public function __construct(private Repository $repository) {}

    public function handle(Command $command): User
    {
        $user = $this->repository->findByKeycloakId($command->keycloakId);

        if ($user === null) {
            $user = User::create(
                id: Id::generate(),
                keycloakId: $command->keycloakId,
                email: $command->email,
            );
            $this->repository->save($user);

            return $user;
        }

        $user->updateEmail($command->email);
        $this->repository->save($user);

        return $user;
    }
}
