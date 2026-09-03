# ADR-002 — Separate canonical vehicle data from dealer offers

**Status:** Accepted  
**Date:** 2026-09-03

## Context

AgenAuto compares vehicles across distributors. Technical vehicle identity and commercial market observations change at different rhythms and have different ownership.

## Decision

AgenAuto stores canonical vehicle information independently from dealer-specific offers.

Canonical domain:
- Brand
- VehicleModel
- Generation
- Trim
- SpecificationDefinition
- TrimSpecification

Commercial domain:
- Dealer
- DealerLocation
- DealerBrand
- Offer
- PriceHistory
- AvailabilitySnapshot
- Promotion
- WarrantyTerm

Every `Offer` references a canonical `Trim`. Price, stock, promotion and availability never become properties of the canonical trim.

## Consequences

- one trim may have many market offers;
- comparison remains technically stable while commercial data changes;
- price and availability can be historized independently;
- partner-specific commercial data cannot pollute canonical specifications;
- data quality workflows can review canonical and commercial changes separately.
