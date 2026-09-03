# Roadmap & Plan de travail — AgenAuto

## Objectif MVP

Le MVP doit permettre à un utilisateur de :

1. découvrir des véhicules neufs disponibles sur le marché camerounais ;
2. filtrer les véhicules selon des critères utiles ;
3. consulter une fiche véhicule normalisée ;
4. comparer plusieurs finitions ;
5. identifier les distributeurs officiels associés ;
6. consulter une offre quand un prix ou une disponibilité est disponible ;
7. demander un devis ou un essai ;
8. transmettre au concessionnaire un lead structuré et traçable.

Le MVP n’a pas besoin de gérer le paiement d’un véhicule, l’assurance, le financement complet ou la reprise.

---

## Phase 0 — Product Foundation

**But : disposer d’un socle de développement stable avant les features.**

Livrables :
- structure monorepo ;
- environnement local Docker ;
- API FastAPI initiale ;
- applications frontend initiales ;
- PostgreSQL + migrations ;
- conventions de configuration ;
- CI de base ;
- gestion des secrets ;
- premiers ADR ;
- health checks ;
- observabilité minimale.

Exit criteria :
- clone -> setup -> run documenté ;
- frontend et API communiquent en local ;
- migration DB automatisée ;
- CI verte sur une PR minimale.

---

## Phase 1 — Canonical Vehicle Catalog

**But : créer la source de vérité automobile.**

Livrables :
- Brand ;
- VehicleModel ;
- Generation ;
- Trim ;
- SpecificationDefinition ;
- TrimSpecification ;
- MediaAsset ;
- API CRUD admin ;
- endpoints publics de consultation ;
- validations d’unités et formats.

Exit criteria :
- une marque peut contenir plusieurs modèles ;
- un modèle peut contenir générations et finitions ;
- les specs sont comparables entre finitions ;
- les valeurs inconnues restent explicitement inconnues.

---

## Phase 2 — Dealers & Offers

**But : relier le référentiel technique au marché réel.**

Livrables :
- Dealer ;
- DealerLocation ;
- DealerBrand ;
- Offer ;
- PriceHistory ;
- AvailabilitySnapshot ;
- WarrantyTerm ;
- promotions ;
- endpoints concessionnaires/offres.

Exit criteria :
- une finition canonique peut avoir plusieurs offres ;
- les prix sont historisés ;
- les offres indiquent leur source et date d’observation ;
- les agences sont localisables.

---

## Phase 3 — Discovery & Search

**But : rendre le catalogue réellement utilisable par un acheteur.**

Filtres MVP :
- marque ;
- budget ;
- carrosserie ;
- énergie ;
- transmission ;
- nombre de places ;
- ville/disponibilité lorsque la donnée existe.

Livrables :
- recherche PostgreSQL ;
- filtres combinables ;
- pagination ;
- tri ;
- URLs partageables ;
- pages marques et modèles SEO-friendly.

Exit criteria :
- résultats reproductibles ;
- filtres compatibles mobile ;
- temps de réponse acceptable sur le dataset pilote.

---

## Phase 4 — Vehicle Comparison

**But : faire du comparateur la feature signature du produit.**

Livrables :
- sélection de 2 à 4 finitions ;
- tableau de comparaison normalisé ;
- regroupement des specs par catégorie ;
- mise en évidence des différences ;
- affichage des données manquantes ;
- comparaison des offres disponibles ;
- lien partageable.

Exit criteria :
- aucune comparaison basée sur des unités incohérentes ;
- différences lisibles sur desktop et mobile ;
- comparaison robuste aux données partielles.

---

## Phase 5 — Leads & Test Drives

**But : transformer la découverte en valeur commerciale mesurable.**

Livrables :
- demande de devis ;
- demande d’essai ;
- consentement utilisateur ;
- qualification du besoin ;
- affectation concessionnaire/agence ;
- statut du lead ;
- historique ;
- anti-spam/rate limiting ;
- notification interne.

Exit criteria :
- chaque lead est traçable de la page source au concessionnaire ;
- données personnelles minimisées ;
- aucun lead critique perdu silencieusement.

---

## Phase 6 — Data Ingestion Factory

**But : réduire le coût de maintien du catalogue et des offres.**

Canaux :
- CSV ;
- Excel ;
- API ;
- saisie portail ;
- collecteur autorisé.

Pipeline :

```text
Source
  -> RawRecord
  -> Validation
  -> Normalize
  -> Match
  -> Confidence
  -> Human Review if needed
  -> Publish
```

Livrables :
- ImportRun ;
- mapping de colonnes ;
- validation ;
- journal d’erreurs ;
- score de confiance ;
- preview avant publication ;
- rollback/rejet ;
- métriques d’import.

Exit criteria :
- aucun import ne modifie silencieusement une entité canonique ambiguë ;
- échecs et rejets sont visibles ;
- imports rejouables de manière contrôlée.

---

## Phase 7 — Dealer Portal

**But : permettre aux partenaires de maintenir leurs offres sans dépendre de l’équipe AgenAuto.**

Livrables :
- authentification B2B ;
- RBAC ;
- gestion agences ;
- gestion offres ;
- prix ;
- disponibilité ;
- promotions ;
- leads ;
- analytics simples ;
- historique des changements.

Exit criteria :
- un dealer ne peut modifier que son périmètre ;
- les changements sensibles sont audités ;
- les données peuvent nécessiter validation AgenAuto selon le type de champ.

---

## Phase 8 — Pilot Launch

**But : lancer un pilote crédible avec un périmètre contrôlé.**

Cible proposée :
- 3 à 5 distributeurs ;
- principales marques et modèles neufs ;
- Douala + Yaoundé en priorité ;
- dataset vérifié manuellement avant ouverture.

Pré-requis :
- monitoring ;
- backups ;
- Sentry ;
- analytics ;
- politique de confidentialité ;
- gestion des consentements ;
- runbook incident ;
- canal de correction de données.

Mesures pilotes :
- nombre de véhicules/finitions fiables ;
- couverture des prix ;
- taux de comparaison ;
- leads par session ;
- taux de leads qualifiés ;
- fraîcheur des offres ;
- erreurs de données signalées.

---

# Post-MVP

## V1.1 — Decision Intelligence
- recommandations selon budget et usage ;
- scoring explicable ;
- shortlist ;
- alternatives proches ;
- alertes prix/disponibilité.

## V1.2 — Ownership Economics
- coût total de possession ;
- consommation estimée ;
- entretien ;
- assurance ;
- financement ;
- valeur de revente estimée.

## V1.3 — Certified Used
Uniquement si le positionnement reste contrôlé : véhicules d’occasion certifiés provenant de partenaires vérifiés, sans basculer dans une marketplace générale d’annonces.

## V2 — Regional Expansion
- multi-country ;
- multi-currency ;
- variantes réglementaires ;
- langues ;
- taxonomies marché ;
- partenaires régionaux.

---

# Ordre de priorité

## P0 — Blocking Foundation
- repo / CI / environments ;
- data model ;
- migrations ;
- architecture ;
- sécurité minimale.

## P1 — MVP Core
- catalog ;
- dealers ;
- offers ;
- search ;
- compare.

## P2 — MVP Completion
- leads ;
- ingestion ;
- admin ;
- dealer portal ;
- observability approfondie.

## P3 — Post-MVP
- recommendations ;
- TCO ;
- finance/insurance ;
- alerts ;
- expansion.

---

# Pilot dataset strategy

Pour éviter de développer dans le vide, le produit doit disposer tôt d’un petit dataset réel et vérifié.

Ordre recommandé :
1. définir 5 à 8 marques pilotes ;
2. sélectionner les modèles réellement commercialisés ;
3. capturer les finitions ;
4. normaliser ~30 à 50 champs réellement comparables ;
5. attacher les distributeurs et agences ;
6. ajouter les prix uniquement lorsque la source est suffisamment fiable ;
7. dater chaque observation.

Le but du dataset pilote est de tester le modèle de données, pas de prétendre couvrir immédiatement tout le marché.

---

# Gouvernance du backlog

Le backlog GitHub suit trois niveaux :

```text
EPIC
  -> Feature / Enabler
      -> implementation task si nécessaire
```

Une issue doit rester suffisamment petite pour produire un résultat vérifiable. Les epics servent à regrouper le contexte et les dépendances, pas à masquer un chantier de plusieurs semaines dans un ticket unique.

Rythme conseillé :
- sélectionner un petit nombre d’issues actives ;
- limiter le WIP ;
- terminer les fondations avant d’ouvrir trop de features ;
- mettre à jour les ADR quand une décision d’architecture change ;
- clôturer explicitement les tickets abandonnés avec la raison `not planned`.
