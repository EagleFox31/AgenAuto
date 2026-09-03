# Méthodologie AppFactory — AgenAuto

## 1. Pourquoi AppFactory

AgenAuto est conçu comme un produit durable, mais son développement doit rester rapide et maîtrisé. L’approche AppFactory permet de séparer clairement ce qui fait la valeur métier du produit de ce qui doit devenir une capacité d’ingénierie standard.

Le principe : **ne pas réinventer les fondations à chaque feature et ne pas transformer le produit en laboratoire d’architecture.**

## 2. Les trois couches

### Product Core

Briques strictement métier :
- Vehicle Catalog
- Specifications
- Dealers
- Offers
- Search
- Comparison
- Leads
- Data Ingestion
- Dealer Portal

Ces modules doivent pouvoir évoluer avec le marché automobile sans être couplés à des détails d’infrastructure.

### Platform Bricks

Briques transverses réutilisables :
- Identity & RBAC
- Audit Trail
- Notifications
- File/Object Storage
- Observability
- Analytics
- Feature Flags
- Rate Limiting
- Background Jobs
- Data Import Framework
- Error Handling
- Configuration

Une brique transversale possède :
- une responsabilité claire ;
- un contrat stable ;
- une documentation minimale ;
- des tests ;
- une configuration par environnement ;
- des métriques ou logs utiles si elle est critique.

### Delivery Factory

Le socle d’exécution :
- conventions Git ;
- Pull Requests ;
- CI ;
- tests ;
- lint/typecheck ;
- migrations ;
- Docker ;
- staging ;
- release process ;
- dependency scanning ;
- documentation des décisions.

## 3. Règle Build / Reuse / Integrate

Avant d’implémenter une brique, on décide explicitement :

### Reuse
Réutiliser un composant interne ou open source quand il répond correctement au besoin et que sa licence est compatible.

### Integrate
Intégrer un service externe lorsqu’il apporte une capacité non différenciante avec un coût opérationnel raisonnable.

### Build
Construire en interne lorsque la capacité porte la différenciation métier, la maîtrise des données ou un avantage structurel.

Pour AgenAuto, le **catalogue canonique, le moteur de comparaison, le mapping des offres et la normalisation automobile** font partie des capacités à maîtriser fortement en interne.

## 4. Open source : règle de sérieux

Un repo GitHub public n’est pas automatiquement réutilisable.

Avant toute intégration :
- licence identifiée ;
- compatibilité avec notre usage vérifiée ;
- dépendances examinées ;
- activité du projet regardée ;
- code critique audité ;
- attribution conservée lorsque requise.

Les repos sans licence servent uniquement de référence fonctionnelle ou architecturale, sauf autorisation explicite de leur auteur.

## 5. Definition of Ready

Une issue est prête à être développée lorsque :
- le problème utilisateur ou technique est clair ;
- le périmètre est défini ;
- les critères d’acceptation sont écrits ;
- les dépendances connues sont identifiées ;
- aucune décision structurante indispensable n’est laissée implicite.

## 6. Definition of Done

Une feature n’est pas terminée parce qu’elle « marche sur ma machine ».

Selon son niveau de risque, elle doit inclure :
- code revu ;
- tests ;
- lint/typecheck ;
- migrations ;
- gestion des erreurs ;
- autorisations ;
- logs/observabilité ;
- documentation ;
- critères d’acceptation vérifiés ;
- déploiement staging réussi.

## 7. Flux Git

Convention proposée :

```text
main
  ├── feat/<scope>-<description>
  ├── fix/<scope>-<description>
  ├── chore/<description>
  └── docs/<description>
```

Conventional commits :
- `feat:`
- `fix:`
- `chore:`
- `docs:`
- `refactor:`
- `test:`
- `ci:`

Chaque PR doit expliquer :
- pourquoi le changement existe ;
- ce qui change ;
- comment le tester ;
- les impacts données/API ;
- les risques connus.

## 8. Quality Gates

Le pipeline minimal doit progressivement imposer :

```text
install
  -> lint
  -> typecheck
  -> unit tests
  -> integration tests
  -> build
  -> security/dependency checks
  -> artifact
```

Les E2E sont réservés aux parcours à forte valeur :
- recherche véhicule ;
- comparaison ;
- soumission d’un lead ;
- création/modification d’une offre concessionnaire ;
- import de données critique.

## 9. Observability by default

Les opérations critiques doivent être corrélables.

Identifiants recommandés :
- `request_id`
- `user_id`
- `dealer_id`
- `lead_id`
- `import_run_id`

Les erreurs applicatives sont capturées dans Sentry. Les logs backend sont structurés. Les imports doivent exposer nombre de lignes reçues, acceptées, rejetées et nécessitant une revue.

## 10. Data Quality comme brique produit

AgenAuto dépend directement de la qualité de ses données. La qualité n’est donc pas une tâche secondaire mais un domaine de première classe.

Chaque donnée structurante peut porter :
- `source`
- `observed_at`
- `verified_at`
- `confidence_score`
- `review_status`

Les corrections humaines importantes doivent être auditables.

## 11. ADR — Architecture Decision Records

Une ADR est créée pour toute décision qui :
- change la structure du système ;
- introduit une dépendance majeure ;
- crée une contrainte durable ;
- touche les données sensibles ;
- modifie les frontières de domaine.

Format minimal :

```text
Context
Decision
Alternatives considered
Consequences
Status
```

## 12. Ce que nous refusons

- microservices prématurés ;
- frameworks ajoutés sans besoin mesurable ;
- duplication de modèles véhicule entre concessionnaires ;
- scraping comme unique stratégie de données ;
- secrets dans Git ;
- PR géantes sans contexte ;
- dépendances open source non licenciées copiées dans le produit ;
- features non observables sur les flux critiques ;
- backlog rempli de tickets vagues.

## 13. Mesure de maturité

Une brique AppFactory est considérée mature lorsqu’elle est :
- utilisée par au moins un flux réel ;
- documentée ;
- testée ;
- observable ;
- configurable ;
- suffisamment découplée pour être réutilisée sans copier-coller massif.

Le but n’est pas de collectionner des briques. Le but est de **réduire le temps entre une idée métier et une livraison fiable**.