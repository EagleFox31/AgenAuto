from __future__ import annotations

from collections.abc import Iterable
from dataclasses import replace
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from crawlee.crawlers import BeautifulSoupCrawler, BeautifulSoupCrawlingContext
from crawlee.request_loaders import ThrottlingRequestManager
from crawlee.storages import RequestQueue

from ..models import SpecObservation, VehicleCandidate
from ..normalization import canonical_jetour_model, normalize_space, normalize_spec
from ..provenance import content_hash, official_web_source

BASE_URL = "https://www.skymotors-cameroun.com"
CATALOG_URL = f"{BASE_URL}/tous-les-vehicules"
ALLOWED_HOSTS = {"skymotors-cameroun.com", "www.skymotors-cameroun.com"}


def _is_allowed_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and parsed.netloc.lower() in ALLOWED_HOSTS


def extract_vehicle_links(html: str, base_url: str = CATALOG_URL) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    links: set[str] = set()

    for anchor in soup.find_all("a", href=True):
        href = normalize_space(str(anchor.get("href") or ""))
        absolute = urljoin(base_url, href)
        if not _is_allowed_url(absolute):
            continue
        if canonical_jetour_model(urlparse(absolute).path) is None:
            continue
        links.add(absolute.split("#", 1)[0].rstrip("/"))

    return sorted(links)


def _iter_colon_pairs(soup: BeautifulSoup) -> Iterable[tuple[str, str]]:
    seen: set[tuple[str, str]] = set()

    for node in soup.find_all(["li", "p"]):
        text = normalize_space(node.get_text(" ", strip=True))
        if ":" not in text or len(text) > 500:
            continue
        label, value = text.split(":", 1)
        pair = (normalize_space(label), normalize_space(value))
        if not pair[0] or not pair[1] or pair in seen:
            continue
        seen.add(pair)
        yield pair


def parse_vehicle_page(
    html: str,
    url: str,
    observed_at: str | None = None,
) -> VehicleCandidate:
    if not _is_allowed_url(url):
        raise ValueError("Sky Motors collector only accepts official Sky Motors URLs.")

    soup = BeautifulSoup(html, "html.parser")
    title = normalize_space(soup.title.get_text(" ", strip=True)) if soup.title else None
    h1 = soup.find("h1")
    heading = normalize_space(h1.get_text(" ", strip=True)) if h1 else ""
    model = canonical_jetour_model(f"{url} {heading} {title or ''}")
    if model is None:
        raise ValueError(f"Unable to identify a Jetour model from {url}")

    specs: list[SpecObservation] = []
    category: str | None = None
    variants: list[str] = []
    quality_flags: list[str] = []

    for label, value in _iter_colon_pairs(soup):
        observation = normalize_spec(label, value)
        specs.append(observation)
        if observation.canonical_key == "body_category":
            category = observation.raw_value
        if observation.canonical_key == "product_variants":
            variants.append(observation.raw_value)

    if not specs:
        quality_flags.append("no_structured_specs_extracted")
    if sum(spec.canonical_key is None for spec in specs) > max(5, len(specs) // 2):
        quality_flags.append("many_unmapped_specs")

    factual_text = "\n".join(f"{spec.raw_label}: {spec.raw_value}" for spec in specs)
    return VehicleCandidate(
        brand="Jetour",
        model=model,
        source=official_web_source(url, observed_at),
        page_title=title,
        category=category,
        variants=tuple(dict.fromkeys(variants)),
        specs=tuple(specs),
        content_hash=content_hash(factual_text),
        quality_flags=tuple(quality_flags),
    )


def _candidate_preference_key(candidate: VehicleCandidate) -> tuple[int, int, int, int, str]:
    mapped_specs = sum(spec.canonical_key is not None for spec in candidate.specs)
    return (
        -mapped_specs,
        -len(candidate.specs),
        len(candidate.quality_flags),
        -len(candidate.variants),
        candidate.source.url,
    )


def dedupe_vehicle_candidates(candidates: Iterable[VehicleCandidate]) -> list[VehicleCandidate]:
    grouped: dict[str, list[VehicleCandidate]] = {}
    for candidate in candidates:
        grouped.setdefault(candidate.model, []).append(candidate)

    deduped: list[VehicleCandidate] = []
    for model in sorted(grouped):
        group = grouped[model]
        chosen = sorted(group, key=_candidate_preference_key)[0]
        if len(group) > 1:
            flags = tuple(
                dict.fromkeys((*chosen.quality_flags, "duplicate_model_pages_detected"))
            )
            chosen = replace(chosen, quality_flags=flags)
        deduped.append(chosen)

    return deduped


async def _build_crawler(max_requests_per_crawl: int) -> BeautifulSoupCrawler:
    request_queue = await RequestQueue.open()
    request_manager = ThrottlingRequestManager(
        inner=request_queue,
        domains=sorted(ALLOWED_HOSTS),
        request_manager_opener=RequestQueue.open,
    )
    return BeautifulSoupCrawler(
        request_manager=request_manager,
        max_requests_per_crawl=max_requests_per_crawl,
        respect_robots_txt_file=True,
    )


async def discover_vehicle_urls() -> list[str]:
    discovered: set[str] = set()
    crawler = await _build_crawler(max_requests_per_crawl=1)

    @crawler.router.default_handler
    async def handle_catalog(context: BeautifulSoupCrawlingContext) -> None:
        discovered.update(extract_vehicle_links(str(context.soup), str(context.request.url)))

    await crawler.run([CATALOG_URL])
    if not discovered:
        raise RuntimeError("Sky Motors catalogue returned no Jetour vehicle links.")
    return sorted(discovered)


async def crawl_sky_motors() -> list[VehicleCandidate]:
    urls = await discover_vehicle_urls()
    candidates: list[VehicleCandidate] = []
    crawler = await _build_crawler(max_requests_per_crawl=len(urls))

    @crawler.router.default_handler
    async def handle_vehicle(context: BeautifulSoupCrawlingContext) -> None:
        candidates.append(parse_vehicle_page(str(context.soup), str(context.request.url)))

    await crawler.run(urls)
    return dedupe_vehicle_candidates(candidates)
