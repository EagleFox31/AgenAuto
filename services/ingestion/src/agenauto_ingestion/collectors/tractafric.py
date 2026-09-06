from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, replace
from itertools import chain
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from crawlee import ConcurrencySettings
from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext
from crawlee.request_loaders import ThrottlingRequestManager
from crawlee.storages import RequestQueue

from ..models import SpecObservation, VehicleCandidate
from ..normalization import (
    canonical_display_model,
    normalize_space,
    normalize_spec,
    normalized_token,
)
from ..provenance import content_hash, official_web_source

DISTRIBUTOR = "Tractafric Motors Cameroun"
CATALOG_URL = "https://www.tractafrictmc-cameroun.com/fr/vehicles/listing.html"
ALLOWED_HOSTS = frozenset(
    {"tractafrictmc-cameroun.com", "www.tractafrictmc-cameroun.com"}
)
MARKET_ONLY_SPEC_LABELS = frozenset(
    {
        "garantie",
        "manufacturer s warranty",
        "manufacturer warranty",
        "retail network",
        "reseau",
        "prix",
        "price",
    }
)
TRIM_MARKERS = frozenset(
    {
        "bva",
        "bvm",
        "dc",
        "gl",
        "gls",
        "glx",
        "h-line",
        "premium",
        "sc",
        "smartstream",
    }
)


@dataclass(frozen=True, slots=True)
class TractafricBrandConfig:
    slug: str
    brand: str
    model_urls: tuple[str, ...]


HYUNDAI = TractafricBrandConfig(
    slug="hyundai",
    brand="Hyundai",
    model_urls=(
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/335/"
        "nouveau-santa-fe/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/325/"
        "nouveau-county/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/360/"
        "all-new-palisade/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/hyundai/20/"
        "tucson/models.html",
    ),
)
MITSUBISHI = TractafricBrandConfig(
    slug="mitsubishi",
    brand="Mitsubishi",
    model_urls=(
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/283/"
        "eclipse-cross/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/284/"
        "outlander/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/342/"
        "nouveau-l200/models.html",
        "https://www.tractafrictmc-cameroun.com/fr/vehicle/mitsubishi/32/"
        "pajero-sport/models.html",
    ),
)
TRACTAFRIC_BRANDS = (HYUNDAI, MITSUBISHI)


def _is_allowed_url(url: str) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme in {"http", "https"}
        and parsed.netloc.lower() in ALLOWED_HOSTS
    )


def _config_from_url(url: str) -> TractafricBrandConfig | None:
    path = urlparse(url).path.lower()
    for config in TRACTAFRIC_BRANDS:
        if f"/vehicle/{config.slug}/" in path:
            return config
    return None


def extract_model_links(
    html: str,
    base_url: str = CATALOG_URL,
) -> dict[str, list[str]]:
    """Parse catalogue HTML when supplied manually; live crawl does not hit it.

    Tractafric's robots policy currently blocks automated access to the catalogue
    listing page. The pilot therefore crawls only the explicit official model URLs
    declared in each brand config.
    """
    soup = BeautifulSoup(html, "html.parser")
    links: dict[str, set[str]] = {
        config.slug: set() for config in TRACTAFRIC_BRANDS
    }

    for anchor in soup.find_all("a", href=True):
        href = normalize_space(str(anchor.get("href") or ""))
        absolute = (
            urljoin(base_url, href)
            .split("#", 1)[0]
            .split("?", 1)[0]
            .rstrip("/")
        )
        if not _is_allowed_url(absolute):
            continue

        config = _config_from_url(absolute)
        if config is None:
            continue

        path = urlparse(absolute).path
        pattern = rf"^/fr/vehicle/{re.escape(config.slug)}/\d+/[^/]+/show\.html$"
        if not re.match(pattern, path, flags=re.IGNORECASE):
            continue
        links[config.slug].add(absolute)

    return {slug: sorted(urls) for slug, urls in links.items()}


def _iter_structured_pairs(soup: BeautifulSoup) -> Iterable[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()

    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) < 2:
            continue
        label = normalize_space(cells[0].get_text(" ", strip=True))
        value = normalize_space(cells[-1].get_text(" ", strip=True))
        pair = (label, value)
        if (
            not label
            or not value
            or len(label) > 120
            or len(value) > 500
            or pair in seen
        ):
            continue
        seen.add(pair)
        yield pair

    for term in soup.find_all("dt"):
        description = term.find_next_sibling("dd")
        if description is None:
            continue
        pair = (
            normalize_space(term.get_text(" ", strip=True)),
            normalize_space(description.get_text(" ", strip=True)),
        )
        if not pair[0] or not pair[1] or pair in seen:
            continue
        seen.add(pair)
        yield pair

    for node in soup.find_all(["li", "p"]):
        text = normalize_space(node.get_text(" ", strip=True))
        if ":" not in text or len(text) > 400:
            continue
        label, value = text.split(":", 1)
        pair = (normalize_space(label), normalize_space(value))
        if (
            not pair[0]
            or not pair[1]
            or len(pair[0]) > 100
            or pair in seen
        ):
            continue
        seen.add(pair)
        yield pair


def _compact_displacement_value(text: str) -> str | None:
    match = re.fullmatch(r"(\d{1,4}(?:[.,]\d{3})?)\s*cc", text, flags=re.IGNORECASE)
    if match is None:
        return None
    value = match.group(1)
    if re.fullmatch(r"\d{1,2}[.,]\d{3}", value):
        return value.replace(".", "").replace(",", "")
    return value


def _iter_compact_model_specs(soup: BeautifulSoup) -> Iterable[tuple[str, str]]:
    """Extract Tractafric's compact model-card facts from unlabeled text nodes."""
    seen: set[tuple[str, str]] = set()
    for raw in soup.stripped_strings:
        text = normalize_space(str(raw))
        token = normalized_token(text)
        pair: tuple[str, str] | None = None

        if token in {"manuelle", "automatique", "manuelle ou automatique"}:
            pair = ("Gearbox", text)
        elif token in {"essence", "diesel"}:
            pair = ("Fuel type", text)
        elif re.fullmatch(r"4x[24]", text, flags=re.IGNORECASE):
            pair = ("Transmission", text)
        else:
            displacement = _compact_displacement_value(text)
            if displacement is not None:
                pair = ("Displacement (cc)", displacement)
            elif re.fullmatch(
                r"[\d\s\u202f.,]+x[\d\s\u202f.,]+x[\d\s\u202f.,]+\s*\(mm\)",
                text,
                flags=re.IGNORECASE,
            ):
                pair = ("Dimensions (Lxwxh) in mm", text.removesuffix("(mm)").strip())
            elif re.fullmatch(r"\d+\s+portes?", text, flags=re.IGNORECASE):
                pair = ("Number of doors", text.split()[0])
            elif re.fullmatch(r"\d+(?:\s*\+\s*\d+)?\s+si[eè]ges?", text, flags=re.IGNORECASE):
                pair = ("Number of seats", re.sub(r"\s+si[eè]ges?$", "", text, flags=re.IGNORECASE))
            elif "cv@tours/min" in token:
                pair = ("Horse power (HP)", text.split("(", 1)[0].strip())
            elif "nm@tours/min" in token:
                pair = ("Max torque Nm", text.split("(", 1)[0].strip())

        if pair is None or pair in seen:
            continue
        seen.add(pair)
        yield pair


def _clean_model_name(value: str, brand: str) -> str:
    clean = canonical_display_model(value, brand)
    clean = re.sub(
        r"^(all[\s-]*new|nouveau|nouvelle|new)\s+",
        "",
        clean,
        flags=re.IGNORECASE,
    )
    return normalize_space(clean).strip(" |-–—")


def _extract_model(
    soup: BeautifulSoup,
    config: TractafricBrandConfig,
    url: str,
) -> str:
    h1 = soup.find("h1")
    candidates = [
        normalize_space(h1.get_text(" ", strip=True)) if h1 else "",
        (
            normalize_space(soup.title.get_text(" ", strip=True)).split("|", 1)[0]
            if soup.title
            else ""
        ),
        urlparse(url).path.rstrip("/").split("/")[-2].replace("-", " "),
    ]
    for candidate in candidates:
        model = _clean_model_name(candidate, config.brand)
        token = normalized_token(model)
        if model and token != config.slug and "tractafric" not in token:
            return model
    raise ValueError(f"Unable to identify {config.brand} model from {url}")


def _looks_like_trim_heading(text: str, model: str) -> bool:
    token = normalized_token(text)
    model_token = normalized_token(model)
    if not text or token == model_token:
        return False
    if len(text) > 120 or len(text.split()) > 16:
        return False
    if text.endswith(".") or "!" in text or "?" in text:
        return False
    if token in {
        "modeles disponibles",
        "modèles disponibles",
        "douala",
        "yaounde",
        "yaoundé",
        "galerie d images",
    }:
        return False
    if re.fullmatch(r"\d+(?:[.,]\d+)?\s*l\s*4x[24]", token):
        return False

    words = set(token.split())
    marker_tokens = {normalized_token(marker) for marker in TRIM_MARKERS}
    if model_token in token:
        residual = normalize_space(token.replace(model_token, ""))
        return bool(residual) and (
            any(char.isdigit() for char in residual)
            or bool(marker_tokens.intersection(residual.split()))
        )
    return (
        bool(marker_tokens.intersection(words))
        or any(char.isdigit() for char in text)
    )


def _extract_variants(soup: BeautifulSoup, model: str) -> tuple[str, ...]:
    variants: list[str] = []
    for heading in soup.find_all(["h1", "h2", "h3", "h4"]):
        text = normalize_space(heading.get_text(" ", strip=True))
        if _looks_like_trim_heading(text, model):
            variants.append(text)
    return tuple(dict.fromkeys(variants))


def _is_market_only_spec(label: str) -> bool:
    return normalized_token(label) in MARKET_ONLY_SPEC_LABELS


def parse_vehicle_page(
    html: str,
    url: str,
    config: TractafricBrandConfig,
    observed_at: str | None = None,
) -> VehicleCandidate:
    if not _is_allowed_url(url) or _config_from_url(url) != config:
        raise ValueError(
            f"{config.brand} collector only accepts official Tractafric URLs."
        )

    soup = BeautifulSoup(html, "html.parser")
    model = _extract_model(soup, config, url)
    title = normalize_space(soup.title.get_text(" ", strip=True)) if soup.title else None
    variants = _extract_variants(soup, model)

    specs: list[SpecObservation] = []
    category: str | None = None
    seen_specs: set[tuple[str, str]] = set()
    pairs = chain(_iter_structured_pairs(soup), _iter_compact_model_specs(soup))
    for label, value in pairs:
        if _is_market_only_spec(label):
            continue
        observation = normalize_spec(label, value)
        signature = (observation.raw_label, observation.raw_value)
        if signature in seen_specs:
            continue
        seen_specs.add(signature)
        specs.append(observation)
        if (
            observation.canonical_key in {"body_category", "body_style"}
            and category is None
        ):
            category = observation.raw_value

    quality_flags: list[str] = []
    if len(specs) < 3:
        quality_flags.append("few_structured_specs_extracted")
    if not variants:
        quality_flags.append("no_trim_names_extracted")
    unmapped = sum(spec.canonical_key is None for spec in specs)
    if specs and unmapped > max(8, len(specs) // 2):
        quality_flags.append("many_unmapped_specs")

    factual_text = "\n".join(
        [
            *(f"variant: {variant}" for variant in variants),
            *(f"{spec.raw_label}: {spec.raw_value}" for spec in specs),
        ]
    )
    return VehicleCandidate(
        brand=config.brand,
        model=model,
        source=official_web_source(url, DISTRIBUTOR, observed_at),
        page_title=title,
        category=category,
        variants=variants,
        specs=tuple(specs),
        content_hash=content_hash(factual_text),
        quality_flags=tuple(quality_flags),
    )


def is_usable_vehicle_candidate(candidate: VehicleCandidate) -> bool:
    return "tractafric" not in normalized_token(candidate.model) and bool(candidate.specs)


def _candidate_preference_key(
    candidate: VehicleCandidate,
) -> tuple[int, int, int, int, str]:
    mapped_specs = sum(spec.canonical_key is not None for spec in candidate.specs)
    return (
        -mapped_specs,
        -len(candidate.specs),
        -len(candidate.variants),
        len(candidate.quality_flags),
        candidate.source.url,
    )


def dedupe_vehicle_candidates(
    candidates: Iterable[VehicleCandidate],
) -> list[VehicleCandidate]:
    grouped: dict[tuple[str, str], list[VehicleCandidate]] = {}
    for candidate in candidates:
        grouped.setdefault((candidate.brand, candidate.model), []).append(candidate)

    output: list[VehicleCandidate] = []
    for key in sorted(grouped):
        group = grouped[key]
        chosen = sorted(group, key=_candidate_preference_key)[0]
        if len(group) > 1:
            flags = tuple(
                dict.fromkeys((*chosen.quality_flags, "duplicate_model_pages_detected"))
            )
            chosen = replace(chosen, quality_flags=flags)
        output.append(chosen)
    return output


async def _build_crawler(
    queue_name: str,
    max_requests_per_crawl: int,
) -> BeautifulSoupCrawler:
    request_queue = await RequestQueue.open(name=queue_name)
    request_manager = ThrottlingRequestManager(
        inner=request_queue,
        domains=sorted(ALLOWED_HOSTS),
        request_manager_opener=RequestQueue.open,
    )
    concurrency = ConcurrencySettings(
        min_concurrency=1,
        desired_concurrency=2,
        max_concurrency=2,
        max_tasks_per_minute=30,
    )
    return BeautifulSoupCrawler(
        request_manager=request_manager,
        concurrency_settings=concurrency,
        max_requests_per_crawl=max_requests_per_crawl,
        respect_robots_txt_file=True,
    )


async def discover_model_urls() -> dict[str, list[str]]:
    """Return the explicit pilot URLs without crawling the robots-blocked listing."""
    discovered: dict[str, list[str]] = {}
    for config in TRACTAFRIC_BRANDS:
        urls = sorted(config.model_urls)
        if not urls:
            raise RuntimeError(f"No Tractafric pilot URLs configured for {config.brand}.")
        if any(not _is_allowed_url(url) or _config_from_url(url) != config for url in urls):
            raise RuntimeError(f"Invalid Tractafric pilot URL configured for {config.brand}.")
        discovered[config.slug] = urls
    return discovered


async def crawl_tractafric() -> dict[str, list[VehicleCandidate]]:
    urls_by_brand = await discover_model_urls()
    results: dict[str, list[VehicleCandidate]] = {}

    for config in TRACTAFRIC_BRANDS:
        urls = urls_by_brand[config.slug]
        candidates: list[VehicleCandidate] = []
        crawler = await _build_crawler(
            f"tractafric-{config.slug}-vehicles",
            len(urls),
        )

        @crawler.router.default_handler
        async def handle_vehicle(
            context: BeautifulSoupCrawlingContext,
            _config: TractafricBrandConfig = config,
            _candidates: list[VehicleCandidate] = candidates,
        ) -> None:
            candidate = parse_vehicle_page(
                str(context.soup),
                str(context.request.url),
                _config,
            )
            if is_usable_vehicle_candidate(candidate):
                _candidates.append(candidate)

        await crawler.run(urls)
        results[config.slug] = dedupe_vehicle_candidates(candidates)

    return results
