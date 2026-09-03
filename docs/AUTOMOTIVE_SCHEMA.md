# AgenAuto canonical automotive schema

This document describes the first executable canonical vehicle model implemented in Payload.

## Boundary

The canonical domain answers **what the vehicle is technically**. The market domain answers **who sells it, where, at what observed price and under which commercial conditions**.

Per ADR-002, price, stock, promotion, warranty offer and availability do not belong on `trims`.

## Entity graph

```text
Brand
  -> VehicleModel
      -> Generation
          -> Trim
              -> TrimSpecification
                    -> SpecificationDefinition

Media <- Brand / VehicleModel / Generation / Trim
```

## Duplicate protection

Payload supports single-field unique constraints directly. Compound business identities are therefore materialized into hidden unique `identityKey` fields:

- `vehicle-models`: `<brand-id>:<model-slug>`
- `generations`: `<model-id>:<generation-slug>`
- `trims`: `<generation-id>:<trim-slug>`
- `trim-specifications`: `<trim-id>:<specification-definition-id>`

Brand slugs and SpecificationDefinition keys are globally unique.

## Specifications

`SpecificationDefinition` is the controlled dictionary. It defines:

- stable key such as `engine.power` or `dimensions.length`;
- category;
- value type: number, text, boolean or controlled option;
- optional controlled unit for numeric values;
- whether the value is comparable/filterable;
- optional allowed options for controlled-option values.

`TrimSpecification` stores one typed value for one trim and one definition.

### Missing data

Missing automotive data is not converted into zero or false. Each trim specification has a status:

- `known`: the field matching the definition value type is required;
- `unknown`: source does not provide a reliable value;
- `not-applicable`: the specification does not apply to this trim.

Unknown/not-applicable values keep all value columns null.

## First-class trim classifications

A small set of stable technical classifications lives directly on `trims` because it will drive discovery and filtering frequently:

- body style;
- fuel type;
- transmission;
- drive type;
- seats;
- doors.

Detailed and extensible technical data remains in the specification dictionary.

## Media

The shared `media` collection stores uploaded imagery plus optional source URL, attribution and license note. Canonical entities reference media instead of copying file metadata into each entity.

## Explicitly out of scope

The following are deliberately excluded from this canonical schema and belong to later market collections:

- dealer/distributor;
- dealership location;
- price and price history;
- stock and availability snapshots;
- promotions;
- dealer-specific warranty terms;
- commercial financing offers.
