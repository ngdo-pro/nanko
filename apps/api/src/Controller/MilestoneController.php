<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateMilestonePayload;
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
}
