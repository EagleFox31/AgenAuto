# AgenAuto

> **Comparer. Comprendre. Choisir.**

AgenAuto est une plateforme de découverte et de comparaison automobile pensée pour le marché camerounais. Notre ambition est de rendre l’achat d’un véhicule neuf plus lisible, plus comparable et plus transparent.

Notre objectif n’est pas de créer une énième marketplace d’annonces. AgenAuto veut devenir la **couche de référence entre les acheteurs et les distributeurs automobiles officiels** : un catalogue fiable, des caractéristiques normalisées, des offres localisées, un comparateur pertinent et des parcours de prise de contact réellement qualifiés.

## Vision

Comparer deux véhicules neufs au Cameroun demande encore souvent de naviguer entre plusieurs sites, brochures PDF, pages sociales, showrooms et échanges WhatsApp. Les niveaux de finition sont difficiles à aligner, les prix ne sont pas toujours publics et les caractéristiques techniques ne sont pas décrites de manière uniforme.

AgenAuto veut réunir ces informations dans une expérience unique :

- rechercher un véhicule par budget, usage, carrosserie, énergie, transmission ou marque ;
- comparer plusieurs modèles et finitions sur une base normalisée ;
- identifier les distributeurs officiels et leurs agences ;
- consulter les prix, promotions, garanties et disponibilités lorsqu’ils sont publiés ou vérifiés ;
- demander un devis, un essai ou un contact commercial ;
- à terme, comparer aussi le coût total de possession, le financement, l’assurance et les solutions de reprise.

**Cameroon first. Africa-ready.** Le produit démarre avec le marché camerounais tout en conservant un modèle capable de s’étendre progressivement à d’autres marchés africains.

## Ce qu’AgenAuto n’est pas

AgenAuto n’est pas un site généraliste d’annonces de véhicules d’occasion et ne cherche pas à remplacer les concessionnaires.

La plateforme se positionne comme une infrastructure de **discovery, comparison et lead generation** au service des acheteurs, distributeurs, marques et partenaires.

## Principe produit central

Le modèle sépare strictement :

1. le **véhicule canonique** — marque, modèle, génération, finition et caractéristiques techniques ;
2. l’**offre concessionnaire** — distributeur, agence, prix, disponibilité, promotion et garantie.

```text
Canonical Vehicle Catalog
  Brand -> Model -> Generation -> Trim -> Specifications
                         |
                         v
Dealer Market Layer
  Dealer -> Location -> Offer -> Price / Availability / Warranty
                         |
                         v
Discovery -> Compare -> Lead -> Dealer
```

Une même finition peut donc être référencée par plusieurs offres commerciales sans dupliquer ou altérer le référentiel technique.

## Architecture : Headless Core + Product Domain

AgenAuto utilise **Payload CMS comme Headless Core**.

Payload apporte les capacités génériques que nous n’avons aucun intérêt à recoder :

- Admin Panel ;
- collections et relations ;
- PostgreSQL et migrations ;
- authentification ;
- RBAC et access control ;
- REST / Local API ;
- médias ;
- hooks ;
- jobs applicatifs ;
- CRUD catalogue, dealers, offres et leads.

La différenciation AgenAuto reste dans nos modules métier :

- normalisation des caractéristiques automobiles ;
- moteur de comparaison ;
- recherche et discovery ;
- provenance et fraîcheur des données ;
- ingestion et matching ;
- qualité des données ;
- futures recommandations et calculs de coût total de possession.

Python reste utilisé comme **service spécialisé d’ingestion et de data processing** lorsque son écosystème apporte un avantage clair. FastAPI n’est plus le backend CRUD principal du produit.

```text
                   AgenAuto
                      |
        +-------------+-------------+
        |                           |
   Public Web                  Dealer UX
   Next.js                     Next.js
        |                           |
        +-------------+-------------+
                      |
               Payload Headless Core
          Admin / Auth / APIs / Jobs
                      |
                  PostgreSQL
                      |
              +-------+--------+
              |                |
      Payload Jobs       Python Ingestion
                         CSV / Excel / API
                         Collectors / Match
```

➡️ [Architecture détaillée](docs/ARCHITECTURE.md)  
➡️ [Headless Core](docs/HEADLESS_CORE.md)  
➡️ [ADR-001 — Payload comme Headless Core](docs/adr/ADR-001-payload-headless-core.md)

## Méthodologie AppFactory

AgenAuto est construit avec notre approche **AppFactory** : nous industrialisons les capacités non différenciantes afin de concentrer l’effort sur la valeur métier.

Nous distinguons désormais quatre couches :

- **Product Core** — catalogue automobile, comparaison, discovery, offres, leads et data quality ;
- **Headless Core Brick** — Payload, configuré comme socle data/admin/auth/API ;
- **Platform Bricks** — observabilité, notifications, storage, analytics, feature flags, anti-abus et intégrations ;
- **Delivery Factory** — Git, CI/CD, tests, quality gates, environnements, documentation et releases.

La règle AppFactory est simple : **Build what differentiates. Reuse what is infrastructure. Integrate what is commodity.**

➡️ [Méthodologie AppFactory](docs/APP_FACTORY.md)  
➡️ [Registre des briques](app-factory/registry/BRICKS.md)  
➡️ [Registre open source](app-factory/sources/OSS_REGISTRY.md)

## Structure du repository

```text
AgenAuto/
├── apps/
│   └── web/
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
│           ├── jobs/
│           └── lib/
├── services/
│   └── ingestion/
├── packages/
│   ├── automotive-domain/
│   ├── contracts/
│   ├── ui/
│   └── config/
├── app-factory/
│   ├── registry/
│   └── sources/
├── data/
│   └── pilot/
├── infra/
│   ├── docker/
│   └── observability/
├── tests/
│   └── e2e/
├── scripts/
└── docs/
```

Le **dealer portal n’est pas nécessairement une application séparée au MVP**. Les opérations simples peuvent utiliser un espace Payload configuré par rôle ; une UX dealer dédiée n’est construite que pour les parcours où l’Admin générique devient insuffisant.

➡️ [Arborescence détaillée et règles de placement](docs/REPOSITORY_STRUCTURE.md)

## Domaines fonctionnels

- Vehicle Catalog
- Vehicle Specifications
- Dealers & Locations
- Dealer Offers & Price History
- Search & Discovery
- Vehicle Comparison
- Leads & Test Drives
- Data Ingestion & Normalization
- Dealer Operations
- Administration & Data Quality
- Analytics & Observability

## Stratégie de données

```text
Partner API
CSV / Excel
Payload Admin
Dealer input
Permitted collector
       |
       v
Raw observation
       |
       v
Normalize + Match
       |
       v
Validation / Review
       |
       v
Payload Headless Core
       |
       v
Canonical Catalog + Dealer Offers
```

Nous privilégions à terme les **feeds et API partenaires**. Les collecteurs automatisés restent une solution complémentaire et ne doivent pas devenir l’unique source de vérité.

Chaque observation commerciale importante doit pouvoir porter au minimum sa **source** et sa **date d’observation**.

## Qualité et sérieux d’exécution

Chaque évolution significative suit les mêmes règles :

- une issue décrit le problème et ses critères d’acceptation ;
- une branche porte un changement cohérent ;
- une Pull Request documente la décision et les impacts ;
- CI avant intégration ;
- migrations versionnées ;
- tests adaptés au risque ;
- secrets hors du dépôt ;
- access control appliqué côté backend ;
- observabilité prévue sur les flux critiques ;
- décisions structurantes documentées en ADR ;
- dépendances open source intégrées uniquement après vérification de licence.

## Plan de livraison

La nouvelle séquence privilégie l’exploitation du Headless Core dès le départ :

**Payload Foundation → Automotive Schema → Data Quality → Market Data → Discovery → Comparison → Leads → Ingestion → Dealer Operations → Pilot Launch**.

➡️ [Roadmap et plan de travail](docs/ROADMAP.md)

## Backlog

Le backlog opérationnel vit dans les **GitHub Issues** et est regroupé sous l’Epic MVP.

🎯 **[Epic MVP — Foundation to pilot launch](https://github.com/EagleFox31/AgenAuto/issues/15)**

Priorités :

- **P0 — Foundation / Blocking**
- **P1 — MVP Core**
- **P2 — MVP Completion**
- **P3 — Post-MVP**

➡️ [Configuration recommandée du Project](docs/PROJECT_BOARD.md)

## Documentation

- [Concept produit AppFactory — Word](docs/Concept_AppFactory_AgenAuto.docx)
- [Architecture](docs/ARCHITECTURE.md)
- [Headless Core](docs/HEADLESS_CORE.md)
- [Méthodologie AppFactory](docs/APP_FACTORY.md)
- [Arborescence du repository](docs/REPOSITORY_STRUCTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Delivery Board](docs/PROJECT_BOARD.md)
- [Architecture Decision Records](docs/adr/README.md)

## Statut

**Phase actuelle : Headless Core Foundation / Domain Modeling.**

Nous verrouillons le schéma automobile, les règles d’accès et la stratégie de données avant d’investir dans les parcours publics de comparaison.

---

**AgenAuto** — construire une infrastructure de décision automobile fiable, locale et progressivement extensible.