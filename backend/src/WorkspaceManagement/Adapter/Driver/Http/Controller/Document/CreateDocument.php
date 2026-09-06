<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Document;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Adapter\Driver\Http\Dto\CreateDocumentInput;
use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use App\WorkspaceManagement\Core\UseCase\CreateDocument\CreateDocumentCommand;
use App\WorkspaceManagement\Core\UseCase\CreateDocument\CreateDocumentUseCase;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\DocumentSlugAlreadyExistsException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectNotFoundException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateDocument
{
    #[Route('/api/v1/projects/{projectId}/documents', name: 'api_v1_documents_create', methods: ['POST'])]
    public function __invoke(
        string $projectId,
        Request $request,
        #[CurrentUser] ?SecurityUser $securityUser,
        ValidatorInterface $validator,
        CreateDocumentUseCase $useCase,
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

        /** @var array<string, mixed>|null $data */
        $data = json_decode((string) $request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse([
                'code' => 'INVALID_PAYLOAD',
                'message' => 'Corps de requête JSON invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $input = new CreateDocumentInput(
            name: is_string($data['name'] ?? null) ? trim($data['name']) : '',
            slug: is_string($data['slug'] ?? null) ? trim($data['slug']) : '',
            layer: is_int($data['layer'] ?? null) ? $data['layer'] : (is_numeric($data['layer'] ?? null) ? (int) $data['layer'] : 0),
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
            $command = new CreateDocumentCommand(
                projectId: ProjectId::fromString($projectId),
                userId: $securityUser->user->id->value,
                name: $input->name,
                slug: $input->slug,
                layer: Layer::fromInt($input->layer),
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
            ], Response::HTTP_CREATED);
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
        } catch (DocumentSlugAlreadyExistsException $e) {
            return new JsonResponse([
                'code' => 'DOCUMENT_SLUG_EXISTS',
                'message' => $e->getMessage(),
            ], Response::HTTP_CONFLICT);
        }
    }
}
