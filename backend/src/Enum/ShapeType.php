<?php

declare(strict_types=1);

namespace App\Enum;

enum ShapeType: string
{
    case Rectangle = 'rectangle';
    case Circle = 'circle';
    case Text = 'text';
}
