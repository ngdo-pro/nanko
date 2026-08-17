<?php

declare(strict_types=1);

namespace App\Graph;

/**
 * Resolves the C4 graph (visible elements, relations, positions) for a project
 * at a given milestone. Pure computation over raw, unresolved rows — no I/O,
 * no repository dependency — so the temporal/projection rules (the hardest
 * part of this feature) are unit-testable with plain array fixtures.
 *
 * Design decisions not spelled out by TECHNICAL_REFERENCE.md, made explicit here:
 *
 * 1. Scope: `$scopeElementId === null` means "resolving at C1 root" — the only
 *    condition under which C1 derived-projection and declared/derived fusion
 *    activate. `elements`/`relations` otherwise always contain every visible
 *    element/relation in the project, never pre-filtered by `kind`.
 * 2. Purity: `realized_at_milestone_id` on a fused relation is computed fresh
 *    on every call, never read from a stored column, so a warning correctly
 *    reappears if the underlying C2 relation is later removed. This method
 *    never writes to storage — persisting a realization is the caller's job.
 * 3. A relation with an endpoint not visible at the target milestone is
 *    dropped and reported as a `dangling_relation` warning, rather than
 *    silently rendered or causing a crash.
 * 4. C1 projection walks `parent_id` up to the nearest ancestor of kind
 *    `system` (not just the direct parent) to determine the system pair.
 * 5. Derived relation ids are a deterministic function of the system pair
 *    (`derived:<source>-><target>`), not random, so a future diff() can
 *    compare the same derived relation across two milestones.
 * 6. An element with no version at or before the target milestone is a
 *    data-integrity anomaly (shouldn't happen given create()'s invariants):
 *    excluded, with an `element_without_version` warning, rather than a crash.
 *
 * @phpstan-type ElementVersionRow array{
 *     id: string,
 *     project_id: string,
 *     parent_id: string|null,
 *     kind: string,
 *     is_external: bool,
 *     archetype: string|null,
 *     created_at_milestone_id: string,
 *     deleted_at_milestone_id: string|null,
 *     version_milestone_id: string,
 *     version_milestone_sort_order: int,
 *     name: string,
 *     description: string|null,
 *     technology: string|null,
 * }
 * @phpstan-type RelationVersionRow array{
 *     id: string,
 *     project_id: string,
 *     source_element_id: string,
 *     target_element_id: string,
 *     status: string,
 *     realized_at_milestone_id: string|null,
 *     created_at_milestone_id: string,
 *     deleted_at_milestone_id: string|null,
 *     version_milestone_id: string,
 *     version_milestone_sort_order: int,
 *     label: string|null,
 *     technology: string|null,
 *     source_handle: string|null,
 *     target_handle: string|null,
 * }
 * @phpstan-type PositionRow array{
 *     id: string,
 *     element_id: string,
 *     milestone_id: string|null,
 *     x: float,
 *     y: float,
 *     updated_at: string,
 * }
 * @phpstan-type MilestoneRow array{
 *     id: string,
 *     project_id: string,
 *     label: string,
 *     occurs_on: string|null,
 *     sort_order: int,
 *     created_at: string,
 * }
 * @phpstan-type ResolvedElement array{
 *     id: string,
 *     project_id: string,
 *     parent_id: string|null,
 *     kind: string,
 *     is_external: bool,
 *     archetype: string|null,
 *     name: string,
 *     description: string|null,
 *     technology: string|null,
 * }
 * @phpstan-type ResolvedRelation array{
 *     id: string,
 *     source_element_id: string,
 *     target_element_id: string,
 *     status: string,
 *     label: string|null,
 *     technology: string|null,
 *     realized_at_milestone_id: string|null,
 *     source_handle: string|null,
 *     target_handle: string|null,
 * }
 * @phpstan-type DerivedRelation array{
 *     id: string,
 *     source_element_id: string,
 *     target_element_id: string,
 *     status: string,
 *     label: string|null,
 *     technology: string|null,
 *     realized: bool,
 *     declared_relation_id: string|null,
 *     realized_at_milestone_id: string|null,
 *     source_handle: string|null,
 *     target_handle: string|null,
 * }
 * @phpstan-type Warning array{type: string, subject_id: string|null, message: string}
 */
final class GraphResolver
{
    public const string WARNING_UNREALIZED_DECLARED_RELATION = 'unrealized_declared_relation';
    public const string WARNING_DANGLING_RELATION = 'dangling_relation';
    public const string WARNING_ELEMENT_WITHOUT_VERSION = 'element_without_version';

    /**
     * @param list<ElementVersionRow>  $elementVersionRows  one row per (element, version) pair
     * @param list<RelationVersionRow> $relationVersionRows one row per (relation, version) pair
     * @param list<PositionRow>        $positionRows        every position row, default and per-milestone
     * @param list<MilestoneRow>       $milestones          every milestone of the project, for sort_order lookup
     */
    public function resolve(
        array $elementVersionRows,
        array $relationVersionRows,
        array $positionRows,
        array $milestones,
        string $milestoneId,
        ?string $scopeElementId = null,
    ): ResolvedGraph {
        $sortOrderByMilestoneId = [];
        foreach ($milestones as $milestone) {
            $sortOrderByMilestoneId[$milestone['id']] = $milestone['sort_order'];
        }

        if (!isset($sortOrderByMilestoneId[$milestoneId])) {
            throw new \InvalidArgumentException(sprintf('Unknown milestone id "%s".', $milestoneId));
        }

        $targetSortOrder = $sortOrderByMilestoneId[$milestoneId];
        $warnings = [];

        $visibleElements = $this->resolveElements($elementVersionRows, $sortOrderByMilestoneId, $targetSortOrder, $warnings);
        $visibleRelations = $this->resolveRelations($relationVersionRows, $sortOrderByMilestoneId, $targetSortOrder, $visibleElements, $warnings);

        $relations = $scopeElementId === null
            ? $this->projectAndFuseC1Relations($visibleRelations, $visibleElements, $milestoneId, $warnings)
            : array_values($visibleRelations);

        $positions = $this->resolvePositions($positionRows, array_keys($visibleElements), $milestoneId);

        return new ResolvedGraph(array_values($visibleElements), $relations, $positions, $warnings);
    }

    /**
     * @param list<ElementVersionRow> $rows
     * @param array<string, int>      $sortOrderByMilestoneId
     * @param list<Warning>           $warnings
     *
     * @return array<string, ResolvedElement> keyed by element id, in seq order
     */
    private function resolveElements(
        array $rows,
        array $sortOrderByMilestoneId,
        int $targetSortOrder,
        array &$warnings,
    ): array {
        /** @var array<string, array{meta: ElementVersionRow, versions: list<ElementVersionRow>}> $groups */
        $groups = [];
        foreach ($rows as $row) {
            $groups[$row['id']]['meta'] ??= $row;
            $groups[$row['id']]['versions'][] = $row;
        }

        $visible = [];

        foreach ($groups as $elementId => $group) {
            $meta = $group['meta'];

            $createdSortOrder = $sortOrderByMilestoneId[$meta['created_at_milestone_id']] ?? null;
            if ($createdSortOrder === null || $createdSortOrder > $targetSortOrder) {
                continue;
            }

            $deletedMilestoneId = $meta['deleted_at_milestone_id'];
            if ($deletedMilestoneId !== null) {
                $deletedSortOrder = $sortOrderByMilestoneId[$deletedMilestoneId] ?? null;
                if ($deletedSortOrder !== null && $deletedSortOrder <= $targetSortOrder) {
                    continue;
                }
            }

            $bestVersion = null;
            $bestSortOrder = null;
            foreach ($group['versions'] as $version) {
                if ($version['version_milestone_sort_order'] > $targetSortOrder) {
                    continue;
                }
                if ($bestSortOrder === null || $version['version_milestone_sort_order'] > $bestSortOrder) {
                    $bestSortOrder = $version['version_milestone_sort_order'];
                    $bestVersion = $version;
                }
            }

            if ($bestVersion === null) {
                $warnings[] = $this->warning(
                    self::WARNING_ELEMENT_WITHOUT_VERSION,
                    $elementId,
                    sprintf('Element "%s" has no version at or before the target milestone.', $elementId),
                );
                continue;
            }

            $visible[$elementId] = [
                'id' => $elementId,
                'project_id' => $meta['project_id'],
                'parent_id' => $meta['parent_id'],
                'kind' => $meta['kind'],
                'is_external' => $meta['is_external'],
                'archetype' => $meta['archetype'],
                'name' => $bestVersion['name'],
                'description' => $bestVersion['description'],
                'technology' => $bestVersion['technology'],
            ];
        }

        return $visible;
    }

    /**
     * @param list<RelationVersionRow>      $rows
     * @param array<string, int>            $sortOrderByMilestoneId
     * @param array<string, ResolvedElement> $visibleElements
     * @param list<Warning>                 $warnings
     *
     * @return array<string, ResolvedRelation> keyed by relation id, in seq order
     */
    private function resolveRelations(
        array $rows,
        array $sortOrderByMilestoneId,
        int $targetSortOrder,
        array $visibleElements,
        array &$warnings,
    ): array {
        /** @var array<string, array{meta: RelationVersionRow, versions: list<RelationVersionRow>}> $groups */
        $groups = [];
        foreach ($rows as $row) {
            $groups[$row['id']]['meta'] ??= $row;
            $groups[$row['id']]['versions'][] = $row;
        }

        $visible = [];

        foreach ($groups as $relationId => $group) {
            $meta = $group['meta'];

            $createdSortOrder = $sortOrderByMilestoneId[$meta['created_at_milestone_id']] ?? null;
            if ($createdSortOrder === null || $createdSortOrder > $targetSortOrder) {
                continue;
            }

            $deletedMilestoneId = $meta['deleted_at_milestone_id'];
            if ($deletedMilestoneId !== null) {
                $deletedSortOrder = $sortOrderByMilestoneId[$deletedMilestoneId] ?? null;
                if ($deletedSortOrder !== null && $deletedSortOrder <= $targetSortOrder) {
                    continue;
                }
            }

            if (!isset($visibleElements[$meta['source_element_id']]) || !isset($visibleElements[$meta['target_element_id']])) {
                $warnings[] = $this->warning(
                    self::WARNING_DANGLING_RELATION,
                    $relationId,
                    sprintf('Relation "%s" has an endpoint not visible at the target milestone.', $relationId),
                );
                continue;
            }

            $bestVersion = null;
            $bestSortOrder = null;
            foreach ($group['versions'] as $version) {
                if ($version['version_milestone_sort_order'] > $targetSortOrder) {
                    continue;
                }
                if ($bestSortOrder === null || $version['version_milestone_sort_order'] > $bestSortOrder) {
                    $bestSortOrder = $version['version_milestone_sort_order'];
                    $bestVersion = $version;
                }
            }

            if ($bestVersion === null) {
                continue;
            }

            $visible[$relationId] = [
                'id' => $relationId,
                'source_element_id' => $meta['source_element_id'],
                'target_element_id' => $meta['target_element_id'],
                'status' => $meta['status'],
                'label' => $bestVersion['label'],
                'technology' => $bestVersion['technology'],
                'realized_at_milestone_id' => $meta['realized_at_milestone_id'],
                'source_handle' => $bestVersion['source_handle'],
                'target_handle' => $bestVersion['target_handle'],
            ];
        }

        return $visible;
    }

    /**
     * @param array<string, ResolvedRelation> $visibleRelations
     * @param array<string, ResolvedElement>  $visibleElements
     * @param list<Warning>                   $warnings
     *
     * @return list<DerivedRelation|ResolvedRelation>
     */
    private function projectAndFuseC1Relations(
        array $visibleRelations,
        array $visibleElements,
        string $milestoneId,
        array &$warnings,
    ): array {
        /** @var array<string, string|null> $systemAncestorCache */
        $systemAncestorCache = [];
        $systemAncestorOf = function (string $elementId) use ($visibleElements, &$systemAncestorCache, &$systemAncestorOf): ?string {
            if (array_key_exists($elementId, $systemAncestorCache)) {
                return $systemAncestorCache[$elementId];
            }

            $element = $visibleElements[$elementId] ?? null;
            if ($element === null) {
                return $systemAncestorCache[$elementId] = null;
            }

            if ($element['kind'] === 'system') {
                return $systemAncestorCache[$elementId] = $elementId;
            }

            $parentId = $element['parent_id'];
            if ($parentId === null) {
                return $systemAncestorCache[$elementId] = null;
            }

            return $systemAncestorCache[$elementId] = $systemAncestorOf($parentId);
        };

        /** @var array<string, DerivedRelation> $derivedByPair */
        $derivedByPair = [];
        /** @var list<ResolvedRelation> $declaredC1Relations */
        $declaredC1Relations = [];

        foreach ($visibleRelations as $relation) {
            $sourceElement = $visibleElements[$relation['source_element_id']];
            $targetElement = $visibleElements[$relation['target_element_id']];

            $sourceIsSystem = $sourceElement['kind'] === 'system';
            $targetIsSystem = $targetElement['kind'] === 'system';

            if ($sourceIsSystem && $targetIsSystem) {
                if ($relation['status'] === 'declared') {
                    $declaredC1Relations[] = $relation;
                }
                continue;
            }

            if ($sourceIsSystem || $targetIsSystem) {
                continue;
            }

            $sourceSystemId = $systemAncestorOf($relation['source_element_id']);
            $targetSystemId = $systemAncestorOf($relation['target_element_id']);

            if ($sourceSystemId === null || $targetSystemId === null || $sourceSystemId === $targetSystemId) {
                continue;
            }

            $pairKey = $sourceSystemId . '|' . $targetSystemId;

            $derivedByPair[$pairKey] ??= [
                'id' => 'derived:' . $sourceSystemId . '->' . $targetSystemId,
                'source_element_id' => $sourceSystemId,
                'target_element_id' => $targetSystemId,
                'status' => 'derived',
                'label' => null,
                'technology' => null,
                'realized' => false,
                'declared_relation_id' => null,
                'realized_at_milestone_id' => null,
                'source_handle' => null,
                'target_handle' => null,
            ];
        }

        $unmatchedDeclared = [];

        foreach ($declaredC1Relations as $declared) {
            $pairKey = $declared['source_element_id'] . '|' . $declared['target_element_id'];

            if (isset($derivedByPair[$pairKey])) {
                $derivedByPair[$pairKey]['realized'] = true;
                $derivedByPair[$pairKey]['declared_relation_id'] = $declared['id'];
                $derivedByPair[$pairKey]['realized_at_milestone_id'] = $milestoneId;
                continue;
            }

            $unmatchedDeclared[] = $declared;
            $warnings[] = $this->warning(
                self::WARNING_UNREALIZED_DECLARED_RELATION,
                $declared['id'],
                sprintf('Declared relation "%s" has never been realized by a matching container relation.', $declared['id']),
            );
        }

        return array_merge(array_values($derivedByPair), $unmatchedDeclared);
    }

    /**
     * @param list<PositionRow> $positionRows
     * @param list<string>      $visibleElementIds
     *
     * @return array<string, array{x: float, y: float}>
     */
    private function resolvePositions(array $positionRows, array $visibleElementIds, string $milestoneId): array
    {
        /** @var array<string, array<string, PositionRow>> $byElement */
        $byElement = [];
        foreach ($positionRows as $row) {
            $byElement[$row['element_id']][$row['milestone_id'] ?? '__default__'] = $row;
        }

        $positions = [];
        foreach ($visibleElementIds as $elementId) {
            $rowsForElement = $byElement[$elementId] ?? null;
            if ($rowsForElement === null) {
                continue;
            }

            $chosen = $rowsForElement[$milestoneId] ?? $rowsForElement['__default__'] ?? null;
            if ($chosen === null) {
                continue;
            }

            $positions[$elementId] = ['x' => $chosen['x'], 'y' => $chosen['y']];
        }

        return $positions;
    }

    /**
     * @return Warning
     */
    private function warning(string $type, ?string $subjectId, string $message): array
    {
        return ['type' => $type, 'subject_id' => $subjectId, 'message' => $message];
    }
}
