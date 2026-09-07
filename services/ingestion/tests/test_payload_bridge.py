from pathlib import Path

from agenauto_ingestion.payload_bridge import (
    build_payload_import_plan,
    normalize_specification_key,
    stable_candidate_key,
)

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_complete_pilot_builds_payload_review_plan_without_fabricated_generations() -> None:
    plan = build_payload_import_plan(REPO_ROOT / "data" / "pilot")
    summary = plan["summary"]

    assert summary["brand_count"] == 8
    assert summary["model_count"] == 59
    assert summary["candidate_count"] == 59
    assert summary["blocked_candidate_count"] == 59
    assert summary["ready_for_trim_promotion_count"] == 0

    brand_names = {operation["name"] for operation in plan["brands"]}
    assert brand_names == {
        "GWM",
        "Haval",
        "Hyundai",
        "Jetour",
        "Kia",
        "Mitsubishi",
        "Suzuki",
        "Toyota",
    }

    for candidate in plan["reviewCandidates"]:
        blocker_codes = {blocker["code"] for blocker in candidate["promotionBlockers"]}
        assert "missing_generation_identity" in blocker_codes


def test_payload_dictionary_keys_match_payload_normalization_contract() -> None:
    plan = build_payload_import_plan(REPO_ROOT / "data" / "pilot")

    for definition in plan["specificationDefinitions"]:
        assert definition["key"] == normalize_specification_key(definition["sourceKey"])
        assert "_" not in definition["key"]


def test_candidate_key_is_stable_when_only_observed_content_changes() -> None:
    candidate = {
        "brand": "Toyota",
        "model": "Hilux",
        "source": {"url": "https://example.test/hilux"},
        "content_hash": "first",
    }
    updated = {**candidate, "content_hash": "second"}

    assert stable_candidate_key(candidate) == stable_candidate_key(updated)
