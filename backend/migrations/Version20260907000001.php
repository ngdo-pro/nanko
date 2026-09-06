<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260907000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create document table for WorkspaceManagement';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE document (
            id UUID NOT NULL,
            project_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            layer INTEGER DEFAULT 0 NOT NULL,
            source_code TEXT NOT NULL,
            ast JSONB DEFAULT \'{}\'::jsonb NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            PRIMARY KEY(id),
            CONSTRAINT fk_document_project FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE
        )');
        $this->addSql('CREATE UNIQUE INDEX uniq_document_project_slug ON document (project_id, slug)');
        $this->addSql('CREATE INDEX idx_document_project_id ON document (project_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE document');
    }
}
