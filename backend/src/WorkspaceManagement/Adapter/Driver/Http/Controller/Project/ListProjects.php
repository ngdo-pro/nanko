<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Project;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\Domain\Project\Project;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\OrganisationNotFoundException;
use App\WorkspaceManagement\Core\UseCase\ListProjects\ListProjectsUseCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

final class ListProjects
{
    #[Route('/api/v1/organisations/{organisationId}/projects', name: 'api_v1_projects_list', methods: ['GET'])]
    public function __invoke(
        string $organisationId,
        #[CurrentUser] ?SecurityUser $securityUser,
        ListProjectsUseCase $useCase,
    ): JsonResponse {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($organisationId)) {
            return new JsonResponse([
                'code' => 'ORGANISATION_NOT_FOUND',
                'message' => 'Organisation introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $orgId = OrganisationId::fromString($organisationId);
            $projects = $useCase->execute($orgId, $securityUser->user->id->value);

            $data = array_map(static fn(Project $p): array => [
                'id' => $p->id()->toString(),
                'organisationId' => $p->organisationId()->toString(),
                'name' => $p->name(),
                'slug' => $p->slug(),
                'createdAt' => $p->createdAt()->format(\DateTimeInterface::ATOM),
            ], $projects);

            return new JsonResponse($data, Response::HTTP_OK);
        } catch (OrganisationNotFoundException) {
            return new JsonResponse([
                'code' => 'ORGANISATION_NOT_FOUND',
                'message' => 'Organisation introuvable.',
            ], Response::HTTP_NOT_FOUND);
        } catch (AccessDeniedException) {
            return new JsonResponse([
                'code' => 'ACCESS_DENIED',
                'message' => "Vous n'avez pas accès à cette organisation.",
            ], Response::HTTP_FORBIDDEN);
        }
    }
}
