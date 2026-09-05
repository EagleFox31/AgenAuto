from pathlib import Path

from agenauto_ingestion.collectors.sky_motors import extract_vehicle_links, parse_vehicle_page

FIXTURE = Path(__file__).parent / "fixtures" / "sky_motors_t2.html"


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
        observed_at="2026-09-05T20:00:00Z",
    )
    assert candidate.brand == "Jetour"
    assert candidate.model == "T2"
    assert candidate.category == "SUV"
    assert candidate.review_status == "draft"
    assert candidate.source.confidence == "A"
    assert candidate.source.observed_at == "2026-09-05T20:00:00Z"
    assert any(spec.canonical_key == "wheelbase_mm" for spec in candidate.specs)
