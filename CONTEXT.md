# Nanko

Nanko aide à concevoir des schémas d'architecture selon une approche "diagrams-as-code" : le contenu est piloté par un format texte versionné (`.nanko`), la base de données étant la source de vérité runtime.

## Language

### Structure

**Org**:
Le regroupement de premier niveau qui possède des Project et des membres. Peut définir une Capability par défaut applicable à tous ses Project.
_Avoid_: Organisation, tenant, workspace

**Project**:
Un conteneur plat de Document au sein d'une Org. Pas de hiérarchie ni de dossiers en v1 — la recherche full-text remplace le rangement.
_Avoid_: Espace, dossier

**Document**:
Un schéma versionné, identifié par un `@id` stable, positionné sur un Layer, décrivant des Shape et leurs Connector. C'est l'entité du domaine ; le fichier `.nanko` n'en est que la sérialisation.
_Avoid_: Schéma, diagramme, fichier .nanko

**Layer**:
L'attribut de profondeur d'un Document au sein d'un Project (équivalent d'un z-index) — pas une entité séparée. Plusieurs Document peuvent partager le même Layer.
_Avoid_: Niveau, z-index

### Versioning

**Version**:
Un instantané figé et immuable d'un Document, identifié par `@version` au format `layer:semver` (le préfixe layer doit toujours égaler le Layer du Document). Contient à la fois le contenu sémantique et son Layout.
_Avoid_: Snapshot, révision

**Draft**:
L'état de travail courant d'un Document, librement modifiable, distinct de ses Version figées. Ne devient une Version qu'au moment où l'utilisateur la publie explicitement.
_Avoid_: Working copy, état courant

**Current version**:
La Version d'un Document désignée manuellement comme faisant autorité pour la navigation inter-Layer. N'est jamais déduite automatiquement d'une plage de compatibilité.
_Avoid_: Latest version, dernière version — une Version plus récente peut exister sans être Current

**Satisfies**:
La déclaration de compatibilité informative (`@satisfies layer:range`) qu'une Version fait envers une plage de Version d'un autre Layer. Sert uniquement à avertir si la Current version affichée sort de cette plage — jamais à choisir automatiquement quelle Version afficher.
_Avoid_: Dépendance, requirement

**Layout**:
La section `!LAYOUT`/`!END` d'un Document, contenant les positions figées par ID de Shape. Fait partie de la Version (versionnée avec le contenu). Généré une seule fois de façon naïve à la première importation, puis piloté à la main.
_Avoid_: Positionnement, placement

### Contenu (mode free)

**Shape**:
Un élément visuel du mode free (rectangle, circle, text), identifié par un ID obligatoire. Ne porte aucune position ni relation spatiale dans le contenu sémantique du Document.
_Avoid_: Forme, élément, node

**Connector**:
Une relation logique entre deux Shape, référencées par leur ID. Ne porte aucune information de position.
_Avoid_: Lien, edge, arrow

### Droits

**Capability**:
Un droit accordé explicitement à un membre sur un Project précis — pas un rôle. Une Org peut définir une Capability par défaut appliquée à tous ses Project pour couvrir le cas simple.
_Avoid_: Rôle, permission, droit
