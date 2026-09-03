# ADR-001 — Payload CMS as AgenAuto Headless Core

**Status:** Accepted  
**Date:** 2026-09-03

## Context

AgenAuto needs a strong data and operations layer for a canonical vehicle catalog, dealers, locations, offers, price history, media, leads, internal users and controlled publishing.

Building all of those primitives from scratch in a custom API would consume significant engineering effort without creating meaningful product differentiation.

Payload provides a Next.js-native backend with an Admin Panel, authentication, granular access control, REST/GraphQL APIs, file storage, PostgreSQL support and migrations. AgenAuto can therefore reuse these capabilities while keeping its differentiating automotive logic in explicit product modules.

## Decision

Payload CMS is adopted as AgenAuto's **Headless Core** and primary application backend for the MVP.

Payload owns:

- canonical catalog persistence and CRUD;
- dealers, locations and commercial offers;
- authentication for internal and dealer users;
- RBAC and document/field-level access control;
- admin back-office;
- media management;
- leads and test-drive request persistence;
- audit-friendly mutation hooks;
- REST / Local API access;
- PostgreSQL schema and migrations;
- lightweight jobs that naturally belong to the application layer.

Payload does **not** own all business intelligence by default.

AgenAuto-specific modules remain responsible for:

- vehicle specification normalization;
- trim-level comparison;
- search/discovery rules;
- data quality and matching;
- source provenance and freshness rules;
- ingestion from CSV, Excel, partner APIs and permitted collectors;
- future ranking, recommendation and TCO engines.

Python remains available as a specialized ingestion/data-processing service where its ecosystem provides a clear advantage. It is no longer the primary CRUD/API backend.

## Consequences

### Positive

- faster MVP delivery;
- no custom admin application required at launch;
- less duplicated auth/RBAC/API work;
- schema remains code-defined and versioned;
- direct fit with Next.js and TypeScript;
- PostgreSQL remains the source of truth;
- easier reuse as an AppFactory platform brick.

### Trade-offs

- product developers must understand Payload conventions and hooks;
- some complex domain queries may need custom endpoints or Local API logic;
- dealer-facing UX should not simply expose the generic Admin Panel where a dedicated workflow is more appropriate;
- Python/TypeScript boundaries must be explicit for ingestion.

## Guardrails

1. Payload is a platform brick, not the product architecture itself.
2. Canonical vehicle data stays separate from dealer-specific offer data.
3. Domain invariants are enforced in code and tests, not only by CMS field configuration.
4. Heavy ingestion/normalization pipelines must not block public application requests.
5. New infrastructure is introduced only when measured constraints justify it.
