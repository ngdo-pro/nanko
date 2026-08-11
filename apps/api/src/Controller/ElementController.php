<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateElementPayload;
use App\Repository\ElementNotFoundException;
use App\Repository\ElementRepositoryInterface;
use App\Repository\InvalidParentException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class ElementController
{
    public function __construct(private readonly ElementRepositoryInterface $elements)
    {
    }

    #[Route('/api/projects/{projectId}/elements', name: 'api_elements_create', methods: ['POST'])]
    public function create(string $projectId, #[MapRequestPayload] CreateElementPayload $payload): JsonResponse
    {
        try {
            $element = $this->elements->create(
                $projectId,
                $payload->milestoneId,
                $payload->kind,
                $payload->parentId,
                $payload->name,
                $payload->description,
                $payload->technology,
                $payload->isExternal,
            );
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        } catch (MilestoneNotFoundException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        } catch (ElementNotFoundException) {
            return new JsonResponse(['error' => 'parent element not found'], 404);
        } catch (InvalidParentException) {
            return new JsonResponse(['error' => 'parent element belongs to a different project'], 400);
        }

        return new JsonResponse($element, 201);
    }
}
