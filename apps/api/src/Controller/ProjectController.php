<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\DuplicateSlugException;
use App\Repository\ProjectNotFoundException;
use App\Repository\ProjectRepositoryInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
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
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $data = is_array($data) ? $data : [];
        $name = is_string($data['name'] ?? null) ? trim($data['name']) : '';
        $slug = is_string($data['slug'] ?? null) ? trim($data['slug']) : '';

        if ($name === '' || preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) !== 1) {
            return new JsonResponse(
                ['error' => 'name is required and slug must be lowercase, alphanumeric, dash-separated'],
                400,
            );
        }

        try {
            $project = $this->projects->create($name, $slug);
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
