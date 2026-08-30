<?php

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

use App\Adapter\Driven\Persistence\Org\DoctrineId;
use Doctrine\DBAL\Platforms\PostgreSQLPlatform;
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
                // line here per new aggregate (DoctrineId for Project, ...).
                DoctrineId::NAME => DoctrineId::class,
            ],

            // IMPORTANT: You MUST configure your server version,
            // either here or in the DATABASE_URL env var (see .env file)
            // 'server_version' => '16',

            'profiling_collect_backtrace' => '%kernel.debug%',
        ],
        'orm' => [
            'validate_xml_mapping' => true,
            'naming_strategy' => 'doctrine.orm.naming_strategy.underscore',
            'identity_generation_preferences' => [
                PostgreSQLPlatform::class => 'identity',
            ],
            'auto_mapping' => true,
            'mappings' => [
                // XML mapping co-located with the Doctrine adapter, not
                // with the domain entity: Core/Domain must stay free of any
                // Doctrine dependency (docs/adr/0011-*.md).
                //
                // One mapping entry per aggregate, not a single catch-all
                // "App" entry for all of Core/Domain: Symfony's
                // SymfonyFileLocator (used by the "xml" driver type) turns
                // everything after "prefix" into a DOT-separated filename
                // in a single flat "dir" -- e.g. a shared "App\Core\Domain"
                // prefix would require App\Core\Domain\Org\Org to live at
                // Adapter/Driven/Persistence/Org.Org.orm.xml, no
                // subfolders. Scoping "prefix" to the aggregate's own
                // namespace instead leaves only the class's own short name
                // after stripping it, which is what gives us the intended
                // Adapter/Driven/Persistence/Org/Org.orm.xml layout. Add
                // one block like this per new aggregate.
                'AppOrg' => [
                    'type' => 'xml',
                    'is_bundle' => false,
                    'dir' => '%kernel.project_dir%/src/Adapter/Driven/Persistence/Org',
                    'prefix' => 'App\\Core\\Domain\\Org',
                    'alias' => 'AppOrg',
                ],
            ],
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

    'when@prod' => [
        'doctrine' => [
            'orm' => [
                'query_cache_driver' => [
                    'type' => 'pool',
                    'pool' => 'doctrine.system_cache_pool',
                ],
                'result_cache_driver' => [
                    'type' => 'pool',
                    'pool' => 'doctrine.result_cache_pool',
                ],
            ],
        ],

        'framework' => [
            'cache' => [
                'pools' => [
                    'doctrine.result_cache_pool' => [
                        'adapter' => 'cache.app',
                    ],
                    'doctrine.system_cache_pool' => [
                        'adapter' => 'cache.system',
                    ],
                ],
            ],
        ],
    ],
]);
