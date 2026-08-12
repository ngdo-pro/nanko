<?php

declare(strict_types=1);

namespace App\Controller;

use App\Graph\GraphResolver;
use App\Repository\ElementRepositoryInterface;
use App\Repository\MilestoneRepositoryInterface;
use App\Repository\PositionRepositoryInterface;
use App\Repository\RelationRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

class GraphController
{
    public function __construct(
        private readonly ElementRepositoryInterface $elements,
        private readonly RelationRepositoryInterface $relations,
        private readonly PositionRepositoryInterface $positions,
        private readonly MilestoneRepositoryInterface $milestones,
        private readonly GraphResolver $resolver,
    ) {
    }

    #[Route('/api/projects/{projectId}/graph', name: 'api_projects_graph', methods: ['GET'])]
    public function show(
        string $projectId,
        #[MapQueryParameter(name: 'milestone_id')] string $milestoneId,
        #[MapQueryParameter(name: 'scope_element_id')] ?string $scopeElementId = null,
    ): JsonResponse {
        try {
            $graph = $this->resolver->resolve(
                $this->elements->findAllVersionsByProject($projectId),
                $this->relations->findAllVersionsByProject($projectId),
                $this->positions->findAllByProject($projectId),
                $this->milestones->findAllByProject($projectId),
                $milestoneId,
                $scopeElementId,
            );
        } catch (\InvalidArgumentException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        }

        return new JsonResponse([
            'elements' => $graph->elements,
            'relations' => $graph->relations,
            'positions' => $graph->positions,
            'warnings' => $graph->warnings,
        ]);
    }
}
