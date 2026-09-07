# Cameroon pilot scope

Issue: #13 — Build and verify the Cameroon pilot dataset early.

## Target pilot

| Distributor | Pilot brands | First collection mode |
|---|---|---|
| CFAO Mobility Cameroon | Toyota, Suzuki | official web crawl + manual review |
| Tractafric Motors Cameroon | Hyundai, Mitsubishi | Hyundai official web + Mitsubishi official manual snapshot |
| KM Auto SA | Kia | official web manual snapshot |
| RIMCO Motors Cameroon | GWM, Haval | official web/brochure manual snapshots |
| Sky Motors Company | Jetour | Crawlee official-web collector + manual review |

Target: 5 distributors, 8 brand slots, a first reviewed set of models/trims, and 30–50 canonical comparison specifications.

## Current pilot coverage

The eight target brand slots are now represented in staging: Jetour, Toyota, Suzuki, Hyundai, Mitsubishi, Kia, GWM and Haval.

Current source modes are deliberately mixed. Automation is used where the official site allows reliable crawling; otherwise the pilot uses versioned manual snapshots from official public pages or brochures. Every candidate remains `draft` until Payload review.

KM Auto / Kia staging currently covers Cerato, Seltos, Soul and Carnival from `kiamotorscameroon.com`.

RIMCO / Haval staging currently covers H6, H6 GT, H9 and Jolion from `greatwall-cm.com` official brochures. RIMCO / GWM staging currently covers POER and Wingle 5. Trim-specific values that cannot yet be represented safely by the aggregate candidate shape are explicitly flagged for Payload review rather than flattened as published truth.

## Source policy

A — official public source (manufacturer/distributor site, brochure or published catalogue).

B — official direct source (dealer quote or written confirmation that can be archived internally with its observation date).

C — secondary discovery source. It may trigger review but must not directly become published truth.

Unknown values remain unknown. No price, stock, warranty, promotion or trim fact is invented.

## Promotion boundary

The files under `data/pilot/` are provenance-aware staging data, not the canonical production catalogue. Promotion flow remains:

`official source -> staged observation -> validation/normalization -> manual review -> Payload -> PostgreSQL`

Price, stock, warranty and promotions stay in dealer-market entities and must never be promoted as canonical vehicle specifications.
