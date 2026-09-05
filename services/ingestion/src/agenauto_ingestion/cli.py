from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from urllib.parse import urlparse

from .collectors.sky_motors import ALLOWED_HOSTS, crawl_sky_motors
from .provenance import utc_now_iso

SCHEMA_VERSION = 1


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def validate_dataset(path: Path, minimum_models: int = 5) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    vehicles = payload.get("vehicles", [])
    if len(vehicles) < minimum_models:
        raise ValueError(f"Expected at least {minimum_models} Jetour models, found {len(vehicles)}.")

    models: set[str] = set()
    for vehicle in vehicles:
        if vehicle.get("brand") != "Jetour":
            raise ValueError("Sky Motors pilot dataset may only contain Jetour vehicle candidates.")
        model = vehicle.get("model")
        if not model or model in models:
            raise ValueError(f"Duplicate or missing model in pilot dataset: {model!r}")
        models.add(model)

        source = vehicle.get("source") or {}
        host = urlparse(source.get("url", "")).netloc.lower()
        if host not in ALLOWED_HOSTS:
            raise ValueError(f"Non-official source found for {model}: {source.get('url')}")
        if source.get("confidence") != "A" or not source.get("observed_at"):
            raise ValueError(f"Missing confidence/provenance for {model}.")
        if vehicle.get("review_status") != "draft":
            raise ValueError("Crawler output must remain draft until Payload review.")
        if not vehicle.get("specs"):
            raise ValueError(f"No structured specifications extracted for {model}.")


def run_sky_motors(output_root: Path) -> Path:
    vehicles = asyncio.run(crawl_sky_motors())
    generated_at = utc_now_iso()
    payload = {
        "schema_version": SCHEMA_VERSION,
        "dataset": "cameroon-pilot-sky-motors-jetour",
        "generated_at": generated_at,
        "collector": "sky_motors_jetour",
        "publication_policy": "draft_only_until_payload_review",
        "vehicles": [candidate.to_dict() for candidate in vehicles],
    }
    output_path = output_root / "candidates.json"
    _write_json(output_path, payload)
    _write_json(
        output_root / "manifest.json",
        {
            "schema_version": SCHEMA_VERSION,
            "generated_at": generated_at,
            "vehicle_count": len(vehicles),
            "models": [candidate.model for candidate in vehicles],
            "source_urls": [candidate.source.url for candidate in vehicles],
            "notes": "Factual structured observations only; no marketing copy, images or brochure files.",
        },
    )
    validate_dataset(output_path)
    return output_path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AgenAuto pilot data ingestion")
    subparsers = parser.add_subparsers(dest="command", required=True)

    crawl = subparsers.add_parser("sky-motors", help="Crawl official Sky Motors Jetour pages")
    crawl.add_argument("--output-root", type=Path, required=True)

    validate = subparsers.add_parser("validate", help="Validate a generated pilot dataset")
    validate.add_argument("--input", type=Path, required=True)
    validate.add_argument("--minimum-models", type=int, default=5)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "sky-motors":
        path = run_sky_motors(args.output_root)
        print(path)
        return
    if args.command == "validate":
        validate_dataset(args.input, args.minimum_models)
        print(f"validated {args.input}")
        return
    raise SystemExit(2)


if __name__ == "__main__":
    main()
