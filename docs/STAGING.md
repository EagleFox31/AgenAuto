# AgenAuto staging bootstrap

AgenAuto staging uses the same Payload/PostgreSQL schema and migrations as the application. The pilot import remains review-only: it may create safe draft brands, models, specification definitions, and catalog ingestion candidates, but it must not invent generations or trims.

## Required runtime configuration

Payload / Next.js staging requires:

- `DATABASE_URL` — persistent PostgreSQL connection string;
- `PAYLOAD_SECRET` — long random secret, different from local/CI;
- `NEXT_PUBLIC_APP_URL` — HTTPS staging application URL.

The manual GitHub workflow `.github/workflows/staging-payload-import.yml` expects:

- GitHub Actions secret `STAGING_DATABASE_URL`;
- GitHub Actions secret `STAGING_PAYLOAD_SECRET`;
- GitHub Actions secret `STAGING_PAYLOAD_TOKEN`;
- GitHub repository variable `STAGING_PAYLOAD_URL`.

Never commit any of these values.

## Bootstrap order

1. Provision a persistent PostgreSQL database.
2. Configure the deployed Payload/Next.js application with `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_APP_URL`.
3. Deploy the `feat/cameroon-pilot-ingestion` revision to staging.
4. Create the first Payload admin account.
5. Obtain a staging Payload JWT for that admin/data-editor account and save it as `STAGING_PAYLOAD_TOKEN`.
6. Add `STAGING_DATABASE_URL`, `STAGING_PAYLOAD_SECRET`, `STAGING_PAYLOAD_TOKEN`, and `STAGING_PAYLOAD_URL` to GitHub Actions configuration.
7. Run **Staging - migrate and import Payload pilot** manually.

## Safety invariants

The workflow fails if:

- required staging configuration is absent;
- the Payload URL is not HTTPS;
- migrations fail;
- the staging API cannot be reached;
- fewer than 8 brands, 59 models, 22 specification definitions, or 59 review candidates are persisted;
- an automatically imported review candidate is not `needs_review`;
- any canonical generation or trim is fabricated during the automatic import.

Human review in Payload Admin remains mandatory before Generation/Trim promotion.
