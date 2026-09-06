<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Organisation;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Core\UseCase\GetOrCreatePersonalOrganisation\GetOrCreatePersonalOrganisationUseCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

final class ListOrganisations
{
    #[Route('/api/v1/organisations', name: 'api_v1_organisations_list', methods: ['GET'])]
    public function __invoke(
        #[CurrentUser] ?SecurityUser $securityUser,
        GetOrCreatePersonalOrganisationUseCase $useCase,
    ): JsonResponse {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $userId = $securityUser->user->id->value;
        $organisations = $useCase->execute($userId);

        return new JsonResponse($organisations, Response::HTTP_OK);
    }
}
