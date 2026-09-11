# ADR-018 : Grammaire DSL, Tokenizer Clé-Valeur et Versionnage de Schéma (@dsl-version)

* **Statut :** Validé
* **Date :** 2026-09-10
* **Impact :** `backend` | `frontend` | `tests-e2e`

## 1. Contexte & Problématique
Initialement, la syntaxe du langage déclaratif `.nanko` reposait sur un découpage positionnel rigide (`rectangle id "Label"`, `src -> tgt "Label"`). Cette approche présentait plusieurs limites majeures :
1. Impossibilité d'associer des attributs sémantiques complémentaires (tels qu'une description détaillée `desc`, des tags technologiques `tech` ou des statuts `external`) sans multiplier les arguments positionnels fragiles.
2. Absence de directives formelles de versionnage de grammaire dans le fichier source `.nanko`, rendant délicate la détection de ruptures et l'évolution future du parseur.
3. Risque d'incohérence syntaxique entre le backend Symfony (`NankoParser.php`) et le client React (`nankoParser.ts`).

## 2. Options techniques étudiées
* **Option A : Arguments positionnels enrichis ou délimiteurs spécifiques (ex: `rectangle id "Label" "Desc"`)**
  * *Avantages :* Évolution minime du parseur regex initial.
  * *Inconvénients :* Ambiguïté forte sur les arguments optionnels, impossibilité d'introduire de futurs attributs sans casser l'ordre, syntaxe peu lisible et fragile.
* **Option B : Adoption d'un format standardisé externe (JSON / YAML / TOML)**
  * *Avantages :* Écosystème de parseurs existants.
  * *Inconvénients :* Perte de l'identité du DSL `.nanko` (concis, orienté architecture lisible), lourdeur de syntaxe pour relier rapidement des entités (`src -> tgt`), verbosité excessive.
* **Option C : Tokenizer déclaratif clé-valeur avec versionnage explicite (`@dsl-version 1` et `key="valeur"`)**
  * *Avantages :* Clarté sémantique, ordre libre des attributs, extensibilité naturelle (ajout d'attributs futurs sans rupture), contrôle déterministe de la compatibilité via directive d'en-tête, préservation de l'esprit déclaratif compact de `.nanko`.
  * *Inconvénients :* Nécessite un tokenizer dédié capable de gérer les guillemets et l'échappement.

## 3. Décision
Retenir l'**Option C** :
1. **Directive de schéma :** Introduction de `@dsl-version <int>` (défaut : 1 si absente pour rétrocompatibilité totale). Rejet strict de toute version non supportée.
2. **Tokenizer clé-valeur symétrique :** Découpage de ligne extrayant le mot-clé, les identifiants positionnels et un dictionnaire d'attributs `clé="valeur"`.
3. **Guillemets doubles stricts :** Obligation stricte d'entourer les valeurs d'attributs de guillemets doubles `"..."`, avec prise en charge de l'échappement `\"`. Rejet explicite des valeurs non délimitées ou avec guillemets simples.
4. **Règles d'intégrité métier :**
   * L'attribut `label` est obligatoire pour toute shape (`rectangle`, `circle`, `text`).
   * Les connecteurs peuvent être nus (`src -> tgt`), porter un `label` (`src -> tgt label="..."`), ou `label` et `desc`. Un connecteur avec `desc` mais sans `label` est strictement interdit et rejeté.
5. **AST unifié :** Exposition formelle de `dslVersion: int` (défaut 1) et `desc: string|null` dans `NankoAst`, `Shape`, `Connector` côté Symfony et dans les schémas Zod côté React.

## 4. Justifications & Conséquences
* **Extensibilité :** Prépare l'ajout futur d'attributs sémantiques (`tech`, `color`, `style`) sans aucune rupture de grammaire.
* **Résilience & Rétrocompatibilité :** Tout document existant sans directive `@dsl-version` est assigné par défaut à la version 1.
* **Expérience développeur & Architecte :** L'inspecteur AST expose la version du DSL et les descriptions associées aux entités.
* **Impact tests & données :** Mise à niveau de l'ensemble des fixtures de tests et migration des documents existants en base locale vers la syntaxe déclarative `label="..."`.
