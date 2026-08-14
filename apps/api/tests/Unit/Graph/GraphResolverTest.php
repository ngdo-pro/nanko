<?php

declare(strict_types=1);

namespace App\Tests\Unit\Graph;

use App\Graph\GraphResolver;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * @phpstan-import-type ElementVersionRow from GraphResolver
 * @phpstan-import-type RelationVersionRow from GraphResolver
 * @phpstan-import-type PositionRow from GraphResolver
 * @phpstan-import-type MilestoneRow from GraphResolver
 */
final class GraphResolverTest extends TestCase
{
    private GraphResolver $resolver;

    protected function setUp(): void
    {
        $this->resolver = new GraphResolver();
    }

    // --- Visibility ---------------------------------------------------

    #[Test]
    public function it excludes an element created after the target milestone(): void
    {
        // GIVEN an element created at a milestone after the target one
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm2', null, 'm2', 1, 'Booking')];

        // WHEN resolving the graph at the earlier milestone
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm1');

        // THEN the element is not visible
        self::assertSame([], $graph->elements);
    }

    #[Test]
    public function it includes an element created at exactly the target milestone(): void
    {
        // GIVEN an element created at the target milestone
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm2', null, 'm2', 1, 'Booking')];

        // WHEN resolving the graph at that milestone
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm2');

        // THEN the element is visible
        self::assertCount(1, $graph->elements);
        self::assertSame('e1', $graph->elements[0]['id']);
    }

    #[Test]
    public function it excludes an element deleted at or before the target milestone(): void
    {
        // GIVEN an element deleted exactly at the target milestone
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', 'm2', 'm1', 0, 'Booking')];

        // WHEN resolving the graph at that milestone
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm2');

        // THEN the element is no longer visible
        self::assertSame([], $graph->elements);
    }

    #[Test]
    public function it still includes an element deleted at a later milestone than the target(): void
    {
        // GIVEN an element deleted at a milestone after the target one
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1), $this->milestone('m3', 2)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', 'm3', 'm1', 0, 'Booking')];

        // WHEN resolving the graph at the earlier milestone
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm2');

        // THEN the element is still visible
        self::assertCount(1, $graph->elements);
    }

    // --- Attribute resolution -------------------------------------------

    #[Test]
    public function it resolves an element attributes from its latest version at or before the target milestone(): void
    {
        // GIVEN an element with two versions, at m1 and m2
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1), $this->milestone('m3', 2)];
        $elements = [
            $this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'A'),
            $this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm2', 1, 'B'),
        ];

        // WHEN resolving the graph at a milestone after both versions
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm3');

        // THEN the latest version's attributes are used
        self::assertSame('B', $graph->elements[0]['name']);
    }

    #[Test]
    public function it falls back to an earlier version when no version exists at the target milestone itself(): void
    {
        // GIVEN an element with a single version, at m1
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1), $this->milestone('m3', 2)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'A')];

        // WHEN resolving the graph at a later milestone with no version of its own
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm3');

        // THEN the earlier version's attributes are used
        self::assertSame('A', $graph->elements[0]['name']);
    }

    #[Test]
    public function it excludes and warns on an element with no version at or before the target milestone(): void
    {
        // GIVEN an element created at m1 but whose only version is at m2
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm2', 1, 'B')];

        // WHEN resolving the graph at m1
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm1');

        // THEN the element is excluded and a warning is raised
        self::assertSame([], $graph->elements);
        self::assertCount(1, $graph->warnings);
        self::assertSame(GraphResolver::WARNING_ELEMENT_WITHOUT_VERSION, $graph->warnings[0]['type']);
        self::assertSame('e1', $graph->warnings[0]['subject_id']);
    }

    // --- Relation visibility / dangling endpoints ------------------------

    #[Test]
    public function it excludes a relation whose source element is not visible at the target milestone(): void
    {
        // GIVEN a relation whose source element does not exist
        $milestones = [$this->milestone('m1', 0)];
        $elements = [$this->elementRow('e2', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Target')];
        $relations = [$this->relationRow('r1', 'e1', 'e2', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1', 'scope');

        // THEN the relation is excluded and a dangling warning is raised
        self::assertSame([], $graph->relations);
        self::assertCount(1, $graph->warnings);
        self::assertSame(GraphResolver::WARNING_DANGLING_RELATION, $graph->warnings[0]['type']);
        self::assertSame('r1', $graph->warnings[0]['subject_id']);
    }

    #[Test]
    public function it excludes a relation whose target element is not visible at the target milestone(): void
    {
        // GIVEN a relation whose target element does not exist
        $milestones = [$this->milestone('m1', 0)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Source')];
        $relations = [$this->relationRow('r1', 'e1', 'e2', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1', 'scope');

        // THEN the relation is excluded and a dangling warning is raised
        self::assertSame([], $graph->relations);
        self::assertCount(1, $graph->warnings);
        self::assertSame(GraphResolver::WARNING_DANGLING_RELATION, $graph->warnings[0]['type']);
    }

    // --- C1 derived projection -------------------------------------------

    #[Test]
    public function it derives a C1 relation from a C2 relation between containers of different systems(): void
    {
        // GIVEN two systems, each with one container, and a relation between the containers
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contB', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'Container B'),
        ];
        $relations = [$this->relationRow('r1', 'contA', 'contB', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN a single derived relation between the two systems is produced
        self::assertCount(1, $graph->relations);
        self::assertSame('sysA', $graph->relations[0]['source_element_id']);
        self::assertSame('sysB', $graph->relations[0]['target_element_id']);
        self::assertSame('derived', $graph->relations[0]['status']);
    }

    #[Test]
    public function it does not project a C2 relation between containers of the same system(): void
    {
        // GIVEN one system with two containers, and a relation between them
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('contA1', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A1'),
            $this->elementRow('contA2', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A2'),
        ];
        $relations = [$this->relationRow('r1', 'contA1', 'contA2', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN no relation is projected — it is internal to the system
        self::assertSame([], $graph->relations);
    }

    #[Test]
    public function it dedupes derived C1 relations when multiple container pairs share the same parent system pair(): void
    {
        // GIVEN two systems, each with two containers, and two relations crossing between them
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA1', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'A1'),
            $this->elementRow('contA2', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'A2'),
            $this->elementRow('contB1', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'B1'),
            $this->elementRow('contB2', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'B2'),
        ];
        $relations = [
            $this->relationRow('r1', 'contA1', 'contB1', 'declared', 'm1', null, 'm1', 0),
            $this->relationRow('r2', 'contA2', 'contB2', 'declared', 'm1', null, 'm1', 0),
        ];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN both container relations collapse into a single derived system relation
        self::assertCount(1, $graph->relations);
    }

    #[Test]
    public function it excludes container level relations from the C1 output relations list(): void
    {
        // GIVEN a C2 relation between containers of different systems
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contB', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'Container B'),
        ];
        $relations = [$this->relationRow('r1', 'contA', 'contB', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN the raw container-level relation never appears, only the projected one does
        $ids = array_column($graph->relations, 'id');
        self::assertNotContains('r1', $ids);
    }

    #[Test]
    public function it does not project relations when resolving at a non root scope(): void
    {
        // GIVEN the same C2 relation as the projection scenario
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contB', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'Container B'),
        ];
        $relations = [$this->relationRow('r1', 'contA', 'contB', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph scoped to a specific element (C2/C3)
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1', 'sysA');

        // THEN the relation is returned as-is, with no projection
        self::assertCount(1, $graph->relations);
        self::assertSame('r1', $graph->relations[0]['id']);
        self::assertSame('contA', $graph->relations[0]['source_element_id']);
    }

    // --- Declared / derived fusion ---------------------------------------

    #[Test]
    public function it absorbs a declared C1 relation into the matching derived relation and marks it realized(): void
    {
        // GIVEN a C2 relation deriving sysA -> sysB, and a matching declared C1 relation
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contB', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'Container B'),
        ];
        $relations = [
            $this->relationRow('r_c2', 'contA', 'contB', 'declared', 'm1', null, 'm1', 0),
            $this->relationRow('r_declared', 'sysA', 'sysB', 'declared', 'm1', null, 'm1', 0),
        ];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN a single fused relation is produced, marked realized, and no warning is raised
        self::assertCount(1, $graph->relations);
        self::assertTrue($graph->relations[0]['realized']);
        self::assertSame('r_declared', $graph->relations[0]['declared_relation_id']);
        self::assertSame([], $graph->warnings);
    }

    #[Test]
    public function it shows an unmatched declared C1 relation alone with an unrealized declared warning(): void
    {
        // GIVEN a declared C1 relation with no matching C2 relation
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
        ];
        $relations = [$this->relationRow('r_declared', 'sysA', 'sysB', 'declared', 'm1', null, 'm1', 0)];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN the declared relation stands alone, and an unrealized warning is raised
        self::assertCount(1, $graph->relations);
        self::assertSame('r_declared', $graph->relations[0]['id']);
        self::assertSame('declared', $graph->relations[0]['status']);
        self::assertCount(1, $graph->warnings);
        self::assertSame(GraphResolver::WARNING_UNREALIZED_DECLARED_RELATION, $graph->warnings[0]['type']);
        self::assertSame('r_declared', $graph->warnings[0]['subject_id']);
    }

    #[Test]
    public function it recomputes the unrealized warning when the underlying C2 relation is later removed(): void
    {
        // GIVEN a C2 relation realizing a declared C1 relation, removed at a later milestone
        $milestones = [$this->milestone('m1', 0), $this->milestone('m2', 1), $this->milestone('m3', 2)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contB', 'p1', 'sysB', 'container', 'm1', null, 'm1', 0, 'Container B'),
        ];
        $relations = [
            $this->relationRow('r_c2', 'contA', 'contB', 'declared', 'm1', 'm3', 'm1', 0),
            $this->relationRow('r_declared', 'sysA', 'sysB', 'declared', 'm1', null, 'm1', 0),
        ];

        // WHEN resolving before the removal
        $before = $this->resolver->resolve($elements, $relations, [], $milestones, 'm2');

        // THEN the declared relation is realized, with no warning
        self::assertSame([], $before->warnings);

        // WHEN resolving after the C2 relation has been removed
        $after = $this->resolver->resolve($elements, $relations, [], $milestones, 'm3');

        // THEN the warning reappears, recomputed from the current data
        self::assertCount(1, $after->warnings);
        self::assertSame(GraphResolver::WARNING_UNREALIZED_DECLARED_RELATION, $after->warnings[0]['type']);
    }

    #[Test]
    public function it does not fuse a declared relation with a derived one for a different system pair(): void
    {
        // GIVEN a derived sysA -> sysC relation, and an unrelated declared sysA -> sysB relation
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('sysA', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System A'),
            $this->elementRow('sysB', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System B'),
            $this->elementRow('sysC', 'p1', null, 'system', 'm1', null, 'm1', 0, 'System C'),
            $this->elementRow('contA', 'p1', 'sysA', 'container', 'm1', null, 'm1', 0, 'Container A'),
            $this->elementRow('contC', 'p1', 'sysC', 'container', 'm1', null, 'm1', 0, 'Container C'),
        ];
        $relations = [
            $this->relationRow('r_c2', 'contA', 'contC', 'declared', 'm1', null, 'm1', 0),
            $this->relationRow('r_declared', 'sysA', 'sysB', 'declared', 'm1', null, 'm1', 0),
        ];

        // WHEN resolving the graph at C1 root
        $graph = $this->resolver->resolve($elements, $relations, [], $milestones, 'm1');

        // THEN both relations appear separately, and the declared one is unrealized
        self::assertCount(2, $graph->relations);
        self::assertCount(1, $graph->warnings);
        self::assertSame(GraphResolver::WARNING_UNREALIZED_DECLARED_RELATION, $graph->warnings[0]['type']);
    }

    // --- Position resolution ----------------------------------------------

    #[Test]
    public function it resolves a milestone specific position over the default when both exist(): void
    {
        // GIVEN an element with both a default and a milestone-specific position
        $milestones = [$this->milestone('m1', 0)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Booking')];
        $positions = [
            $this->positionRow('e1', null, 1.0, 1.0),
            $this->positionRow('e1', 'm1', 9.0, 9.0),
        ];

        // WHEN resolving the graph at that milestone
        $graph = $this->resolver->resolve($elements, [], $positions, $milestones, 'm1');

        // THEN the milestone-specific position wins
        self::assertSame(['x' => 9.0, 'y' => 9.0], $graph->positions['e1']);
    }

    #[Test]
    public function it falls back to the default position when no milestone specific row exists(): void
    {
        // GIVEN an element with only a default position
        $milestones = [$this->milestone('m1', 0)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Booking')];
        $positions = [$this->positionRow('e1', null, 1.0, 1.0)];

        // WHEN resolving the graph at that milestone
        $graph = $this->resolver->resolve($elements, [], $positions, $milestones, 'm1');

        // THEN the default position is used
        self::assertSame(['x' => 1.0, 'y' => 1.0], $graph->positions['e1']);
    }

    #[Test]
    public function it omits an element from positions when it has neither a milestone specific nor a default position row(): void
    {
        // GIVEN a visible element with no position row at all
        $milestones = [$this->milestone('m1', 0)];
        $elements = [$this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Booking')];

        // WHEN resolving the graph
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm1');

        // THEN no position is returned for that element
        self::assertArrayNotHasKey('e1', $graph->positions);
    }

    // --- Cross-cutting ------------------------------------------------

    #[Test]
    public function it returns elements ordered by their input row order(): void
    {
        // GIVEN element rows given out of alphabetical order
        $milestones = [$this->milestone('m1', 0)];
        $elements = [
            $this->elementRow('e3', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Third'),
            $this->elementRow('e1', 'p1', null, 'system', 'm1', null, 'm1', 0, 'First'),
            $this->elementRow('e2', 'p1', null, 'system', 'm1', null, 'm1', 0, 'Second'),
        ];

        // WHEN resolving the graph
        $graph = $this->resolver->resolve($elements, [], [], $milestones, 'm1');

        // THEN elements come back in the same order as the input rows
        self::assertSame(['e3', 'e1', 'e2'], array_column($graph->elements, 'id'));
    }

    // --- Fixture builders --------------------------------------------------

    /**
     * @return MilestoneRow
     */
    private function milestone(string $id, int $sortOrder): array
    {
        return ['id' => $id, 'project_id' => 'p1', 'label' => 'Test milestone', 'occurs_on' => null, 'sort_order' => $sortOrder, 'created_at' => 'now'];
    }

    /**
     * @return ElementVersionRow
     */
    private function elementRow(
        string $id,
        string $projectId,
        ?string $parentId,
        string $kind,
        string $createdAtMilestoneId,
        ?string $deletedAtMilestoneId,
        string $versionMilestoneId,
        int $versionMilestoneSortOrder,
        string $name,
        ?string $description = null,
        ?string $technology = null,
        bool $isExternal = false,
        ?string $archetype = null,
    ): array {
        return [
            'id' => $id,
            'project_id' => $projectId,
            'parent_id' => $parentId,
            'kind' => $kind,
            'is_external' => $isExternal,
            'archetype' => $archetype,
            'created_at_milestone_id' => $createdAtMilestoneId,
            'deleted_at_milestone_id' => $deletedAtMilestoneId,
            'version_milestone_id' => $versionMilestoneId,
            'version_milestone_sort_order' => $versionMilestoneSortOrder,
            'name' => $name,
            'description' => $description,
            'technology' => $technology,
        ];
    }

    /**
     * @return RelationVersionRow
     */
    private function relationRow(
        string $id,
        string $sourceElementId,
        string $targetElementId,
        string $status,
        string $createdAtMilestoneId,
        ?string $deletedAtMilestoneId,
        string $versionMilestoneId,
        int $versionMilestoneSortOrder,
        ?string $label = null,
        ?string $technology = null,
        ?string $realizedAtMilestoneId = null,
    ): array {
        return [
            'id' => $id,
            'project_id' => 'p1',
            'source_element_id' => $sourceElementId,
            'target_element_id' => $targetElementId,
            'status' => $status,
            'realized_at_milestone_id' => $realizedAtMilestoneId,
            'created_at_milestone_id' => $createdAtMilestoneId,
            'deleted_at_milestone_id' => $deletedAtMilestoneId,
            'version_milestone_id' => $versionMilestoneId,
            'version_milestone_sort_order' => $versionMilestoneSortOrder,
            'label' => $label,
            'technology' => $technology,
        ];
    }

    /**
     * @return PositionRow
     */
    private function positionRow(string $elementId, ?string $milestoneId, float $x, float $y): array
    {
        return ['id' => 'pos-' . $elementId . '-' . ($milestoneId ?? 'default'), 'element_id' => $elementId, 'milestone_id' => $milestoneId, 'x' => $x, 'y' => $y, 'updated_at' => 'now'];
    }
}
