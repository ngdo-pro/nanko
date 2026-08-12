<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\PositionPayload;
use App\Repository\ElementNotFoundException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\PositionRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class PositionController
{
    public function __construct(private readonly PositionRepositoryInterface $positions)
    {
    }

    #[Route('/api/elements/{elementId}/position', name: 'api_elements_position_upsert', methods: ['PATCH'])]
    public function upsert(string $elementId, #[MapRequestPayload] PositionPayload $payload): JsonResponse
    {
        // Validated NotNull by PositionPayload — narrows float|null to float for the repository call.
        $x = $payload->x ?? throw new \LogicException('x is required');
        $y = $payload->y ?? throw new \LogicException('y is required');

        try {
            $position = $this->positions->upsert($elementId, $payload->milestoneId, $x, $y);
        } catch (ElementNotFoundException) {
            return new JsonResponse(['error' => 'element not found'], 404);
        } catch (MilestoneNotFoundException) {
            return new JsonResponse(['error' => 'milestone not found'], 404);
        }

        return new JsonResponse($position);
    }
}
