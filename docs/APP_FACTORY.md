# Méthodologie AppFactory — AgenAuto

## 1. Pourquoi AppFactory

AgenAuto est conçu comme un produit durable, mais son développement doit rester rapide et maîtrisé. L’approche AppFactory sépare ce qui fait réellement la valeur métier du produit de ce qui doit être industrialisé et réutilisé.

Le principe : **ne pas réinventer les fondations à chaque produit, sans transformer l’architecture en collection de briques inutiles.**

## 2. Les quatre couches

### Product Core

Capacités strictement métier AgenAuto :
- Vehicle Catalog semantics
- Vehicle Specifications
- Dealers & Market Mapping
- Dealer Offers
- Search & Discovery rules
- Vehicle Comparison
- Leads
- Data Provenance & Freshness
- Automotive Data Quality
- Ingestion & Matching rules

Ce sont les capacités que nous devons comprendre et maîtriser parce qu’elles portent la différenciation du produit.

### Headless Core Brick

Payload CMS devient une brique AppFactory réutilisable pour fournir :
- collections / relations ;
- PostgreSQL + migrations ;
- Admin Panel ;
- authentication ;
- RBAC / access control ;
- REST / Local API ;
- media ;
- hooks ;
- jobs applicatifs ;
- CRUD générique ;
- workflows administratifs simples.

Le Headless Core est **configuré par le produit**, mais n’est pas le produit.

AgenAuto lui apporte :
- collections automobiles ;
- access policies dealer/admin ;
- validations métier ;
- hooks de provenance ;
- custom endpoints lorsque nécessaire ;
- règles de publication ;
- projections utilisées par la recherche et le comparateur.

### Platform Bricks

Briques transverses qui restent indépendantes du CMS lorsque cela a du sens :
- Observability
- Notifications
- Object Storage
- Analytics
- Feature Flags
- Rate Limiting / Anti-Abuse
- External Integrations
- Data Import Framework
- Error Handling
- Configuration

Une brique transverse possède :
- une responsabilité claire ;
- un contrat stable ;
- une documentation minimale ;
- des tests adaptés ;
- une configuration par environnement ;
- des logs/métriques lorsqu’elle est critique.

### Delivery Factory

Socle d’exécution :
- conventions Git ;
- branches et Pull Requests ;
- CI ;
- tests ;
- lint/typecheck ;
- migrations ;
- Docker ;
- staging ;
- release process ;
- dependency/security scanning ;
- documentation des décisions ;
- contrôle des licences open source.

## 3. Règle Build / Reuse / Integrate

Avant toute implémentation, on décide explicitement :

### Reuse
Réutiliser une capacité open source ou interne lorsqu’elle couvre correctement le besoin et que sa licence est compatible.

Exemple AgenAuto : Payload pour admin, auth, CRUD, access control et APIs génériques.

### Integrate
Intégrer un service externe lorsque la capacité est non différenciante et que le coût opérationnel est acceptable.

Exemples futurs : email transactionnel, analytics, monitoring, object storage.

### Build
Construire en interne lorsque la capacité porte la différenciation métier, la qualité des données ou un avantage structurel.

Pour AgenAuto, nous construisons ou contrôlons fortement :
- modèle automobile canonique ;
- dictionnaire de spécifications ;
- moteur de comparaison ;
- provenance et fraîcheur ;
- matching des offres ;
- normalisation automobile ;
- règles de data quality ;
- future decision intelligence.

## 4. Règle d’utilisation du CMS

Un Headless CMS n’est pas une excuse pour déplacer toute la logique métier dans des formulaires et hooks improvisés.

Nous distinguons :

### Configuration CMS légitime
- relations ;
- champs ;
- validations simples ;
- access control ;
- lifecycle hooks courts ;
- publication ;
- opérations administratives.

### Domaine AgenAuto explicite
- normalisation d’unités ;
- comparaison ;
- matching ambigu ;
- scoring de confiance ;
- règles de fraîcheur ;
- transformations complexes ;
- logique de recommandation.

Les fonctions de domaine doivent rester testables sans dépendre directement de l’interface Admin.

## 5. Python comme brique spécialisée

Python n’est plus le backend principal du produit.

Il est utilisé lorsque son écosystème apporte un avantage concret :
- CSV/Excel complexes ;
- batch data processing ;
- Polars/Pandas ;
- matching ;
- parsers ;
- collecteurs autorisés ;
- extraction documentaire ;
- analyse de qualité.

Le service Python communique avec le Headless Core via des contrats explicites et ne possède pas une base métier parallèle.

## 6. Open source : règle de sérieux

Un repo GitHub public n’est pas automatiquement réutilisable.

Avant intégration :
- licence identifiée ;
- compatibilité vérifiée ;
- activité du projet évaluée ;
- dépendances examinées ;
- code critique audité ;
- attribution conservée lorsque requise.

Les repos sans licence servent uniquement de référence fonctionnelle ou architecturale, sauf autorisation explicite.

## 7. Definition of Ready

Une issue est prête lorsque :
- le problème est clair ;
- le périmètre est défini ;
- les critères d’acceptation sont écrits ;
- les dépendances sont identifiées ;
- la décision Build / Reuse / Integrate est explicite si nécessaire ;
- aucune décision d’architecture bloquante n’est laissée implicite.

## 8. Definition of Done

Selon le niveau de risque :
- code revu ;
- tests ;
- lint/typecheck ;
- migration Payload si le schéma change ;
- access control vérifié ;
- gestion des erreurs ;
- logs/observabilité ;
- documentation ;
- critères d’acceptation vérifiés ;
- staging validé.

Une collection qui existe dans l’Admin mais dont les permissions, invariants ou migrations ne sont pas maîtrisés n’est pas « terminée ».

## 9. Flux Git

```text
main
  ├── feat/<scope>-<description>
  ├── fix/<scope>-<description>
  ├── refactor/<scope>-<description>
  ├── chore/<description>
  └── docs/<description>
```

Conventional commits :
- `feat:`
- `fix:`
- `refactor:`
- `chore:`
- `docs:`
- `test:`
- `ci:`

Chaque PR décrit :
- pourquoi ;
- ce qui change ;
- comment tester ;
- impacts données/schema ;
- impacts access control ;
- impacts API ;
- risques connus.

## 10. Quality Gates

Pipeline cible :

```text
install
  -> lint
  -> typecheck
  -> unit tests
  -> integration tests
  -> Payload migration/schema checks
  -> build
  -> dependency/security checks
```

Pour le service Python, si présent :

```text
ruff
  -> typecheck ciblé
  -> pytest
```

E2E critiques :
- recherche ;
- comparaison ;
- lead ;
- mise à jour d’une offre dealer ;
- import/review de données.

## 11. Data Quality comme domaine de première classe

Chaque observation structurante peut porter :
- `source` ;
- `observedAt` ;
- `verifiedAt` ;
- `confidenceScore` ;
- `reviewStatus`.

Les corrections importantes restent auditables.

Le CMS facilite l’opération, mais **la qualité des données reste une responsabilité produit**.

## 12. Observability by default

Identifiants utiles :
- `request_id`
- `user_id`
- `dealer_id`
- `lead_id`
- `import_run_id`

Les erreurs critiques sont capturées. Les imports exposent au minimum : reçus, acceptés, rejetés et nécessitant une revue.

## 13. ADR — Architecture Decision Records

Une ADR est créée lorsqu’une décision :
- change une frontière du système ;
- introduit une dépendance structurante ;
- crée une contrainte durable ;
- touche les données sensibles ;
- modifie la stratégie d’exécution.

ADR actuels :
- Payload comme Headless Core ;
- séparation Canonical Vehicle / Dealer Offer.

## 14. Ce que nous refusons

- recoder un admin générique sans raison ;
- recoder auth/RBAC alors que le Headless Core les couvre ;
- microservices prématurés ;
- Redis ou moteur de recherche ajouté « au cas où » ;
- logique métier complexe cachée uniquement dans l’Admin ;
- duplication de modèles véhicule par concessionnaire ;
- scraping comme source unique ;
- secrets dans Git ;
- PR géantes sans contexte ;
- dépendances non licenciées copiées ;
- backlog rempli de tickets vagues.

## 15. Mesure de maturité d’une brique

Une brique AppFactory est mature lorsqu’elle est :
- utilisée dans un flux réel ;
- documentée ;
- testée ;
- observable lorsque nécessaire ;
- configurable ;
- suffisamment découplée pour être réutilisée sans copier-coller massif.

Le but n’est pas de collectionner des briques. Le but est de **réduire le temps entre une idée métier et une livraison fiable**.