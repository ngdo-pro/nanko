<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateMilestonePayload;
use App\Dto\ReorderMilestonesPayload;
use App\Dto\UpdateMilestonePayload;
use App\Repository\InvalidMilestoneOrderException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\MilestoneRepositoryInterface;
use App\Repository\ProjectNotFoundException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class MilestoneController
{
    public function __construct(private readonly MilestoneRepositoryInterface $milestones)
    {
    }

    #[Route('/api/projects/{projectId}/milestones', name: 'api_milestones_list', methods: ['GET'])]
    public function list(string $projectId): JsonResponse
    {
        return new JsonResponse($this->milestones->findAllByProject($projectId));
    }

    #[Route('/api/projects/{projectId}/milestones', name: 'api_milestones_create', methods: ['POST'])]
    public function create(string $projectId, #[MapRequestPayload] CreateMilestonePayload $payload): JsonResponse
    {
        try {
            $milestone = $this->milestones->create($projectId, $payload->label, $payload->occursOn);
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        }

        return new JsonResponse($milestone, 201);
    }

    #[Route('/api/milestones/{milestoneId}', name: 'api_milestones_update', methods: ['PATCH'])]
    public function update(string $milestoneId, #[MapRequestPayload] UpdateMilestonePayload $payload): JsonResponse
    {
        try {
            $milestone = $this->milestones->update($milestoneId, $payload->label, $payload->occursOn);
        } catch (MilestoneNotFoundException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        }

        return new JsonResponse($milestone);
    }

    #[Route('/api/projects/{projectId}/milestones/reorder', name: 'api_milestones_reorder', methods: ['PUT'])]
    public function reorder(string $projectId, #[MapRequestPayload] ReorderMilestonesPayload $payload): JsonResponse
    {
        try {
            $milestones = $this->milestones->reorder($projectId, $payload->milestoneIds);
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        } catch (InvalidMilestoneOrderException) {
            return new JsonResponse(['error' => 'milestone_ids must exactly match the project\'s milestones'], 422);
        }

        return new JsonResponse($milestones);
    }
}
