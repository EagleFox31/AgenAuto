# Automotive collections

Canonical automotive data owned by AgenAuto.

## Identity chain

`Brand -> VehicleModel -> Generation -> Trim -> TrimSpecification`

`SpecificationDefinition` is the controlled dictionary that gives each technical specification a stable key, category, value type and optional unit.

## Invariants

- canonical trims never store dealer price, stock, promotion or availability;
- Brand slugs are globally unique;
- Model identity is unique inside a Brand;
- Generation identity is unique inside a Model;
- Trim identity is unique inside a Generation;
- one Trim can have at most one value for a given SpecificationDefinition;
- unknown values remain explicit (`unknown`) instead of becoming zero, false or guessed values;
- media is referenced through the shared `media` collection so provenance/attribution can be preserved.

Commercial observations belong to `collections/market`, not here.
