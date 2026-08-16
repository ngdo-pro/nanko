<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateAnnotationPayload;
use App\Dto\UpdateAnnotationPayload;
use App\Repository\AnnotationNotFoundException;
use App\Repository\AnnotationRepositoryInterface;
use App\Repository\ElementNotFoundException;
use App\Repository\InvalidAnnotationLinkException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationNotFoundException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class AnnotationController
{
    public function __construct(private readonly AnnotationRepositoryInterface $annotations)
    {
    }

    #[Route('/api/projects/{projectId}/annotations', name: 'api_annotations_list', methods: ['GET'])]
    public function list(
        string $projectId,
        #[MapQueryParameter(name: 'scope_element_id')] ?string $scopeElementId = null,
    ): JsonResponse {
        return new JsonResponse($this->annotations->findAllByProjectScope($projectId, $scopeElementId));
    }

    #[Route('/api/projects/{projectId}/annotations', name: 'api_annotations_create', methods: ['POST'])]
    public function create(string $projectId, #[MapRequestPayload] CreateAnnotationPayload $payload): JsonResponse
    {
        // Validated NotNull by CreateAnnotationPayload — narrows float|null to float for the repository call.
        $x = $payload->x ?? throw new \LogicException('x is required');
        $y = $payload->y ?? throw new \LogicException('y is required');

        try {
            $annotation = $this->annotations->create(
                $projectId,
                $payload->scopeElementId,
                $x,
                $y,
                $payload->authorName,
                $payload->body,
                $payload->links,
            );
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        } catch (ElementNotFoundException) {
            return new JsonResponse(['error' => 'element not found'], 404);
        } catch (RelationNotFoundException) {
            return new JsonResponse(['error' => 'relation not found'], 404);
        } catch (InvalidAnnotationLinkException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 422);
        }

        return new JsonResponse($annotation, 201);
    }

    #[Route('/api/annotations/{annotationId}', name: 'api_annotations_update', methods: ['PATCH'])]
    public function update(string $annotationId, #[MapRequestPayload] UpdateAnnotationPayload $payload): JsonResponse
    {
        // Validated NotNull by UpdateAnnotationPayload — narrows float|null to float for the repository call.
        $x = $payload->x ?? throw new \LogicException('x is required');
        $y = $payload->y ?? throw new \LogicException('y is required');

        try {
            $annotation = $this->annotations->update(
                $annotationId,
                $payload->authorName,
                $payload->body,
                $x,
                $y,
                $payload->links,
            );
        } catch (AnnotationNotFoundException) {
            return new JsonResponse(['error' => 'annotation not found'], 404);
        } catch (ElementNotFoundException) {
            return new JsonResponse(['error' => 'element not found'], 404);
        } catch (RelationNotFoundException) {
            return new JsonResponse(['error' => 'relation not found'], 404);
        } catch (InvalidAnnotationLinkException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 422);
        }

        return new JsonResponse($annotation);
    }

    #[Route('/api/annotations/{annotationId}', name: 'api_annotations_delete', methods: ['DELETE'])]
    public function delete(string $annotationId): JsonResponse
    {
        try {
            $this->annotations->delete($annotationId);
        } catch (AnnotationNotFoundException) {
            return new JsonResponse(['error' => 'annotation not found'], 404);
        }

        return new JsonResponse(null, 204);
    }
}
