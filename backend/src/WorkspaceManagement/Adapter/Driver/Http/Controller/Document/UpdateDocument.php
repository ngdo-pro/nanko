<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Document;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Adapter\Driver\Http\Dto\UpdateDocumentInput;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Document\Parser\InvalidNankoSyntaxException;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentNotFoundException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use App\WorkspaceManagement\Core\UseCase\UpdateDocument\UpdateDocumentCommand;
use App\WorkspaceManagement\Core\UseCase\UpdateDocument\UpdateDocumentUseCase;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class UpdateDocument
{
    #[Route('/api/v1/documents/{documentId}', name: 'api_v1_documents_update', methods: ['PUT'])]
    public function __invoke(
        string $documentId,
        Request $request,
        #[CurrentUser] ?SecurityUser $securityUser,
        ValidatorInterface $validator,
        UpdateDocumentUseCase $useCase,
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

        /** @var array<string, mixed>|null $data */
        $data = json_decode((string) $request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse([
                'code' => 'INVALID_PAYLOAD',
                'message' => 'Corps de requête JSON invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $input = new UpdateDocumentInput(
            sourceCode: is_string($data['sourceCode'] ?? null) ? $data['sourceCode'] : '',
        );

        $violations = $validator->validate($input);
        if (count($violations) > 0) {
            $formattedViolations = [];
            foreach ($violations as $violation) {
                $formattedViolations[] = [
                    'propertyPath' => $violation->getPropertyPath(),
                    'title' => (string) $violation->getMessage(),
                ];
            }

            return new JsonResponse([
                'violations' => $formattedViolations,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $command = new UpdateDocumentCommand(
                documentId: DocumentId::fromString($documentId),
                userId: $securityUser->user->id->value,
                sourceCode: $input->sourceCode,
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
        } catch (InvalidNankoSyntaxException $e) {
            return new JsonResponse([
                'code' => 'INVALID_NANKO_SYNTAX',
                'message' => $e->getMessage(),
                'line' => $e->syntaxLine,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}
