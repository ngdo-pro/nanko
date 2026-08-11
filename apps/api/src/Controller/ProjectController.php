<?php

declare(strict_types=1);

namespace App\Controller;

use App\Dto\CreateProjectPayload;
use App\Repository\DuplicateSlugException;
use App\Repository\ProjectNotFoundException;
use App\Repository\ProjectRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;

class ProjectController
{
    public function __construct(private readonly ProjectRepositoryInterface $projects)
    {
    }

    #[Route('/api/projects', name: 'api_projects_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse($this->projects->findAll());
    }

    #[Route('/api/projects', name: 'api_projects_create', methods: ['POST'])]
    public function create(#[MapRequestPayload] CreateProjectPayload $payload): JsonResponse
    {
        try {
            $project = $this->projects->create($payload->name, $payload->slug);
        } catch (DuplicateSlugException) {
            return new JsonResponse(['error' => 'slug already in use'], 409);
        }

        return new JsonResponse($project, 201);
    }

    #[Route('/api/projects/{id}', name: 'api_projects_delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        try {
            $this->projects->delete($id);
        } catch (ProjectNotFoundException) {
            return new JsonResponse(['error' => 'project not found'], 404);
        }

        return new JsonResponse(null, 204);
    }
}
