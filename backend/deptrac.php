<?php

declare(strict_types=1);

use Deptrac\Deptrac\Contract\Config\Collector\ClassNameRegexConfig;
use Deptrac\Deptrac\Contract\Config\Collector\DirectoryConfig;
use Deptrac\Deptrac\Contract\Config\DeptracConfig;
use Deptrac\Deptrac\Contract\Config\Layer;
use Deptrac\Deptrac\Contract\Config\Ruleset;

// Enforces the dependency direction of docs/adr/0011-hexagonal-architecture-backend.md.
// Run: vendor/bin/deptrac analyse
return static function (DeptracConfig $config): void {
    $config
        ->paths('./src')
        ->layers(
            $coreDomain = Layer::withName('CoreDomain')->collectors(
                DirectoryConfig::create('src/Core/Domain'),
            ),
            $corePort = Layer::withName('CorePort')->collectors(
                DirectoryConfig::create('src/Core/Port'),
            ),
            $coreUseCase = Layer::withName('CoreUseCase')->collectors(
                DirectoryConfig::create('src/Core/UseCase'),
            ),
            $adapterDriven = Layer::withName('AdapterDriven')->collectors(
                DirectoryConfig::create('src/Adapter/Driven'),
            ),
            $adapterDriver = Layer::withName('AdapterDriver')->collectors(
                DirectoryConfig::create('src/Adapter/Driver'),
            ),
            // Not a src/ directory: a virtual layer over the framework/ORM
            // classes Core is forbidden from touching. symfony/uid is
            // excluded -- see the OrgId exception in the ADR.
            $framework = Layer::withName('Framework')->collectors(
                ClassNameRegexConfig::create('#^Symfony\\(?!Component\\Uid\\)#i'),
                ClassNameRegexConfig::create('#^Doctrine\\#i'),
            ),
        )
        ->rulesets(
            // The core of the hexagon: no framework, no adapter, not even
            // its own Port/UseCase siblings -- everything else depends on
            // Domain, never the reverse.
            Ruleset::forLayer($coreDomain),
            // Ports are interfaces expressed in terms of the domain.
            Ruleset::forLayer($corePort)->accesses($coreDomain),
            // Use cases orchestrate the domain through ports only.
            Ruleset::forLayer($coreUseCase)->accesses($coreDomain, $corePort),
            // Driven adapters (Doctrine, ...) implement a port and talk to
            // the framework/ORM to do so.
            Ruleset::forLayer($adapterDriven)->accesses($coreDomain, $corePort, $framework),
            // Driving adapters (HTTP, ...) call a use case and talk to the
            // framework to do so -- never a driven adapter directly.
            Ruleset::forLayer($adapterDriver)->accesses($coreUseCase, $coreDomain, $framework),
        )
    ;
};
