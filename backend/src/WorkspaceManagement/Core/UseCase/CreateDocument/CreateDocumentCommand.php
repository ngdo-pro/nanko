<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\CreateDocument;

use App\WorkspaceManagement\Core\Domain\Document\Layer;
use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use Symfony\Component\Uid\Uuid as UserId;

final readonly class CreateDocumentCommand
{
    public function __construct(
        public ProjectId $projectId,
        public UserId $userId,
        public string $name,
        public string $slug,
        public Layer $layer,
    ) {}
}
