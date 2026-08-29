<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260829091335 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE document (layer VARCHAR(255) NOT NULL, type VARCHAR(255) NOT NULL, id UUID NOT NULL, current_version_id UUID DEFAULT NULL, project_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_D8698A769407EE77 ON document (current_version_id)');
        $this->addSql('CREATE INDEX IDX_D8698A76166D1F9C ON document (project_id)');
        $this->addSql('CREATE TABLE draft (content JSON NOT NULL, layout JSON NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, id UUID NOT NULL, document_id UUID NOT NULL, updated_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_467C9694C33F7837 ON draft (document_id)');
        $this->addSql('CREATE INDEX IDX_467C9694896DBBDE ON draft (updated_by_id)');
        $this->addSql('CREATE TABLE org (default_capabilities JSON NOT NULL, name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_7215BA80989D9B62 ON org (slug)');
        $this->addSql('CREATE TABLE org_membership (joined_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, id UUID NOT NULL, org_id UUID NOT NULL, user_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_3A39D41F4837C1B ON org_membership (org_id)');
        $this->addSql('CREATE INDEX IDX_3A39D41A76ED395 ON org_membership (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_org_membership_org_user ON org_membership (org_id, user_id)');
        $this->addSql('CREATE TABLE project (name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, id UUID NOT NULL, org_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_2FB3D0EEF4837C1B ON project (org_id)');
        $this->addSql('CREATE TABLE project_capability_grant (capability VARCHAR(255) NOT NULL, id UUID NOT NULL, project_id UUID NOT NULL, user_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_F4863716166D1F9C ON project_capability_grant (project_id)');
        $this->addSql('CREATE INDEX IDX_F4863716A76ED395 ON project_capability_grant (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_project_capability_grant ON project_capability_grant (project_id, user_id, capability)');
        $this->addSql('CREATE TABLE users (email VARCHAR(255) NOT NULL, display_name VARCHAR(255) NOT NULL, id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_1483A5E9E7927C74 ON users (email)');
        $this->addSql('CREATE TABLE version (major SMALLINT NOT NULL, minor SMALLINT NOT NULL, patch SMALLINT NOT NULL, published_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, layer VARCHAR(255) NOT NULL, semver VARCHAR(255) NOT NULL, content JSON NOT NULL, layout JSON NOT NULL, satisfies JSON DEFAULT NULL, id UUID NOT NULL, document_id UUID NOT NULL, published_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_BF1CD3C3C33F7837 ON version (document_id)');
        $this->addSql('CREATE INDEX IDX_BF1CD3C35B075477 ON version (published_by_id)');
        $this->addSql('CREATE INDEX idx_version_document_timeline ON version (document_id, major, minor, patch)');
        $this->addSql('CREATE UNIQUE INDEX uniq_version_document_semver ON version (document_id, semver)');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A769407EE77 FOREIGN KEY (current_version_id) REFERENCES version (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE document ADD CONSTRAINT FK_D8698A76166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE draft ADD CONSTRAINT FK_467C9694C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE draft ADD CONSTRAINT FK_467C9694896DBBDE FOREIGN KEY (updated_by_id) REFERENCES users (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE org_membership ADD CONSTRAINT FK_3A39D41F4837C1B FOREIGN KEY (org_id) REFERENCES org (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE org_membership ADD CONSTRAINT FK_3A39D41A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE project ADD CONSTRAINT FK_2FB3D0EEF4837C1B FOREIGN KEY (org_id) REFERENCES org (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE project_capability_grant ADD CONSTRAINT FK_F4863716166D1F9C FOREIGN KEY (project_id) REFERENCES project (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE project_capability_grant ADD CONSTRAINT FK_F4863716A76ED395 FOREIGN KEY (user_id) REFERENCES users (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE version ADD CONSTRAINT FK_BF1CD3C3C33F7837 FOREIGN KEY (document_id) REFERENCES document (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE version ADD CONSTRAINT FK_BF1CD3C35B075477 FOREIGN KEY (published_by_id) REFERENCES users (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE document DROP CONSTRAINT FK_D8698A769407EE77');
        $this->addSql('ALTER TABLE document DROP CONSTRAINT FK_D8698A76166D1F9C');
        $this->addSql('ALTER TABLE draft DROP CONSTRAINT FK_467C9694C33F7837');
        $this->addSql('ALTER TABLE draft DROP CONSTRAINT FK_467C9694896DBBDE');
        $this->addSql('ALTER TABLE org_membership DROP CONSTRAINT FK_3A39D41F4837C1B');
        $this->addSql('ALTER TABLE org_membership DROP CONSTRAINT FK_3A39D41A76ED395');
        $this->addSql('ALTER TABLE project DROP CONSTRAINT FK_2FB3D0EEF4837C1B');
        $this->addSql('ALTER TABLE project_capability_grant DROP CONSTRAINT FK_F4863716166D1F9C');
        $this->addSql('ALTER TABLE project_capability_grant DROP CONSTRAINT FK_F4863716A76ED395');
        $this->addSql('ALTER TABLE version DROP CONSTRAINT FK_BF1CD3C3C33F7837');
        $this->addSql('ALTER TABLE version DROP CONSTRAINT FK_BF1CD3C35B075477');
        $this->addSql('DROP TABLE document');
        $this->addSql('DROP TABLE draft');
        $this->addSql('DROP TABLE org');
        $this->addSql('DROP TABLE org_membership');
        $this->addSql('DROP TABLE project');
        $this->addSql('DROP TABLE project_capability_grant');
        $this->addSql('DROP TABLE users');
        $this->addSql('DROP TABLE version');
    }
}
