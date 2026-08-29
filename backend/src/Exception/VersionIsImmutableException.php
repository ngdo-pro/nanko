<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\Uid\Uuid;

final class VersionIsImmutableException extends \RuntimeException
{
    public function __construct(Uuid $versionId)
    {
        parent::__construct(sprintf('Version "%s" is immutable and cannot be modified after publish.', $versionId));
    }
}
