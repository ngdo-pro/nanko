<?php

declare(strict_types=1);

namespace App\Repository;

final class InvalidMilestoneOrderException extends \RuntimeException
{
    public function __construct(public readonly string $projectId)
    {
        parent::__construct(sprintf(
            'The given milestone order does not exactly match project "%s"\'s milestones.',
            $projectId,
        ));
    }
}
