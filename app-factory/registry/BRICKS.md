# AppFactory Brick Registry

| Brick | Decision | Role in AgenAuto | Source / implementation |
|---|---|---|---|
| Headless Core | Integrate | Admin, auth, RBAC, CRUD, media, jobs, migrations | Payload CMS |
| Canonical Automotive Domain | Build | Vehicle identity, specs, units, validation | `packages/automotive-domain` |
| Vehicle Comparison | Build | Normalized 2–4 trim comparison | `apps/web/src/features/comparison` + domain package |
| Discovery/Search | Build on platform | Filters, ranking, SEO projections | Payload/PostgreSQL first |
| Dealer Market Model | Build on platform | Dealers, offers, price history, availability | Payload collections |
| Lead Workflow | Build on platform | Quote/test-drive/contact intent | Payload + AgenAuto feature logic |
| Data Ingestion | Build / Adapt | Public-source collectors, CSV/Excel/PDF parsing, matching and confidence | `services/ingestion` on Crawlee Python + Payload review/promotion boundary |
| Shared UI | Build / Adapt | Product-grade reusable components | `packages/ui` + licensed OSS where useful |
| Observability | Integrate | Error monitoring and diagnostics | Sentry first |
| Project Automation | Reuse | Bootstrap Projects v2, backlog metadata and Issue/PR lifecycle synchronization | `EagleFox31/appfactory-project-automation@v1` |
| Delivery Factory | Build / Reuse | CI, quality gates, release conventions | GitHub Actions + repo conventions |

## Rule

Chaque nouvelle brique doit préciser :
1. le problème qu'elle résout ;
2. si elle est `Build`, `Reuse`, `Adapt` ou `Integrate` ;
3. sa licence si du code tiers est repris ;
4. son owner et son emplacement réel ;
5. les critères qui justifieraient son remplacement.
