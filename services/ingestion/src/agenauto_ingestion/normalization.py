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
    "body style": ("body_style", None),
    "nom du modele": ("model_name", None),
    "variantes du produit": ("product_variants", None),
    "etiquette du produit": ("product_variants", None),
    "traction": ("drivetrain", None),
    "transmission": ("drivetrain", None),
    "longueur x largeur x hauteur mm": ("dimensions_mm", "mm"),
    "longueur largeur hauteur mm": ("dimensions_mm", "mm"),
    "dimensions lxwxh in mm": ("dimensions_mm", "mm"),
    "empattement mm": ("wheelbase_mm", "mm"),
    "wheelbase mm": ("wheelbase_mm", "mm"),
    "garde au sol minimale mm": ("ground_clearance_mm", "mm"),
    "ground clearance mm": ("ground_clearance_mm", "mm"),
    "nombre de place": ("seats", None),
    "nombre de places pcs": ("seats", None),
    "number of seats": ("seats", None),
    "capacite du reservoir de carburant l": ("fuel_tank_l", "L"),
    "volume du reservoir l": ("fuel_tank_l", "L"),
    "fuel tank capacity l": ("fuel_tank_l", "L"),
    "cylindree ml": ("engine_displacement_ml", "mL"),
    "cylindree du moteur": ("engine_displacement_ml", "mL"),
    "displacement cc": ("engine_displacement_ml", "mL"),
    "puissance maximale kw": ("max_power_kw", "kW"),
    "max power kw rpm": ("max_power_kw_rpm", None),
    "horse power hp": ("horsepower_hp", "hp"),
    "couple maximal n m": ("max_torque_nm", "N·m"),
    "couple maximum n m": ("max_torque_nm", "N·m"),
    "max torque nm": ("max_torque_nm", "N·m"),
    "vitesse maximale km h": ("max_speed_kmh", "km/h"),
    "max speed km h": ("max_speed_kmh", "km/h"),
    "type de transmission": ("transmission", None),
    "boite de vitesse": ("transmission", None),
    "gearbox": ("transmission", None),
    "type de carburant": ("fuel_type", None),
    "fuel type": ("fuel_type", None),
    "consommation": ("consumption_l_100km", "L/100km"),
    "consumption mixed cycle l 100km": ("consumption_l_100km", "L/100km"),
    "curb weight kg": ("curb_weight_kg", "kg"),
    "gross vehicle weight kg": ("gross_vehicle_weight_kg", "kg"),
    "payload kg": ("payload_kg", "kg"),
    "braked towing capacity kg": ("braked_towing_capacity_kg", "kg"),
    "number of doors": ("doors", None),
    "tyre dimension": ("tyre_dimension", None),
    "manufacturer s warranty": ("manufacturer_warranty", None),
    "manufacturer warranty": ("manufacturer_warranty", None),
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


def canonical_display_model(value: str, brand: str) -> str:
    clean = normalize_space(value).strip(" |-–—")
    clean = re.sub(rf"^{re.escape(brand)}\s*[-:–—]?\s*", "", clean, flags=re.IGNORECASE)
    clean = re.sub(r"^(new|nouveau|nouvelle)\s+", "", clean, flags=re.IGNORECASE)
    return normalize_space(clean).strip(" |-–—")


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
