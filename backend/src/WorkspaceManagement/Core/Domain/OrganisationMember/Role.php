<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\OrganisationMember;

enum Role: string
{
    case OWNER = 'owner';
    case MEMBER = 'member';
}
