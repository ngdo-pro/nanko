<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateRelationPayload;
use App\Repository\ElementNotFoundException;
use App\Repository\InvalidRelationElementException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use App\Repository\RelationRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class RelationController
{
    public function __construct(private readonly RelationRepositoryInterface $relations)
    {
    }

    #[Route('/api/projects/{projectId}/relations', name: 'api_relations_create', methods: ['POST'])]
    public function create(string $projectId, #[MapRequestPayload] CreateRelationPayload $payload): JsonResponse
    {
        try {
            $relation = $this->relations->create(
                $projectId,
                $payload->milestoneId,
                $payload->sourceElementId,
                $payload->targetElementId,
                $payload->label,
                $payload->technology,
            );
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        } catch (MilestoneNotFoundException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        } catch (ElementNotFoundException) {
            return new JsonResponse(['error' => 'source or target element not found'], 404);
        } catch (InvalidRelationElementException) {
            return new JsonResponse(['error' => 'source or target element belongs to a different project'], 400);
        }

        return new JsonResponse($relation, 201);
    }
}
