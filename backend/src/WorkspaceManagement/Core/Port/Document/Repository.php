<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Port\Document;

use App\WorkspaceManagement\Core\Domain\Document\Document;
use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;

interface Repository
{
    public function save(Document $document): void;

    public function findById(DocumentId $id): ?Document;

    public function findByProjectAndSlug(ProjectId $projectId, string $slug): ?Document;

    /**
     * @return list<Document>
     */
    public function listByProjectId(ProjectId $projectId): array;
}
