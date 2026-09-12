/**
 * Fonction pure de validation d'un nouveau connecteur.
 * Rejette :
 * - Les connexions incomplètes (source ou cible manquante)
 * - Les auto-connexions (source === target)
 * - Les doublons d'arêtes dans le même sens
 */
export function isValidNankoConnection(
  connection: { source?: string | null; target?: string | null },
  edges: Array<{ source: string; target: string }>,
): boolean {
  if (!connection.source || !connection.target) return false
  if (connection.source === connection.target) return false
  const alreadyExists = edges.some(
    (e) => e.source === connection.source && e.target === connection.target,
  )
  return !alreadyExists
}
