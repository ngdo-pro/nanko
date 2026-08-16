<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260814140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add source_handle/target_handle to relation_version — which of the 4 edges (or the '
            . 'center) a relation is anchored to on each end, at each milestone. Free text (validated '
            . 'application-side) rather than an enum: same treatment as label/technology, and avoids an '
            . 'ALTER TYPE if another anchor is added later. NULL for every existing row — read side '
            . 'defaults to the pre-existing bottom/top anchor, so no diagram re-arranges visually.';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE relation_version ADD COLUMN source_handle text');
        $this->addSql('ALTER TABLE relation_version ADD COLUMN target_handle text');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE relation_version DROP COLUMN target_handle');
        $this->addSql('ALTER TABLE relation_version DROP COLUMN source_handle');
    }
}
