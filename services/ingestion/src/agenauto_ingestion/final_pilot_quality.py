from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

MIN_MAPPED_SPECS = 3
CANONICAL_KEYS = frozenset(
    {
        "body_category",
        "body_style",
        "doors",
        "drivetrain",
        "engine_displacement_ml",
        "fuel_tank_l",
        "fuel_type",
        "horsepower_hp",
        "max_power_kw",
        "max_power_kw_rpm",
        "max_speed_kmh",
        "max_torque_nm",
        "dimensions_mm",
        "ground_clearance_mm",
        "wheelbase_mm",
        "seats",
        "transmission",
        "consumption_l_100km",
        "curb_weight_kg",
        "gross_vehicle_weight_kg",
        "payload_kg",
        "braked_towing_capacity_kg",
        "tyre_dimension",
    }
)
MARKET_LABEL_TOKENS = (
    "availability",
    "disponibilite",
    "garantie",
    "price",
    "prix",
    "promotion",
    "retail network",
    "showroom",
    "stock",
    "warranty",
)


def _read_json(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}.")
    return value


def _content_hash(vehicle: dict[str, object]) -> str:
    variants = vehicle.get("variants") or []
    specs = vehicle.get("specs") or []
    parts = [
        *(f"variant: {variant}" for variant in variants),
        *(
            f"{spec.get('raw_label')}: {spec.get('raw_value')}"
            for spec in specs
            if isinstance(spec, dict)
        ),
    ]
    variant_specs = vehicle.get("variant_specs")
    if isinstance(variant_specs, dict) and variant_specs:
        parts.append(json.dumps(variant_specs, ensure_ascii=False, sort_keys=True))
    return hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()


def _validate_spec(
    spec: object,
    *,
    brand: str,
    model: str,
    scope: str,
) -> bool:
    if not isinstance(spec, dict):
        raise ValueError(f"Invalid {scope} spec object for {brand} {model}.")
    label = str(spec.get("raw_label") or "").lower()
    if any(token in label for token in MARKET_LABEL_TOKENS):
        raise ValueError(f"Market data leaked into {scope} specs for {brand} {model}.")
    key = spec.get("canonical_key")
    if not key:
        return False
    if key not in CANONICAL_KEYS:
        raise ValueError(f"Unknown canonical key {key!r} for {brand} {model}.")
    return True


def validate_manual_snapshot(
    path: Path,
    *,
    expected_brand: str,
    minimum_models: int,
    allowed_hosts: frozenset[str],
) -> dict[str, object]:
    payload = _read_json(path)
    if payload.get("publication_policy") != "draft_only_until_payload_review":
        raise ValueError(f"{path} must remain draft-only until Payload review.")

    vehicles = payload.get("vehicles")
    if not isinstance(vehicles, list) or len(vehicles) < minimum_models:
        count = len(vehicles) if isinstance(vehicles, list) else 0
        raise ValueError(
            f"Expected at least {minimum_models} {expected_brand} models, found {count}."
        )

    identities: set[tuple[str, str]] = set()
    for vehicle in vehicles:
        if not isinstance(vehicle, dict):
            raise ValueError(f"Non-object vehicle found in {path}.")
        brand = str(vehicle.get("brand") or "")
        model = str(vehicle.get("model") or "")
        identity = (brand, model)
        if brand != expected_brand or not model or identity in identities:
            raise ValueError(f"Invalid or duplicate identity {identity!r} in {path}.")
        identities.add(identity)

        if vehicle.get("review_status") != "draft":
            raise ValueError(f"{brand} {model} must remain draft.")

        source = vehicle.get("source")
        if not isinstance(source, dict):
            raise ValueError(f"Missing source for {brand} {model}.")
        host = urlparse(str(source.get("url") or "")).netloc.lower()
        if host not in allowed_hosts:
            raise ValueError(f"Non-official host for {brand} {model}: {host}")
        if source.get("confidence") != "A" or not source.get("observed_at"):
            raise ValueError(f"Missing A-grade provenance for {brand} {model}.")
        if not str(source.get("source_type") or "").startswith("official_"):
            raise ValueError(f"Unexpected source type for {brand} {model}.")
        if not source.get("distributor"):
            raise ValueError(f"Missing distributor provenance for {brand} {model}.")

        specs = vehicle.get("specs")
        if not isinstance(specs, list):
            raise ValueError(f"Missing specs for {brand} {model}.")
        mapped = sum(
            _validate_spec(spec, brand=brand, model=model, scope="model") for spec in specs
        )
        if mapped < MIN_MAPPED_SPECS:
            raise ValueError(
                f"Expected at least {MIN_MAPPED_SPECS} mapped specs for {brand} {model}, "
                f"found {mapped}."
            )

        variant_specs = vehicle.get("variant_specs")
        if variant_specs is not None:
            if not isinstance(variant_specs, dict):
                raise ValueError(f"Invalid variant_specs for {brand} {model}.")
            variants = {str(variant) for variant in vehicle.get("variants") or []}
            if set(variant_specs) != variants:
                raise ValueError(f"Trim/spec scope mismatch for {brand} {model}.")
            for variant, scoped_specs in variant_specs.items():
                if not isinstance(scoped_specs, list):
                    raise ValueError(f"Invalid scoped specs for {brand} {model} {variant}.")
                scoped_mapped = sum(
                    _validate_spec(
                        spec,
                        brand=brand,
                        model=model,
                        scope=f"trim {variant}",
                    )
                    for spec in scoped_specs
                )
                if scoped_mapped < MIN_MAPPED_SPECS:
                    raise ValueError(
                        f"Expected at least {MIN_MAPPED_SPECS} mapped trim specs for "
                        f"{brand} {model} {variant}, found {scoped_mapped}."
                    )

        if vehicle.get("content_hash") != _content_hash(vehicle):
            raise ValueError(f"Stale content hash for {brand} {model}.")

    return payload


def _manifest_brand(payload: dict[str, object]) -> dict[str, object]:
    vehicles = payload["vehicles"]
    assert isinstance(vehicles, list) and vehicles
    first = vehicles[0]
    assert isinstance(first, dict)
    source = first.get("source")
    assert isinstance(source, dict)
    return {
        "brand": first["brand"],
        "distributor": source["distributor"],
        "vehicle_count": len(vehicles),
        "models": [vehicle["model"] for vehicle in vehicles if isinstance(vehicle, dict)],
        "publication_policy": payload.get("publication_policy"),
    }


def build_manifests(root: Path) -> None:
    kia = _read_json(root / "km-auto/kia/candidates.json")
    haval = _read_json(root / "rimco/haval/candidates.json")
    gwm = _read_json(root / "rimco/gwm/candidates.json")

    km_manifest = {
        "schema_version": 1,
        "distributor": "KM Auto SA",
        "brands": [_manifest_brand(kia)],
        "vehicle_count": len(kia["vehicles"]),
        "notes": "Official Kia Cameroon manual web snapshots; all candidates remain draft.",
    }
    rimco_manifest = {
        "schema_version": 1,
        "distributor": "RIMCO Motors Cameroon",
        "brands": [_manifest_brand(haval), _manifest_brand(gwm)],
        "vehicle_count": len(haval["vehicles"]) + len(gwm["vehicles"]),
        "notes": (
            "Official Great Wall/Haval Cameroon web and brochure snapshots; "
            "trim-scoped differences remain flagged for Payload review."
        ),
    }

    (root / "km-auto/manifest.json").write_text(
        json.dumps(km_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (root / "rimco/manifest.json").write_text(
        json.dumps(rimco_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    datasets = [
        root / "sky-motors/candidates.json",
        root / "cfao/toyota/candidates.json",
        root / "cfao/suzuki/candidates.json",
        root / "tractafric/hyundai/candidates.json",
        root / "tractafric/mitsubishi/candidates.json",
        root / "km-auto/kia/candidates.json",
        root / "rimco/haval/candidates.json",
        root / "rimco/gwm/candidates.json",
    ]
    brands: list[dict[str, object]] = []
    total = 0
    for dataset in datasets:
        payload = _read_json(dataset)
        entry = _manifest_brand(payload)
        brands.append(entry)
        total += int(entry["vehicle_count"])

    pilot_manifest = {
        "schema_version": 1,
        "pilot_brand_count": len(brands),
        "vehicle_count": total,
        "brands": brands,
        "publication_policy": "draft_only_until_payload_review",
        "notes": (
            "Cameroon pilot covers 8 brand slots across 5 official distributors. "
            "Unknown or trim-scoped values remain draft until review."
        ),
    }
    (root / "manifest.json").write_text(
        json.dumps(pilot_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate final Cameroon pilot brand snapshots")
    parser.add_argument("--root", type=Path, default=Path("data/pilot"))
    args = parser.parse_args()
    root = args.root

    validate_manual_snapshot(
        root / "km-auto/kia/candidates.json",
        expected_brand="Kia",
        minimum_models=4,
        allowed_hosts=frozenset({"kiamotorscameroon.com", "www.kiamotorscameroon.com"}),
    )
    validate_manual_snapshot(
        root / "rimco/haval/candidates.json",
        expected_brand="Haval",
        minimum_models=4,
        allowed_hosts=frozenset({"greatwall-cm.com", "www.greatwall-cm.com"}),
    )
    validate_manual_snapshot(
        root / "rimco/gwm/candidates.json",
        expected_brand="GWM",
        minimum_models=2,
        allowed_hosts=frozenset({"greatwall-cm.com", "www.greatwall-cm.com"}),
    )
    build_manifests(root)
    print("validated Kia, Haval and GWM pilot snapshots")


if __name__ == "__main__":
    main()
