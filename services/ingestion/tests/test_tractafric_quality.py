import pytest

from agenauto_ingestion.tractafric_quality import (
    clean_hyundai_dataset,
    extract_palisade_presentation_specs,
    validate_tractafric_quality,
)


def test_clean_hyundai_dataset_removes_showroom_contact_specs() -> None:
    payload = {
        "vehicles": [
            {
                "brand": "Hyundai",
                "model": "Tucson",
                "variants": [],
                "specs": [
                    {
                        "raw_label": (
                            "Tractafric Motors Cameroun BP 4181 Douala - Bassa "
                            "Cameroun Showroom Heures d'ouverture"
                        ),
                        "raw_value": "du lundi au vendredi Tél : +237 694 18 70 30",
                        "canonical_key": None,
                        "unit": None,
                    },
                    {
                        "raw_label": "Fuel type",
                        "raw_value": "Essence",
                        "canonical_key": "fuel_type",
                        "unit": None,
                    },
                    {
                        "raw_label": "Transmission",
                        "raw_value": "4x4",
                        "canonical_key": "drivetrain",
                        "unit": None,
                    },
                    {
                        "raw_label": "Number of seats",
                        "raw_value": "5",
                        "canonical_key": "seats",
                        "unit": None,
                    },
                ],
                "quality_flags": [],
            }
        ]
    }

    cleaned = clean_hyundai_dataset(payload)
    specs = cleaned["vehicles"][0]["specs"]

    assert len(specs) == 3
    assert all("Tractafric Motors" not in spec["raw_label"] for spec in specs)
    validate_tractafric_quality(cleaned)


def test_palisade_presentation_extracts_three_canonical_facts() -> None:
    html = """
    <html>
      <head><title>Hyundai All New Palisade | Hyundai Cameroun</title></head>
      <body>
        <p>Un SUV 8 places haut de gamme.</p>
        <p>Son moteur V6 développe 287 chevaux.</p>
        <p>La traction intégrale HTRAC permet de garder le contrôle.</p>
      </body>
    </html>
    """

    specs = extract_palisade_presentation_specs(html)
    mapped = {spec["canonical_key"]: spec["raw_value"] for spec in specs}

    assert mapped == {
        "seats": "8",
        "horsepower_hp": "287",
        "drivetrain": "HTRAC traction intégrale",
    }


def test_quality_gate_rejects_too_few_mapped_specs() -> None:
    payload = {
        "vehicles": [
            {
                "brand": "Hyundai",
                "model": "Palisade",
                "specs": [
                    {
                        "raw_label": "Number of seats",
                        "raw_value": "8",
                        "canonical_key": "seats",
                        "unit": None,
                    },
                    {
                        "raw_label": "Horse power (HP)",
                        "raw_value": "287",
                        "canonical_key": "horsepower_hp",
                        "unit": "hp",
                    },
                ],
            }
        ]
    }

    with pytest.raises(ValueError, match="at least 3 mapped technical specs"):
        validate_tractafric_quality(payload)
