<?php

declare(strict_types=1);

namespace App\Enum;

enum Capability: string
{
    case DocumentRead = 'document_read';
    case DocumentWrite = 'document_write';
    case VersionPublish = 'version_publish';
    case ProjectManageCapabilities = 'project_manage_capabilities';
}
