<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\Document;
use App\Entity\Draft;
use App\Entity\Org;
use App\Entity\OrgMembership;
use App\Entity\Project;
use App\Entity\ProjectCapabilityGrant;
use App\Entity\User;
use App\Entity\Version;
use App\Enum\Capability;
use App\Enum\DocumentType;
use App\Enum\ShapeType;
use App\ValueObject\DocumentContent;
use App\ValueObject\Layout;
use App\ValueObject\LayoutPosition;
use App\ValueObject\Shape;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

final class AppFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $owner = new User('owner@nanko.dev', 'Owner');
        $collaborator = new User('collaborator@nanko.dev', 'Collaborator');
        $manager->persist($owner);
        $manager->persist($collaborator);

        $org = new Org('Nanko', 'nanko');
        $org->setDefaultCapabilities([Capability::DocumentRead]);
        $manager->persist($org);

        $manager->persist(new OrgMembership($org, $owner));
        $manager->persist(new OrgMembership($org, $collaborator));

        $project = new Project($org, 'Système de nanko', 'systeme-de-nanko');
        $manager->persist($project);

        $manager->persist(new ProjectCapabilityGrant($project, $collaborator, Capability::DocumentWrite));

        $document = new Document($project, '0', DocumentType::Free);
        $manager->persist($document);

        $rect = new Shape(id: 'rect-1', type: ShapeType::Rectangle, label: 'Gestion des droits');
        $content = new DocumentContent(shapes: [$rect], connectors: []);
        $layout = new Layout(positions: [new LayoutPosition(shapeId: 'rect-1', x: 0, y: 0)]);

        $draft = new Draft($document, $content, $layout, $owner);
        $manager->persist($draft);

        $version = new Version(
            document: $document,
            layer: '0',
            semver: '0.0.1',
            content: $content,
            layout: $layout,
            publishedBy: $owner,
        );
        $manager->persist($version);

        $manager->flush();

        $document->setCurrentVersion($version);
        $manager->flush();
    }
}
