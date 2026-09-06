<?php

declare(strict_types=1);

namespace App\WorkspaceManagement\Core\Domain\Document\Parser;

final class NankoParser
{
    /**
     * @throws InvalidNankoSyntaxException
     */
    public static function parse(string $sourceCode): NankoAst
    {
        $lines = preg_split('/\r\n|\r|\n/', $sourceCode);
        if ($lines === false) {
            return new NankoAst([], []);
        }

        /** @var array<string, Shape> $shapesById */
        $shapesById = [];
        /** @var list<Connector> $connectors */
        $connectors = [];
        /** @var array<string, mixed> $layout */
        $layout = [];

        $inLayout = false;

        foreach ($lines as $index => $rawLine) {
            $lineNumber = $index + 1;
            $line = trim($rawLine);

            // Ignorer les lignes vides et commentaires
            if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, '//')) {
                continue;
            }

            // Gestion de la section !LAYOUT / !END
            if ($line === '!LAYOUT') {
                $inLayout = true;
                continue;
            }
            if ($line === '!END' && $inLayout) {
                $inLayout = false;
                continue;
            }

            if ($inLayout) {
                // Parsing d'une entrée layout (ex: "app: x=100, y=200" ou "app: 100, 200")
                if (preg_match('/^([a-zA-Z0-9_-]+)\s*:\s*(?:x=)?(-?\d+)\s*,\s*(?:y=)?(-?\d+)/', $line, $matches)) {
                    $layout[$matches[1]] = [
                        'x' => (int) $matches[2],
                        'y' => (int) $matches[3],
                    ];
                }
                continue;
            }

            // Directives de métadonnées (@id, @layer)
            if (str_starts_with($line, '@')) {
                if (preg_match('/^@(id|layer)\s+(.+)$/', $line)) {
                    continue;
                }
                throw new InvalidNankoSyntaxException($lineNumber, sprintf('Directive métadonnée non reconnue : "%s"', $line));
            }

            // 1. Détection des Shapes (rectangle, circle, text)
            if (preg_match('/^(rectangle|circle|text)\s+([a-zA-Z0-9_-]+)(?:\s+(?:"([^"]*)"|\'([^\']*)\'|(\S+)))?\s*$/', $line, $matches)) {
                $type = $matches[1];
                $id = $matches[2];
                $label = (isset($matches[3]) && $matches[3] !== '') ? $matches[3] : ($matches[4] ?? ($matches[5] ?? $id));

                if (isset($shapesById[$id])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Une Shape avec l\'identifiant "%s" est déjà déclarée.', $id));
                }

                $shapesById[$id] = new Shape($id, $type, $label);
                continue;
            }

            // 2. Détection des Connectors (source -> target [label])
            if (preg_match('/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s+(?:"([^"]*)"|\'([^\']*)\'|(\S+)))?\s*$/', $line, $matches)) {
                $source = $matches[1];
                $target = $matches[2];
                $label = isset($matches[3]) && $matches[3] !== '' ? $matches[3] : ($matches[4] ?? ($matches[5] ?? null));

                if (!isset($shapesById[$source])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Le connecteur référence une Shape source non déclarée : "%s".', $source));
                }

                if (!isset($shapesById[$target])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Le connecteur référence une Shape cible non déclarée : "%s".', $target));
                }

                $connectors[] = new Connector($source, $target, $label);
                continue;
            }

            // Si aucune règle ne matche, lever une erreur de syntaxe
            throw new InvalidNankoSyntaxException($lineNumber, sprintf('Instruction non reconnue : "%s".', $line));
        }

        return new NankoAst(
            shapes: array_values($shapesById),
            connectors: $connectors,
            layout: $layout,
        );
    }
}
