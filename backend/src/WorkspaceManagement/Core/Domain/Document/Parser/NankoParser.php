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
        $dslVersion = 1;

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

            // Directives de métadonnées (@id, @layer, @dsl-version)
            if (str_starts_with($line, '@')) {
                if (preg_match('/^@dsl-version\s+(.+)$/', $line, $matches)) {
                    $versionVal = trim($matches[1]);
                    if (!ctype_digit($versionVal) || (int) $versionVal !== 1) {
                        throw new InvalidNankoSyntaxException(
                            $lineNumber,
                            sprintf("Version de DSL non supportée : '%s'. Seule la version 1 est actuellement supportée.", $versionVal)
                        );
                    }
                    $dslVersion = (int) $versionVal;
                    continue;
                }

                if (preg_match('/^@(id|layer|version|satisfies)\s+(.+)$/', $line)) {
                    continue;
                }
                throw new InvalidNankoSyntaxException($lineNumber, sprintf('Directive métadonnée non reconnue : "%s"', $line));
            }

            // 1. Détection des Shapes (rectangle, circle, text)
            if (preg_match('/^(rectangle|circle|text)\s+([a-zA-Z0-9_-]+)(?:\s+(.*))?$/', $line, $matches)) {
                $type = $matches[1];
                $id = $matches[2];
                $attrString = trim($matches[3] ?? '');

                if ($attrString === '') {
                    throw new InvalidNankoSyntaxException(
                        $lineNumber,
                        sprintf("L'attribut 'label' est obligatoire pour la shape '%s'.", $id)
                    );
                }

                $attrs = self::parseAttributes($attrString, $lineNumber);

                if (!isset($attrs['label']) || trim($attrs['label']) === '') {
                    throw new InvalidNankoSyntaxException(
                        $lineNumber,
                        sprintf("L'attribut 'label' est obligatoire pour la shape '%s'.", $id)
                    );
                }

                foreach (array_keys($attrs) as $attrKey) {
                    if (!in_array($attrKey, ['label', 'desc'], true)) {
                        throw new InvalidNankoSyntaxException(
                            $lineNumber,
                            sprintf("Attribut non supporté '%s' pour la shape '%s'.", $attrKey, $id)
                        );
                    }
                }

                if (isset($shapesById[$id])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Une Shape avec l\'identifiant "%s" est déjà déclarée.', $id));
                }

                $shapesById[$id] = new Shape($id, $type, $attrs['label'], $attrs['desc'] ?? null);
                continue;
            }

            // 2. Détection des Connectors (source -> target [attributs])
            if (preg_match('/^([a-zA-Z0-9_-]+)\s*->\s*([a-zA-Z0-9_-]+)(?:\s+(.*))?$/', $line, $matches)) {
                $source = $matches[1];
                $target = $matches[2];
                $attrString = trim($matches[3] ?? '');

                if (!isset($shapesById[$source])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Le connecteur référence une Shape source non déclarée : "%s".', $source));
                }

                if (!isset($shapesById[$target])) {
                    throw new InvalidNankoSyntaxException($lineNumber, sprintf('Le connecteur référence une Shape cible non déclarée : "%s".', $target));
                }

                $label = null;
                $desc = null;

                if ($attrString !== '') {
                    $attrs = self::parseAttributes($attrString, $lineNumber);

                    foreach (array_keys($attrs) as $attrKey) {
                        if (!in_array($attrKey, ['label', 'desc'], true)) {
                            throw new InvalidNankoSyntaxException(
                                $lineNumber,
                                sprintf("Attribut non supporté '%s' pour le connecteur.", $attrKey)
                            );
                        }
                    }

                    if (isset($attrs['desc']) && !isset($attrs['label'])) {
                        throw new InvalidNankoSyntaxException(
                            $lineNumber,
                            "Un connecteur ne peut pas déclarer de description ('desc') sans libellé ('label')."
                        );
                    }

                    $label = $attrs['label'] ?? null;
                    $desc = $attrs['desc'] ?? null;
                }

                $connectors[] = new Connector($source, $target, $label, $desc);
                continue;
            }

            // Si aucune règle ne matche, lever une erreur de syntaxe
            throw new InvalidNankoSyntaxException($lineNumber, sprintf('Instruction non reconnue : "%s".', $line));
        }

        return new NankoAst(
            shapes: array_values($shapesById),
            connectors: $connectors,
            layout: $layout,
            dslVersion: $dslVersion,
        );
    }

    /**
     * @return array<string, string>
     *
     * @throws InvalidNankoSyntaxException
     */
    private static function parseAttributes(string $attrString, int $lineNumber): array
    {
        $attributes = [];
        $len = strlen($attrString);
        $i = 0;

        while ($i < $len) {
            // Skip whitespace
            while ($i < $len && ctype_space($attrString[$i])) {
                ++$i;
            }
            if ($i >= $len) {
                break;
            }

            // Check if user passed positional quoted string directly (legacy syntax)
            if ($attrString[$i] === '"' || $attrString[$i] === '\'') {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf('Syntaxe invalide : la valeur %s n\'est associée à aucun nom d\'attribut (utilisez la syntaxe déclarative clé="valeur", ex: label="...").', substr($attrString, $i))
                );
            }

            // Extract key
            $keyStart = $i;
            while ($i < $len && (ctype_alnum($attrString[$i]) || $attrString[$i] === '_' || $attrString[$i] === '-')) {
                ++$i;
            }
            $key = substr($attrString, $keyStart, $i - $keyStart);
            if ($key === '') {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf('Caractère inattendu dans les attributs : "%s".', substr($attrString, $i))
                );
            }

            // Skip whitespace before '='
            while ($i < $len && ctype_space($attrString[$i])) {
                ++$i;
            }

            if ($i >= $len || $attrString[$i] !== '=') {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf("La valeur de l'attribut '%s' doit être entourée de guillemets doubles.", $key)
                );
            }
            ++$i; // skip '='

            // Skip whitespace after '='
            while ($i < $len && ctype_space($attrString[$i])) {
                ++$i;
            }

            if ($i >= $len || $attrString[$i] !== '"') {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf("La valeur de l'attribut '%s' doit être entourée de guillemets doubles.", $key)
                );
            }
            ++$i; // skip opening quote '"'

            // Extract value until unescaped '"'
            $val = '';
            $closed = false;
            while ($i < $len) {
                $char = $attrString[$i];
                if ($char === '\\') {
                    if ($i + 1 < $len) {
                        $next = $attrString[$i + 1];
                        if ($next === '"' || $next === '\\') {
                            $val .= $next;
                            $i += 2;
                            continue;
                        }
                    }
                    $val .= $char;
                    ++$i;
                    continue;
                }
                if ($char === '"') {
                    $closed = true;
                    ++$i; // skip closing quote
                    break;
                }
                $val .= $char;
                ++$i;
            }

            if (!$closed) {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf("Guillemet fermant manquant pour l'attribut '%s'.", $key)
                );
            }

            // Next character must be whitespace or end of string
            if ($i < $len && !ctype_space($attrString[$i])) {
                throw new InvalidNankoSyntaxException(
                    $lineNumber,
                    sprintf("Séparateur manquant après l'attribut '%s'.", $key)
                );
            }

            $attributes[$key] = $val;
        }

        return $attributes;
    }
}
