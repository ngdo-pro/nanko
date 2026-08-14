<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260813120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create annotation table — a sticky note pinned at a canvas position, kept across '
            . 'milestones (not versioned), optionally pointing at one element or relation. '
            . 'scope_element_id does not cascade on delete (like milestone_id references) — it identifies '
            . 'which diagram the note lives on, it does not own the note.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE annotation (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                element_id uuid REFERENCES element(id) ON DELETE CASCADE,
                relation_id uuid REFERENCES relation(id) ON DELETE CASCADE,
                scope_element_id uuid REFERENCES element(id),
                x double precision NOT NULL,
                y double precision NOT NULL,
                author_name text NOT NULL,
                body text NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now(),
                CHECK (element_id IS NULL OR relation_id IS NULL)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE annotation');
    }
}
