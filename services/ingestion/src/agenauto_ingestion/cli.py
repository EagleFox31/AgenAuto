from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path
from urllib.parse import urlparse

from .collectors.cfao import CFAO_BRANDS, crawl_cfao
from .collectors.cfao import DISTRIBUTOR as CFAO_DISTRIBUTOR
from .collectors.sky_motors import (
    ALLOWED_HOSTS as SKY_ALLOWED_HOSTS,
)
from .collectors.sky_motors import (
    DISTRIBUTOR as SKY_DISTRIBUTOR,
)
from .collectors.sky_motors import (
    crawl_sky_motors,
)
from .collectors.tractafric import (
    ALLOWED_HOSTS as TRACTAFRIC_ALLOWED_HOSTS,
)
from .collectors.tractafric import (
    DISTRIBUTOR as TRACTAFRIC_DISTRIBUTOR,
)
from .collectors.tractafric import (
    TRACTAFRIC_BRANDS,
    crawl_tractafric,
)
from .provenance import utc_now_iso

SCHEMA_VERSION = 1


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def validate_dataset(
    path: Path,
    minimum_models: int = 5,
    brands: tuple[str, ...] = (),
    allowed_hosts: tuple[str, ...] = (),
) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    vehicles = payload.get("vehicles", [])
    if len(vehicles) < minimum_models:
        raise ValueError(
            f"Expected at least {minimum_models} models, found {len(vehicles)} in {path}."
        )

    expected_brands = set(brands)
    expected_hosts = {host.lower() for host in allowed_hosts}
    identities: set[tuple[str, str]] = set()

    for vehicle in vehicles:
        brand = vehicle.get("brand")
        model = vehicle.get("model")
        identity = (str(brand or ""), str(model or ""))
        if not brand or not model or identity in identities:
            raise ValueError(f"Duplicate or missing vehicle identity: {identity!r}")
        identities.add(identity)

        if expected_brands and brand not in expected_brands:
            raise ValueError(f"Unexpected brand {brand!r} in {path}.")

        source = vehicle.get("source") or {}
        host = urlparse(source.get("url", "")).netloc.lower()
        if expected_hosts and host not in expected_hosts:
            raise ValueError(
                f"Non-official source found for {brand} {model}: {source.get('url')}"
            )
        if source.get("confidence") != "A" or not source.get("observed_at"):
            raise ValueError(f"Missing confidence/provenance for {brand} {model}.")
        if not source.get("distributor"):
            raise ValueError(f"Missing distributor provenance for {brand} {model}.")
        if vehicle.get("review_status") != "draft":
            raise ValueError("Crawler output must remain draft until Payload review.")
        if not vehicle.get("specs"):
            raise ValueError(
                f"No structured specifications extracted for {brand} {model}."
            )


def _dataset_payload(
    dataset: str,
    collector: str,
    distributor: str,
    vehicles: list[object],
    generated_at: str,
) -> dict[str, object]:
    return {
        "schema_version": SCHEMA_VERSION,
        "dataset": dataset,
        "generated_at": generated_at,
        "collector": collector,
        "distributor": distributor,
        "publication_policy": "draft_only_until_payload_review",
        "vehicles": [candidate.to_dict() for candidate in vehicles],
    }


def run_sky_motors(output_root: Path) -> Path:
    vehicles = asyncio.run(crawl_sky_motors())
    generated_at = utc_now_iso()
    payload = _dataset_payload(
        "cameroon-pilot-sky-motors-jetour",
        "sky_motors_jetour",
        SKY_DISTRIBUTOR,
        vehicles,
        generated_at,
    )
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
            "notes": (
                "Factual structured observations only; no marketing copy, "
                "images or brochure files."
            ),
        },
    )
    validate_dataset(
        output_path,
        brands=("Jetour",),
        allowed_hosts=tuple(sorted(SKY_ALLOWED_HOSTS)),
    )
    return output_path


def run_cfao(output_root: Path) -> list[Path]:
    results = asyncio.run(crawl_cfao())
    generated_at = utc_now_iso()
    output_paths: list[Path] = []
    manifest_brands: list[dict[str, object]] = []

    for config in CFAO_BRANDS:
        vehicles = results[config.slug]
        output_path = output_root / config.slug / "candidates.json"
        _write_json(
            output_path,
            _dataset_payload(
                f"cameroon-pilot-cfao-{config.slug}",
                f"cfao_{config.slug}",
                CFAO_DISTRIBUTOR,
                vehicles,
                generated_at,
            ),
        )
        output_paths.append(output_path)
        manifest_brands.append(
            {
                "brand": config.brand,
                "vehicle_count": len(vehicles),
                "models": [candidate.model for candidate in vehicles],
                "source_urls": [candidate.source.url for candidate in vehicles],
            }
        )

    _write_json(
        output_root / "manifest.json",
        {
            "schema_version": SCHEMA_VERSION,
            "generated_at": generated_at,
            "distributor": CFAO_DISTRIBUTOR,
            "brands": manifest_brands,
            "vehicle_count": sum(len(vehicles) for vehicles in results.values()),
            "notes": (
                "Official CFAO/CAMI factual observations only. Trim names are retained "
                "when exposed by the official model page."
            ),
        },
    )
    return output_paths


def run_tractafric(output_root: Path) -> list[Path]:
    results = asyncio.run(crawl_tractafric())
    generated_at = utc_now_iso()
    output_paths: list[Path] = []
    manifest_brands: list[dict[str, object]] = []

    for config in TRACTAFRIC_BRANDS:
        vehicles = results[config.slug]
        output_path = output_root / config.slug / "candidates.json"
        _write_json(
            output_path,
            _dataset_payload(
                f"cameroon-pilot-tractafric-{config.slug}",
                f"tractafric_{config.slug}",
                TRACTAFRIC_DISTRIBUTOR,
                vehicles,
                generated_at,
            ),
        )
        output_paths.append(output_path)
        manifest_brands.append(
            {
                "brand": config.brand,
                "vehicle_count": len(vehicles),
                "models": [candidate.model for candidate in vehicles],
                "source_urls": [candidate.source.url for candidate in vehicles],
            }
        )

    _write_json(
        output_root / "manifest.json",
        {
            "schema_version": SCHEMA_VERSION,
            "generated_at": generated_at,
            "distributor": TRACTAFRIC_DISTRIBUTOR,
            "brands": manifest_brands,
            "vehicle_count": sum(len(vehicles) for vehicles in results.values()),
            "notes": (
                "Official Tractafric Motors Cameroun factual observations only. "
                "Commercial fields stay outside canonical vehicle specs."
            ),
        },
    )
    return output_paths


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AgenAuto pilot data ingestion")
    subparsers = parser.add_subparsers(dest="command", required=True)

    sky = subparsers.add_parser(
        "sky-motors",
        help="Crawl official Sky Motors Jetour pages",
    )
    sky.add_argument("--output-root", type=Path, required=True)

    cfao = subparsers.add_parser(
        "cfao",
        help="Crawl official CFAO Toyota and Suzuki pages",
    )
    cfao.add_argument("--output-root", type=Path, required=True)

    tractafric = subparsers.add_parser(
        "tractafric",
        help="Crawl official Tractafric Hyundai and Mitsubishi pages",
    )
    tractafric.add_argument("--output-root", type=Path, required=True)

    validate = subparsers.add_parser(
        "validate",
        help="Validate a generated pilot dataset",
    )
    validate.add_argument("--input", type=Path, required=True)
    validate.add_argument("--minimum-models", type=int, default=5)
    validate.add_argument("--brand", action="append", default=[])
    validate.add_argument("--allowed-host", action="append", default=[])
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "sky-motors":
        path = run_sky_motors(args.output_root)
        print(path)
        return
    if args.command == "cfao":
        for path in run_cfao(args.output_root):
            print(path)
        return
    if args.command == "tractafric":
        for path in run_tractafric(args.output_root):
            print(path)
        return
    if args.command == "validate":
        validate_dataset(
            args.input,
            args.minimum_models,
            tuple(args.brand),
            tuple(args.allowed_host),
        )
        print(f"validated {args.input}")
        return
    raise SystemExit(2)


if __name__ == "__main__":
    main()
