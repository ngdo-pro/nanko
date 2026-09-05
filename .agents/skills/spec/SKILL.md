---
name: spec
description: Cadrer un besoin d'évolution et générer une spécification delta structurée dans .specs/changes/active/.
---

# Skill : spec

Utilisez ce skill lorsque l'utilisateur demande de concevoir, spécifier ou cadrer une évolution pour un domaine (`/spec [domaine] [besoin]`).

## Procédure

1. **Isolation du domaine :**
   * Vérifier que `.specs/current/domains/[domaine]/` existe.
   * Lire les fichiers de l'état courant : `behavior.md`, `tech.md`, `contracts.md`, `models.md`.
   * Lire `.specs/vision.md` et `.specs/architecture.md`.
2. **Interview (2 questions max) :**
   * Si des zones d'ombre subsistent (notamment sur l'exposition réseau, la sécurité des endpoints ou le périmètre), poser au maximum 2 questions précises à l'utilisateur.
3. **Numéro de séquence :**
   * Déterminer le prochain ID sur 3 chiffres (`XXX`) d'après `.specs/changes/active/` et `.specs/changes/archive/`.
4. **Génération du Delta :**
   * Instancier `.specs/CHANGE_TEMPLATE.md` dans `.specs/changes/active/XXX-[slug].md`.
   * Remplir obligatoirement toutes les sections :
     - Intention & Contexte (Why, Scope, Out of Scope)
     - Diagramme Mermaid (Flux & interactions)
     - Delta Modèle de données & DBAL / Doctrine
     - Delta Contrats d'API (Symfony / DTOs / Codes HTTP)
     - Configuration Réseau, Prérequis DNS & Sécurisation des Endpoints (Entrées DNS A/CNAME, exposition publique/interne, CORS, Rate Limiting, TLS, secrets)
     - Wireframes ASCII & JSX
     - Schéma Zod & Matrice des 5 états UI
     - Invariants & Cas limites (Edge cases)
     - Plan d'exécution séquentiel (Phasé avec DoD)
     - Scénarios de validation Gherkin & commandes de test
5. **Validation :**
   * Inviter l'utilisateur à relire la spec dans son éditeur avant l'implémentation (`/build-spec XXX`).

