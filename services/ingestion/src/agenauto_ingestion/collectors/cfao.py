from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, replace
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

DISTRIBUTOR = "CFAO Mobility Cameroon (CAMI Motors)"


@dataclass(frozen=True, slots=True)
class CfaoBrandConfig:
    slug: str
    brand: str
    catalog_url: str
    path_prefix: str
    allowed_hosts: frozenset[str]


TOYOTA = CfaoBrandConfig(
    slug="toyota",
    brand="Toyota",
    catalog_url="https://toyota.cami-cfao.com/en/range/toyota-cameroon-cami",
    path_prefix="/en/range/toyota-cameroon-cami/",
    allowed_hosts=frozenset({"toyota.cami-cfao.com"}),
)

SUZUKI = CfaoBrandConfig(
    slug="suzuki",
    brand="Suzuki",
    catalog_url="https://suzuki.cami-cfao.com/en/range/suzuki-cameroon-cami",
    path_prefix="/en/range/suzuki-cameroon-cami/",
    allowed_hosts=frozenset({"suzuki.cami-cfao.com"}),
)

CFAO_BRANDS = (TOYOTA, SUZUKI)


def _is_allowed_url(url: str, config: CfaoBrandConfig) -> bool:
    parsed = urlparse(url)
    return (
        parsed.scheme in {"http", "https"}
        and parsed.netloc.lower() in config.allowed_hosts
    )


def extract_model_links(
    html: str,
    config: CfaoBrandConfig,
    base_url: str | None = None,
) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: set[str] = set()
    origin = base_url or config.catalog_url

    for anchor in soup.find_all("a", href=True):
        href = normalize_space(str(anchor.get("href") or ""))
        absolute = urljoin(origin, href).split("#", 1)[0].split("?", 1)[0].rstrip("/")
        if not _is_allowed_url(absolute, config):
            continue

        path = urlparse(absolute).path.rstrip("/") + "/"
        if not path.startswith(config.path_prefix):
            continue
        remainder = path[len(config.path_prefix) :].strip("/")
        if not remainder or "/" in remainder:
            continue
        links.add(absolute)

    return sorted(links)


def _iter_structured_pairs(soup: BeautifulSoup) -> Iterable[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()

    for row in soup.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) < 2:
            continue
        label = normalize_space(cells[0].get_text(" ", strip=True))
        value = normalize_space(cells[-1].get_text(" ", strip=True))
        pair = (label, value)
        if not label or not value or len(label) > 120 or len(value) > 500 or pair in seen:
            continue
        seen.add(pair)
        yield pair

    for node in soup.find_all(["li", "p"]):
        text = normalize_space(node.get_text(" ", strip=True))
        if ":" not in text or len(text) > 500:
            continue
        label, value = text.split(":", 1)
        pair = (normalize_space(label), normalize_space(value))
        if not pair[0] or not pair[1] or len(pair[0]) > 120 or pair in seen:
            continue
        seen.add(pair)
        yield pair


def _extract_model(soup: BeautifulSoup, config: CfaoBrandConfig, url: str) -> str:
    h1 = soup.find("h1")
    heading = normalize_space(h1.get_text(" ", strip=True)) if h1 else ""
    if not heading and soup.title:
        heading = normalize_space(soup.title.get_text(" ", strip=True)).split("|", 1)[0]
    model = canonical_display_model(heading, config.brand)
    if not model:
        slug = urlparse(url).path.rstrip("/").rsplit("/", 1)[-1].replace("-", " ")
        model = canonical_display_model(slug, config.brand)
    if not model:
        raise ValueError(f"Unable to identify {config.brand} model from {url}")
    return model


def _extract_variants(soup: BeautifulSoup, model: str) -> tuple[str, ...]:
    variants: list[str] = []
    model_token = normalized_token(model)

    for heading in soup.find_all(["h3", "h4"]):
        text = normalize_space(heading.get_text(" ", strip=True))
        token = normalized_token(text)
        if not text or token == model_token:
            continue
        if model_token not in token:
            continue
        if "technical specifications" in token:
            continue
        variants.append(text)

    return tuple(dict.fromkeys(variants))


def parse_vehicle_page(
    html: str,
    url: str,
    config: CfaoBrandConfig,
    observed_at: str | None = None,
) -> VehicleCandidate:
    if not _is_allowed_url(url, config):
        raise ValueError(f"{config.brand} collector only accepts official CFAO URLs.")

    soup = BeautifulSoup(html, "html.parser")
    model = _extract_model(soup, config, url)
    title = normalize_space(soup.title.get_text(" ", strip=True)) if soup.title else None
    variants = _extract_variants(soup, model)

    specs: list[SpecObservation] = []
    category: str | None = None
    seen_specs: set[tuple[str, str]] = set()
    for label, value in _iter_structured_pairs(soup):
        observation = normalize_spec(label, value)
        signature = (observation.raw_label, observation.raw_value)
        if signature in seen_specs:
            continue
        seen_specs.add(signature)
        specs.append(observation)
        if observation.canonical_key in {"body_category", "body_style"} and category is None:
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


def _candidate_preference_key(candidate: VehicleCandidate) -> tuple[int, int, int, int, str]:
    mapped_specs = sum(spec.canonical_key is not None for spec in candidate.specs)
    return (
        -mapped_specs,
        -len(candidate.specs),
        -len(candidate.variants),
        len(candidate.quality_flags),
        candidate.source.url,
    )


def dedupe_vehicle_candidates(candidates: Iterable[VehicleCandidate]) -> list[VehicleCandidate]:
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
    config: CfaoBrandConfig,
    queue_name: str,
    max_requests_per_crawl: int,
) -> BeautifulSoupCrawler:
    request_queue = await RequestQueue.open(name=queue_name)
    request_manager = ThrottlingRequestManager(
        inner=request_queue,
        domains=sorted(config.allowed_hosts),
        request_manager_opener=RequestQueue.open,
    )
    concurrency = ConcurrencySettings(max_concurrency=2, max_tasks_per_minute=30)
    return BeautifulSoupCrawler(
        request_manager=request_manager,
        concurrency_settings=concurrency,
        max_requests_per_crawl=max_requests_per_crawl,
        respect_robots_txt_file=True,
    )


async def discover_model_urls(config: CfaoBrandConfig) -> list[str]:
    discovered: set[str] = set()
    crawler = await _build_crawler(config, f"cfao-{config.slug}-catalog", 1)

    @crawler.router.default_handler
    async def handle_catalog(context: BeautifulSoupCrawlingContext) -> None:
        discovered.update(
            extract_model_links(str(context.soup), config, str(context.request.url))
        )

    await crawler.run([config.catalog_url])
    if not discovered:
        raise RuntimeError(f"CFAO {config.brand} catalogue returned no model links.")
    return sorted(discovered)


async def crawl_cfao_brand(config: CfaoBrandConfig) -> list[VehicleCandidate]:
    urls = await discover_model_urls(config)
    candidates: list[VehicleCandidate] = []
    crawler = await _build_crawler(config, f"cfao-{config.slug}-vehicles", len(urls))

    @crawler.router.default_handler
    async def handle_vehicle(context: BeautifulSoupCrawlingContext) -> None:
        candidates.append(
            parse_vehicle_page(str(context.soup), str(context.request.url), config)
        )

    await crawler.run(urls)
    return dedupe_vehicle_candidates(candidates)


async def crawl_cfao() -> dict[str, list[VehicleCandidate]]:
    results: dict[str, list[VehicleCandidate]] = {}
    for config in CFAO_BRANDS:
        results[config.slug] = await crawl_cfao_brand(config)
    return results
