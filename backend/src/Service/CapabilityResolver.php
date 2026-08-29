<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Project;
use App\Entity\User;
use App\Enum\Capability;
use App\Repository\ProjectCapabilityGrantRepository;

/**
 * Resolves a User's effective Capability set on a Project.
 *
 * Union/additive (ADR-0005 + grilling Q): the Org's default Capabilities are
 * always included, plus any explicit ProjectCapabilityGrant for that user on
 * that Project. An explicit grant can only add rights, never remove one of
 * the Org's defaults.
 */
final class CapabilityResolver
{
    public function __construct(
        private readonly ProjectCapabilityGrantRepository $grants,
    ) {
    }

    /**
     * @return Capability[]
     */
    public function resolve(User $user, Project $project): array
    {
        $capabilities = $project->getOrg()->getDefaultCapabilities();

        foreach ($this->grants->findForUserInProject($project, $user) as $grant) {
            $capabilities[] = $grant->getCapability();
        }

        return array_values(array_unique($capabilities, \SORT_REGULAR));
    }

    public function has(User $user, Project $project, Capability $capability): bool
    {
        return \in_array($capability, $this->resolve($user, $project), true);
    }
}
