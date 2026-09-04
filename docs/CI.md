# AgenAuto continuous integration

AgenAuto uses one permanent GitHub Actions workflow, `.github/workflows/ci.yml`, as the merge-quality gate for the Payload/Next.js application.

## When CI runs

- every pull request;
- every push to `main`;
- manual `workflow_dispatch` when an explicit rerun is useful.

Concurrent runs for the same pull request/ref are cancelled so outdated commits do not waste runner time.

## Blocking checks

The `Payload, tests and build` job runs against PostgreSQL 16 and uses CI-only placeholder environment values. It does not require production secrets.

The gate performs, in order:

1. frozen-lockfile dependency installation with pnpm cache;
2. critical production dependency audit;
3. Payload import-map and TypeScript type regeneration;
4. generated-artifact drift check;
5. application of every committed migration to an empty PostgreSQL database;
6. migration status check;
7. Payload schema-drift probe using `migrate:create --skip-empty`;
8. unit and architecture tests;
9. ESLint;
10. TypeScript typecheck;
11. production Next.js build.

A schema change that would produce an uncommitted Payload migration fails CI. Generated Payload types/import-map changes also fail until the reviewed generated artifacts are committed.

## Tests

The root `pnpm test` command uses the Node.js 24 built-in test runner, so the repository has a test gate without adding another test framework dependency. Initial coverage protects automotive identity normalization and the ADR-002 boundary that prevents dealer price/stock/availability fields from entering canonical `Trim` data.

## Python ingestion later

The web CI does not install Python. When `services/ingestion` becomes executable, Python quality checks should be added as a separate path-scoped job (for example Ruff + pytest) rather than coupling the Next.js/Payload job to Python. This keeps the AppFactory boundary explicit and lets each runtime evolve independently.
