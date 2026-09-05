<?php

declare(strict_types=1);

namespace App\Adapter\Driver\Http\Controller\System;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class VersionController
{
    public function __construct(
        #[Autowire('%app.version%')]
        private readonly string $version,
        #[Autowire('%app.commit%')]
        private readonly string $commit,
        #[Autowire('%kernel.environment%')]
        private readonly string $environment,
    ) {}

    #[Route('/api/v1/version', name: 'api_version', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'status' => 'ok',
            'version' => $this->version,
            'commit' => $this->commit,
            'environment' => $this->environment,
        ]);
    }
}
