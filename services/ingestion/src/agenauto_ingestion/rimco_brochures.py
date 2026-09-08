from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from .brochure_pdf import fetch_pdf, has_reliable_trim_scope, extract_trim_matrix
from .provenance import utc_now_iso

ALLOWED_HOSTS = frozenset({"greatwall-cm.com", "www.greatwall-cm.com"})

GENERATION_REGISTRY: dict[tuple[str, str], dict[str, object]] = {
    ("Haval", "H6"): {
        "name": "3rd Gen H6",
        "code": "B01",
        "production_start_year": 2020,
        "confidence": "A",
        "evidence": [
            {
                "kind": "manufacturer_generation",
                "url": "https://www.gwm-global.com/news/1155598.html",
                "note": "GWM identifies the vehicle as the 3rd Gen HAVAL H6 and documents its 2020 global launch.",
            },
            {
                "kind": "regulatory_model_code",
                "url": "https://www.rover.infrastructure.gov.au/PublishedApprovals/VTADetails/?id=c059cdec-9e3a-ec11-a303-0050569e60b7",
                "note": "Government approval maps HAVAL marketing designation H6 to model B01.",
            },
        ],
    }
}

SCOPE_FLAGS = {
    "aggregate_page_specs_not_trim_scoped",
    "core_specs_common_across_listed_trims",
    "trim_specific_values_require_payload_review",
    "trim_scoped_specs_extracted",
}


def _content_hash(vehicle: dict[str, object]) -> str:
    variants = vehicle.get("variants") or []
    specs = vehicle.get("specs") or []
    factual_text = "\n".join(
        [
            *(f"variant: {variant}" for variant in variants),
            *(
                f"{spec.get('raw_label')}: {spec.get('raw_value')}"
                for spec in specs
                if isinstance(spec, dict)
            ),
        ]
    )
    return hashlib.sha256(factual_text.encode("utf-8")).hexdigest()


def enrich_vehicle(vehicle: dict[str, object]) -> tuple[dict[str, object], dict[str, object]]:
    brand = str(vehicle.get("brand") or "")
    model = str(vehicle.get("model") or "")
    source = vehicle.get("source")
    if not isinstance(source, dict):
        raise ValueError(f"{brand} {model}: missing source object")
    source_url = str(source.get("url") or "")
    if not source_url.lower().endswith(".pdf"):
        return vehicle, {"vehicle": f"{brand} {model}", "status": "skipped_non_pdf"}

    pdf_bytes = fetch_pdf(source_url, allowed_hosts=ALLOWED_HOSTS)
    known_specs = [spec for spec in vehicle.get("specs") or [] if isinstance(spec, dict)]
    trims, variant_specs = extract_trim_matrix(pdf_bytes, model=model, known_specs=known_specs)
    reliable_scope = has_reliable_trim_scope(trims, variant_specs)

    enriched = dict(vehicle)
    if trims:
        enriched["variants"] = trims
    generation = GENERATION_REGISTRY.get((brand, model))
    if generation:
        enriched["generation_hint"] = generation
    if reliable_scope:
        enriched["variant_specs"] = variant_specs

    flags = [str(flag) for flag in enriched.get("quality_flags") or []]
    flags = [flag for flag in flags if flag not in SCOPE_FLAGS and flag != "manual_official_brochure_snapshot"]
    flags.append("official_brochure_automated_enrichment")
    if reliable_scope:
        flags.append("trim_scoped_specs_extracted")
    elif trims:
        flags.append("aggregate_page_specs_not_trim_scoped")
    enriched["quality_flags"] = list(dict.fromkeys(flags))

    source = dict(source)
    source["source_type"] = "official_brochure_automated_enrichment"
    enriched["source"] = source
    enriched["content_hash"] = _content_hash(enriched)

    return enriched, {
        "vehicle": f"{brand} {model}",
        "status": "enriched",
        "trim_count": len(trims),
        "trim_scoped": reliable_scope,
        "mapped_trim_spec_count": sum(len(items) for items in variant_specs.values()),
    }


def run(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    vehicles = payload.get("vehicles")
    if not isinstance(vehicles, list):
        raise ValueError("RIMCO dataset is missing vehicles")

    reports: list[dict[str, object]] = []
    enriched_vehicles: list[dict[str, object]] = []
    for raw_vehicle in vehicles:
        if not isinstance(raw_vehicle, dict):
            raise ValueError("RIMCO dataset contains a non-object vehicle")
        enriched, report = enrich_vehicle(raw_vehicle)
        enriched_vehicles.append(enriched)
        reports.append(report)

    payload["vehicles"] = enriched_vehicles
    payload["generated_at"] = utc_now_iso()
    payload["collector"] = "rimco_haval_official_brochure_enrichment"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"path": str(path), "reports": reports}


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich RIMCO Haval candidates from official PDF brochures")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/pilot/rimco/haval/candidates.json"),
    )
    args = parser.parse_args()
    print(json.dumps(run(args.input), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
