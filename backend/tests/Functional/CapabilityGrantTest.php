<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Org;
use App\Entity\Project;
use App\Entity\ProjectCapabilityGrant;
use App\Entity\User;
use App\Enum\Capability;
use App\Service\CapabilityResolver;
use PHPUnit\Framework\Attributes\Test;

final class CapabilityGrantTest extends FunctionalTestCase
{
    private function resolver(): CapabilityResolver
    {
        return new CapabilityResolver($this->em->getRepository(ProjectCapabilityGrant::class));
    }

    #[Test]
    public function an_explicit_grant_adds_to_the_org_default_capabilities(): void
    {
        // GIVEN an Org with a default capability, and a user granted an extra
        // capability explicitly on one of its Projects
        $org = new Org('Union Org', 'union-org');
        $org->setDefaultCapabilities([Capability::DocumentRead]);
        $project = new Project($org, 'Project A', 'project-a');
        $user = new User('collaborator@nanko.dev', 'Collaborator');
        $grant = new ProjectCapabilityGrant($project, $user, Capability::DocumentWrite);

        $this->em->persist($org);
        $this->em->persist($project);
        $this->em->persist($user);
        $this->em->persist($grant);
        $this->em->flush();

        // WHEN resolving the user's capabilities on that Project
        $resolver = $this->resolver();
        $capabilities = $resolver->resolve($user, $project);

        // THEN the explicit grant is additive — both the default and the grant apply
        self::assertContainsEquals(Capability::DocumentRead, $capabilities);
        self::assertContainsEquals(Capability::DocumentWrite, $capabilities);
    }

    #[Test]
    public function an_explicit_grant_on_one_project_does_not_leak_to_another_project_in_the_same_org(): void
    {
        // GIVEN two Projects in the same Org, a user granted a capability only on Project A
        $org = new Org('Isolated Org', 'isolated-org');
        $org->setDefaultCapabilities([Capability::DocumentRead]);
        $projectA = new Project($org, 'Project A', 'isolated-project-a');
        $projectB = new Project($org, 'Project B', 'isolated-project-b');
        $user = new User('scoped@nanko.dev', 'Scoped User');
        $grant = new ProjectCapabilityGrant($projectA, $user, Capability::DocumentWrite);

        $this->em->persist($org);
        $this->em->persist($projectA);
        $this->em->persist($projectB);
        $this->em->persist($user);
        $this->em->persist($grant);
        $this->em->flush();

        $resolver = $this->resolver();

        // WHEN/THEN Project A grants DocumentWrite, but Project B only exposes the Org default
        self::assertTrue($resolver->has($user, $projectA, Capability::DocumentWrite));
        self::assertFalse($resolver->has($user, $projectB, Capability::DocumentWrite));
        self::assertTrue($resolver->has($user, $projectB, Capability::DocumentRead));
    }
}
