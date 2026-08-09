<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Routing\Attribute\Route;

class PublishController
{
    public function __construct(private HubInterface $hub)
    {
    }

    #[Route('/api/publish', name: 'api_publish', methods: ['POST'])]
    public function __invoke(): JsonResponse
    {
        $update = new Update('spike/test', json_encode([
            'message' => 'hello from Symfony',
            'at' => date(DATE_ATOM),
        ]));
        $this->hub->publish($update);

        $response = new JsonResponse(['published' => true]);
        $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:5173');

        return $response;
    }
}
