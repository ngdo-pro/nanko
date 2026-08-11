<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260811200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create milestone table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE milestone (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
                label text NOT NULL,
                occurs_on date,
                sort_order integer NOT NULL,
                created_at timestamptz NOT NULL DEFAULT now(),
                UNIQUE (project_id, sort_order)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE milestone');
    }
}
