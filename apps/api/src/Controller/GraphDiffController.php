<?php

declare(strict_types=1);

namespace App\Controller;

use App\Graph\GraphDiffer;
use App\Graph\GraphResolver;
use App\Repository\ElementRepositoryInterface;
use App\Repository\MilestoneRepositoryInterface;
use App\Repository\PositionRepositoryInterface;
use App\Repository\RelationRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

class GraphDiffController
{
    public function __construct(
        private readonly ElementRepositoryInterface $elements,
        private readonly RelationRepositoryInterface $relations,
        private readonly PositionRepositoryInterface $positions,
        private readonly MilestoneRepositoryInterface $milestones,
        private readonly GraphResolver $resolver,
        private readonly GraphDiffer $differ,
    ) {
    }

    // C1-only in v1 — no scope_element_id, mirroring the frontend's compare
    // screen which only ever diffs the whole system landscape for now.
    #[Route('/api/projects/{projectId}/diff', name: 'api_projects_diff', methods: ['GET'])]
    public function show(
        string $projectId,
        #[MapQueryParameter(name: 'from_milestone_id')] string $fromMilestoneId,
        #[MapQueryParameter(name: 'to_milestone_id')] string $toMilestoneId,
    ): JsonResponse {
        $elementVersionRows = $this->elements->findAllVersionsByProject($projectId);
        $relationVersionRows = $this->relations->findAllVersionsByProject($projectId);
        $positionRows = $this->positions->findAllByProject($projectId);
        $milestoneRows = $this->milestones->findAllByProject($projectId);

        try {
            $from = $this->resolver->resolve($elementVersionRows, $relationVersionRows, $positionRows, $milestoneRows, $fromMilestoneId);
            $to = $this->resolver->resolve($elementVersionRows, $relationVersionRows, $positionRows, $milestoneRows, $toMilestoneId);
        } catch (\InvalidArgumentException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        }

        return new JsonResponse($this->differ->diff($from, $to));
    }
}
