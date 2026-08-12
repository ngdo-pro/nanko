<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260812000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create position table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE position (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                element_id uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
                milestone_id uuid REFERENCES milestone(id),
                x double precision NOT NULL,
                y double precision NOT NULL,
                updated_at timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT position_unique UNIQUE NULLS NOT DISTINCT (element_id, milestone_id)
            )
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE position');
    }
}
