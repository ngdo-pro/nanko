# Architecture hexagonale (Core/Port/Adapter) dès le premier commit métier

Le backend adopte une architecture hexagonale dès sa toute première entité, alors qu'aucun code métier n'existait encore. Alternative rejetée : partir avec des entités Doctrine attributées directement consommées par les controllers, et refactorer "si le besoin s'en fait sentir" — ici le coût de mise en place est quasi nul (rien à migrer), alors que le coût d'un rétro-fit une fois `Document`/`Version` écrits avec des entités Doctrine attributées serait, lui, réel.

La persistance passe par Doctrine DBAL, pas par l'ORM. Alternative rejetée : mapper les agrégats via l'ORM (EntityManager, UnitOfWork, mapping XML/attributs) — l'ORM ajoute une couche de comportement implicite (identity map, lazy loading, flush différé, hydratation automatique) que la couche `Adapter/Driven/Persistence` est justement censée rendre explicite : un repository DBAL écrit lui-même le SQL (ou le QueryBuilder DBAL) et fait l'hydratation vers/depuis le domaine à la main, sans magie cachée entre l'appel du repository et l'écriture réelle en base. Contrepartie assumée : plus de code de mapping écrit à la main par agrégat (pas de génération automatique depuis un mapping déclaratif), en échange d'un contrôle total sur les requêtes et d'une frontière `Adapter/Driven` parfaitement lisible — un aggrégat au modèle relationnel complexe (ex. `Document` avec son contenu sémantique et son Layout) n'aura ainsi jamais besoin d'un rétro-fit hors de l'ORM : DBAL est le point de départ, pas un échappatoire à activer plus tard. `doctrine/orm` n'est donc pas une dépendance du projet ; seuls `doctrine/dbal` (via `doctrine/doctrine-bundle`) et `doctrine/doctrine-migrations-bundle` (qui opère lui aussi au niveau DBAL/Schema, pas ORM) le sont.

La convention de nommage a itéré en trois temps avant de se stabiliser : `Domain/Application/Infrastructure` (vocabulaire DDD classique) a été écarté d'emblée — un dossier `Application` séparé pour la seule orchestration n'apportait rien de plus qu'une distinction entité/cas d'usage à l'intérieur d'un même dossier, à la taille actuelle du projet. `Core/Port/Adapter` fusionné (3 dossiers plats) a suivi, mais `Core/` mélangeant données (`Org`, `CreateOrgCommand`) et comportement (`CreateOrgHandler`) dans un même dossier plat empêchait une exclusion simple côté container Symfony : soit un glob fragile, soit réinscrire chaque Handler ligne par ligne dans `services.php`. La structure finale sépare `Core/` en trois sous-dossiers (`Domain`, `UseCase`, `Port`) et `Adapter/` en deux (`Driven`, `Driver`) :

```
backend/src/
  Core/
    Domain/<Agrégat>/            # entité + value objects, données pures
    UseCase/<Agrégat>/<Verbe><Agrégat>/
      Command.php   # suffixe Command/Query obligatoire dans le nom de fichier
      Handler.php    # seul élément de Core qui est un service
    Port/<Agrégat>/Repository.php
  Adapter/
    Driven/<Technologie>/<Agrégat>/   # ex. Persistence/Org
    Driver/<Technologie>/<Agrégat>/   # ex. Http/Controller/Org
```

Contrepartie assumée : 5 dossiers de premier niveau sous `src/` plutôt que 3, mais chacun a une règle de dépendance non ambiguë. `Core/Domain` ne dépend de rien (sauf `Symfony\Component\Uid`, exception délibérée pour les value objects d'identité — c'est un simple type-valeur, pas un service, et `symfony/uid` est déjà une dépendance directe). `Core/Port` ne dépend que de `Core/Domain`. `Core/UseCase` ne dépend que de `Core/Domain` et `Core/Port`. `Adapter/Driven` et `Adapter/Driver` peuvent dépendre de tout le `Core` et du framework, jamais l'inverse, et jamais l'un de l'autre. Ce sens de dépendance est vérifié automatiquement par Deptrac (`backend/deptrac.php`, `vendor/bin/deptrac analyse`) plutôt que laissé à la discipline seule.

**Convention de nommage des classes** : une information (technologie, agrégat, rôle) ne doit apparaître qu'une seule fois entre le namespace et le nom de classe, jamais dans les deux — le namespace la porte déjà la plupart du temps, donc le nom de classe se réduit à ce qui reste réellement distinctif :
- Port d'un agrégat : `Core/Port/<Agrégat>/Repository.php` (pas `<Agrégat>RepositoryInterface` — "Interface" est superflu : un fichier de `Core/Port/` sans dépendance technique EST une interface par construction).
- Cas d'usage : `Core/UseCase/<Agrégat>/<Verbe><Agrégat>/{Command,Handler}.php` — `<Verbe><Agrégat>` ne vit que dans le nom du dossier, pas répété dans le nom de fichier (pas `CreateOrgCommand.php`, juste `Command.php`).
- Adapter driven DBAL : `Adapter/Driven/Persistence/<Agrégat>/Doctrine<Rôle>.php` (pas de segment `Doctrine/` dans le chemin, il est déjà dans le nom de classe ; pas de préfixe `<Agrégat>` dans le nom de classe, il est déjà dans le nom de dossier) — ex. `Persistence/Org/DoctrineRepository.php`, une classe qui parle directement à `Doctrine\DBAL\Connection` (SQL ou QueryBuilder DBAL, hydratation manuelle vers/depuis le domaine), et le type DBAL custom de l'identifiant à côté : `Persistence/Org/DoctrineId.php` (pas de dossier `Type/` partagé entre agrégats : chaque agrégat a son propre dossier, donc pas besoin d'y répéter son nom dans la classe non plus) — déclaré dans `config/packages/doctrine.php` (`dbal.types`), une entrée par agrégat à venir.
- Adapter driver HTTP : `Adapter/Driver/Http/Controller/<Agrégat>/<Verbe>.php` (pas de suffixe `Controller`, déjà dans le nom de dossier ; pas de préfixe `<Agrégat>`, déjà dans le nom de dossier).
- Value object d'identité : `Core/Domain/<Agrégat>/Id.php` (pas `<Agrégat>Id`, l'agrégat est déjà le namespace) — l'entité racine elle-même (`Core/Domain/<Agrégat>/<Agrégat>.php`) reste l'exception : il n'y a rien de plus court à écrire pour "l'agrégat lui-même".
