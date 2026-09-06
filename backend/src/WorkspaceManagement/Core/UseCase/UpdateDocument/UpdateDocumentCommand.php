<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\UseCase\UpdateDocument;

use App\WorkspaceManagement\Core\Domain\Document\Id as DocumentId;
use Symfony\Component\Uid\Uuid as UserId;

final readonly class UpdateDocumentCommand
{
    public function __construct(
        public DocumentId $documentId,
        public UserId $userId,
        public string $sourceCode,
    ) {}
}
