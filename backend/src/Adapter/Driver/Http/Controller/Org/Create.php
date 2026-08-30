<?php

declare(strict_types=1);

namespace App\Adapter\Driver\Http\Controller\Org;

use App\Core\UseCase\Org\CreateOrg\Command;
use App\Core\UseCase\Org\CreateOrg\Handler;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class Create
{
    public function __construct(private readonly Handler $createOrg)
    {
    }

    #[Route('/orgs', name: 'org_create', methods: ['POST'])]
    public function __invoke(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), associative: true, flags: \JSON_THROW_ON_ERROR);

        $id = ($this->createOrg)(new Command($payload['name'] ?? ''));

        return new JsonResponse(['id' => $id->toString()], 201);
    }
}
