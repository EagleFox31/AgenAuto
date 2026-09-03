# Open Source Registry

Ce registre suit les projets externes évalués pour AgenAuto.

| Repository | License status | Potential use | Rule |
|---|---|---|---|
| `mbeps/car-dealership` | Apache-2.0 | UI/inventory/dealer workflow patterns | Code réutilisable sous respect de la licence ; ne pas reprendre son backend comme architecture AgenAuto |
| `kaje94/auto-marketplace` | MIT | Search/filter architecture and marketplace patterns | Adaptation possible ; éviter la complexité infra non justifiée au MVP |
| `peterwild/kia-negotiator` | à revérifier avant code reuse | Dealer inventory ingestion patterns | Inspiration forte pour collectors/normalization ; respecter ToS des sources |
| `luispucho/CarDeal` | no license observed during initial review | Multi-dealer and comparison domain inspiration | Référence uniquement tant qu'une licence compatible n'est pas confirmée |
| `theahmedhany/carzo` | license to verify | Mobile/product UX inspiration | Référence uniquement avant vérification de licence |

## Avant toute reprise de code

- confirmer la licence dans la version/commit utilisé ;
- conserver attribution/NOTICE lorsque requis ;
- vérifier dépendances et activité ;
- isoler l'adaptation dans la brique concernée ;
- documenter pourquoi elle est préférable à une implémentation interne ;
- ne jamais transformer un repo tiers en source de vérité architecturale d'AgenAuto.
