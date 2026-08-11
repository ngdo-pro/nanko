<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ElementNotFoundException;
use App\Repository\ElementRepositoryInterface;
use App\Repository\InvalidParentException;
use App\Repository\MilestoneNotFoundException;
use App\Repository\ProjectNotFoundException;
use Symfony\Component\HttpFoundation\Exception\JsonException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class ElementController
{
    private const array ALLOWED_KINDS = ['system', 'container', 'component'];

    public function __construct(private readonly ElementRepositoryInterface $elements)
    {
    }

    #[Route('/api/projects/{projectId}/elements', name: 'api_elements_create', methods: ['POST'])]
    public function create(string $projectId, Request $request): JsonResponse
    {
        try {
            $data = $request->toArray();
        } catch (JsonException) {
            $data = [];
        }

        $milestoneId = is_string($data['milestone_id'] ?? null) ? trim($data['milestone_id']) : '';
        $kind = is_string($data['kind'] ?? null) ? $data['kind'] : '';
        $parentId = is_string($data['parent_id'] ?? null) ? trim($data['parent_id']) : null;
        $parentId = $parentId === '' ? null : $parentId;
        $name = is_string($data['name'] ?? null) ? trim($data['name']) : '';
        $description = is_string($data['description'] ?? null) ? trim($data['description']) : null;
        $description = $description === '' ? null : $description;
        $technology = is_string($data['technology'] ?? null) ? trim($data['technology']) : null;
        $technology = $technology === '' ? null : $technology;
        $isExternal = array_key_exists('is_external', $data) ? $data['is_external'] : false;

        if (
            $milestoneId === ''
            || !in_array($kind, self::ALLOWED_KINDS, true)
            || $name === ''
            || !is_bool($isExternal)
        ) {
            return new JsonResponse(
                ['error' => 'milestone_id, a valid kind and a non-empty name are required, and is_external must be a boolean'],
                400,
            );
        }

        try {
            $element = $this->elements->create(
                $projectId,
                $milestoneId,
                $kind,
                $parentId,
                $name,
                $description,
                $technology,
                $isExternal,
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
