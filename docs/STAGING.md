# AgenAuto staging bootstrap

AgenAuto staging uses the same Payload/PostgreSQL schema and migrations as the application. The pilot import remains review-only: it may create safe draft brands, models, specification definitions, and catalog ingestion candidates, but it must not invent generations or trims.

## Current staging database

The current persistent staging database is the Supabase project `AgenAuto-staging` in the Trigenys organization, project ref `yjfpliavyqjqqoqcomyg`, region `eu-west-3`.

The six application migrations through `20260907_080418_pilot_ingestion_review` have been applied and their names have been synchronized into Payload's `payload_migrations` table. The database is intentionally still empty of pilot catalog data until the deployed Payload API is available.

Supabase exposes the `public` schema through PostgREST. AgenAuto does not use Supabase as a public data API: Payload is the authorization boundary. After Payload migrations, run `infra/supabase/payload-public-schema-lockdown.sql` so every Payload-owned public table has RLS enabled with no public policies. This intentionally blocks direct anonymous/authenticated Supabase API access while allowing the server-side Payload database owner/privileged connection to operate.

## Database connection for Vercel / GitHub Actions

Use the **Supabase Session pooler** connection string from **Project → Connect** for `DATABASE_URL` / `STAGING_DATABASE_URL`. The shared session pooler is reachable over IPv4 on port `5432`, which avoids relying on the project's direct IPv6 endpoint and retains session semantics suitable for Payload migrations. Do not commit the connection string or database password.

## Required runtime configuration

Payload / Next.js staging requires:

- `DATABASE_URL` — Supabase Session pooler PostgreSQL connection string with the privileges required by Payload;
- `PAYLOAD_SECRET` — long random secret, different from local/CI;
- `NEXT_PUBLIC_APP_URL` — HTTPS staging application URL.

The manual GitHub workflow `.github/workflows/staging-payload-import.yml` expects:

- GitHub Actions secret `STAGING_DATABASE_URL`;
- GitHub Actions secret `STAGING_PAYLOAD_SECRET`;
- GitHub Actions secret `STAGING_PAYLOAD_TOKEN`;
- GitHub repository variable `STAGING_PAYLOAD_URL`.

Never commit any of these values.

## Bootstrap order

1. Provision the persistent PostgreSQL database.
2. Apply the Payload migrations and, on Supabase, the RLS lockdown script.
3. Configure the deployed Payload/Next.js application with `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_APP_URL`.
4. Deploy the `feat/cameroon-pilot-ingestion` revision to staging.
5. Create the first Payload admin account.
6. Obtain a staging Payload JWT for that admin/data-editor account and save it as `STAGING_PAYLOAD_TOKEN`.
7. Add `STAGING_DATABASE_URL`, `STAGING_PAYLOAD_SECRET`, `STAGING_PAYLOAD_TOKEN`, and `STAGING_PAYLOAD_URL` to GitHub Actions configuration.
8. Run **Staging - migrate and import Payload pilot** manually.

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
