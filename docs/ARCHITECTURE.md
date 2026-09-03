# Architecture AgenAuto

## 1. Principes

L’architecture d’AgenAuto suit cinq principes :

1. **Domain-first** — le modèle automobile et les règles métier priment sur les choix de framework.
2. **Canonical data first** — le référentiel véhicule est séparé des offres commerciales.
3. **Modular monolith before distributed systems** — on garde des frontières de domaine nettes sans introduire des microservices prématurés.
4. **Contract-driven interfaces** — les interfaces entre frontend, API et workers sont explicites et versionnées.
5. **Operational readiness by design** — logs, métriques, audit, migrations, sécurité et reprise ne sont pas ajoutés après coup.

## 2. Topologie cible

```text
Browser
  |
  +--> apps/web -------------------+
  |                                |
  +--> apps/dealer-portal ---------+----> services/api ----> PostgreSQL
  |                                |           |
  +--> apps/admin -----------------+           +-----------> Object Storage
                                               |
                                               +-----------> Redis
                                                            |
                                                            v
                                                services/ingestion-worker
```

### Applications

#### `apps/web`
Expérience publique : catalogue, recherche, pages marques/modèles, fiches véhicules, comparaison, concessionnaires, offres, génération de leads.

Responsabilités principales :
- SEO technique et contenu indexable ;
- navigation catalogue ;
- filtres et recherche ;
- comparateur ;
- formulaires de leads ;
- analytics produit.

#### `apps/dealer-portal`
Espace B2B des distributeurs et agences.

Responsabilités principales :
- gestion des offres ;
- prix et promotions ;
- disponibilité ;
- médias commerciaux ;
- gestion des leads ;
- indicateurs de conversion.

#### `apps/admin`
Back-office interne AgenAuto.

Responsabilités principales :
- validation du référentiel ;
- résolution de doublons ;
- correction des mappings ;
- supervision des imports ;
- contrôle qualité ;
- audit des modifications.

### Services

#### `services/api`
API métier principale en FastAPI.

Le service reste un **modular monolith** au MVP, structuré en modules de domaine indépendants :

```text
api/
  domains/
    catalog/
    specifications/
    dealers/
    offers/
    comparison/
    leads/
    ingestion/
    identity/
    audit/
  shared/
  infrastructure/
```

#### `services/ingestion-worker`
Traitements asynchrones et ingestion :
- imports CSV/Excel ;
- appels API partenaires ;
- collecte autorisée ;
- nettoyage ;
- normalisation ;
- matching ;
- calcul de score de confiance ;
- génération de snapshots de prix et disponibilité.

Redis sert de broker/queue uniquement quand les traitements sortent du cadre d’une requête HTTP courte.

## 3. Modèle de domaine

### Référentiel canonique

```text
Brand
  └── VehicleModel
       └── Generation
            └── Trim
                 ├── TrimSpecification
                 └── MediaAsset
```

Entités clés :
- `Brand`
- `VehicleModel`
- `Generation`
- `Trim`
- `SpecificationDefinition`
- `TrimSpecification`
- `MediaAsset`

Les spécifications sont normalisées via un dictionnaire contrôlé afin d’éviter des variantes telles que `1.5L`, `1498 cc`, `1 498 cm3` comme trois propriétés différentes.

### Réseau de distribution

```text
Dealer
  ├── DealerLocation
  ├── DealerBrand
  └── Offer
       ├── PriceHistory
       └── AvailabilitySnapshot
```

Entités clés :
- `Dealer`
- `DealerLocation`
- `DealerBrand`
- `Offer`
- `PriceHistory`
- `AvailabilitySnapshot`
- `Promotion`
- `WarrantyTerm`

Une `Offer` référence une `Trim` canonique. Le prix et la disponibilité n’appartiennent jamais directement au véhicule canonique.

### Acquisition et qualité de données

```text
IngestionSource
  └── ImportRun
       └── RawRecord
            └── MatchDecision
                 └── Canonical entity / Offer
```

Chaque donnée ingérée conserve :
- sa source ;
- la date d’observation ;
- son payload brut ou hash de référence ;
- le statut de normalisation ;
- le score de confiance ;
- les éventuelles corrections humaines.

### Leads

Entités principales :
- `Lead`
- `LeadIntent`
- `QuoteRequest`
- `TestDriveRequest`
- `LeadAssignment`
- `LeadStatusHistory`

Le MVP doit pouvoir identifier l’origine d’un lead, le véhicule concerné, l’agence ciblée et son statut de traitement.

## 4. Recherche et comparaison

### Recherche

Phase MVP :
- PostgreSQL ;
- indexes adaptés ;
- full-text search ;
- filtres structurés ;
- facettes calculées côté API.

Un moteur comme Meilisearch/OpenSearch n’est introduit que si la latence, le volume ou les besoins de ranking dépassent ce que PostgreSQL permet raisonnablement.

### Comparateur

Le comparateur travaille sur des `Trim` et non uniquement sur des `VehicleModel`.

Pipeline :

```text
selected trim ids
      |
      v
load canonical specifications
      |
      v
normalize units / missing values
      |
      v
comparison projection
      |
      v
highlight differences
```

Les valeurs inconnues sont explicitement marquées comme non disponibles ; elles ne sont jamais inventées ou assimilées à zéro.

## 5. Stack technique

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- Design system interne dans `packages/ui`

### Backend
- Python
- FastAPI
- SQLAlchemy 2.x
- Alembic
- Pydantic

### Data
- PostgreSQL 16
- Redis pour queues/cache ciblé
- S3-compatible object storage pour médias et imports

### Quality
- Ruff
- mypy ou Pyright pour les zones critiques
- pytest
- ESLint
- TypeScript strict
- Playwright pour les parcours E2E critiques

### Delivery
- Docker / Docker Compose
- GitHub Actions
- migrations versionnées
- environnements `local`, `staging`, `production`

### Observability
- Sentry pour erreurs applicatives
- OpenTelemetry lorsque les flux distribués le justifient
- logs structurés JSON côté backend
- corrélation `request_id` / `import_run_id` / `lead_id`

## 6. Structure cible du repository

```text
AgenAuto/
├── apps/
│   ├── web/
│   ├── dealer-portal/
│   └── admin/
├── services/
│   ├── api/
│   └── ingestion-worker/
├── packages/
│   ├── ui/
│   ├── contracts/
│   └── config/
├── infra/
│   ├── docker/
│   ├── migrations/
│   └── observability/
├── scripts/
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── APP_FACTORY.md
│   └── ROADMAP.md
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
└── README.md
```

## 7. API boundaries

Premières familles d’API :

```text
/api/v1/brands
/api/v1/models
/api/v1/generations
/api/v1/trims
/api/v1/search
/api/v1/compare
/api/v1/dealers
/api/v1/offers
/api/v1/leads
/api/v1/imports
```

L’API publique de consultation et l’API de gestion peuvent partager le même service au MVP, mais les permissions et scopes doivent être clairement séparés.

## 8. Authentification et autorisation

Rôles initiaux :
- `anonymous`
- `customer`
- `dealer_agent`
- `dealer_manager`
- `data_editor`
- `admin`

L’autorisation est appliquée au niveau du domaine et non uniquement dans l’interface.

## 9. Sécurité

Minimum attendu dès le MVP :
- secrets dans un secret store / variables d’environnement ;
- validation stricte des uploads ;
- rate limiting sur endpoints publics sensibles ;
- protection anti-abus sur les leads ;
- audit des opérations administratives ;
- CORS explicite ;
- dépendances scannées ;
- sauvegardes PostgreSQL testées ;
- politique de rétention des données personnelles.

## 10. Décisions d’architecture

Les décisions importantes sont documentées sous `docs/adr/`.

ADR initiaux à prévoir :
- ADR-001 — Modular monolith comme architecture de départ ;
- ADR-002 — séparation Canonical Vehicle / Dealer Offer ;
- ADR-003 — PostgreSQL comme moteur de recherche initial ;
- ADR-004 — stratégie d’ingestion multi-source ;
- ADR-005 — stratégie d’authentification et RBAC.

## 11. Critères de passage à l’échelle

On ne découpe pas un module en service séparé parce que « les microservices scalent ». Le découpage n’est envisagé que si au moins un de ces critères apparaît :
- profil de charge radicalement différent ;
- cycles de déploiement indépendants nécessaires ;
- isolation de panne requise ;
- ownership d’équipe différent ;
- dépendances techniques incompatibles ;
- contraintes de sécurité particulières.

Cette règle protège AgenAuto contre la complexité distribuée prématurée.