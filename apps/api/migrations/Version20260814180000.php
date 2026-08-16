<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260814180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Replace annotation\'s single element_id/relation_id link with a many-to-many '
            . 'annotation_link join table — a note can now link to several elements and/or another '
            . 'note, not just one element XOR one relation. UNIQUE NULLS NOT DISTINCT (PG15+, project '
            . 'pins PG16) gives dedupe-at-the-DB-level for free: a repeated link attempt is an '
            . 'INSERT ... ON CONFLICT DO NOTHING no-op, not an error. The three-way CHECK replaces the '
            . 'old two-way element_id/relation_id CHECK that lived on the annotation table itself, which '
            . 'is dropped along with the four columns it constrained.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE annotation_link (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                annotation_id uuid NOT NULL REFERENCES annotation(id) ON DELETE CASCADE,
                element_id uuid REFERENCES element(id) ON DELETE CASCADE,
                relation_id uuid REFERENCES relation(id) ON DELETE CASCADE,
                target_annotation_id uuid REFERENCES annotation(id) ON DELETE CASCADE,
                source_handle text,
                target_handle text,
                created_at timestamptz NOT NULL DEFAULT now(),
                CHECK ((element_id IS NOT NULL)::int + (relation_id IS NOT NULL)::int + (target_annotation_id IS NOT NULL)::int = 1),
                CHECK (target_annotation_id IS NULL OR target_annotation_id <> annotation_id),
                UNIQUE NULLS NOT DISTINCT (annotation_id, element_id, relation_id, target_annotation_id)
            )
            SQL);

        $this->addSql(<<<'SQL'
            INSERT INTO annotation_link (annotation_id, element_id, relation_id, source_handle, target_handle)
            SELECT id, element_id, relation_id, source_handle, target_handle
            FROM annotation
            WHERE element_id IS NOT NULL OR relation_id IS NOT NULL
            SQL);

        $this->addSql('ALTER TABLE annotation DROP COLUMN element_id');
        $this->addSql('ALTER TABLE annotation DROP COLUMN relation_id');
        $this->addSql('ALTER TABLE annotation DROP COLUMN source_handle');
        $this->addSql('ALTER TABLE annotation DROP COLUMN target_handle');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE annotation ADD COLUMN element_id uuid REFERENCES element(id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE annotation ADD COLUMN relation_id uuid REFERENCES relation(id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE annotation ADD COLUMN source_handle text');
        $this->addSql('ALTER TABLE annotation ADD COLUMN target_handle text');

        // Down-migration data loss is acceptable (bootstrap-stage project, no real data to
        // protect): backfill one arbitrary element/relation link per annotation, dropping any
        // note-to-note links entirely since the old schema has no column to hold them.
        $this->addSql(<<<'SQL'
            UPDATE annotation a
            SET element_id = l.element_id,
                relation_id = l.relation_id,
                source_handle = l.source_handle,
                target_handle = l.target_handle
            FROM (
                SELECT DISTINCT ON (annotation_id) annotation_id, element_id, relation_id, source_handle, target_handle
                FROM annotation_link
                WHERE element_id IS NOT NULL OR relation_id IS NOT NULL
                ORDER BY annotation_id, created_at ASC
            ) l
            WHERE a.id = l.annotation_id
            SQL);

        $this->addSql('ALTER TABLE annotation ADD CONSTRAINT annotation_element_id_relation_id_check CHECK (element_id IS NULL OR relation_id IS NULL)');

        $this->addSql('DROP TABLE annotation_link');
    }
}
