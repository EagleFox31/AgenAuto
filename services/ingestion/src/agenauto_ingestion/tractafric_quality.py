from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup

from .collectors.tractafric import USER_AGENT
from .normalization import normalize_space, normalized_token
from .provenance import content_hash, utc_now_iso

MINIMUM_MAPPED_SPECS = 3
HYUNDAI_HOSTS = frozenset({"hyundai-cameroun.com", "www.hyundai-cameroun.com"})
CONTACT_MARKERS = (
    "tractafric motors cameroun",
    "showroom",
    "heures d ouverture",
    "atelier heures d ouverture",
    "tractafric motors cam tractafric com",
    "bp 4181",
    "bp 7028",
)


def _is_contact_spec(spec: dict[str, object]) -> bool:
    text = normalized_token(
        f"{spec.get('raw_label', '')} {spec.get('raw_value', '')}"
    )
    return any(marker in text for marker in CONTACT_MARKERS)


def _mapped_spec_count(vehicle: dict[str, object]) -> int:
    specs = vehicle.get("specs") or []
    return sum(
        1
        for spec in specs
        if isinstance(spec, dict) and spec.get("canonical_key")
    )


def _presentation_url(model_url: str) -> str:
    return re.sub(r"/models\.html$", "/show.html", model_url)


def _fetch_official_hyundai_html(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.netloc.lower() not in HYUNDAI_HOSTS:
        raise RuntimeError(f"Unexpected Hyundai presentation URL: {url}")

    robots = RobotFileParser()
    robots.set_url(f"{parsed.scheme}://{parsed.netloc}/robots.txt")
    try:
        robots.read()
    except OSError as exc:
        raise RuntimeError(f"Unable to verify robots.txt for {url}: {exc}") from exc
    if not robots.can_fetch(USER_AGENT, url):
        raise RuntimeError(f"robots.txt disallows AgenAuto pilot access to {url}")

    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.7",
        },
    )
    try:
        with urlopen(request, timeout=20) as response:  # noqa: S310
            final_url = response.geturl()
            final = urlparse(final_url)
            if final.scheme != "https" or final.netloc.lower() not in HYUNDAI_HOSTS:
                raise RuntimeError(
                    f"Unexpected redirect while fetching Hyundai presentation: {final_url}"
                )
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace")
    except OSError as exc:
        raise RuntimeError(f"Unable to fetch official Hyundai page {url}: {exc}") from exc


def extract_palisade_presentation_specs(html: str) -> list[dict[str, object]]:
    soup = BeautifulSoup(html, "html.parser")
    text = normalize_space(soup.get_text(" ", strip=True))
    token = normalized_token(text)
    specs: list[dict[str, object]] = []

    seats = re.search(r"\b(\d{1,2})\s+places\b", text, flags=re.IGNORECASE)
    if seats:
        specs.append(
            {
                "raw_label": "Number of seats",
                "raw_value": seats.group(1),
                "canonical_key": "seats",
                "unit": None,
            }
        )

    horsepower = re.search(r"\b(\d{2,4})\s+chevaux\b", text, flags=re.IGNORECASE)
    if horsepower:
        specs.append(
            {
                "raw_label": "Horse power (HP)",
                "raw_value": horsepower.group(1),
                "canonical_key": "horsepower_hp",
                "unit": "hp",
            }
        )

    if "htrac" in token and "traction integrale" in token:
        specs.append(
            {
                "raw_label": "Transmission",
                "raw_value": "HTRAC traction intégrale",
                "canonical_key": "drivetrain",
                "unit": None,
            }
        )

    return specs


def _rebuild_content_hash(vehicle: dict[str, object]) -> None:
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
    vehicle["content_hash"] = content_hash(factual_text)


def clean_hyundai_dataset(payload: dict[str, object]) -> dict[str, object]:
    vehicles = payload.get("vehicles")
    if not isinstance(vehicles, list):
        raise ValueError("Hyundai dataset has no vehicles list.")

    for vehicle in vehicles:
        if not isinstance(vehicle, dict):
            raise ValueError("Hyundai dataset contains a non-object vehicle.")

        specs = vehicle.get("specs") or []
        vehicle["specs"] = [
            spec
            for spec in specs
            if isinstance(spec, dict) and not _is_contact_spec(spec)
        ]

        if vehicle.get("model") == "Palisade" and _mapped_spec_count(vehicle) < MINIMUM_MAPPED_SPECS:
            source = vehicle.get("source") or {}
            if not isinstance(source, dict) or not source.get("url"):
                raise ValueError("Palisade is missing source provenance.")
            fallback_url = _presentation_url(str(source["url"]))
            html = _fetch_official_hyundai_html(fallback_url)
            fallback_specs = extract_palisade_presentation_specs(html)
            if len(fallback_specs) < MINIMUM_MAPPED_SPECS:
                raise ValueError(
                    "Official Palisade presentation did not expose enough technical facts."
                )
            vehicle["specs"] = fallback_specs
            source["url"] = fallback_url
            source["observed_at"] = utc_now_iso()
            source["source_type"] = "official_web"
            title = BeautifulSoup(html, "html.parser").title
            if title is not None:
                vehicle["page_title"] = normalize_space(title.get_text(" ", strip=True))
            flags = [
                flag
                for flag in (vehicle.get("quality_flags") or [])
                if flag != "few_structured_specs_extracted"
            ]
            flags.append("technical_specs_from_official_presentation_page")
            vehicle["quality_flags"] = list(dict.fromkeys(flags))

        _rebuild_content_hash(vehicle)

    return payload


def validate_tractafric_quality(
    payload: dict[str, object],
    minimum_mapped_specs: int = MINIMUM_MAPPED_SPECS,
) -> None:
    vehicles = payload.get("vehicles")
    if not isinstance(vehicles, list) or not vehicles:
        raise ValueError("Tractafric quality gate requires a non-empty vehicles list.")

    for vehicle in vehicles:
        if not isinstance(vehicle, dict):
            raise ValueError("Tractafric dataset contains a non-object vehicle.")
        brand = vehicle.get("brand")
        model = vehicle.get("model")
        specs = vehicle.get("specs") or []
        contact_specs = [
            spec
            for spec in specs
            if isinstance(spec, dict) and _is_contact_spec(spec)
        ]
        if contact_specs:
            raise ValueError(f"Contact/showroom data leaked into specs for {brand} {model}.")
        mapped = _mapped_spec_count(vehicle)
        if mapped < minimum_mapped_specs:
            raise ValueError(
                f"Expected at least {minimum_mapped_specs} mapped technical specs for "
                f"{brand} {model}, found {mapped}."
            )


def _read_json(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}.")
    return value


def _write_json(path: Path, payload: dict[str, object]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean and validate Tractafric pilot data")
    parser.add_argument("--hyundai", type=Path, required=True)
    parser.add_argument("--mitsubishi", type=Path, required=True)
    args = parser.parse_args()

    hyundai = clean_hyundai_dataset(_read_json(args.hyundai))
    validate_tractafric_quality(hyundai)
    _write_json(args.hyundai, hyundai)

    mitsubishi = _read_json(args.mitsubishi)
    validate_tractafric_quality(mitsubishi)

    print(f"quality-validated {args.hyundai}")
    print(f"quality-validated {args.mitsubishi}")


if __name__ == "__main__":
    main()
