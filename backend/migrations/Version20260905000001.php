<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260905000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create app_user table for Keycloak identity and JIT provisioning';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE app_user (
            id UUID NOT NULL,
            keycloak_id UUID NOT NULL,
            email VARCHAR(180) NOT NULL,
            created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('CREATE UNIQUE INDEX uniq_user_keycloak_id ON app_user (keycloak_id)');
        $this->addSql('CREATE INDEX idx_user_email ON app_user (email)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE app_user');
    }
}
