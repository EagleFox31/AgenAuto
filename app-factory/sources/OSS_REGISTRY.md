# Open Source Registry

Ce registre suit les projets externes évalués pour AgenAuto.

| Repository | License status | Potential use | Rule |
|---|---|---|---|
| `mbeps/car-dealership` | Apache-2.0 | UI/inventory/dealer workflow patterns | Code réutilisable sous respect de la licence ; ne pas reprendre son backend comme architecture AgenAuto |
| `kaje94/auto-marketplace` | MIT | Search/filter architecture and marketplace patterns | Adaptation possible ; éviter la complexité infra non justifiée au MVP |
| `apify/crawlee-python` | Apache-2.0 verified | HTTP/BeautifulSoup/Playwright collector orchestration | Integrated as the ingestion crawler engine; source-specific rules and normalization remain AgenAuto code |
| `peterwild/kia-negotiator` | MIT verified | Dealer inventory ingestion and trim-normalization patterns | Architecture/pattern reference; do not assume US dealer semantics or source permissions apply in Cameroon |
| `luispucho/CarDeal` | no license observed during initial review | Multi-dealer and comparison domain inspiration | Référence uniquement tant qu'une licence compatible n'est pas confirmée |
| `theahmedhany/carzo` | license to verify | Mobile/product UX inspiration | Référence uniquement avant vérification de licence |

## Avant toute reprise de code

- confirmer la licence dans la version/commit utilisé ;
- conserver attribution/NOTICE lorsque requis ;
- vérifier dépendances et activité ;
- isoler l'adaptation dans la brique concernée ;
- documenter pourquoi elle est préférable à une implémentation interne ;
- ne jamais transformer un repo tiers en source de vérité architecturale d'AgenAuto.
