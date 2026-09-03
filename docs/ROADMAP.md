# Roadmap & Plan de travail — AgenAuto

## Objectif MVP

Le MVP doit permettre à un utilisateur de :

1. découvrir des véhicules neufs disponibles sur le marché camerounais ;
2. filtrer les véhicules selon des critères utiles ;
3. consulter une fiche véhicule normalisée ;
4. comparer plusieurs finitions ;
5. identifier les distributeurs officiels associés ;
6. consulter une offre lorsqu’un prix ou une disponibilité est disponible ;
7. demander un devis ou un essai ;
8. transmettre au concessionnaire un lead structuré et traçable.

Le MVP n’a pas besoin de gérer le paiement du véhicule, l’assurance complète, le financement ou la reprise.

---

## Phase 0 — Headless Core Foundation

**But : disposer très vite d’un backend/admin exploitable sans recoder les primitives génériques.**

Livrables :
- Next.js + Payload initialisés ;
- PostgreSQL connecté ;
- environnement local documenté ;
- migrations Payload ;
- collection `users` avec rôles initiaux ;
- access control de base ;
- Admin Panel fonctionnel ;
- CI de base ;
- gestion des secrets ;
- ADR-001 / ADR-002 ;
- observabilité minimale.

Exit criteria :
- clone -> setup -> run documenté ;
- Payload Admin accessible en local ;
- PostgreSQL + migration reproductibles ;
- un utilisateur admin peut s’authentifier ;
- CI verte sur une PR minimale.

---

## Phase 1 — Automotive Schema & Canonical Catalog

**But : transformer le Headless Core en véritable plateforme automobile.**

Collections / domaines :
- Brand ;
- VehicleModel ;
- Generation ;
- Trim ;
- SpecificationDefinition ;
- TrimSpecification ;
- MediaAsset.

Livrables :
- collections Payload ;
- relations ;
- indexes ;
- validations ;
- dictionnaire de specs ;
- normalisation d’unités ;
- règles de publication ;
- données publiques exposées via Payload/API ;
- tests des invariants critiques.

Exit criteria :
- une marque contient plusieurs modèles ;
- un modèle contient générations et finitions ;
- les specs sont comparables entre finitions ;
- les valeurs inconnues restent inconnues ;
- les migrations sont versionnées.

---

## Phase 2 — Dealers, Offers & Market Observations

**But : relier le référentiel technique au marché réel.**

Collections / domaines :
- Dealer ;
- DealerLocation ;
- DealerBrand ;
- Offer ;
- PriceHistory ;
- AvailabilitySnapshot ;
- WarrantyTerm ;
- Promotion.

Livrables :
- relations dealer -> location -> offer ;
- offre -> trim canonique ;
- prix historisés ;
- disponibilité datée ;
- source et date d’observation ;
- access policies dealer/admin.

Exit criteria :
- une finition canonique peut avoir plusieurs offres ;
- les prix ne sont jamais stockés comme propriété canonique du véhicule ;
- les observations de marché sont datées et sourcées ;
- un dealer ne peut pas modifier le référentiel canonique hors périmètre autorisé.

---

## Phase 3 — Data Quality & Pilot Dataset

**But : valider tôt le modèle avec des données réelles au lieu de développer dans le vide.**

Livrables :
- 5 à 8 marques pilotes ;
- modèles/finitions réellement commercialisés ;
- 30 à 50 specs comparables ;
- source par donnée structurante ;
- review status ;
- détection de doublons ;
- corrections auditables.

Exit criteria :
- chaque finition publiée a une source identifiable ;
- le dataset alimente déjà fiches et comparaison ;
- aucune valeur fictive n’est utilisée pour masquer un manque de données.

---

## Phase 4 — Discovery & Search

**But : rendre le catalogue utile aux acheteurs.**

Filtres MVP :
- marque ;
- budget ;
- carrosserie ;
- énergie ;
- transmission ;
- nombre de places ;
- ville/disponibilité lorsque la donnée existe.

Livrables :
- requêtes PostgreSQL/Payload optimisées ;
- filtres combinables ;
- pagination ;
- tri ;
- URLs partageables ;
- pages marques/modèles SEO-friendly ;
- états données partielles.

Exit criteria :
- résultats reproductibles ;
- expérience mobile et desktop utilisable ;
- performance mesurée sur le dataset pilote.

---

## Phase 5 — Vehicle Comparison

**But : faire du comparateur la feature signature.**

Livrables :
- sélection de 2 à 4 finitions ;
- projection normalisée ;
- regroupement par catégorie ;
- conversion/normalisation d’unités ;
- mise en évidence des différences ;
- données inconnues explicites ;
- contexte des offres disponibles ;
- lien partageable.

Exit criteria :
- aucune comparaison sur unités incohérentes ;
- comparaison robuste aux données partielles ;
- différences lisibles sur desktop et mobile.

---

## Phase 6 — Leads & Test Drives

**But : transformer la découverte en valeur commerciale mesurable.**

Livrables :
- quote request ;
- test-drive request ;
- contact request ;
- consentement ;
- source d’acquisition ;
- dealer/location ciblé ;
- historique de statut ;
- anti-abus ;
- notification asynchrone via Payload Jobs si adaptée.

Exit criteria :
- chaque lead est traçable ;
- aucun échec critique n’est silencieux ;
- les données personnelles sont minimisées.

---

## Phase 7 — Ingestion Factory

**But : réduire le coût de maintien du catalogue et des offres.**

Canaux :
- Payload Admin ;
- CSV ;
- Excel ;
- API partenaire ;
- saisie dealer ;
- collecteur autorisé.

Pipeline :

```text
Source
  -> Raw observation
  -> Validate
  -> Normalize
  -> Match
  -> Confidence / Review
  -> Publish to Payload
```

Approche :
- Payload porte `data-sources`, `import-runs`, review et publication ;
- TypeScript/Payload suffit pour les imports simples ;
- Python est introduit pour les traitements data complexes.

Exit criteria :
- aucun import ambigu ne modifie silencieusement le canonique ;
- rejets et erreurs sont visibles ;
- les opérations sont traçables ;
- le service Python, s’il existe, n’est pas une deuxième source de vérité.

---

## Phase 8 — Dealer Operations

**But : permettre aux partenaires de maintenir les données commerciales avec le minimum de développement spécifique.**

Approche progressive :
1. Payload Admin avec access control dealer ;
2. composants/vues custom ;
3. interface dealer dédiée uniquement si les workflows le justifient.

Livrables MVP :
- authentification dealer ;
- scope organisationnel ;
- gestion offres/prix/disponibilité ;
- lecture et traitement des leads ;
- audit des changements.

Exit criteria :
- un dealer ne voit/modifie que son périmètre ;
- il ne peut pas altérer les specs canoniques ;
- les changements commerciaux sont traçables.

---

## Phase 9 — Pilot Launch

**But : lancer un pilote crédible avec un périmètre maîtrisé.**

Cible proposée :
- 3 à 5 distributeurs ;
- 5 à 8 marques solides ;
- Douala + Yaoundé en priorité ;
- dataset vérifié manuellement.

Launch gates :
- monitoring ;
- backups ;
- Sentry ;
- analytics ;
- privacy/consent ;
- access control testé ;
- E2E critiques ;
- runbook incident ;
- canal de correction des données.

Mesures :
- couverture des modèles/finitions ;
- couverture prix ;
- fraîcheur des offres ;
- taux de comparaison ;
- leads/session ;
- taux de leads qualifiés ;
- erreurs de données signalées.

---

# Post-MVP

## V1.1 — Decision Intelligence
- recommandations selon budget/usage ;
- scoring explicable ;
- shortlist ;
- alternatives ;
- alertes prix/disponibilité.

## V1.2 — Ownership Economics
- TCO ;
- consommation ;
- entretien ;
- assurance ;
- financement ;
- valeur de revente estimée.

## V1.3 — Certified Used
Occasion certifiée provenant de partenaires vérifiés, sans basculer dans une marketplace générale d’annonces.

## V2 — Regional Expansion
- multi-country ;
- multi-currency ;
- variantes réglementaires ;
- langues ;
- taxonomies marché ;
- partenaires régionaux.

---

# Priorités

## P0 — Foundation
- Payload / Next.js / Postgres ;
- schema foundation ;
- auth/access control ;
- CI ;
- migrations ;
- ADR.

## P1 — MVP Core
- canonical catalog ;
- dealers/offers ;
- data quality pilot ;
- discovery ;
- comparison.

## P2 — MVP Completion
- leads ;
- ingestion ;
- dealer operations ;
- observability/security ;
- E2E ;
- pilot launch.

## P3 — Post-MVP
- recommendations ;
- TCO ;
- financing/insurance integrations ;
- alerts ;
- regional expansion.

---

# Gouvernance du backlog

```text
EPIC
  -> Feature / Enabler
      -> implementation task si nécessaire
```

Une issue doit produire un résultat vérifiable. L’usage d’un Headless Core doit au contraire **réduire** le nombre de tickets génériques : nous ne créons pas des tickets séparés pour recoder CRUD, auth ou admin lorsqu’ils peuvent être configurés proprement dans Payload.

Rythme :
- limiter le WIP ;
- finir P0 avant de disperser l’effort ;
- travailler tôt avec un dataset réel ;
- mettre à jour les ADR lorsque l’architecture change ;
- clôturer les travaux devenus inutiles plutôt que les garder « pour plus tard ».