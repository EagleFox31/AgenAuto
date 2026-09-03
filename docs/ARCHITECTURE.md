# Architecture AgenAuto

## 1. Principes

L’architecture d’AgenAuto suit six principes :

1. **Domain-first** — le modèle automobile et les règles métier priment sur les frameworks.
2. **Canonical data first** — le référentiel véhicule reste séparé des offres commerciales.
3. **Headless Core before custom backend** — les capacités génériques data/admin/auth/API sont confiées à Payload plutôt que recodées.
4. **Modular monolith before distributed systems** — les frontières de domaine restent nettes sans microservices prématurés.
5. **Contract-driven boundaries** — les interfaces entre Payload, frontend et ingestion spécialisée sont explicites.
6. **Operational readiness by design** — migrations, sécurité, audit, observabilité et reprise font partie du MVP.

## 2. Décision structurante

Payload CMS est le **Headless Core** d’AgenAuto.

Il porte la persistance principale, l’Admin Panel, l’authentification, l’access control, les APIs générées, les hooks, les migrations PostgreSQL et les jobs applicatifs simples.

La logique qui différencie AgenAuto reste dans des modules métier dédiés : comparaison, normalisation automobile, search/discovery, provenance/fraîcheur, data quality et ingestion.

Voir :
- `docs/HEADLESS_CORE.md`
- `docs/adr/ADR-001-payload-headless-core.md`
- `docs/adr/ADR-002-canonical-vehicle-vs-dealer-offer.md`

## 3. Topologie cible

```text
Browser
  |
  +--> Next.js public product UI ------------------+
  |                                                |
  +--> Dealer-facing UI when needed ---------------+
                                                   |
                                                   v
                                      Payload Headless Core
                                  Admin / Auth / Access / APIs
                                  Collections / Hooks / Jobs
                                                   |
                                                   v
                                               PostgreSQL
                                                   |
                           +-----------------------+------------------+
                           |                                          |
                           v                                          v
                  Object / Media Storage                      Python Ingestion
                                                             CSV / Excel / APIs
                                                             collectors / match
```

### Pourquoi cette topologie

Une grande partie de ce qui était auparavant prévu dans `services/api` et `apps/admin` correspond à des capacités déjà fournies par Payload. Les reconstruire en FastAPI + admin custom n’apporterait pas d’avantage produit au MVP.

FastAPI n’est donc plus le backend CRUD principal. Python devient un outil spécialisé là où son écosystème apporte un levier clair.

## 4. Applications et packages

### `apps/web`

Application Next.js principale. Elle héberge :
- expérience publique ;
- intégration Payload ;
- routes publiques ;
- catalogue ;
- recherche ;
- fiches véhicules ;
- comparaison ;
- formulaires de leads ;
- éventuellement les écrans dealer dédiés au fur et à mesure.

### Payload Admin

Le back-office interne initial est fourni par Payload et configuré par nos collections, hooks, validations et règles d’accès.

Il sert à :
- maintenir le référentiel ;
- gérer les dealers et agences ;
- gérer les offres ;
- corriger des données ;
- superviser les imports ;
- consulter les leads ;
- effectuer des revues de qualité.

Nous ne construisons pas `apps/admin` séparé au MVP tant que l’Admin Payload répond correctement aux besoins.

### Dealer UX

Le dealer portal n’est pas automatiquement une application indépendante.

Approche progressive :

1. utiliser l’Admin Payload avec scopes et vues adaptés pour les opérations simples ;
2. ajouter des composants ou vues custom si nécessaire ;
3. construire une UX dealer dédiée uniquement lorsque les workflows B2B justifient un produit séparé.

### `packages/payload-config`

Contient :
- collections ;
- globals ;
- access policies ;
- hooks ;
- field factories ;
- validation ;
- jobs/workflows ;
- plugins/configuration Payload.

### `packages/automotive-domain`

Contient les règles métier indépendantes de l’UI :
- dictionnaire de specs ;
- normalisation d’unités ;
- invariants automobile ;
- projection de comparaison ;
- détection de différences ;
- politiques de fraîcheur ;
- matching helpers partagés.

### `services/ingestion`

Service Python spécialisé, introduit uniquement pour les traitements où il est utile :
- CSV/Excel complexes ;
- normalisation de masse ;
- matching ;
- déduplication ;
- collecteurs autorisés ;
- extraction de documents ;
- batch quality analysis.

Ce service n’est jamais une deuxième base de vérité. Il écrit dans Payload/PostgreSQL via un contrat contrôlé.

## 5. Modèle de domaine

### Référentiel canonique

```text
Brand
  └── VehicleModel
       └── Generation
            └── Trim
                 ├── TrimSpecification
                 └── MediaAsset
```

Collections principales :
- `brands`
- `vehicle-models`
- `generations`
- `trims`
- `specification-definitions`
- `trim-specifications`
- `media`

Les spécifications utilisent un dictionnaire contrôlé et des unités normalisées.

### Réseau de distribution

```text
Dealer
  ├── DealerLocation
  ├── DealerBrand
  └── Offer
       ├── PriceHistory
       └── AvailabilitySnapshot
```

Collections principales :
- `dealers`
- `dealer-locations`
- `dealer-brands`
- `offers`
- `price-history`
- `availability-snapshots`
- `promotions`
- `warranty-terms`

Une `Offer` référence une `Trim` canonique. Le prix et la disponibilité n’appartiennent jamais directement à la `Trim`.

### Identité et organisations

Collection `users` avec rôles initiaux :
- `admin`
- `data_editor`
- `dealer_manager`
- `dealer_agent`

Les utilisateurs dealer sont rattachés à une organisation/dealer. Les règles Payload filtrent lecture et mutation au niveau document et champ.

Un compte buyer n’est pas obligatoire au MVP pour rechercher, comparer et soumettre un lead.

### Leads

Collections principales :
- `leads`
- `lead-status-events`

Intentions :
- quote request ;
- test drive ;
- contact request.

Chaque lead doit conserver :
- source page ;
- trim/offer concerné si disponible ;
- dealer/location ciblé ;
- statut ;
- consentement pertinent ;
- attribution d’acquisition.

### Provenance et ingestion

Collections principales :
- `data-sources`
- `import-runs`
- `raw-records` ou références de payload brut ;
- `match-decisions`
- `review-items`.

Les observations commerciales doivent conserver au minimum :
- `source` ;
- `observedAt` ;
- `reviewStatus` lorsque nécessaire.

## 6. Payload : frontières de responsabilité

Payload gère nativement ou par configuration :
- CRUD ;
- relations ;
- auth ;
- access control ;
- Admin Panel ;
- media ;
- REST / GraphQL / Local API ;
- migrations PostgreSQL ;
- hooks ;
- jobs applicatifs adaptés.

AgenAuto ajoute explicitement :
- invariants de domaine ;
- custom endpoints si les APIs générées ne suffisent pas ;
- projections de comparaison ;
- search queries métier ;
- règles de data quality ;
- provenance/fraîcheur ;
- workflows d’import.

Le CMS n’est donc pas une boîte noire : **Payload fournit la plateforme, AgenAuto conserve la logique métier.**

## 7. Recherche

MVP : PostgreSQL uniquement.

Approche :
- index structurés ;
- requêtes Payload/Drizzle ciblées ;
- filtres combinables ;
- full-text lorsque pertinent ;
- pagination ;
- tri ;
- cache uniquement si mesuré utile.

Meilisearch/OpenSearch n’est introduit que si la latence, le ranking ou le volume le justifient réellement.

## 8. Comparateur

Le comparateur travaille sur des `Trim`.

```text
selected trim ids
       |
       v
load canonical specs + relevant offers
       |
       v
normalize units / unknown values
       |
       v
comparison projection
       |
       v
highlight meaningful differences
```

Les valeurs inconnues sont explicitement marquées comme non disponibles et jamais transformées en valeurs inventées.

Le moteur est implémenté dans `packages/automotive-domain` ou un module équivalent, pas dans de simples templates CMS.

## 9. Jobs et asynchrone

Payload Jobs Queue est utilisée pour les tâches applicatives asynchrones simples et proches du domaine TypeScript :
- notifications ;
- synchronisations légères ;
- post-processing ;
- opérations planifiées ;
- tâches déclenchées par hooks.

Le service Python reste préférable pour les pipelines data lourds ou spécialisés.

Redis n’est **plus une dépendance obligatoire au bootstrap**. Il n’est ajouté que si un besoin de queue/cache externe apparaît et que Payload Jobs Queue ne suffit pas.

## 10. Stack technique

### Application
- Next.js
- React
- TypeScript strict
- Payload CMS
- Tailwind CSS

### Data
- PostgreSQL
- Payload Postgres adapter / Drizzle
- stockage objet compatible S3 si nécessaire pour les médias

### Specialized ingestion
- Python
- Pydantic
- Polars/Pandas selon besoin
- Playwright / parsers selon sources autorisées
- FastAPI uniquement si une API dédiée au service d’ingestion devient utile

### Quality
- ESLint
- TypeScript strict
- Vitest/Jest selon modules
- Playwright pour les parcours E2E critiques
- Ruff + pytest pour le service Python

### Delivery
- Docker / Docker Compose
- GitHub Actions
- migrations Payload versionnées
- environnements local / staging / production

### Observability
- Sentry ;
- logs structurés ;
- correlation IDs ;
- métriques d’import ;
- OpenTelemetry seulement lorsque les flux distribués le justifient.

## 11. Structure cible du repository

```text
AgenAuto/
├── apps/
│   └── web/
│       ├── app/
│       ├── payload.config.ts
│       └── src/
├── packages/
│   ├── automotive-domain/
│   ├── payload-config/
│   ├── ui/
│   └── config/
├── services/
│   └── ingestion/
├── infra/
│   ├── docker/
│   └── observability/
├── scripts/
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── HEADLESS_CORE.md
│   ├── APP_FACTORY.md
│   └── ROADMAP.md
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
└── README.md
```

Le repo peut rester encore plus simple au tout début. Nous ne créons pas des dossiers vides pour simuler une architecture mature.

## 12. Access control

Payload applique l’autorisation côté backend.

Règles initiales :
- public : lecture des données publiées nécessaires au catalogue ;
- dealer agent : opérations commerciales limitées à son dealer ;
- dealer manager : gestion étendue de son dealer et de ses utilisateurs autorisés ;
- data editor : maintenance du référentiel et review ;
- admin : gouvernance complète.

Les champs canoniques sensibles ne deviennent pas modifiables par un dealer simplement parce qu’il a accès à une `Offer`.

## 13. Sécurité

Minimum MVP :
- secrets hors Git ;
- validation stricte des uploads ;
- anti-abus sur les leads ;
- access control testé ;
- audit des mutations importantes ;
- dépendances scannées ;
- backup/restore PostgreSQL testé ;
- rétention des données personnelles documentée ;
- collectors conformes aux conditions d’utilisation applicables.

## 14. ADR

ADR acceptés :
- ADR-001 — Payload CMS as AgenAuto Headless Core ;
- ADR-002 — Canonical Vehicle / Dealer Offer separation.

ADR futurs probables :
- stratégie de recherche ;
- stratégie d’ingestion multi-source ;
- modèle dealer multi-tenant ;
- stratégie de stockage média ;
- éventuel découpage du service d’ingestion.

## 15. Critères de passage à l’échelle

Nous n’ajoutons pas une nouvelle infrastructure parce qu’elle est populaire.

Une séparation technique majeure n’est envisagée que si au moins un critère apparaît :
- charge radicalement différente ;
- besoin de déploiement indépendant ;
- isolation de panne ;
- contrainte de sécurité spécifique ;
- dépendances incompatibles ;
- ownership d’équipe séparé ;
- limite mesurée du Headless Core.

Cette règle protège AgenAuto contre la complexité prématurée tout en conservant des frontières propres.