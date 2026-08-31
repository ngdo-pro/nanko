<?php

declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use Symfony\Bridge\Doctrine\Types\UuidType;

return App::config([
    'doctrine' => [
        'dbal' => [
            'url' => '%env(resolve:DATABASE_URL)%',
            'types' => [
                'uuid' => UuidType::class,
                // One DBAL type per aggregate identity value object,
                // co-located with that aggregate's repository under
                // Adapter/Driven/Persistence/<Aggregate>/ -- see
                // docs/adr/0011-hexagonal-architecture-backend.md. Add one
                // line here per new aggregate, e.g.:
                //   DoctrineId::NAME => DoctrineId::class,
            ],

            // IMPORTANT: You MUST configure your server version,
            // either here or in the DATABASE_URL env var (see .env file)
            // 'server_version' => '16',

            'profiling_collect_backtrace' => '%kernel.debug%',
        ],
    ],

    'when@test' => [
        'doctrine' => [
            'dbal' => [
                // "TEST_TOKEN" is typically set by ParaTest
                'dbname_suffix' => '_test%env(default::TEST_TOKEN)%',
            ],
        ],
    ],
]);
