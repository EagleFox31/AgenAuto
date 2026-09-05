from agenauto_ingestion.normalization import canonical_jetour_model, normalize_spec


def test_jetour_model_aliases_are_canonicalized() -> None:
    assert canonical_jetour_model("JETOUR X70+") == "X70 Plus"
    assert canonical_jetour_model("/jetour-x90-plus") == "X90 Plus"
    assert canonical_jetour_model("Jetour DASHING") == "Dashing"


def test_known_spec_is_mapped_to_canonical_dictionary_key() -> None:
    spec = normalize_spec("Empattement (mm)", "2800")
    assert spec.canonical_key == "wheelbase_mm"
    assert spec.unit == "mm"
    assert spec.raw_value == "2800"
