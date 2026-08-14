<?php

declare(strict_types=1);

namespace App\Graph;

/**
 * Compares two already-resolved graphs (same project, two milestones) by
 * element/relation id. Pure computation, mirroring GraphResolver's own
 * pure-function design — no I/O, callers resolve both graphs first.
 *
 * Design decisions not spelled out by PLAN.md, made explicit here:
 *
 * 1. Only `name`/`description`/`technology` are compared for elements, and
 *    only `label`/`technology` for relations — `status`/`realized_at_milestone_id`
 *    are deliberately excluded. A derived relation's `realized` flag can flip
 *    between two milestones without its label/technology (always null)
 *    changing, so it is never reported as `modified` — only as added/removed
 *    when the underlying system pair itself appears/disappears.
 * 2. A relation retarget always mints a new relation id (see GraphResolver's
 *    own docblock), so comparing purely by id means a retarget is always a
 *    `removed` (old id) + `added` (new id) pair, never a `modified` — there is
 *    no id-stable way to tell a retarget from an unrelated remove+add, and
 *    this diff does not attempt to.
 * 3. Positions are intentionally not part of this comparison — dragging a
 *    node between milestones is not a change worth surfacing in a diff.
 *
 * @phpstan-import-type ResolvedElement from GraphResolver
 * @phpstan-import-type ResolvedRelation from GraphResolver
 * @phpstan-import-type DerivedRelation from GraphResolver
 * @phpstan-type DiffStatus 'added'|'removed'|'modified'|'unchanged'
 * @phpstan-type DiffEntry array{id: string, status: DiffStatus, changed_fields: list<string>}
 */
final class GraphDiffer
{
    private const array ELEMENT_COMPARED_FIELDS = ['name', 'description', 'technology'];
    private const array RELATION_COMPARED_FIELDS = ['label', 'technology'];

    /**
     * @return array{elements: list<DiffEntry>, relations: list<DiffEntry>}
     */
    public function diff(ResolvedGraph $from, ResolvedGraph $to): array
    {
        return [
            'elements' => $this->diffItems($from->elements, $to->elements, self::ELEMENT_COMPARED_FIELDS),
            'relations' => $this->diffItems($from->relations, $to->relations, self::RELATION_COMPARED_FIELDS),
        ];
    }

    /**
     * @param list<array<string, mixed>> $fromItems
     * @param list<array<string, mixed>> $toItems
     * @param list<string>               $comparedFields
     *
     * @return list<DiffEntry>
     */
    private function diffItems(array $fromItems, array $toItems, array $comparedFields): array
    {
        $fromById = $this->indexById($fromItems);
        $toById = $this->indexById($toItems);

        $entries = [];
        foreach ($fromById as $id => $fromItem) {
            if (!isset($toById[$id])) {
                $entries[] = ['id' => $id, 'status' => 'removed', 'changed_fields' => []];
            }
        }

        foreach ($toById as $id => $toItem) {
            if (!isset($fromById[$id])) {
                $entries[] = ['id' => $id, 'status' => 'added', 'changed_fields' => []];
                continue;
            }

            $changedFields = [];
            foreach ($comparedFields as $field) {
                if (($fromById[$id][$field] ?? null) !== ($toItem[$field] ?? null)) {
                    $changedFields[] = $field;
                }
            }

            $entries[] = $changedFields === []
                ? ['id' => $id, 'status' => 'unchanged', 'changed_fields' => []]
                : ['id' => $id, 'status' => 'modified', 'changed_fields' => $changedFields];
        }

        return $entries;
    }

    /**
     * @param list<array<string, mixed>> $items
     *
     * @return array<string, array<string, mixed>>
     */
    private function indexById(array $items): array
    {
        $byId = [];
        foreach ($items as $item) {
            $id = $item['id'];
            if (!is_string($id)) {
                continue;
            }

            $byId[$id] = $item;
        }

        return $byId;
    }
}
