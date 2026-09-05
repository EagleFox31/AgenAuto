# Cameroon pilot scope

Issue: #13 — Build and verify the Cameroon pilot dataset early.

## Target pilot

| Distributor | Pilot brands | First collection mode |
|---|---|---|
| CFAO Mobility Cameroon | Toyota, Suzuki | official web/brochures + manual review |
| Tractafric Motors Cameroon | Hyundai, Mitsubishi | official web/brochures + manual review |
| KM Auto | Kia | official web/brochures + manual review |
| RIMCO Motors | GWM/Haval | official web/brochures + manual review |
| Sky Motors Company | Jetour | Crawlee official-web collector + manual review |

Target: 5 distributors, 8 brand slots, a first reviewed set of models/trims, and 30–50 canonical comparison specifications.

## Source policy

A — official public source (manufacturer/distributor site, brochure or published catalogue).

B — official direct source (dealer quote or written confirmation that can be archived internally with its observation date).

C — secondary discovery source. It may trigger review but must not directly become published truth.

Unknown values remain unknown. No price, stock, warranty, promotion or trim fact is invented.

## First collector: Sky Motors / Jetour

Entry point: `https://www.skymotors-cameroun.com/tous-les-vehicules`.

Current official catalogue discovery is expected to cover at least T1, T2, Dashing, X50, X70 Plus and X90 Plus. G700 is currently promoted on the homepage but is not assumed to have a structured catalogue page until the collector can prove it.

The collector stores factual structured observations only. Marketing prose, images and downloaded brochures are not committed. Every candidate stays `draft` until reviewed through Payload.
