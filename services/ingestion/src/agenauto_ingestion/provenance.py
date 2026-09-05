from __future__ import annotations

from datetime import UTC, datetime
from hashlib import sha256

from .models import SourceReference


def utc_now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def content_hash(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def official_web_source(url: str, observed_at: str | None = None) -> SourceReference:
    return SourceReference(url=url, observed_at=observed_at or utc_now_iso())
