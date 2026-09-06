<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Document;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use App\WorkspaceManagement\Core\UseCase\ListDocuments\ListDocumentsCommand;
use App\WorkspaceManagement\Core\UseCase\ListDocuments\ListDocumentsUseCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

final class ListDocuments
{
    #[Route('/api/v1/projects/{projectId}/documents', name: 'api_v1_documents_list', methods: ['GET'])]
    public function __invoke(
        string $projectId,
        #[CurrentUser] ?SecurityUser $securityUser,
        ListDocumentsUseCase $useCase,
    ): JsonResponse {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($projectId)) {
            return new JsonResponse([
                'code' => 'PROJECT_NOT_FOUND',
                'message' => 'Projet introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $command = new ListDocumentsCommand(
                projectId: ProjectId::fromString($projectId),
                userId: $securityUser->user->id->value,
            );

            $documents = $useCase->execute($command);

            $response = array_map(static function ($doc): array {
                $ast = $doc->ast();
                $shapesCount = isset($ast['shapes']) && is_array($ast['shapes']) ? count($ast['shapes']) : 0;
                $connectorsCount = isset($ast['connectors']) && is_array($ast['connectors']) ? count($ast['connectors']) : 0;

                return [
                    'id' => $doc->id()->toString(),
                    'projectId' => $doc->projectId()->toString(),
                    'name' => $doc->name(),
                    'slug' => $doc->slug(),
                    'layer' => $doc->layer()->toInt(),
                    'shapesCount' => $shapesCount,
                    'connectorsCount' => $connectorsCount,
                    'createdAt' => $doc->createdAt()->format(\DateTimeInterface::ATOM),
                    'updatedAt' => $doc->updatedAt()->format(\DateTimeInterface::ATOM),
                ];
            }, $documents);

            return new JsonResponse($response, Response::HTTP_OK);
        } catch (ProjectNotFoundException $e) {
            return new JsonResponse([
                'code' => 'PROJECT_NOT_FOUND',
                'message' => $e->getMessage(),
            ], Response::HTTP_NOT_FOUND);
        } catch (AccessDeniedException $e) {
            return new JsonResponse([
                'code' => 'ACCESS_DENIED',
                'message' => $e->getMessage(),
            ], Response::HTTP_FORBIDDEN);
        }
    }
}
