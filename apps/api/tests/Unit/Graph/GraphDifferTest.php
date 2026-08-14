<?php

declare(strict_types=1);

namespace App\Tests\Unit\Graph;

use App\Graph\GraphDiffer;
use App\Graph\ResolvedGraph;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

final class GraphDifferTest extends TestCase
{
    private GraphDiffer $differ;

    protected function setUp(): void
    {
        $this->differ = new GraphDiffer();
    }

    #[Test]
    public function it reports an element only in the target graph as added(): void
    {
        // GIVEN an element present only in the "to" graph
        $from = $this->resolvedGraph(elements: []);
        $to = $this->resolvedGraph(elements: [$this->element('e1', 'Booking')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN the element is reported as added
        self::assertSame([['id' => 'e1', 'status' => 'added', 'changed_fields' => []]], $diff['elements']);
    }

    #[Test]
    public function it reports an element only in the source graph as removed(): void
    {
        // GIVEN an element present only in the "from" graph
        $from = $this->resolvedGraph(elements: [$this->element('e1', 'Booking')]);
        $to = $this->resolvedGraph(elements: []);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN the element is reported as removed
        self::assertSame([['id' => 'e1', 'status' => 'removed', 'changed_fields' => []]], $diff['elements']);
    }

    #[Test]
    public function it reports an element present unchanged in both graphs as unchanged(): void
    {
        // GIVEN the same element, identical, in both graphs
        $from = $this->resolvedGraph(elements: [$this->element('e1', 'Booking', 'Handles bookings', 'Node.js')]);
        $to = $this->resolvedGraph(elements: [$this->element('e1', 'Booking', 'Handles bookings', 'Node.js')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN the element is reported as unchanged
        self::assertSame([['id' => 'e1', 'status' => 'unchanged', 'changed_fields' => []]], $diff['elements']);
    }

    #[Test]
    public function it reports a renamed element as modified with name in changed fields(): void
    {
        // GIVEN the same element with a different name across the two graphs
        $from = $this->resolvedGraph(elements: [$this->element('e1', 'Booking')]);
        $to = $this->resolvedGraph(elements: [$this->element('e1', 'Booking v2')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN it is reported as modified, with "name" listed as a changed field
        self::assertSame([['id' => 'e1', 'status' => 'modified', 'changed_fields' => ['name']]], $diff['elements']);
    }

    #[Test]
    public function it lists every field that changed on a modified element(): void
    {
        // GIVEN the same element with its description and technology both changed
        $from = $this->resolvedGraph(elements: [$this->element('e1', 'Booking', 'Old description', 'PHP')]);
        $to = $this->resolvedGraph(elements: [$this->element('e1', 'Booking', 'New description', 'Node.js')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN both changed fields are listed, name is not
        self::assertSame([['id' => 'e1', 'status' => 'modified', 'changed_fields' => ['description', 'technology']]], $diff['elements']);
    }

    #[Test]
    public function it reports a relation only in the target graph as added(): void
    {
        // GIVEN a relation present only in the "to" graph
        $from = $this->resolvedGraph(relations: []);
        $to = $this->resolvedGraph(relations: [$this->relation('r1')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN the relation is reported as added
        self::assertSame([['id' => 'r1', 'status' => 'added', 'changed_fields' => []]], $diff['relations']);
    }

    #[Test]
    public function it reports a relabeled relation as modified(): void
    {
        // GIVEN the same relation with a different label across the two graphs
        $from = $this->resolvedGraph(relations: [$this->relation('r1', 'calls')]);
        $to = $this->resolvedGraph(relations: [$this->relation('r1', 'calls sync')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN it is reported as modified, with "label" listed as a changed field
        self::assertSame([['id' => 'r1', 'status' => 'modified', 'changed_fields' => ['label']]], $diff['relations']);
    }

    #[Test]
    public function a retargeted relation is reported as removed plus added never modified(): void
    {
        // GIVEN a relation retargeted between the two milestones — per GraphResolver's own
        // invariant, a retarget always mints a brand new relation id, it never reuses the old one
        $from = $this->resolvedGraph(relations: [$this->relation('r1', null, 'a', 'b')]);
        $to = $this->resolvedGraph(relations: [$this->relation('r2', null, 'a', 'c')]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($from, $to);

        // THEN the old id is removed and the new id is added — comparing purely by id has no way
        // to recognize this as "the same relation, retargeted", and this diff does not attempt to
        self::assertEqualsCanonicalizing(
            [
                ['id' => 'r1', 'status' => 'removed', 'changed_fields' => []],
                ['id' => 'r2', 'status' => 'added', 'changed_fields' => []],
            ],
            $diff['relations'],
        );
    }

    #[Test]
    public function a derived relation that flips from unrealized to realized is unchanged not modified(): void
    {
        // GIVEN the same derived relation id across two milestones, unrealized at the first and
        // realized at the second — derived relations never carry a label/technology of their own
        // (both null, always), so only realized_at_milestone_id/status differ, and those are
        // deliberately excluded from this comparison
        $from = $this->relation('derived:a->b', null);
        $from['realized_at_milestone_id'] = null;
        $to = $this->relation('derived:a->b', null);
        $to['realized_at_milestone_id'] = 'm2';

        $fromGraph = $this->resolvedGraph(relations: [$from]);
        $toGraph = $this->resolvedGraph(relations: [$to]);

        // WHEN diffing the two graphs
        $diff = $this->differ->diff($fromGraph, $toGraph);

        // THEN the realization flip is not surfaced as a modification
        self::assertSame([['id' => 'derived:a->b', 'status' => 'unchanged', 'changed_fields' => []]], $diff['relations']);
    }

    /**
     * @param list<array<string, mixed>> $elements
     * @param list<array<string, mixed>> $relations
     */
    private function resolvedGraph(array $elements = [], array $relations = []): ResolvedGraph
    {
        return new ResolvedGraph($elements, $relations, [], []);
    }

    /**
     * @return array<string, mixed>
     */
    private function element(string $id, string $name, ?string $description = null, ?string $technology = null): array
    {
        return [
            'id' => $id,
            'project_id' => 'p1',
            'parent_id' => null,
            'kind' => 'system',
            'is_external' => false,
            'archetype' => null,
            'name' => $name,
            'description' => $description,
            'technology' => $technology,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function relation(string $id, ?string $label = null, string $sourceElementId = 'a', string $targetElementId = 'b'): array
    {
        return [
            'id' => $id,
            'source_element_id' => $sourceElementId,
            'target_element_id' => $targetElementId,
            'status' => 'declared',
            'label' => $label,
            'technology' => null,
            'realized_at_milestone_id' => null,
        ];
    }
}
