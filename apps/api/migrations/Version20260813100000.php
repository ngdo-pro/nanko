<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260813100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add archetype to element (structural, not versioned — like kind/is_external)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TYPE element_archetype AS ENUM ('service', 'database', 'queue')
            SQL);

        $this->addSql(<<<'SQL'
            ALTER TABLE element ADD COLUMN archetype element_archetype
            SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE element DROP COLUMN archetype');
        $this->addSql('DROP TYPE element_archetype');
    }
}
