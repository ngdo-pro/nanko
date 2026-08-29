<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Document;
use App\Entity\Org;
use App\Entity\Project;
use App\Entity\User;
use App\Entity\Version;
use App\Enum\DocumentType;
use App\Exception\VersionIsImmutableException;
use App\ValueObject\DocumentContent;
use App\ValueObject\Layout;
use PHPUnit\Framework\Attributes\Test;

final class VersionImmutabilityTest extends FunctionalTestCase
{
    #[Test]
    public function a_persisted_version_field_cannot_be_reassigned(): void
    {
        // GIVEN a persisted Version
        $version = $this->persistedVersion();

        // WHEN a caller attempts to mutate one of its (readonly) fields directly
        $property = new \ReflectionProperty(Version::class, 'semver');

        // THEN PHP itself rejects the mutation — the entity is immutable by construction
        $this->expectException(\Error::class);
        $this->expectExceptionMessageMatches('/readonly property/i');
        $property->setValue($version, '9.9.9');
    }

    #[Test]
    public function the_lifecycle_guard_rejects_mutation_if_ever_reached(): void
    {
        // GIVEN a persisted Version
        $version = $this->persistedVersion();

        // WHEN/THEN its ORM #[PreUpdate] guard is invoked directly, it always throws —
        // this is the belt-and-braces defense behind PHP's readonly enforcement above
        $this->expectException(VersionIsImmutableException::class);
        $version->rejectMutation();
    }

    private function persistedVersion(): Version
    {
        $user = new User('immutable@nanko.dev', 'Immutable Tester');
        $org = new Org('Immutable Org', 'immutable-org');
        $project = new Project($org, 'Immutable Project', 'immutable-project');
        $document = new Document($project, '0', DocumentType::Free);

        $this->em->persist($user);
        $this->em->persist($org);
        $this->em->persist($project);
        $this->em->persist($document);
        $this->em->flush();

        $version = new Version(
            document: $document,
            layer: '0',
            semver: '0.0.1',
            content: new DocumentContent(),
            layout: new Layout(),
            publishedBy: $user,
        );
        $this->em->persist($version);
        $this->em->flush();

        return $version;
    }
}
