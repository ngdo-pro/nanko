<?php

declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

return App::config([
    'monolog' => [
        'handlers' => [
            'main' => [
                'type' => 'stream',
                'path' => 'php://stderr',
                'level' => 'info',
                'formatter' => 'monolog.formatter.json',
            ],
        ],
    ],
]);
