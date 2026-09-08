from __future__ import annotations

import re
import unicodedata
from io import BytesIO
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import pdfplumber

USER_AGENT = "AgenAuto/0.1 (+https://github.com/EagleFox31/AgenAuto)"
_HEADER_HINTS = ("caracteristiques techniques", "technical specifications", "versions", "version")
_SPEC_WORDS = {
    "cylindree",
    "displacement",
    "fuel",
    "carburant",
    "puissance",
    "power",
    "couple",
    "torque",
    "dimensions",
    "garde au sol",
    "ground clearance",
    "poids",
    "weight",
    "boite",
    "gearbox",
    "transmission",
    "drivetrain",
    "places",
    "seats",
    "empattement",
    "wheelbase",
}


def _plain(value: object) -> str:
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def _key(value: object) -> str:
    return re.sub(r"[^a-z0-9]+", " ", _plain(value).lower()).strip()


def fetch_pdf(url: str, *, allowed_hosts: frozenset[str], timeout: int = 30) -> bytes:
    host = urlparse(url).netloc.lower()
    if host not in allowed_hosts:
        raise ValueError(f"Refusing non-official brochure host: {host}")
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/pdf,*/*"})
    with urlopen(request, timeout=timeout) as response:  # noqa: S310 - host is allow-listed above
        content_type = str(response.headers.get("Content-Type") or "").lower()
        payload = response.read()
    if not payload.startswith(b"%PDF") and "pdf" not in content_type:
        raise ValueError(f"Expected a PDF from {url}, received {content_type or 'unknown content type'}.")
    return payload


def extract_tables(pdf_bytes: bytes) -> list[list[list[str]]]:
    output: list[list[list[str]]] = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                cleaned: list[list[str]] = []
                for row in table:
                    cells = [re.sub(r"\s+", " ", str(cell or "")).strip() for cell in row]
                    if any(cells):
                        cleaned.append(cells)
                if cleaned:
                    output.append(cleaned)
    return output


def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        return "\n".join((page.extract_text() or "") for page in pdf.pages)


def _looks_like_trim(value: str, *, model: str) -> bool:
    value = re.sub(r"\s+", " ", value).strip(" :-–—")
    if not value or len(value) > 48:
        return False
    lowered = _key(value)
    if not lowered or lowered == _key(model):
        return False
    if any(word in lowered for word in _SPEC_WORDS):
        return False
    if re.fullmatch(r"[\d\s.,/+x×-]+", lowered):
        return False
    if len(re.findall(r"[A-Za-zÀ-ÿ]", value)) < 3:
        return False
    return True


def _header_index(table: list[list[str]], *, model: str) -> tuple[int, list[str]] | None:
    for index, row in enumerate(table[:12]):
        cells = [cell.strip() for cell in row]
        row_key = _key(" ".join(cells))
        hinted = any(hint in row_key for hint in _HEADER_HINTS)
        candidates = [cell for cell in cells[1:] if _looks_like_trim(cell, model=model)]
        if hinted and candidates:
            return index, candidates
        if len(candidates) >= 2:
            first = _key(cells[0]) if cells else ""
            if not first or any(hint in first for hint in _HEADER_HINTS):
                return index, candidates
    return None


def extract_trim_matrix(
    pdf_bytes: bytes,
    *,
    model: str,
    known_specs: list[dict[str, object]],
) -> tuple[list[str], dict[str, list[dict[str, object]]]]:
    """Extract brochure trim headers and trim-scoped rows without guessing missing values.

    Existing normalized specs provide the label dictionary. A row is promoted only when its
    brochure label can be matched to an already registered observation label.
    """

    label_meta = {
        _key(spec.get("raw_label")): spec
        for spec in known_specs
        if isinstance(spec, dict) and spec.get("raw_label")
    }

    best_trims: list[str] = []
    best_specs: dict[str, list[dict[str, object]]] = {}

    for table in extract_tables(pdf_bytes):
        header = _header_index(table, model=model)
        if header is None:
            continue
        header_index, trims = header
        header_row = table[header_index]
        trim_columns: list[tuple[int, str]] = []
        for column, cell in enumerate(header_row[1:], start=1):
            if _looks_like_trim(cell, model=model):
                trim_columns.append((column, re.sub(r"\s+", " ", cell).strip()))
        if not trim_columns:
            continue

        scoped = {trim: [] for _, trim in trim_columns}
        for row in table[header_index + 1 :]:
            if not row:
                continue
            raw_label = row[0].strip()
            meta = label_meta.get(_key(raw_label))
            if meta is None:
                continue
            for column, trim in trim_columns:
                value = row[column].strip() if column < len(row) else ""
                if not value or value in {"-", "—", "–"}:
                    continue
                scoped[trim].append(
                    {
                        "raw_label": raw_label,
                        "raw_value": value,
                        "canonical_key": meta.get("canonical_key"),
                        "unit": meta.get("unit"),
                    }
                )

        score = sum(len(items) for items in scoped.values())
        best_score = sum(len(items) for items in best_specs.values())
        if score > best_score or (score == best_score and len(trim_columns) > len(best_trims)):
            best_trims = [trim for _, trim in trim_columns]
            best_specs = scoped

    return best_trims, best_specs


def has_reliable_trim_scope(
    trims: list[str],
    variant_specs: dict[str, list[dict[str, object]]],
    *,
    minimum_specs_per_trim: int = 3,
) -> bool:
    if not trims or set(trims) != set(variant_specs):
        return False
    return all(len(variant_specs[trim]) >= minimum_specs_per_trim for trim in trims)
