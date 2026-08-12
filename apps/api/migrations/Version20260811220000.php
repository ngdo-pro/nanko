<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260811220000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create relation and relation_version tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TYPE relation_status AS ENUM ('derived', 'declared')
            SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE relation (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                source_element_id uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
                target_element_id uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
                status relation_status NOT NULL DEFAULT 'declared',
                realized_at_milestone_id uuid REFERENCES milestone(id),
                seq bigserial,
                created_at_milestone_id uuid NOT NULL REFERENCES milestone(id),
                deleted_at_milestone_id uuid REFERENCES milestone(id),
                created_at timestamptz NOT NULL DEFAULT now()
            )
            SQL);

        $this->addSql(<<<'SQL'
            CREATE TABLE relation_version (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                relation_id uuid NOT NULL REFERENCES relation(id) ON DELETE CASCADE,
                milestone_id uuid NOT NULL REFERENCES milestone(id),
                label text,
                technology text,
                created_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (relation_id, milestone_id)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE relation_version');
        $this->addSql('DROP TABLE relation');
        $this->addSql('DROP TYPE relation_status');
    }
}
