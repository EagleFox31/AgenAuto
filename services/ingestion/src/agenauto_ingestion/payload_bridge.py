from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SCHEMA_VERSION = 1

SPEC_DEFINITION_META: dict[str, dict[str, object]] = {
    "body_style": {
        "label": "Body style",
        "category": "other",
        "valueType": "text",
    },
    "drivetrain": {
        "label": "Drivetrain",
        "category": "drivetrain",
        "valueType": "text",
    },
    "transmission": {
        "label": "Transmission",
        "category": "drivetrain",
        "valueType": "text",
    },
    "fuel_type": {
        "label": "Fuel type",
        "category": "engine",
        "valueType": "text",
    },
    "engine_displacement_ml": {
        "label": "Engine displacement",
        "category": "engine",
        "valueType": "number",
        "unit": "cm3",
    },
    "max_power_kw": {
        "label": "Maximum power",
        "category": "performance",
        "valueType": "number",
        "unit": "kw",
    },
    "max_power_kw_rpm": {
        "label": "Maximum power / engine speed",
        "category": "performance",
        "valueType": "text",
    },
    "horsepower_hp": {
        "label": "Horsepower",
        "category": "performance",
        "valueType": "number",
        "unit": "hp",
    },
    "max_torque_nm": {
        "label": "Maximum torque",
        "category": "performance",
        "valueType": "number",
        "unit": "nm",
    },
    "max_speed_kmh": {
        "label": "Maximum speed",
        "category": "performance",
        "valueType": "number",
        "unit": "km-h",
    },
    "dimensions_mm": {
        "label": "Dimensions (L x W x H)",
        "category": "dimensions",
        "valueType": "text",
    },
    "wheelbase_mm": {
        "label": "Wheelbase",
        "category": "dimensions",
        "valueType": "number",
        "unit": "mm",
    },
    "ground_clearance_mm": {
        "label": "Ground clearance",
        "category": "dimensions",
        "valueType": "number",
        "unit": "mm",
    },
    "curb_weight_kg": {
        "label": "Curb weight",
        "category": "dimensions",
        "valueType": "number",
        "unit": "kg",
    },
    "gross_vehicle_weight_kg": {
        "label": "Gross vehicle weight",
        "category": "capacity",
        "valueType": "number",
        "unit": "kg",
    },
    "payload_kg": {
        "label": "Payload",
        "category": "capacity",
        "valueType": "number",
        "unit": "kg",
    },
    "braked_towing_capacity_kg": {
        "label": "Braked towing capacity",
        "category": "capacity",
        "valueType": "number",
        "unit": "kg",
    },
    "seats": {
        "label": "Seats",
        "category": "capacity",
        "valueType": "number",
    },
    "doors": {
        "label": "Doors",
        "category": "capacity",
        "valueType": "number",
    },
    "fuel_tank_l": {
        "label": "Fuel tank capacity",
        "category": "capacity",
        "valueType": "number",
        "unit": "l",
    },
    "consumption_l_100km": {
        "label": "Combined fuel consumption",
        "category": "efficiency",
        "valueType": "number",
        "unit": "l-100km",
    },
    "tyre_dimension": {
        "label": "Tyre dimension",
        "category": "chassis",
        "valueType": "text",
    },
}

AGGREGATE_FLAGS = {
    "aggregate_page_specs_not_trim_scoped",
    "core_specs_common_across_listed_trims",
    "trim_specific_values_require_payload_review",
}

FILTERABLE_SPEC_KEYS = {
    "body_style",
    "drivetrain",
    "transmission",
    "fuel_type",
    "engine_displacement_ml",
    "horsepower_hp",
    "seats",
}


def normalize_slug(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower().strip())
    return text.strip("-")


def normalize_specification_key(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-zA-Z0-9]+", ".", text.lower().strip())
    return text.strip(".")


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}.")
    return value


def load_pilot_candidates(pilot_root: Path) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    for path in sorted(pilot_root.glob("**/candidates.json")):
        payload = _read_json(path)
        vehicles = payload.get("vehicles")
        if not isinstance(vehicles, list):
            raise ValueError(f"Missing vehicles array in {path}.")
        for vehicle in vehicles:
            if not isinstance(vehicle, dict):
                raise ValueError(f"Invalid vehicle candidate in {path}.")
            candidate = dict(vehicle)
            candidate["_dataset_path"] = str(path.relative_to(pilot_root))
            candidates.append(candidate)
    if not candidates:
        raise ValueError(f"No pilot candidates found under {pilot_root}.")
    return candidates


def stable_candidate_key(candidate: dict[str, Any]) -> str:
    source = candidate.get("source") or {}
    identity = "|".join(
        [
            str(candidate.get("brand") or ""),
            str(candidate.get("model") or ""),
            str(source.get("url") or ""),
        ]
    )
    return hashlib.sha256(identity.encode("utf-8")).hexdigest()


def _quality_flags(candidate: dict[str, Any]) -> list[str]:
    raw = candidate.get("quality_flags") or []
    return [str(flag) for flag in raw if flag]


def _canonical_keys(candidate: dict[str, Any]) -> set[str]:
    output: set[str] = set()
    for spec in candidate.get("specs") or []:
        if isinstance(spec, dict) and spec.get("canonical_key"):
            output.add(str(spec["canonical_key"]))
    return output


def _promotion_blockers(candidate: dict[str, Any]) -> list[dict[str, str]]:
    flags = set(_quality_flags(candidate))
    blockers = [
        {
            "code": "missing_generation_identity",
            "note": (
                "The source proves the model but does not provide a canonical generation identity. "
                "Select or create the generation in Payload before trim/spec promotion."
            ),
        }
    ]
    if not candidate.get("variants"):
        blockers.append(
            {
                "code": "no_trim_names_extracted",
                "note": "No source-backed trim name is available; do not invent a trim.",
            }
        )
    if flags.intersection(AGGREGATE_FLAGS):
        blockers.append(
            {
                "code": "specs_not_trim_scoped",
                "note": "One or more specifications are aggregate/model-level and need trim review.",
            }
        )
    unregistered = sorted(_canonical_keys(candidate) - SPEC_DEFINITION_META.keys())
    if unregistered:
        blockers.append(
            {
                "code": "unregistered_spec_definition",
                "note": "Review dictionary keys before promotion: " + ", ".join(unregistered),
            }
        )
    return blockers


def _source(candidate: dict[str, Any]) -> dict[str, Any]:
    source = candidate.get("source")
    if not isinstance(source, dict):
        raise ValueError(
            f"Missing source for {candidate.get('brand')} {candidate.get('model')}."
        )
    required = ("url", "observed_at", "distributor", "confidence")
    missing = [field for field in required if not source.get(field)]
    if missing:
        raise ValueError(
            f"Missing source fields {missing} for {candidate.get('brand')} {candidate.get('model')}."
        )
    return source


def build_payload_import_plan(pilot_root: Path) -> dict[str, Any]:
    candidates = load_pilot_candidates(pilot_root)
    brands: dict[str, dict[str, Any]] = {}
    models: dict[tuple[str, str], dict[str, Any]] = {}
    definition_keys: set[str] = set()
    review_candidates: list[dict[str, Any]] = []
    seen_candidate_keys: set[str] = set()

    for candidate in candidates:
        brand = str(candidate.get("brand") or "").strip()
        model = str(candidate.get("model") or "").strip()
        if not brand or not model:
            raise ValueError("Pilot candidate is missing brand/model identity.")
        source = _source(candidate)
        brand_slug = normalize_slug(brand)
        model_slug = normalize_slug(model)
        if not brand_slug or not model_slug:
            raise ValueError(f"Unable to normalize {brand} {model}.")

        brands.setdefault(
            brand_slug,
            {
                "name": brand,
                "slug": brand_slug,
                "sourceReference": source["url"],
                "sourceObservedAt": source["observed_at"],
            },
        )
        models.setdefault(
            (brand_slug, model_slug),
            {
                "brandSlug": brand_slug,
                "name": model,
                "slug": model_slug,
                "sourceReference": source["url"],
                "sourceObservedAt": source["observed_at"],
            },
        )

        definition_keys.update(
            key for key in _canonical_keys(candidate) if key in SPEC_DEFINITION_META
        )
        candidate_key = stable_candidate_key(candidate)
        if candidate_key in seen_candidate_keys:
            raise ValueError(f"Duplicate staging candidate key for {brand} {model}.")
        seen_candidate_keys.add(candidate_key)

        blockers = _promotion_blockers(candidate)
        review_candidates.append(
            {
                "candidateKey": candidate_key,
                "displayName": f"{brand} {model}",
                "brandName": brand,
                "modelName": model,
                "brandSlug": brand_slug,
                "modelSlug": model_slug,
                "distributor": source["distributor"],
                "sourceReference": source["url"],
                "sourceObservedAt": source["observed_at"],
                "sourceType": source.get("source_type") or "official_web",
                "confidence": source["confidence"],
                "contentHash": candidate.get("content_hash"),
                "variants": list(candidate.get("variants") or []),
                "specifications": list(candidate.get("specs") or []),
                "qualityFlags": _quality_flags(candidate),
                "promotionBlockers": blockers,
                "datasetPath": candidate["_dataset_path"],
                "rawCandidate": {
                    key: value for key, value in candidate.items() if not key.startswith("_")
                },
            }
        )

    definitions: list[dict[str, Any]] = []
    for canonical_key in sorted(definition_keys):
        metadata = dict(SPEC_DEFINITION_META[canonical_key])
        definitions.append(
            {
                "sourceKey": canonical_key,
                "key": normalize_specification_key(canonical_key),
                **metadata,
                "comparable": True,
                "filterable": canonical_key in FILTERABLE_SPEC_KEYS,
            }
        )

    blocked = sum(bool(candidate["promotionBlockers"]) for candidate in review_candidates)
    plan = {
        "schema_version": SCHEMA_VERSION,
        "mode": "draft_review_only",
        "policy": (
            "Create/match only safe canonical parents and dictionary definitions. "
            "Never fabricate generations or trims; stage every source candidate for Payload review."
        ),
        "summary": {
            "brand_count": len(brands),
            "model_count": len(models),
            "specification_definition_count": len(definitions),
            "candidate_count": len(review_candidates),
            "blocked_candidate_count": blocked,
            "ready_for_trim_promotion_count": len(review_candidates) - blocked,
        },
        "brands": [brands[key] for key in sorted(brands)],
        "models": [models[key] for key in sorted(models)],
        "specificationDefinitions": definitions,
        "reviewCandidates": sorted(
            review_candidates,
            key=lambda item: (item["brandName"], item["modelName"]),
        ),
    }
    return plan


class PayloadClient:
    def __init__(self, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token

    def request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = Request(
            f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"JWT {self.token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        with urlopen(request, timeout=30) as response:  # noqa: S310
            payload = json.loads(response.read().decode("utf-8"))
        if not isinstance(payload, dict):
            raise RuntimeError(f"Unexpected Payload response for {method} {path}.")
        return payload

    def find_one(self, collection: str, field: str, value: object) -> dict[str, Any] | None:
        query = urlencode(
            {
                f"where[{field}][equals]": str(value),
                "limit": "1",
                "depth": "0",
            }
        )
        result = self.request("GET", f"/api/{collection}?{query}")
        docs = result.get("docs") or []
        return docs[0] if docs else None

    def create(self, collection: str, body: dict[str, Any]) -> dict[str, Any]:
        result = self.request("POST", f"/api/{collection}", body)
        doc = result.get("doc", result)
        if not isinstance(doc, dict) or "id" not in doc:
            raise RuntimeError(f"Payload create did not return an id for {collection}.")
        return doc

    def update(self, collection: str, document_id: object, body: dict[str, Any]) -> dict[str, Any]:
        result = self.request("PATCH", f"/api/{collection}/{document_id}", body)
        doc = result.get("doc", result)
        if not isinstance(doc, dict):
            raise RuntimeError(f"Unexpected Payload update response for {collection}.")
        return doc

    def ensure(
        self,
        collection: str,
        field: str,
        value: object,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        existing = self.find_one(collection, field, value)
        return existing if existing is not None else self.create(collection, body)


def _canonical_source_fields(operation: dict[str, Any]) -> dict[str, Any]:
    return {
        "catalogStatus": "draft",
        "sourceType": "official-dealer",
        "sourceReference": operation["sourceReference"],
        "sourceObservedAt": operation["sourceObservedAt"],
        "qualityFlags": [
            {
                "code": "pilot_import_draft",
                "severity": "warning",
                "note": "Created from the Cameroon pilot staging dataset; review before publication.",
            }
        ],
    }


def apply_payload_import_plan(plan: dict[str, Any], client: PayloadClient) -> dict[str, int]:
    brand_ids: dict[str, object] = {}
    model_ids: dict[tuple[str, str], object] = {}
    created = {"brands": 0, "models": 0, "definitions": 0, "candidates": 0}

    for operation in plan["brands"]:
        existing = client.find_one("brands", "slug", operation["slug"])
        if existing is None:
            existing = client.create(
                "brands",
                {
                    "name": operation["name"],
                    "slug": operation["slug"],
                    **_canonical_source_fields(operation),
                },
            )
            created["brands"] += 1
        brand_ids[operation["slug"]] = existing["id"]

    for operation in plan["models"]:
        brand_id = brand_ids[operation["brandSlug"]]
        identity_key = f"{brand_id}:{operation['slug']}"
        existing = client.find_one("vehicle-models", "identityKey", identity_key)
        if existing is None:
            existing = client.create(
                "vehicle-models",
                {
                    "brand": brand_id,
                    "name": operation["name"],
                    "slug": operation["slug"],
                    **_canonical_source_fields(operation),
                },
            )
            created["models"] += 1
        model_ids[(operation["brandSlug"], operation["slug"])] = existing["id"]

    for definition in plan["specificationDefinitions"]:
        existing = client.find_one("specification-definitions", "key", definition["key"])
        if existing is not None:
            continue
        body = {
            "key": definition["key"],
            "label": definition["label"],
            "category": definition["category"],
            "valueType": definition["valueType"],
            "comparable": definition["comparable"],
            "filterable": definition["filterable"],
            "catalogStatus": "draft",
            "sourceType": "manual-verification",
            "sourceReference": f"pilot-normalization:{definition['sourceKey']}",
            "sourceNotes": "Seeded from normalized pilot keys; review semantics before publication.",
            "qualityFlags": [
                {
                    "code": "pilot_dictionary_seed",
                    "severity": "warning",
                    "note": "Definition is a draft dictionary proposal, not a published specification.",
                }
            ],
        }
        if definition.get("unit"):
            body["unit"] = definition["unit"]
        client.create("specification-definitions", body)
        created["definitions"] += 1

    for candidate in plan["reviewCandidates"]:
        brand_id = brand_ids[candidate["brandSlug"]]
        model_id = model_ids[(candidate["brandSlug"], candidate["modelSlug"])]
        factual = {
            "candidateKey": candidate["candidateKey"],
            "displayName": candidate["displayName"],
            "brandName": candidate["brandName"],
            "modelName": candidate["modelName"],
            "distributor": candidate["distributor"],
            "sourceReference": candidate["sourceReference"],
            "sourceObservedAt": candidate["sourceObservedAt"],
            "sourceType": candidate["sourceType"],
            "confidence": candidate["confidence"],
            "contentHash": candidate.get("contentHash"),
            "variants": [{"name": name} for name in candidate["variants"]],
            "specifications": candidate["specifications"],
            "qualityFlags": [{"code": code} for code in candidate["qualityFlags"]],
            "rawCandidate": candidate["rawCandidate"],
            "proposedBrand": brand_id,
            "proposedModel": model_id,
        }
        existing = client.find_one(
            "catalog-ingestion-candidates",
            "candidateKey",
            candidate["candidateKey"],
        )
        if existing is None:
            client.create(
                "catalog-ingestion-candidates",
                {
                    **factual,
                    "mappingStatus": "needs_review",
                    "trimMappings": [
                        {"sourceVariant": name} for name in candidate["variants"]
                    ],
                    "promotionBlockers": candidate["promotionBlockers"],
                },
            )
            created["candidates"] += 1
        else:
            client.update(
                "catalog-ingestion-candidates",
                existing["id"],
                factual,
            )

    return created


def login_payload(base_url: str, email: str, password: str) -> str:
    request = Request(
        f"{base_url.rstrip('/')}/api/users/login",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    with urlopen(request, timeout=30) as response:  # noqa: S310
        payload = json.loads(response.read().decode("utf-8"))
    token = payload.get("token") if isinstance(payload, dict) else None
    if not token:
        raise RuntimeError("Payload login did not return a JWT token.")
    return str(token)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build or apply the AgenAuto Cameroon pilot -> Payload draft review bridge."
    )
    parser.add_argument("--pilot-root", type=Path, default=Path("data/pilot"))
    parser.add_argument("--output", type=Path, default=Path("data/pilot/payload-import-plan.json"))
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--payload-url", default=os.getenv("PAYLOAD_URL", ""))
    parser.add_argument("--token", default=os.getenv("PAYLOAD_TOKEN", ""))
    parser.add_argument("--email", default=os.getenv("PAYLOAD_EMAIL", ""))
    parser.add_argument("--password", default=os.getenv("PAYLOAD_PASSWORD", ""))
    args = parser.parse_args()

    plan = build_payload_import_plan(args.pilot_root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(plan["summary"], sort_keys=True))

    if not args.apply:
        print(f"dry-run plan written to {args.output}")
        return

    if not args.payload_url:
        raise SystemExit("--apply requires --payload-url or PAYLOAD_URL.")
    token = args.token
    if not token:
        if not args.email or not args.password:
            raise SystemExit(
                "--apply requires PAYLOAD_TOKEN or PAYLOAD_EMAIL/PAYLOAD_PASSWORD."
            )
        token = login_payload(args.payload_url, args.email, args.password)

    result = apply_payload_import_plan(plan, PayloadClient(args.payload_url, token))
    print(json.dumps({"applied": result}, sort_keys=True))


if __name__ == "__main__":
    main()
