# ADR-011 : Architecture hexagonale stricte et persistance DBAL sans ORM dès le premier commit

* **Statut :** Validé
* **Date :** 2026-09-05
* **Impact :** `backend`

## 1. Contexte & Problématique
Comment structurer le backend Symfony dès sa toute première entité métier pour garantir une maintenabilité maximale et prévenir la dette technique des architectures couplées à un ORM ?  
Dans les projets traditionnels, partir avec des entités Doctrine ORM directement manipulées dans les contrôleurs reporte le refactoring à "plus tard", avec un coût de rétro-fit prohibitif une fois le domaine complexifié (notamment pour l'AST `.nanko` et le Layout spatial).

## 2. Options techniques étudiées
* **Option A : Architecture classique Symfony avec Doctrine ORM (EntityManager, UnitOfWork, Attributs de mapping)**
  * *Inconvénients :* Couche de comportement implicite et opaque (identity map, lazy loading involontaire, flush différé, requêtes cachées N+1) ; couplage fort entre le modèle métier et la structure relationnelle de base de données ; refactoring structurel très douloureux à terme.
* **Option B : Architecture hexagonale stricte (Core / Port / Adapter) avec Doctrine DBAL sans ORM**
  * *Avantages :* Entités et Value Objects du Domaine 100% purs et découplés de tout framework ; requêtes SQL explicites écrites via le QueryBuilder DBAL ; hydratation manuelle claire et maîtrisée ; exclusion totale de la dépendance `doctrine/orm` au profit de `doctrine/dbal` ; vérification automatisée de la frontière de dépendances en CI via Deptrac.

## 3. Décision
Retenir l'**Option B** : Mise en place immédiate d'une architecture hexagonale et suppression de Doctrine ORM du projet (`doctrine/orm` n'est pas installé) :

1. **Structure modulaire en couches :**
   ```text
   backend/src/[BoundedContext]/
   ├── Core/
   │   ├── Domain/       # Entités et Value Objects purs (UUIDv7), zéro framework
   │   ├── Port/         # Interfaces pures de Repository
   │   └── UseCase/      # Command et Handler par cas d'usage unitaire
   └── Adapter/
       ├── Driven/Persistence/  # Repositories DBAL Doctrine avec SQL explicite
       └── Driver/Http/         # Contrôleurs HTTP et DTOs d'entrée
   ```
2. **Convention de nommage sans redondance :**
   * Port : `Core/Port/<Agrégat>/Repository.php` (l'interface est implicite car pure).
   * Cas d'usage : `Core/UseCase/<Agrégat>/<Verbe><Agrégat>/{Command,Handler}.php`.
   * Adaptateur DBAL : `Adapter/Driven/Persistence/<Agrégat>/DoctrineRepository.php`.
   * Adaptateur HTTP : `Adapter/Driver/Http/Controller/<Agrégat>/<Verbe>.php`.
3. **Vérification automatique Deptrac :**
   * `Core/Domain` ne dépend de rien (sauf `symfony/uid` pour les types d'identifiants).
   * `Core/Port` ne dépend que de `Domain`.
   * `Core/UseCase` ne dépend que de `Domain` et `Port`.
   * Les adaptateurs `Driver` et `Driven` dépendent du Core, jamais l'inverse.
   * La règle est validée en CI via `vendor/bin/deptrac analyse` (`make deptrac`).

## 4. Justifications & Conséquences
* **Contrôle absolu des requêtes :** Zéro requête SQL magique ou invisible en arrière-plan.
* **Résilience des agrégats complexes :** Les structures d'arbres et le JSONB de l'AST `.nanko` sont persistés sans heurter les limites d'un mapping relationnel ORM.
* **Contrepartie assumée :** Volume de code de mapping initial plus élevé (écriture manuelle de l'hydratation dans chaque repository), largement rentabilisé par l'étanchéité et la simplicité de diagnostic.
