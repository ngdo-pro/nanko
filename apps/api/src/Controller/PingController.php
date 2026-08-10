<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class PingController
{
    #[Route('/api/ping', name: 'api_ping', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $response = new JsonResponse(['status' => 'ok', 'service' => 'spike-symfony-api']);
        $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:5173');

        return $response;
    }
}
