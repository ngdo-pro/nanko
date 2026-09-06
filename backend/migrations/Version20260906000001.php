<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260906000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create organisation, organisation_member and project tables for WorkspaceManagement';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE organisation (
            id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            is_personal BOOLEAN DEFAULT false NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE UNIQUE INDEX uniq_organisation_slug ON organisation (slug)');

        $this->addSql('CREATE TABLE organisation_member (
            id UUID NOT NULL,
            organisation_id UUID NOT NULL,
            user_id UUID NOT NULL,
            role VARCHAR(50) DEFAULT \'owner\' NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            PRIMARY KEY(id),
            CONSTRAINT fk_org_member_organisation FOREIGN KEY (organisation_id) REFERENCES organisation (id) ON DELETE CASCADE,
            CONSTRAINT fk_org_member_user FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE
        )');
        $this->addSql('CREATE UNIQUE INDEX uniq_org_member ON organisation_member (organisation_id, user_id)');
        $this->addSql('CREATE INDEX idx_org_member_user ON organisation_member (user_id)');
        $this->addSql('CREATE INDEX idx_org_member_organisation ON organisation_member (organisation_id)');

        $this->addSql('CREATE TABLE project (
            id UUID NOT NULL,
            organisation_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            PRIMARY KEY(id),
            CONSTRAINT fk_project_organisation FOREIGN KEY (organisation_id) REFERENCES organisation (id) ON DELETE CASCADE
        )');
        $this->addSql('CREATE UNIQUE INDEX uniq_project_org_slug ON project (organisation_id, slug)');
        $this->addSql('CREATE INDEX idx_project_organisation ON project (organisation_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE project');
        $this->addSql('DROP TABLE organisation_member');
        $this->addSql('DROP TABLE organisation');
    }
}
