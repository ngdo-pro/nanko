# Architecture hexagonale (Core/Port/Adapter) dès le premier commit métier

Le backend adopte une architecture hexagonale dès sa toute première entité, alors qu'aucun code métier n'existait encore. Alternative rejetée : partir avec des entités Doctrine attributées directement consommées par les controllers, et refactorer "si le besoin s'en fait sentir" — ici le coût de mise en place est quasi nul (rien à migrer), alors que le coût d'un rétro-fit une fois `Document`/`Version` écrits avec des entités Doctrine attributées serait, lui, réel.

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
- Adapter driven Doctrine : `Adapter/Driven/Persistence/<Agrégat>/Doctrine<Rôle>.php` (pas de segment `Doctrine/` dans le chemin, il est déjà dans le nom de classe ; pas de préfixe `<Agrégat>` dans le nom de classe, il est déjà dans le nom de dossier) — ex. `Persistence/Org/DoctrineRepository.php`, et le type DBAL custom de l'identifiant à côté : `Persistence/Org/DoctrineId.php` (pas de dossier `Type/` partagé entre agrégats : chaque agrégat a son propre dossier, donc pas besoin d'y répéter son nom dans la classe non plus).
- Adapter driver HTTP : `Adapter/Driver/Http/Controller/<Agrégat>/<Verbe>.php` (pas de suffixe `Controller`, déjà dans le nom de dossier ; pas de préfixe `<Agrégat>`, déjà dans le nom de dossier).
- Value object d'identité : `Core/Domain/<Agrégat>/Id.php` (pas `<Agrégat>Id`, l'agrégat est déjà le namespace) — l'entité racine elle-même (`Core/Domain/<Agrégat>/<Agrégat>.php`) reste l'exception : il n'y a rien de plus court à écrire pour "l'agrégat lui-même".

Le mapping Doctrine est en XML externe (`Adapter/Driven/Persistence/<Agrégat>/<Agrégat>.orm.xml`), pas en attributs sur l'entité domaine — alternative nommée et écartée : `#[ORM\Entity]` directement sur `Org`. Contrepartie assumée : un fichier de mapping de plus par agrégat, et un type DBAL custom par value object d'identité (`Persistence/Org/DoctrineId`, un par agrégat à venir) — jugé acceptable pour garder `Core/Domain` à zéro dépendance Doctrine. Point vérifié en pratique (pas supposé) : le driver XML de Doctrine bundle (`SimplifiedXmlDriver`) construit un nom de fichier en remplaçant `\` par `.` dans la partie du nom de classe qui suit le `prefix` configuré — un `prefix` unique pour tout `Core\Domain` aurait donc aplati tous les fichiers de mapping dans un seul dossier (`Org.Org.orm.xml`, `Project.Project.orm.xml`, ...). Un `prefix` scopé à chaque agrégat (`App\Core\Domain\Org`, pas `App\Core\Domain`) restaure la structure en sous-dossier voulue (`Org/Org.orm.xml`) — une entrée de mapping par agrégat dans `config/packages/doctrine.php`, au même rythme qu'une entrée de type DBAL par agrégat.

Échappatoire pour plus tard : si un agrégat (par exemple `Document`, avec son contenu sémantique et son Layout) diverge trop du modèle relationnel pour qu'un mapping XML direct reste lisible, basculer vers un modèle de persistance séparé avec mapper explicite plutôt que de forcer le mapping ORM sur l'entité domaine elle-même.

Un piège rencontré en écrivant le premier repository, à anticiper pour chaque futur value object d'identité : `Doctrine\ORM\UnitOfWork::getIdHashByIdentifier()` fait un `implode()` sur les valeurs PHP de l'identifiant pour construire sa clé d'identity-map — sans `__toString()` sur le VO d'identité (ici `Core\Domain\Org\Id`), persister ou retrouver une entité échoue avec *"Object of class Id could not be converted to string"*. Ce n'est pas une fuite d'infrastructure dans le domaine : `Stringable` est du PHP natif, pas du Doctrine.
