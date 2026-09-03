# Repository Structure — AgenAuto

Cette arborescence traduit l'architecture Payload Headless Core et la méthodologie AppFactory dans le repository.

```text
AgenAuto/
├── apps/
│   └── web/
│       ├── README.md
│       └── src/
│           ├── app/
│           │   ├── (frontend)/
│           │   └── (payload)/
│           ├── access/
│           ├── collections/
│           │   ├── automotive/
│           │   ├── market/
│           │   └── platform/
│           ├── features/
│           │   ├── discovery/
│           │   ├── comparison/
│           │   └── leads/
│           ├── hooks/
│           ├── jobs/
│           └── lib/
│
├── services/
│   └── ingestion/
│
├── packages/
│   ├── automotive-domain/
│   ├── contracts/
│   ├── ui/
│   └── config/
│
├── app-factory/
│   ├── registry/
│   │   └── BRICKS.md
│   └── sources/
│       └── OSS_REGISTRY.md
│
├── data/
│   └── pilot/
│
├── infra/
│   ├── docker/
│   └── observability/
│
├── tests/
│   └── e2e/
│
├── scripts/
├── docs/
│   ├── adr/
│   ├── ARCHITECTURE.md
│   ├── APP_FACTORY.md
│   ├── HEADLESS_CORE.md
│   ├── PROJECT_BOARD.md
│   ├── REPOSITORY_STRUCTURE.md
│   └── ROADMAP.md
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
└── README.md
```

## `apps/web`

Application déployable principale. Next.js et Payload vivent ensemble afin de profiter de la Local API côté serveur et d'éviter une couche HTTP interne inutile.

### `src/app/(frontend)`
Expérience publique AgenAuto : catalogue, pages SEO, search, comparaison et conversion.

### `src/app/(payload)`
Intégration Payload : Admin Panel et routes techniques générées par le Headless Core.

### `src/collections`
Modèle persistant Payload, organisé par domaine.

- `automotive` — données canoniques véhicule ;
- `market` — concessionnaires et observations commerciales ;
- `platform` — capacités transverses et workflow data.

### `src/features`
Logique produit qui ne doit pas être diluée dans le CMS.

- `discovery` ;
- `comparison` ;
- `leads`.

### `src/access`
Politiques RBAC et scopes dealer.

### `src/hooks`
Hooks Payload limités aux préoccupations de cycle de vie des collections. La logique métier complexe reste dans `features` ou `packages/automotive-domain`.

### `src/jobs`
Jobs applicatifs légers gérés côté Payload.

## `services/ingestion`

Service optionnel spécialisé. Il n'est créé/utilisé que lorsque le traitement dépasse raisonnablement Payload/TypeScript : parsing complexe, collecteurs, normalisation/matching lourd, etc.

Il ne possède jamais une base métier indépendante.

## `packages`

Briques réutilisables et découplées :

- `automotive-domain` — fonctions pures et invariants automobiles ;
- `contracts` — contrats aux frontières du système ;
- `ui` — design system et composants ;
- `config` — conventions de configuration.

## `app-factory`

Registre des briques et des références externes.

- `registry/BRICKS.md` répond à la question Build / Reuse / Adapt / Integrate ;
- `sources/OSS_REGISTRY.md` suit les repos GitHub évalués, leur licence et leur usage autorisé.

Le code réellement utilisé reste dans `apps`, `packages` ou `services`.

## `data/pilot`

Fixtures, mappings et échantillons autorisés pour le dataset pilote. Les données métier actives restent dans Payload/PostgreSQL.

## `infra`

Infrastructure volontairement minimale et justifiée par les besoins : Docker local, observabilité, puis extensions seulement lorsqu'elles apportent une valeur mesurable.

## `tests/e2e`

Parcours Playwright critiques de l'acheteur, de l'admin et du concessionnaire.

## Règle de placement

Avant de créer un nouveau dossier, se demander :

1. Est-ce une collection persistante générique ? → `apps/web/src/collections`.
2. Est-ce une règle métier différenciante ? → `features` ou `packages/automotive-domain`.
3. Est-ce une brique réutilisable ? → `packages` + registre AppFactory.
4. Est-ce du traitement data spécialisé ? → `services/ingestion`.
5. Est-ce de l'infrastructure ou de l'automatisation ? → `infra` / `scripts`.

Cette règle évite que Payload devienne un monolithe de hooks difficile à maintenir et évite également de recréer des microservices sans raison.
