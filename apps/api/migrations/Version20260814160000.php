<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260814160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add source_handle/target_handle to annotation — the note-to-element decorative arrow '
            . 'anchor was implemented client-side only in the relation anchor feature (Version20260814140000), '
            . 'leaving every note-to-element link visually pinned to bottom/top regardless of the edge the '
            . 'user actually dragged from. Same free-text treatment as relation_version, not versioned by '
            . 'milestone (annotations aren\'t either). NULL for every existing row.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE annotation ADD COLUMN source_handle text');
        $this->addSql('ALTER TABLE annotation ADD COLUMN target_handle text');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE annotation DROP COLUMN target_handle');
        $this->addSql('ALTER TABLE annotation DROP COLUMN source_handle');
    }
}
