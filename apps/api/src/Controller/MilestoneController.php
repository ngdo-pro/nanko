<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\MilestoneRepositoryInterface;
use App\Repository\ProjectNotFoundException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
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
    public function create(string $projectId, Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $data = is_array($data) ? $data : [];
        $label = is_string($data['label'] ?? null) ? trim($data['label']) : '';
        $occursOn = is_string($data['occurs_on'] ?? null) ? trim($data['occurs_on']) : null;
        $occursOn = $occursOn === '' ? null : $occursOn;

        if ($label === '' || ($occursOn !== null && preg_match('/^\d{4}-\d{2}-\d{2}$/', $occursOn) !== 1)) {
            return new JsonResponse(
                ['error' => 'label is required and occurs_on must be a YYYY-MM-DD date'],
                400,
            );
        }

        try {
            $milestone = $this->milestones->create($projectId, $label, $occursOn);
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        }

        return new JsonResponse($milestone, 201);
    }
}
