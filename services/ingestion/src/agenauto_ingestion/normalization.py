from __future__ import annotations

import re
import unicodedata

from .models import SpecObservation

JETOUR_MODELS = {
    "t1": "T1",
    "t2": "T2",
    "dashing": "Dashing",
    "x50": "X50",
    "x70 plus": "X70 Plus",
    "x70plus": "X70 Plus",
    "x90 plus": "X90 Plus",
    "x90plus": "X90 Plus",
    "g700": "G700",
}

SPEC_ALIASES: dict[str, tuple[str, str | None]] = {
    "categorie": ("body_category", None),
    "nom du modele": ("model_name", None),
    "variantes du produit": ("product_variants", None),
    "etiquette du produit": ("product_variants", None),
    "traction": ("drivetrain", None),
    "longueur x largeur x hauteur mm": ("dimensions_mm", "mm"),
    "longueur largeur hauteur mm": ("dimensions_mm", "mm"),
    "empattement mm": ("wheelbase_mm", "mm"),
    "garde au sol minimale mm": ("ground_clearance_mm", "mm"),
    "nombre de place": ("seats", None),
    "nombre de places pcs": ("seats", None),
    "capacite du reservoir de carburant l": ("fuel_tank_l", "L"),
    "volume du reservoir l": ("fuel_tank_l", "L"),
    "cylindree ml": ("engine_displacement_ml", "mL"),
    "cylindree du moteur": ("engine_displacement_ml", "mL"),
    "puissance maximale kw": ("max_power_kw", "kW"),
    "couple maximal n m": ("max_torque_nm", "N·m"),
    "couple maximum n m": ("max_torque_nm", "N·m"),
    "vitesse maximale km h": ("max_speed_kmh", "km/h"),
    "type de transmission": ("transmission", None),
    "boite de vitesse": ("transmission", None),
    "type de carburant": ("fuel_type", None),
    "consommation": ("consumption_l_100km", "L/100km"),
}


def normalize_space(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").split())


def normalized_token(value: str) -> str:
    ascii_value = unicodedata.normalize("NFD", value)
    ascii_value = "".join(char for char in ascii_value if unicodedata.category(char) != "Mn")
    ascii_value = ascii_value.lower().replace("+", " plus ")
    ascii_value = re.sub(r"[^a-z0-9]+", " ", ascii_value)
    return normalize_space(ascii_value)


def canonical_jetour_model(value: str) -> str | None:
    token = normalized_token(value)
    token = re.sub(r"\bjetour\b", "", token)
    token = normalize_space(token)

    for alias in sorted(JETOUR_MODELS, key=len, reverse=True):
        if re.search(rf"\b{re.escape(alias)}\b", token):
            return JETOUR_MODELS[alias]
    return None


def normalize_spec(label: str, value: str) -> SpecObservation:
    clean_label = normalize_space(label).strip(" :-")
    clean_value = normalize_space(value).strip()
    token = normalized_token(clean_label)
    canonical_key, unit = SPEC_ALIASES.get(token, (None, None))
    return SpecObservation(
        raw_label=clean_label,
        raw_value=clean_value,
        canonical_key=canonical_key,
        unit=unit,
    )
