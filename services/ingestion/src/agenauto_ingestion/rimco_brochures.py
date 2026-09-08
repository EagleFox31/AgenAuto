from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from bs4 import BeautifulSoup

from .brochure_pdf import USER_AGENT, extract_trim_matrix, fetch_pdf, has_reliable_trim_scope
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


def _allowed_url(url: str) -> bool:
    return urlparse(url).netloc.lower() in ALLOWED_HOSTS


def discover_brochure_url(landing_page: str) -> str | None:
    if not _allowed_url(landing_page):
        raise ValueError(f"Refusing non-official landing page: {landing_page}")
    request = Request(
        landing_page,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
    )
    with urlopen(request, timeout=30) as response:  # noqa: S310 - official host is allow-listed
        html = response.read()

    soup = BeautifulSoup(html, "html.parser")
    candidates: list[tuple[int, str]] = []
    for link in soup.find_all("a", href=True):
        href = urljoin(landing_page, str(link.get("href") or "").strip())
        if not _allowed_url(href) or not href.lower().split("?", 1)[0].endswith(".pdf"):
            continue
        text = " ".join(link.stripped_strings).lower()
        score = 0
        if "fiche technique" in text:
            score += 10
        if "technique" in text:
            score += 3
        if "fiche" in text:
            score += 2
        candidates.append((score, href))

    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def load_current_brochure(source: dict[str, object]) -> tuple[bytes, str, str | None]:
    direct_url = str(source.get("url") or "").strip()
    landing_page = str(source.get("landing_page") or "").strip()
    direct_error: str | None = None

    if direct_url.lower().split("?", 1)[0].endswith(".pdf"):
        try:
            return fetch_pdf(direct_url, allowed_hosts=ALLOWED_HOSTS), direct_url, None
        except Exception as error:  # distributor links can be replaced without redirects
            direct_error = f"{type(error).__name__}: {error}"

    if landing_page:
        discovered = discover_brochure_url(landing_page)
        if discovered:
            return (
                fetch_pdf(discovered, allowed_hosts=ALLOWED_HOSTS),
                discovered,
                direct_error,
            )

    if direct_error:
        raise RuntimeError(f"Official brochure unavailable ({direct_error})")
    raise RuntimeError("No official brochure URL could be discovered.")


def _inject_generation_evidence(vehicle: dict[str, object]) -> dict[str, object]:
    enriched = dict(vehicle)
    generation = GENERATION_REGISTRY.get(
        (str(vehicle.get("brand") or ""), str(vehicle.get("model") or ""))
    )
    if generation:
        enriched["generation_hint"] = generation
    return enriched


def enrich_vehicle(vehicle: dict[str, object]) -> tuple[dict[str, object], dict[str, object]]:
    brand = str(vehicle.get("brand") or "")
    model = str(vehicle.get("model") or "")
    source = vehicle.get("source")
    if not isinstance(source, dict):
        raise ValueError(f"{brand} {model}: missing source object")

    enriched = _inject_generation_evidence(vehicle)
    try:
        pdf_bytes, resolved_url, replaced_error = load_current_brochure(source)
    except Exception as error:
        enriched["content_hash"] = _content_hash(enriched)
        return enriched, {
            "vehicle": f"{brand} {model}",
            "status": "source_unavailable",
            "error": f"{type(error).__name__}: {error}",
            "preserved_existing_observation": True,
        }

    known_specs = [spec for spec in vehicle.get("specs") or [] if isinstance(spec, dict)]
    trims, variant_specs = extract_trim_matrix(pdf_bytes, model=model, known_specs=known_specs)
    reliable_scope = has_reliable_trim_scope(trims, variant_specs)

    if trims:
        enriched["variants"] = trims
    if reliable_scope:
        enriched["variant_specs"] = variant_specs
    else:
        enriched.pop("variant_specs", None)

    flags = [str(flag) for flag in enriched.get("quality_flags") or []]
    flags = [
        flag
        for flag in flags
        if flag not in SCOPE_FLAGS and flag != "manual_official_brochure_snapshot"
    ]
    flags.append("official_brochure_automated_enrichment")
    if reliable_scope:
        flags.append("trim_scoped_specs_extracted")
    elif trims:
        flags.append("aggregate_page_specs_not_trim_scoped")
    enriched["quality_flags"] = list(dict.fromkeys(flags))

    resolved_source = dict(source)
    resolved_source["url"] = resolved_url
    resolved_source["source_type"] = "official_brochure_automated_enrichment"
    enriched["source"] = resolved_source
    enriched["content_hash"] = _content_hash(enriched)

    return enriched, {
        "vehicle": f"{brand} {model}",
        "status": "enriched",
        "source_url": resolved_url,
        "recovered_stale_url": bool(replaced_error and resolved_url != source.get("url")),
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
    parser = argparse.ArgumentParser(
        description="Enrich RIMCO Haval candidates from current official PDF brochures"
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("data/pilot/rimco/haval/candidates.json"),
    )
    args = parser.parse_args()
    print(json.dumps(run(args.input), ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
