# Pilot → Payload review bridge

The Cameroon pilot dataset remains factual staging data. This bridge moves it toward Payload/PostgreSQL without inventing missing automotive identities.

## What the bridge may create automatically

- canonical `brands` in `draft`;
- canonical `vehicle-models` in `draft`;
- draft `specification-definitions` for registered normalized keys;
- one `catalog-ingestion-candidates` review record per factual pilot vehicle candidate.

Every automatic canonical record carries traceable pilot provenance and remains subject to the existing Payload catalog-quality workflow.

## What the bridge must not invent

The pilot sources do not consistently identify a canonical vehicle generation. Since a Payload `trim` requires a `generation`, the bridge never creates placeholder generations such as `current`, `2026` or `unknown`, and it never creates trims solely to make an import succeed.

Each review candidate therefore starts with `missing_generation_identity` as a promotion blocker. Model-level/aggregate specification pages receive additional blockers when values are not demonstrably trim-scoped.

## Dry run

```bash
python -m agenauto_ingestion.payload_bridge \
  --pilot-root data/pilot \
  --output data/pilot/payload-import-plan.json
```

The generated plan is deterministic and safe for CI. It performs no network or database writes.

## Apply to Payload

Use an AgenAuto `admin` or `data_editor` account because canonical and review writes are RBAC-protected.

```bash
PAYLOAD_URL=https://agenauto.example \
PAYLOAD_EMAIL=data.editor@example.com \
PAYLOAD_PASSWORD='...' \
python -m agenauto_ingestion.payload_bridge --apply
```

A pre-issued Payload JWT can be supplied through `PAYLOAD_TOKEN` instead of email/password.

Apply mode is idempotent for brands, models, specification definitions and review candidates. Existing human mapping fields on review candidates are preserved when factual source observations refresh.

## Human review and promotion

1. Open **Automotive Review → Catalog Ingestion Candidates**.
2. Confirm the proposed brand/model mapping.
3. Select or create the source-backed canonical generation.
4. Map each source variant to a canonical trim only when the source supports it.
5. Resolve blockers and document ambiguous aggregate values.
6. Promote only reviewed facts into canonical trims/specifications; use the existing `draft → in_review → published` workflow.

The canonical collections remain the single source of truth. The staging collection is a review boundary, not a second automotive schema.
