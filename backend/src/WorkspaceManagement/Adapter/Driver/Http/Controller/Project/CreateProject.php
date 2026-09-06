<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Adapter\Driver\Http\Controller\Project;

use App\AuthAndIdentity\Adapter\Driver\Http\Security\SecurityUser;
use App\WorkspaceManagement\Adapter\Driver\Http\Dto\CreateProjectInput;
use App\WorkspaceManagement\Core\Domain\Organisation\Id as OrganisationId;
use App\WorkspaceManagement\Core\UseCase\CreateProject\CreateProjectCommand;
use App\WorkspaceManagement\Core\UseCase\CreateProject\CreateProjectUseCase;
use App\WorkspaceManagement\Core\UseCase\Exception\AccessDeniedException;
use App\WorkspaceManagement\Core\UseCase\Exception\ProjectSlugAlreadyExistsException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class CreateProject
{
    #[Route('/api/v1/organisations/{organisationId}/projects', name: 'api_v1_projects_create', methods: ['POST'])]
    public function __invoke(
        string $organisationId,
        Request $request,
        #[CurrentUser] ?SecurityUser $securityUser,
        ValidatorInterface $validator,
        CreateProjectUseCase $useCase,
    ): JsonResponse {
        if ($securityUser === null) {
            return new JsonResponse([
                'code' => 'UNAUTHORIZED',
                'message' => 'Token JWT manquant, invalide ou expiré.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        if (!Uuid::isValid($organisationId)) {
            return new JsonResponse([
                'code' => 'ORGANISATION_NOT_FOUND',
                'message' => 'Organisation introuvable.',
            ], Response::HTTP_NOT_FOUND);
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode((string) $request->getContent(), true);
        if (!is_array($data)) {
            return new JsonResponse([
                'code' => 'INVALID_PAYLOAD',
                'message' => 'Corps de requête JSON invalide.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $input = new CreateProjectInput(
            name: is_string($data['name'] ?? null) ? trim($data['name']) : '',
            slug: is_string($data['slug'] ?? null) ? trim($data['slug']) : '',
        );

        $violations = $validator->validate($input);
        if (count($violations) > 0) {
            $formattedViolations = [];
            foreach ($violations as $violation) {
                $formattedViolations[] = [
                    'propertyPath' => $violation->getPropertyPath(),
                    'title' => (string) $violation->getMessage(),
                ];
            }

            return new JsonResponse([
                'violations' => $formattedViolations,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $command = new CreateProjectCommand(
                organisationId: OrganisationId::fromString($organisationId),
                userId: $securityUser->user->id->value,
                name: $input->name,
                slug: $input->slug,
            );

            $project = $useCase->execute($command);

            return new JsonResponse([
                'id' => $project->id()->toString(),
                'organisationId' => $project->organisationId()->toString(),
                'name' => $project->name(),
                'slug' => $project->slug(),
                'createdAt' => $project->createdAt()->format(\DateTimeInterface::ATOM),
            ], Response::HTTP_CREATED);
        } catch (AccessDeniedException $e) {
            return new JsonResponse([
                'code' => 'ACCESS_DENIED',
                'message' => $e->getMessage(),
            ], Response::HTTP_FORBIDDEN);
        } catch (ProjectSlugAlreadyExistsException $e) {
            return new JsonResponse([
                'code' => 'PROJECT_SLUG_EXISTS',
                'message' => $e->getMessage(),
            ], Response::HTTP_CONFLICT);
        }
    }
}
