<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260811210000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create element and element_version tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TYPE element_kind AS ENUM (
                'system_landscape', 'person', 'system', 'container', 'component', 'code'
            )
            SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE element (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                parent_id uuid REFERENCES element(id) ON DELETE CASCADE,
                kind element_kind NOT NULL,
                is_external boolean NOT NULL DEFAULT false,
                seq bigserial,
                created_at_milestone_id uuid NOT NULL REFERENCES milestone(id),
                deleted_at_milestone_id uuid REFERENCES milestone(id),
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            )
            SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE element_version (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                element_id uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
                milestone_id uuid NOT NULL REFERENCES milestone(id),
                name text NOT NULL,
                description text,
                technology text,
                created_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (element_id, milestone_id)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE element_version');
        $this->addSql('DROP TABLE element');
        $this->addSql('DROP TYPE element_kind');
    }
}
