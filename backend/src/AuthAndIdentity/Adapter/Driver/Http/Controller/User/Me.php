<?php

declare(strict_types=1);

namespace App\AuthAndIdentity\Adapter\Driver\Http\Controller\User;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

final class Me
{
    #[Route('/api/v1/me', name: 'api_v1_me', methods: ['GET'])]
    public function __invoke(#[CurrentUser] ?SecurityUser $securityUser): JsonResponse
    {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $user = $securityUser->user;

        return new JsonResponse([
            'id' => $user->id->toString(),
            'keycloakId' => $user->keycloakId->toString(),
            'email' => $user->email(),
            'createdAt' => $user->createdAt->format(\DateTimeInterface::ATOM),
        ]);
    }
}
