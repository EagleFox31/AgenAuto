from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class SourceReference:
    url: str
    observed_at: str
    source_type: str = "official_web"
    distributor: str = "Sky Motors Company"
    country: str = "CM"
    confidence: str = "A"


@dataclass(frozen=True, slots=True)
class SpecObservation:
    raw_label: str
    raw_value: str
    canonical_key: str | None = None
    unit: str | None = None


@dataclass(frozen=True, slots=True)
class VehicleCandidate:
    brand: str
    model: str
    source: SourceReference
    page_title: str | None = None
    category: str | None = None
    variants: tuple[str, ...] = ()
    specs: tuple[SpecObservation, ...] = ()
    content_hash: str | None = None
    review_status: str = "draft"
    quality_flags: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
