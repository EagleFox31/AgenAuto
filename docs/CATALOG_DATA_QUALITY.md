# Canonical catalog data-quality workflow

Issue #5 turns the Payload automotive schema into the operational catalog used by AgenAuto editors and public discovery.

## Principle

Payload Admin remains the MVP catalog back office. AgenAuto does not build a second custom admin application for brands, models, generations, trims or specifications.

Canonical records follow this lifecycle:

```text
Draft -> In review -> Published
             |            |
             v            v
          Rejected     In review
             |
             +-------> Draft / In review
```

Direct `Draft -> Published` publication is rejected. A published record that needs a content change must first return to `In review`.

## Publication rules

A record can enter review or publication only when a traceable `sourceReference` exists. A publication is blocked when any `qualityFlags` entry has severity `blocking`.

Hierarchy is also enforced during publication:

- a vehicle model requires a published brand;
- a generation requires a published vehicle model;
- a trim requires a published generation;
- a trim specification requires both a published trim and published specification definition.

This prevents orphaned public catalog records whose parent context is still draft or rejected.

## Provenance

Every canonical collection receives the following shared fields:

- `catalogStatus`
- `sourceType`
- `sourceReference`
- `sourceObservedAt`
- `sourceNotes`
- `qualityFlags`
- `reviewNotes`
- `reviewedBy`
- `reviewedAt`

`sourceNotes`, quality flags and review metadata are internal editorial context. Public catalog consumers only receive fields permitted by Payload field access.

## Public projection

Payload collection access is the public projection boundary:

- `admin` and `data_editor` users can read all canonical records in Payload Admin;
- dealer users and unauthenticated consumers only read records where `catalogStatus = published`;
- canonical writes remain restricted server-side to `admin` and `data_editor`;
- media remains publicly readable as an asset collection but writable only by canonical editors.

The frontend can therefore consume the Payload REST or Local API without reproducing publication filtering in UI code.

## Existing schema protections

Issue #2 protections remain active:

- compound identity keys prevent duplicate model/generation/trim/spec assignments;
- invalid year ranges are rejected;
- typed specification definitions reject mismatched value fields;
- `unknown` and `not-applicable` specification states remain explicit instead of inventing values.

Issue #4 audit hooks continue to record canonical mutations. Together, provenance fields and immutable audit logs provide both source context and mutation traceability.

## MVP operator flow

1. Create or update a canonical record in Payload Admin.
2. Keep it in `Draft` while incomplete.
3. Add a traceable source and any quality flags.
4. Move it to `In review`.
5. Resolve blocking quality flags and verify parent publication.
6. Move it to `Published`.
7. If published content changes later, return it to `In review` before editing and republishing.

Custom Payload Admin components should only be introduced when the generic collection UI creates a measured usability problem.
