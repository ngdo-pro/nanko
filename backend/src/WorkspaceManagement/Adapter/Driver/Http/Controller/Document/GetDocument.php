<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Document;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentNotFoundException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use App\WorkspaceManagement\Core\UseCase\GetDocument\GetDocumentCommand;
use App\WorkspaceManagement\Core\UseCase\GetDocument\GetDocumentUseCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

final class GetDocument
{
    #[Route('/api/v1/documents/{documentId}', name: 'api_v1_documents_get', methods: ['GET'])]
    public function __invoke(
        string $documentId,
        #[CurrentUser] ?SecurityUser $securityUser,
        GetDocumentUseCase $useCase,
    ): JsonResponse {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($documentId)) {
            return new JsonResponse([
                'code' => 'DOCUMENT_NOT_FOUND',
                'message' => 'Document introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        try {
            $command = new GetDocumentCommand(
                documentId: DocumentId::fromString($documentId),
                userId: $securityUser->user->id->value,
            );

            $document = $useCase->execute($command);

            return new JsonResponse([
                'id' => $document->id()->toString(),
                'projectId' => $document->projectId()->toString(),
                'name' => $document->name(),
                'slug' => $document->slug(),
                'layer' => $document->layer()->toInt(),
                'sourceCode' => $document->sourceCode(),
                'ast' => $document->ast(),
                'createdAt' => $document->createdAt()->format(\DateTimeInterface::ATOM),
                'updatedAt' => $document->updatedAt()->format(\DateTimeInterface::ATOM),
            ], Response::HTTP_OK);
        } catch (DocumentNotFoundException|ProjectNotFoundException $e) {
            return new JsonResponse([
                'code' => 'DOCUMENT_NOT_FOUND',
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
