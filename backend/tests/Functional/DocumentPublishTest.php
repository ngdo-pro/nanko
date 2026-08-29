<?php

declare(strict_types=1);

namespace App\Tests\Functional;

use App\Entity\Document;
use App\Entity\Org;
use App\Entity\Project;
use App\Entity\User;
use App\Entity\Version;
use App\Enum\DocumentType;
use App\Enum\ShapeType;
use App\ValueObject\DocumentContent;
use App\ValueObject\Layout;
use App\ValueObject\Shape;
use PHPUnit\Framework\Attributes\Test;

final class DocumentPublishTest extends FunctionalTestCase
{
    #[Test]
    public function publishing_a_version_sets_it_as_the_current_version(): void
    {
        // GIVEN a Document with no published Version yet
        $user = new User('author@nanko.dev', 'Author');
        $org = new Org('Acme', 'acme');
        $project = new Project($org, 'Acme system', 'acme-system');
        $document = new Document($project, '0', DocumentType::Free);

        $this->em->persist($user);
        $this->em->persist($org);
        $this->em->persist($project);
        $this->em->persist($document);
        $this->em->flush();

        self::assertNull($document->getCurrentVersion());

        // WHEN a Version is published and manually marked current
        $content = new DocumentContent(shapes: [new Shape(id: 'a', type: ShapeType::Rectangle)]);
        $version = new Version(
            document: $document,
            layer: '0',
            semver: '0.0.1',
            content: $content,
            layout: new Layout(),
            publishedBy: $user,
        );
        $this->em->persist($version);
        $this->em->flush();

        $document->setCurrentVersion($version);
        $this->em->flush();
        $this->em->clear();

        // THEN reloading the Document shows this Version as current
        $reloaded = $this->em->getRepository(Document::class)->find($document->getId());
        self::assertNotNull($reloaded);
        self::assertNotNull($reloaded->getCurrentVersion());
        self::assertSame('0:0.0.1', $reloaded->getCurrentVersion()->getVersionIdentity());
    }

    #[Test]
    public function a_version_from_another_document_cannot_be_set_as_current(): void
    {
        // GIVEN two Documents, each with their own published Version
        $user = new User('author2@nanko.dev', 'Author 2');
        $org = new Org('Acme 2', 'acme-2');
        $project = new Project($org, 'Acme system 2', 'acme-system-2');
        $documentA = new Document($project, '0', DocumentType::Free);
        $documentB = new Document($project, '0', DocumentType::Free);

        $this->em->persist($user);
        $this->em->persist($org);
        $this->em->persist($project);
        $this->em->persist($documentA);
        $this->em->persist($documentB);
        $this->em->flush();

        $versionOfB = new Version(
            document: $documentB,
            layer: '0',
            semver: '0.0.1',
            content: new DocumentContent(),
            layout: new Layout(),
            publishedBy: $user,
        );
        $this->em->persist($versionOfB);
        $this->em->flush();

        // WHEN/THEN assigning Document B's Version as Document A's current is rejected
        $this->expectException(\InvalidArgumentException::class);
        $documentA->setCurrentVersion($versionOfB);
    }
}
