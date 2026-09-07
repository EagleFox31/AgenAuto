import json
from pathlib import Path

import pytest

from agenauto_ingestion.final_pilot_quality import validate_manual_snapshot


def _vehicle() -> dict[str, object]:
    variants = ["TEST"]
    specs = [
        {
            "raw_label": "Fuel type",
            "raw_value": "Essence",
            "canonical_key": "fuel_type",
            "unit": None,
        },
        {
            "raw_label": "Displacement (cc)",
            "raw_value": "2000",
            "canonical_key": "engine_displacement_ml",
            "unit": "mL",
        },
        {
            "raw_label": "Gearbox",
            "raw_value": "Automatic",
            "canonical_key": "transmission",
            "unit": None,
        },
    ]
    import hashlib

    factual = "\n".join(
        [
            *(f"variant: {variant}" for variant in variants),
            *(f"{spec['raw_label']}: {spec['raw_value']}" for spec in specs),
        ]
    )
    return {
        "brand": "Kia",
        "model": "Example",
        "source": {
            "url": "https://www.kiamotorscameroon.com/example",
            "observed_at": "2026-09-07T07:21:00Z",
            "distributor": "KM Auto SA",
            "source_type": "official_web_manual_snapshot",
            "country": "CM",
            "confidence": "A",
        },
        "variants": variants,
        "specs": specs,
        "content_hash": hashlib.sha256(factual.encode("utf-8")).hexdigest(),
        "review_status": "draft",
        "quality_flags": [],
    }


def _write(tmp_path: Path, vehicle: dict[str, object]) -> Path:
    path = tmp_path / "candidates.json"
    path.write_text(
        json.dumps(
            {
                "publication_policy": "draft_only_until_payload_review",
                "vehicles": [vehicle],
            }
        ),
        encoding="utf-8",
    )
    return path


def test_final_pilot_quality_accepts_traceable_canonical_snapshot(tmp_path: Path) -> None:
    path = _write(tmp_path, _vehicle())
    payload = validate_manual_snapshot(
        path,
        expected_brand="Kia",
        minimum_models=1,
        allowed_hosts=frozenset({"www.kiamotorscameroon.com"}),
    )
    assert len(payload["vehicles"]) == 1


def test_final_pilot_quality_rejects_market_data_in_specs(tmp_path: Path) -> None:
    vehicle = _vehicle()
    vehicle["specs"][0]["raw_label"] = "Warranty"
    path = _write(tmp_path, vehicle)
    with pytest.raises(ValueError, match="Market data leaked"):
        validate_manual_snapshot(
            path,
            expected_brand="Kia",
            minimum_models=1,
            allowed_hosts=frozenset({"www.kiamotorscameroon.com"}),
        )


def test_final_pilot_quality_rejects_unknown_canonical_key(tmp_path: Path) -> None:
    vehicle = _vehicle()
    vehicle["specs"][0]["canonical_key"] = "made_up_spec"
    path = _write(tmp_path, vehicle)
    with pytest.raises(ValueError, match="Unknown canonical key"):
        validate_manual_snapshot(
            path,
            expected_brand="Kia",
            minimum_models=1,
            allowed_hosts=frozenset({"www.kiamotorscameroon.com"}),
        )
