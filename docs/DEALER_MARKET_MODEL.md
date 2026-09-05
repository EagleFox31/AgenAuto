# Dealer market model

Issue #6 turns AgenAuto's commercial side into a first-class Payload domain while preserving ADR-002: canonical vehicle data and dealer market data remain separate.

## Boundary

Canonical vehicle data owns technical truth:

- Brand
- Vehicle Model
- Generation
- Trim
- Specification Definition
- Trim Specification

Dealer market data owns commercial truth:

- Dealer Organization
- Dealer Location
- Dealer Brand representation
- Offer
- Price History
- Availability Snapshot
- Promotion
- Warranty Term

A canonical `Trim` never owns dealer price, stock, availability, promotion or warranty fields.

## Tenant / dealer model

`dealer-organizations` is the tenant and represents the official distributor/dealer organization in the MVP. Existing user tenancy remains stable: dealer users continue to reference `dealerOrganization`.

A dealer organization can have many locations, represented brands and offers. Every commercial child record carries an indexed `dealerOrganization` tenant key so access checks do not depend on deep relationship traversal.

## Offer model

An `offers` row links a dealer organization to one canonical trim and may optionally target a dealer location. The relationship is many-to-one from offers to trims, so one canonical trim can have any number of dealer offers across distributors and locations.

Offers store commercial identity and provenance only:

- dealer organization
- location
- canonical trim
- headline / external reference
- status
- source reference
- observation date
- notes

An active offer must reference a published canonical trim. A location referenced by an offer must belong to the same dealer organization.

## Price history

Price is never a mutable field on `Trim` or `Offer`.

Every observed price creates a `price-history` record with:

- offer
- dealer organization
- amount
- XAF currency
- price type (`list`, `from`, `promotional`)
- observed timestamp
- source reference

Dealer accounts may append price observations but cannot update or delete them. Platform users may repair history when data correction is necessary. This prevents silent loss of price context.

## Availability

Availability follows the same observation model. Each `availability-snapshots` record stores:

- offer
- dealer organization
- status (`in_stock`, `limited`, `order_only`, `out_of_stock`, `unknown`)
- optional quantity
- observed timestamp
- source reference

Dealer accounts append snapshots instead of overwriting previous observations.

## Promotions and warranty

Promotions and warranty terms are separate market entities linked to an offer. They do not pollute the canonical trim.

Promotions carry their own active window and provenance. Warranty terms carry duration/distance/coverage plus source and observation timestamp.

## Access policy

Platform roles (`admin`, `data_editor`) operate across the full market dataset.

`dealer_manager` can maintain its own dealer structure and commercial records. `dealer_agent` can operate offers and append price/availability observations, but cannot change dealer structure.

Dealer writes are always forced to the authenticated `dealerOrganization`. A dealer-supplied tenant ID that targets another organization is rejected server-side.

Mutable market collections are tenant-scoped for update/delete. Price and availability observations are append-only for dealer accounts.

## Public reads

Active dealer organizations, locations, brand representations, offers, promotions and warranty terms can be read as market-facing records. Raw price history and availability history remain private to platform/dealer users; Issue #7 will build the public discovery projection from the appropriate current observations instead of exposing raw history.

## Data-quality invariants

- dealer locations are unique within a dealer organization by normalized identity key;
- dealer/brand representation is unique per dealer + canonical brand;
- active offers must point to published canonical trims;
- offer locations must belong to the same dealer organization;
- price and availability observations must belong to the same dealer organization as their offer;
- every offer, price observation, availability snapshot, promotion and warranty term stores traceable source/observation context;
- canonical specifications remain protected by the existing canonical RBAC and publication workflow.
