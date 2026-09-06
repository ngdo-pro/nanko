<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\ListDocuments;

use App\WorkspaceManagement\Core\Domain\Project\Id as ProjectId;
use Symfony\Component\Uid\Uuid as UserId;

final readonly class ListDocumentsCommand
{
    public function __construct(
        public ProjectId $projectId,
        public UserId $userId,
    ) {}
}
