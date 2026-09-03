# GitHub Project — AgenAuto Delivery

## Recommendation

AgenAuto doit utiliser un GitHub Project dès le début du développement actif. Les **Issues restent la source de vérité** ; le Project sert à visualiser, prioriser et limiter le WIP.

**Nom recommandé : `AgenAuto Delivery`**

## Champs

### Status
- Inbox
- Ready
- In Progress
- In Review
- Blocked
- Done

### Priority
- P0 — Blocking
- P1 — MVP Core
- P2 — MVP Completion
- P3 — Post-MVP

### Phase
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

### Area
- Product
- Headless Core
- Frontend
- Automotive Domain
- Data
- Dealer Ops
- Platform
- Security
- Observability
- DevEx

### Size
- XS
- S
- M
- L

Une issue `L` doit être examinée pour vérifier qu’elle n’est pas en réalité un epic ou plusieurs issues.

## Vues recommandées

### 1. Delivery Board
Board groupé par `Status`.

Usage quotidien : visualiser le WIP.

### 2. MVP Roadmap
Groupée par `Phase`, triée par `Priority`.

Usage : vérifier l’ordre logique du produit.

### 3. Ready Queue
Filtre `Status = Ready`, tri `Priority` puis `Size`.

Usage : choisir le prochain travail sans improviser.

### 4. Headless Core
Filtre `Area = Headless Core`.

Usage : suivre le bootstrap Payload, schéma, access policies et migrations.

### 5. Data & Quality
Filtre `Area = Data` ou `Automotive Domain`.

Usage : référentiel, normalisation, imports et dataset pilote.

### 6. Launch Gates
Filtre/label logique couvrant sécurité, observabilité, leads, dataset, access control et E2E.

## WIP

Pour une petite équipe :
- 2 à 3 issues `In Progress` maximum ;
- une grosse feature active par développeur ;
- ne pas lancer une UX dealer dédiée tant que Payload Admin couvre encore le besoin ;
- terminer les fondations avant d’ouvrir des features post-MVP.

## Automations utiles

- nouvelle issue -> `Inbox` ;
- issue sélectionnée -> `Ready` ;
- travail commencé -> `In Progress` ;
- PR ouverte -> `In Review` ;
- dépendance externe -> `Blocked` ;
- issue fermée -> `Done`.

## Backlog initial révisé

Epic : **#15 — AgenAuto MVP — Foundation to pilot launch**.

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

## Règle AppFactory appliquée au board

Le board ne doit pas encourager à recréer des capacités déjà fournies par la brique Headless Core.

Avant d’ajouter une issue générique du type :
- construire CRUD X ;
- créer admin Y ;
- implémenter auth Z ;

on vérifie si Payload couvre déjà la capacité et si la bonne tâche n’est pas plutôt :
- configurer la collection ;
- définir les access policies ;
- ajouter les invariants métier ;
- customiser uniquement le workflow qui apporte de la valeur.

## Gouvernance

Le Project ne devient jamais une deuxième base de données du projet. Les exigences restent dans les Issues, les décisions dans les ADR, et les changements dans les PR. Le board ne conserve que les métadonnées de pilotage.