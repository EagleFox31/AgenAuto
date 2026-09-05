from pathlib import Path

from agenauto_ingestion.collectors.sky_motors import (
    dedupe_vehicle_candidates,
    extract_vehicle_links,
    parse_vehicle_page,
)
from agenauto_ingestion.models import SpecObservation, VehicleCandidate
from agenauto_ingestion.provenance import official_web_source

FIXTURE = Path(__file__).parent / "fixtures" / "sky_motors_t2.html"
OBSERVED_AT = "2026-09-05T20:00:00Z"


def test_catalogue_link_discovery_keeps_only_official_jetour_pages() -> None:
    html = """
    <a href="/jetour-t2">T2</a>
    <a href="https://www.skymotors-cameroun.com/jetour-x70-plus">X70 Plus</a>
    <a href="/jmc-grand-avenue">JMC</a>
    <a href="https://example.com/jetour-t1">external</a>
    """
    assert extract_vehicle_links(html) == [
        "https://www.skymotors-cameroun.com/jetour-t2",
        "https://www.skymotors-cameroun.com/jetour-x70-plus",
    ]


def test_vehicle_page_preserves_provenance_and_stays_draft() -> None:
    candidate = parse_vehicle_page(
        FIXTURE.read_text(encoding="utf-8"),
        "https://www.skymotors-cameroun.com/jetour-t2",
        observed_at=OBSERVED_AT,
    )
    assert candidate.brand == "Jetour"
    assert candidate.model == "T2"
    assert candidate.category == "SUV"
    assert candidate.review_status == "draft"
    assert candidate.source.confidence == "A"
    assert candidate.source.observed_at == OBSERVED_AT
    assert any(spec.canonical_key == "wheelbase_mm" for spec in candidate.specs)


def test_duplicate_model_pages_keep_richest_traceable_candidate() -> None:
    weak = VehicleCandidate(
        brand="Jetour",
        model="T1",
        source=official_web_source(
            "https://www.skymotors-cameroun.com/jetour-t1-overview",
            OBSERVED_AT,
        ),
        specs=(SpecObservation(raw_label="Motorisation", raw_value="Essence"),),
    )
    rich = VehicleCandidate(
        brand="Jetour",
        model="T1",
        source=official_web_source(
            "https://www.skymotors-cameroun.com/jetour-t1",
            OBSERVED_AT,
        ),
        specs=(
            SpecObservation(
                raw_label="Empattement",
                raw_value="2800 mm",
                canonical_key="wheelbase_mm",
                unit="mm",
            ),
            SpecObservation(
                raw_label="Places",
                raw_value="5",
                canonical_key="seats",
            ),
        ),
    )

    result = dedupe_vehicle_candidates([weak, rich])

    assert len(result) == 1
    assert result[0].source.url == rich.source.url
    assert len(result[0].specs) == 2
    assert "duplicate_model_pages_detected" in result[0].quality_flags
