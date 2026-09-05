from agenauto_ingestion.collectors.cfao import (
    DISTRIBUTOR,
    TOYOTA,
    extract_model_links,
    is_usable_vehicle_candidate,
    parse_vehicle_page,
)


def test_cfao_catalogue_discovery_keeps_direct_official_model_pages() -> None:
    html = """
    <a href="/en/range/toyota-cameroon-cami/hilux">Hilux</a>
    <a href="https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami/corolla-cross">
      Corolla Cross
    </a>
    <a href="/en/range/toyota-cameroon-cami/hilux/spec-sheet">nested</a>
    <a href="https://example.com/en/range/toyota-cameroon-cami/rav4">external</a>
    """
    assert extract_model_links(html, TOYOTA) == [
        "https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami/corolla-cross",
        "https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami/hilux",
    ]


def test_cfao_vehicle_page_extracts_trim_names_specs_and_provenance() -> None:
    html = """
    <html>
      <head><title>HILUX | TOYOTA</title></head>
      <body>
        <h1>Toyota-Hilux</h1>
        <h3>
          The Toyota Hilux combines legendary toughness with comfort and technology.
        </h3>
        <h3>Hilux 2.4GD Comfort Single Cab 6-MT 4x4</h3>
        <p>Fuel type : Diesel</p>
        <p>Dimensions (Lxwxh) in mm : 5325 x 1800 x 1795</p>
        <table>
          <tr><td>Displacement (cc)</td><td>2393</td></tr>
          <tr><td>Wheelbase (mm)</td><td>3085</td></tr>
          <tr><td>Number of seats</td><td>3</td></tr>
          <tr><td>Fuel tank capacity (L)</td><td>80</td></tr>
          <tr><td>Gearbox</td><td>Manual</td></tr>
          <tr><td>Manufacturer Warranty</td><td>3 years / 100.000 km</td></tr>
          <tr><td>Retail Network</td><td>TOYOTA</td></tr>
        </table>
      </body>
    </html>
    """
    candidate = parse_vehicle_page(
        html,
        "https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami/hilux",
        TOYOTA,
        observed_at="2026-09-05T21:40:00Z",
    )

    assert candidate.brand == "Toyota"
    assert candidate.model == "Hilux"
    assert candidate.source.distributor == DISTRIBUTOR
    assert candidate.source.confidence == "A"
    assert candidate.review_status == "draft"
    assert candidate.variants == ("Hilux 2.4GD Comfort Single Cab 6-MT 4x4",)
    assert any(spec.canonical_key == "engine_displacement_ml" for spec in candidate.specs)
    assert any(spec.canonical_key == "wheelbase_mm" for spec in candidate.specs)
    assert any(spec.canonical_key == "fuel_tank_l" for spec in candidate.specs)
    assert all(spec.raw_label != "Manufacturer Warranty" for spec in candidate.specs)
    assert all(spec.raw_label != "Retail Network" for spec in candidate.specs)
    assert is_usable_vehicle_candidate(candidate)


def test_cfao_generic_landing_content_is_not_a_vehicle_candidate() -> None:
    html = """
    <html>
      <head><title>CFAO MOBILITY - Toyota Cameroon</title></head>
      <body><h1>CFAO MOBILITY - Toyota Cameroon</h1></body>
    </html>
    """
    candidate = parse_vehicle_page(
        html,
        "https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami/legacy-link",
        TOYOTA,
        observed_at="2026-09-05T21:40:00Z",
    )

    assert candidate.model == "CFAO MOBILITY - Toyota Cameroon"
    assert candidate.specs == ()
    assert not is_usable_vehicle_candidate(candidate)
