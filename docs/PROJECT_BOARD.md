# GitHub Project — AgenAuto Delivery

## Recommendation

AgenAuto doit utiliser un GitHub Project dès le début du développement actif. Les Issues restent la source de vérité du travail ; le Project sert à visualiser et prioriser leur exécution.

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
- Foundation
- Catalog
- Dealers & Offers
- Discovery
- Comparison
- Leads
- Ingestion
- Dealer Portal
- Pilot
- Post-MVP

### Area
- Product
- Frontend
- Backend
- Data
- Platform
- Security
- Observability
- DevEx

### Size
- XS
- S
- M
- L

Une issue `L` doit être examinée pour vérifier qu’elle n’est pas en réalité un epic.

## Vues recommandées

### 1. Delivery Board
Board groupé par `Status`.

Usage quotidien : voir le WIP et faire avancer les tickets.

### 2. MVP Roadmap
Table ou roadmap groupée par `Phase`, triée par `Priority`.

Usage : vision produit et dépendances.

### 3. Ready Queue
Filtre : `Status = Ready`, tri `Priority` puis `Size`.

Usage : choisir le prochain travail sans improviser.

### 4. Data & Ingestion
Filtre : `Area = Data`.

Usage : suivre séparément la qualité du référentiel, les imports et le dataset pilote.

### 5. Launch Gates
Vue dédiée aux issues nécessaires au pilote : observabilité, sécurité, E2E, dataset et leads.

## WIP

Pour une petite équipe, ne pas avoir plus de :
- 2 à 3 issues `In Progress` au total ;
- 1 grosse feature active par développeur ;
- 1 chantier plateforme actif en parallèle des features.

L’objectif est de terminer plutôt que commencer.

## Automations utiles

- nouvelle issue -> `Inbox` ;
- issue ajoutée au sprint courant -> `Ready` ;
- PR ouverte avec `Closes #X` -> issue visible en `In Review` ;
- issue fermée -> `Done` ;
- PR mergée -> fermer automatiquement les issues explicitement liées lorsque pertinent.

## Backlog initial

Epic principal : **#15 — AgenAuto MVP — Foundation to pilot launch**.

Séquence :

```text
#1  Monorepo / Local Dev
#2  Canonical Data Model
#3  CI Quality Gates
#4  Auth / RBAC / Audit
     |
     v
#5  Vehicle Catalog
#6  Dealers & Offers
     |
     +------------+
     v            v
#7 Search       #8 Compare
     \            /
      \          /
       v        v
          #9 Leads
             |
             v
#10 Ingestion -> #13 Pilot Dataset
#11 Dealer Portal
#12 Observability / Security
#14 Critical E2E
             |
             v
         Pilot Launch
```

## Règle de gouvernance

Le Project ne doit pas devenir une deuxième base de données du projet. Les exigences, critères d’acceptation et décisions restent dans les Issues, PR et ADR. Le board ne porte que les métadonnées nécessaires au pilotage.