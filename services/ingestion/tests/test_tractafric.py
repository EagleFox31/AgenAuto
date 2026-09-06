from agenauto_ingestion.collectors.tractafric import (
    DISTRIBUTOR,
    HYUNDAI,
    MITSUBISHI,
    extract_model_links,
    parse_vehicle_page,
)


def test_tractafric_catalogue_discovery_keeps_hyundai_and_mitsubishi() -> None:
    html = """
    <a href="/fr/vehicle/hyundai/20/nouveau-tucson/show.html">Tucson</a>
    <a href="/fr/vehicle/hyundai/335/nouveau-santa-fe/show.html">Santa Fe</a>
    <a href="/fr/vehicle/mitsubishi/342/nouveau-l200/show.html">L200</a>
    <a href="/fr/vehicle/mitsubishi/283/eclipse-cross/show.html">Eclipse Cross</a>
    <a href="/fr/vehicle/hyundai/20/nouveau-tucson/gallery.html">nested</a>
    <a href="https://example.com/fr/vehicle/hyundai/99/fake/show.html">external</a>
    """
    links = extract_model_links(html)
    assert links["hyundai"] == [
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/20/"
        "nouveau-tucson/show.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/335/"
        "nouveau-santa-fe/show.html",
    ]
    assert links["mitsubishi"] == [
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/283/"
        "eclipse-cross/show.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/342/"
        "nouveau-l200/show.html",
    ]


def test_tractafric_hyundai_page_extracts_factual_specs_only() -> None:
    html = """
    <html>
      <head><title>Nouveau Tucson | Hyundai Cameroun</title></head>
      <body>
        <h1>Nouveau Tucson</h1>
        <h3>Tucson 1.6 T-GDi Premium 7-DCT</h3>
        <table>
          <tr><td>Type de carburant</td><td>Essence</td></tr>
          <tr><td>Cylindrée (ml)</td><td>1598</td></tr>
          <tr><td>Empattement (mm)</td><td>2755</td></tr>
          <tr><td>Nombre de place</td><td>5</td></tr>
          <tr><td>Garantie</td><td>3 ans ou 60 000 km</td></tr>
        </table>
      </body>
    </html>
    """
    candidate = parse_vehicle_page(
        html,
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/20/"
        "nouveau-tucson/show.html",
        HYUNDAI,
        observed_at="2026-09-06T09:30:00Z",
    )

    assert candidate.brand == "Hyundai"
    assert candidate.model == "Tucson"
    assert candidate.source.distributor == DISTRIBUTOR
    assert candidate.source.confidence == "A"
    assert candidate.variants == ("Tucson 1.6 T-GDi Premium 7-DCT",)
    assert any(spec.canonical_key == "engine_displacement_ml" for spec in candidate.specs)
    assert any(spec.canonical_key == "wheelbase_mm" for spec in candidate.specs)
    assert all(spec.raw_label != "Garantie" for spec in candidate.specs)


def test_tractafric_mitsubishi_page_normalizes_new_model_name() -> None:
    html = """
    <html>
      <head><title>NOUVEAU L200 | Mitsubishi Cameroun</title></head>
      <body>
        <h1>NOUVEAU L200</h1>
        <p>Type de carburant : Diesel</p>
        <table>
          <tr><td>Cylindrée (ml)</td><td>2442</td></tr>
          <tr><td>Empattement (mm)</td><td>3130</td></tr>
          <tr><td>Nombre de place</td><td>5</td></tr>
        </table>
      </body>
    </html>
    """
    candidate = parse_vehicle_page(
        html,
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/342/"
        "nouveau-l200/show.html",
        MITSUBISHI,
        observed_at="2026-09-06T09:30:00Z",
    )

    assert candidate.brand == "Mitsubishi"
    assert candidate.model == "L200"
    assert candidate.source.distributor == DISTRIBUTOR
    assert candidate.review_status == "draft"
    assert len(candidate.specs) == 4
