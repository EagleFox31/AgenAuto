# GitHub Project — AgenAuto Delivery

## Principe

AgenAuto utilise un GitHub Project v2 pour piloter le delivery. Les **Issues restent la source de vérité** ; le Project sert à visualiser le flux, prioriser, limiter le WIP et suivre les phases.

**Project : `AgenAuto Delivery`**

Le Project est désormais géré par la brique AppFactory réutilisable :

```text
EagleFox31/appfactory-project-automation@v1
```

Configuration produit : `.github/project-config.json`  
Workflow consommateur : `.github/workflows/project-automation.yml`

## Bootstrap automatique

Lors du premier lancement manuel du workflow avec `issue_number` vide, l'Action :

1. crée `AgenAuto Delivery` s'il n'existe pas ;
2. le lie au repository AgenAuto ;
3. crée ou réconcilie les champs AppFactory ;
4. crée la vue `AppFactory Board` ;
5. importe les Issues ouvertes ;
6. les place dans le backlog ;
7. applique les métadonnées définies dans `project-config.json`.

Le bootstrap est convergent et non destructif : une relance réutilise les éléments existants et ajoute les options manquantes au lieu de recréer le Project.

## Champs AppFactory

### Status

```text
Backlog → Ready → In Progress → Review → Validation → Done
```

### Priority

- P0
- P1
- P2
- P3

### Work type

- Product
- Feature
- Engineering
- UX
- Security
- Quality
- Documentation
- Bug

### Phase AgenAuto

- Headless Core
- Automotive Schema
- Dealers & Offers
- Data Quality
- Discovery
- Comparison
- Leads
- Ingestion
- Dealer Operations
- Pilot
- Post-MVP

### Size

- XS
- S
- M
- L
- XL

Une issue `L` ou `XL` doit être examinée pour vérifier qu'elle n'est pas en réalité un epic ou plusieurs issues.

## Automations lifecycle

- nouvelle Issue → `Backlog` ;
- Issue réouverte → `Backlog` ;
- draft PR liée → `In Progress` ;
- PR prête pour review → `Review` ;
- PR mergée → `Done` ;
- Issue fermée → `Done` ;
- édition d'Issue → resynchronisation des métadonnées ;
- `workflow_dispatch` + numéro d'Issue → resynchronisation ciblée ;
- `workflow_dispatch` sans numéro → bootstrap/réconciliation complète.

## Métadonnées initiales

Les Issues #1 à #15 disposent d'overrides dans `.github/project-config.json` afin que le premier import remplisse immédiatement :

- Priority ;
- Work type ;
- Phase ;
- Size.

Les nouvelles Issues pourront utiliser les conventions de titre AppFactory ou les métadonnées embarquées dans leur body lorsque nécessaire.

## Vue de base

L'Action crée automatiquement :

### AppFactory Board

Board groupé par `Status`, utilisé pour le flux quotidien.

Des vues supplémentaires pourront être ajoutées manuellement sans modifier le moteur d'automatisation, par exemple :

- MVP Roadmap — groupée par `Phase` ;
- Ready Queue — `Status = Ready` ;
- Launch Gates — sécurité, observabilité, E2E et dataset pilote.

## WIP

Pour une petite équipe :

- 2 à 3 issues `In Progress` maximum ;
- une grosse feature active par développeur ;
- ne pas lancer une UX dealer dédiée tant que Payload Admin couvre encore le besoin ;
- terminer les fondations avant d'ouvrir des features post-MVP.

## Backlog initial

Epic : **#15 — AgenAuto MVP — Payload Headless Core to Cameroon pilot**.

Séquence cible :

```text
#1  Payload / Next.js / Postgres Bootstrap
#2  Automotive Canonical Schema
#3  CI + Payload Migration Gates
#4  Auth / Access Control / Audit
       |
       v
#5  Canonical Catalog + Data Quality Admin
#6  Dealers / Offers / Market Observations
       |
       v
#13 Pilot Dataset
       |
       +-------------+
       v             v
#7 Discovery      #8 Compare
       \             /
        \           /
         v         v
            #9 Leads
               |
       +-------+-------+
       v               v
#10 Ingestion      #11 Dealer Operations
       \               /
        \             /
         v           v
#12 Observability / Security
#14 Critical E2E
               |
               v
           Pilot Launch
```

## Secret requis

Le workflow attend un repository Actions secret nommé :

```text
PROJECT_TOKEN
```

Ce token doit avoir accès à GitHub Projects v2 pour le compte `EagleFox31`. Il n'est jamais stocké dans le repository et n'est pas imprimé par l'Action.

## Règle AppFactory appliquée au board

Le board ne doit pas encourager à recréer des capacités déjà fournies par la brique Headless Core.

Avant d'ajouter une issue générique du type :

- construire CRUD X ;
- créer admin Y ;
- implémenter auth Z ;

on vérifie si Payload couvre déjà la capacité et si la bonne tâche n'est pas plutôt :

- configurer la collection ;
- définir les access policies ;
- ajouter les invariants métier ;
- customiser uniquement le workflow qui apporte de la valeur.

## Gouvernance

Le Project ne devient jamais une deuxième base de données du projet. Les exigences restent dans les Issues, les décisions dans les ADR, et les changements dans les PR. Le board ne conserve que les métadonnées de pilotage.
