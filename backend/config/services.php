<?php

declare(strict_types=1);

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

// This file is the entry point to configure your own services.
// Files in the packages/ subdirectory configure your dependencies.
// See also https://symfony.com/doc/current/service_container/import.html

return App::config([
    // Put parameters here that don't need to change on each machine where the app is deployed
    // https://symfony.com/doc/current/best_practices.html#use-parameters-for-application-configuration
    'parameters' => [],

    'services' => [
        // default configuration for services in *this* file
        '_defaults' => [
            'autowire' => true,      // Automatically injects dependencies in your services.
            'autoconfigure' => true, // Automatically registers your services as commands, event subscribers, etc.
        ],

        // makes classes in src/ available to be used as services
        // this creates a service per class whose id is the fully-qualified class name
        'App\\' => [
            'resource' => '../src/',
            'exclude' => [
                '../src/Kernel.php',
                // Core/Domain holds entities and value objects: plain data,
                // never services. An entity's constructor arguments are
                // rarely autowirable (scalars, value objects), which would
                // otherwise fail the container compilation even though
                // nothing ever injects the entity itself as a service.
                '../src/Core/Domain/',
                // Same reasoning for use-case DTOs. The *Command.php /
                // *Query.php suffix is therefore a hard requirement, not
                // just a style convention: the container's compilation
                // depends on it. Handlers are NOT excluded -- they only
                // depend on Core/Port interfaces, so they autowire fine.
                '../src/Core/UseCase/**/*Command.php',
                '../src/Core/UseCase/**/*Query.php',
                // Core/Port holds only interfaces. No exclude needed: the
                // resource loader (Symfony\Component\DependencyInjection\
                // Loader\FileLoader::registerClasses()) already skips
                // interfaces/abstract classes before autowiring runs.
            ],
        ],

        // Port -> Adapter bindings: the map of the architecture, kept
        // explicit and in one place rather than left to autowiring
        // ambiguity as more adapters per port appear. Add one alias entry
        // here per new aggregate's repository port, e.g.:
        //   SomeRepositoryPort::class => ['alias' => DoctrineSomeRepository::class],

        // add more service definitions when explicit configuration is needed
        // please note that last definitions always *replace* previous ones
    ],
]);
