# AgenAuto authentication, RBAC and audit model

## Purpose

Payload authentication is the identity foundation for AgenAuto. Authorization is enforced in Payload collection access rules and hooks so restrictions apply to the Admin Panel, REST API, GraphQL and Local API calls that do not explicitly override access.

## Roles

| Role | Scope |
| --- | --- |
| `admin` | Platform-wide administration, user/tenant management and canonical data management |
| `data_editor` | Platform-wide canonical automotive data management without user administration |
| `dealer_manager` | Dealer-tenant user, restricted to the assigned dealer organization |
| `dealer_agent` | Dealer-tenant user, restricted to the assigned dealer organization |

A user has exactly one role in the MVP security model.

## Dealer tenancy anchor

`dealer-organizations` exists in #4 only as the security tenancy anchor used by authenticated dealer users.

It deliberately does **not** model dealer locations, represented brands, prices, offers, stock, promotions or warranties. Those commercial concepts remain owned by #6. The future dealer market model should reference this tenancy anchor rather than create a second authorization identity.

Dealer roles must have a `dealerOrganization`. Platform roles (`admin`, `data_editor`) must not have one.

## Canonical automotive data

Canonical collections remain publicly readable because they feed the public discovery product, but mutation is server-side restricted to:

- `admin`
- `data_editor`

Dealer roles cannot create, update or delete canonical brands, models, generations, trims or technical specifications. Shared canonical media follows the same rule in #4.

## User administration

The first Payload user is automatically promoted to `admin` so a fresh installation remains bootstrappable.

After bootstrap:

- only admins can create or delete users;
- admins can update all users;
- authenticated non-admin users can update only their own user document;
- privilege-bearing fields (`role`, `dealerOrganization`, `status`) are both field-restricted and stripped from non-admin update payloads;
- suspended users are rejected by a server-side `beforeLogin` hook.

## Reusable dealer scope

`dealerScopeForUser(user, field)` returns a Payload access result:

- `true` for platform-wide admin/data-editor access;
- a query constrained to the authenticated dealer organization for dealer users;
- `false` for missing/invalid tenant context.

#6 can reuse this helper for offers and dealer-owned commercial records.

## Audit trail

Sensitive mutations are written to the immutable `audit-logs` collection. Audit entries record:

- actor ID/email/role snapshot;
- actor dealer organization ID when applicable;
- action (`create`, `update`, `delete`);
- target collection and document ID;
- changed field names only;
- timestamp.

Password hashes, salts, reset tokens, sessions and related authentication secrets are explicitly excluded from the changed-field summary. Audit logs are readable only by admins and cannot be created, updated or deleted through normal collection access.

## Security boundary

These rules are not UI-only hiding. Collection and field access rules run in Payload on the server. Hooks add defense-in-depth for privilege-bearing user fields and login suspension.

Later issues may add finer dealer permissions, but must preserve these invariants:

1. dealer users never escape their tenant;
2. canonical technical data is not dealer-editable by default;
3. privileged identity changes require an admin;
4. sensitive mutations remain auditable.
