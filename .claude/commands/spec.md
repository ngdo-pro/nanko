# Skill Claude Code : /spec

Rédige une spécification de demande d'évolution sous forme de delta structuré.

## Rôle & Objectif
Interviewe le développeur, compare le besoin exprimé avec l'état courant du domaine cible, et génère un fichier de spécification delta prêt pour relecture humaine dans `.specs/changes/active/XXX-[slug].md`.

## Arguments attendus
`$ARGUMENTS` : `[domaine] [besoin...]`
* Le premier argument est le nom du domaine (ex. `auth-and-identity`, `workspace-management`).
* Les arguments suivants décrivent le besoin ou l'évolution souhaitée.

## Procédure d'exécution

### Étape 1 : Vérification du domaine et isolation du contexte
1. Vérifier si le répertoire `.specs/current/domains/[domaine]/` existe.
   * S'il n'existe pas, lister les domaines existants dans `.specs/current/domains/` et demander confirmation ou confirmation de création d'un nouveau domaine.
2. Charger **exclusivement** le contexte du domaine :
   * `.specs/current/domains/[domaine]/behavior.md`
   * `.specs/current/domains/[domaine]/tech.md`
   * `.specs/current/domains/[domaine]/contracts.md`
   * `.specs/current/domains/[domaine]/models.md`
   * Ainsi que `.specs/vision.md` et `.specs/architecture.md` pour garantir les invariants transverses.
   * *Ne charger aucun code source non nécessaire pour limiter le bruit contextuel.*

### Étape 2 : Cadrage & Interview (2 questions maximum)
1. Analyser le besoin par rapport à ce qui existe déjà dans l'état courant.
2. Si le besoin comporte des ambiguïtés ou des choix d'arbitrage critiques, poser **au maximum 2 questions précises et actionnables** à l'utilisateur.
3. Si le besoin est clair et non ambigu, passer directement à l'étape suivante sans poser de questions superflues.

### Étape 3 : Résolution du numéro de séquence (XXX)
1. Parcourir les fichiers existants dans `.specs/changes/active/` et `.specs/changes/archive/`.
2. Trouver le numéro le plus élevé (format numérique sur 3 chiffres, ex. `000`, `001`).
3. Incrémenter ce numéro pour obtenir `XXX` (ex. `001`, `002`).
4. Créer un slug en kebab-case à partir de l'intitulé du besoin (ex. `001-init-auth.md`).

### Étape 4 : Génération de la spécification delta
1. Lire le template `.specs/CHANGE_TEMPLATE.md`.
2. Générer le fichier complet `.specs/changes/active/XXX-[slug].md` en renseignant minutieusement chaque section :
   * **Métadonnées :** Domaine, type de changement, cibles (`backend`, `frontend`, `tests-e2e`).
   * **1. Intention & Contexte :** Why, impact utilisateur, in-scope, out-of-scope.
   * **2. Flux & Architecture :** Diagramme de séquence Mermaid complet avec cas nominal, erreur 422 et erreur métier/conflit 409.
   * **3. Delta Modèle de données & DB :** Diagramme ERD Mermaid, tableau des colonnes modifiées/ajoutées, types DBAL, identifiants UUIDv7 et nom de la migration Doctrine.
   * **4. Delta Contrats d'API :** Endpoints REST avec DTOs PHP `final readonly` typés avec contraintes `Assert\*`, formats JSON de réponses et codes de statut HTTP.
   * **5. Delta Maquettes & Layout UI :** Wireframes ASCII Desktop (≥ 1024px) et Mobile (< 768px), arborescence JSX et structure Tailwind.
   * **6. Delta Spécifications UI :** Schéma de validation Zod complet et matrice des 5 états UI (Idle, Submitting, Error Validation, Error Serveur, Success).
   * **7. Invariants & Cas limites :** Rétrocompatibilité, idempotence, contrôle d'accès (Voters / Capabilities).
   * **8. Plan d'exécution séquentiel :** Checklist à cocher découpée en Phase 1 Backend, Phase 2 Frontend, Phase 3 E2E et Phase 4 Sync.
   * **9. Definition of Done :** Scénarios Gherkin détaillés et taggés (`@e2e @preprod`, `@api @integration`, `@api @unit`, `@web @unit`, `@web @integration`) et commandes d'automatisation.

### Étape 5 : Restitution au développeur
Afficher un résumé concis du delta généré et rappeler au développeur :
« La spec active a été générée dans `.specs/changes/active/XXX-[slug].md`. Veuillez la relire et la valider ou l'ajuster directement dans votre éditeur avant de lancer `/build-spec XXX`. »
