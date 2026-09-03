# AgenAuto

> **Comparer. Comprendre. Choisir.**

AgenAuto est une plateforme de découverte et de comparaison automobile pensée pour le marché camerounais, avec une ambition simple : rendre l’achat d’un véhicule neuf plus lisible, plus comparable et plus transparent.

Notre objectif n’est pas de créer une énième marketplace d’annonces. AgenAuto veut devenir la **couche de référence entre les acheteurs et les distributeurs automobiles officiels** : un catalogue fiable, des caractéristiques normalisées, des offres localisées, un comparateur pertinent et des parcours de prise de contact réellement qualifiés.

## Vision

Aujourd’hui, comparer deux véhicules neufs au Cameroun demande souvent de naviguer entre plusieurs sites, brochures PDF, pages sociales, showrooms et échanges WhatsApp. Les prix ne sont pas toujours publics, les niveaux de finition sont difficiles à comparer et les informations techniques ne sont pas structurées de la même manière d’un distributeur à l’autre.

AgenAuto veut résoudre ce problème avec une expérience unique :

- rechercher un véhicule par budget, usage, carrosserie, motorisation ou marque ;
- comparer plusieurs modèles et finitions sur une base de données normalisée ;
- identifier le ou les distributeurs officiels qui commercialisent le véhicule ;
- consulter les prix disponibles, promotions, garanties et disponibilités déclarées ;
- demander un devis, un essai ou un contact commercial ;
- à terme, comparer aussi le coût total de possession, le financement, l’assurance et les offres de reprise.

**Cameroon first. Africa-ready.** L’architecture est conçue pour démarrer localement sans empêcher une extension progressive à d’autres marchés africains.

## Ce qu’AgenAuto n’est pas

AgenAuto n’est pas un site généraliste d’annonces de véhicules d’occasion et ne cherche pas à remplacer les concessionnaires.

La plateforme se positionne comme une infrastructure de **discovery, comparison et lead generation** au service de l’écosystème automobile : acheteurs, distributeurs, marques et partenaires.

## Le principe produit central

Le modèle métier sépare strictement :

1. le **véhicule canonique** — marque, modèle, génération, finition et caractéristiques techniques ;
2. l’**offre concessionnaire** — distributeur, agence, prix, stock, promotion, garantie et disponibilité.

Cette séparation permet à plusieurs distributeurs de proposer le même véhicule sans dupliquer ou dégrader le référentiel technique.

```text
Vehicle Catalog
  Brand -> Model -> Generation -> Trim -> Specifications
                         |
                         v
Dealer Offers
  Dealer -> Location -> Offer -> Price / Stock / Warranty / Promotion
                         |
                         v
Discovery -> Compare -> Lead -> Dealer
```

## Méthodologie AppFactory

AgenAuto est construit avec notre approche **AppFactory** : les fonctionnalités métier restent propres au produit, tandis que les capacités transverses sont conçues comme des briques standardisées, testables et réutilisables.

Nous distinguons trois niveaux :

- **Product Core** : catalogue, comparaison, offres, concessionnaires, leads et ingestion automobile ;
- **Platform Bricks** : authentification, permissions, observabilité, audit, stockage, notifications, analytics, feature flags et sécurité ;
- **Delivery Factory** : conventions Git, CI/CD, quality gates, environnements, migrations, tests, documentation et automatisation des releases.

L’AppFactory n’est pas un prétexte pour sur-architecturer. Une brique n’est introduite que lorsqu’elle réduit réellement le coût de développement, le risque opérationnel ou la dette future.

➡️ [Méthodologie AppFactory](docs/APP_FACTORY.md)

## Architecture cible

```text
apps/
  web/                 # expérience publique, SEO, recherche, comparaison
  dealer-portal/       # espace distributeurs / agences
  admin/               # qualité du catalogue, modération, imports

services/
  api/                 # FastAPI — domaine et API métier
  ingestion-worker/    # imports, normalisation, collecteurs, tâches asynchrones

packages/
  ui/                  # design system partagé
  contracts/           # schémas OpenAPI / types générés
  config/              # configuration partagée

infra/
  docker/
  migrations/
  observability/

docs/
  adr/
```

Socle envisagé : **Next.js + TypeScript**, **FastAPI + Python**, **PostgreSQL**, **Redis** pour les traitements asynchrones nécessaires, stockage objet compatible S3, Docker et GitHub Actions.

La recherche commence volontairement avec PostgreSQL ; un moteur dédié ne sera ajouté que si les volumes et les usages le justifient.

➡️ [Architecture détaillée](docs/ARCHITECTURE.md)

## Domaines fonctionnels

- Vehicle Catalog
- Vehicle Specifications
- Dealers & Locations
- Dealer Offers & Price History
- Search & Discovery
- Vehicle Comparison
- Leads & Test Drives
- Data Ingestion & Normalization
- Dealer Portal
- Administration & Data Quality
- Analytics & Observability

## Stratégie de données

AgenAuto doit pouvoir recevoir des données par plusieurs canaux :

```text
API partenaire
CSV / Excel
Saisie portail
Import administrateur
Collecteur autorisé
        |
        v
Raw Ingestion
        |
        v
Normalization + Matching
        |
        v
Validation / Data Quality
        |
        v
Canonical Catalog + Dealer Offers
```

L’objectif à long terme est de privilégier les **feeds et API partenaires**. Les collecteurs automatisés ne doivent jamais devenir la seule source de vérité du produit.

## Qualité et sérieux d’exécution

Chaque évolution significative doit respecter les mêmes règles :

- une issue décrit le problème et les critères d’acceptation ;
- une branche porte un changement cohérent ;
- une Pull Request documente la décision et les impacts ;
- CI obligatoire avant intégration ;
- migrations versionnées ;
- tests adaptés au niveau de risque ;
- secrets hors du dépôt ;
- observabilité prévue dès les premiers flux critiques ;
- décisions structurantes documentées sous forme d’ADR ;
- aucune dépendance open source intégrée sans vérification de licence.

Le dépôt fournit un formulaire d’Issue structuré et un template de Pull Request afin que ces règles soient appliquées dans le workflow quotidien.

## Plan de livraison

Le développement est découpé en incréments exploitables :

**Foundation → Catalog → Dealers & Offers → Discovery & Comparison → Leads → Ingestion → Dealer Portal → Pilot Launch**.

Le MVP doit permettre à un utilisateur de découvrir des véhicules neufs, comparer des finitions, identifier les distributeurs correspondants et générer un lead exploitable.

➡️ [Plan de travail et roadmap](docs/ROADMAP.md)

## Backlog

Le backlog opérationnel est suivi dans les **GitHub Issues**. Les epics structurent les grands chantiers et les issues d’implémentation sont liées aux critères d’acceptation du MVP.

🎯 **[Epic MVP — Foundation to pilot launch](https://github.com/EagleFox31/AgenAuto/issues/15)**

Le repo privilégie un backlog lisible et exécutable plutôt qu’une accumulation de tickets. Les priorités sont organisées autour de :

- **P0 — Foundation / Blocking**
- **P1 — MVP Core**
- **P2 — MVP Completion**
- **P3 — Post-MVP**

Un GitHub Project `AgenAuto Delivery` est recommandé pour visualiser ce backlog en gardant les Issues comme source de vérité.

➡️ [Configuration recommandée du Project](docs/PROJECT_BOARD.md)

## Documentation

- [Concept produit AppFactory — Word](docs/Concept_AppFactory_AgenAuto.docx)
- [Architecture](docs/ARCHITECTURE.md)
- [Méthodologie AppFactory](docs/APP_FACTORY.md)
- [Roadmap et plan de travail](docs/ROADMAP.md)
- [GitHub Project / Delivery Board](docs/PROJECT_BOARD.md)

## Statut

**Phase actuelle : Product Foundation / Architecture.**

Le produit est en phase de structuration du socle, du modèle de données et du backlog avant implémentation fonctionnelle.

---

**AgenAuto** — construire une infrastructure de décision automobile fiable, locale et progressivement extensible.