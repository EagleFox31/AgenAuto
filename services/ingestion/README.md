# services/ingestion

Python ingestion brick for traceable data preparation that reasonably exceeds Payload/TypeScript.

## Current implementation

The first collector targets the official Sky Motors Cameroon Jetour catalogue using Crawlee Python. It:
- respects `robots.txt` through Crawlee;
- only accepts `skymotors-cameroun.com` URLs;
- discovers Jetour model pages from the official catalogue;
- extracts factual structured label/value specifications;
- keeps raw labels/values alongside canonical mapping keys;
- records source URL, observation timestamp, confidence and content hash;
- outputs `draft` candidates only;
- does not archive marketing prose, images or brochures.

## Local use

```bash
python -m pip install -e 'services/ingestion[dev]'
ruff check services/ingestion
pytest services/ingestion/tests
agenauto-ingest sky-motors --output-root data/pilot/sky-motors
agenauto-ingest validate --input data/pilot/sky-motors/candidates.json
```

## Architecture rules

- Payload/PostgreSQL remains the single business source of truth.
- This service has no independent business database.
- Crawled data is an observation, never automatically published truth.
- Promotion into Payload must preserve provenance and the review lifecycle from #5.
- Price/availability belong to dealer-market records from #6, never canonical Trim.
- Collect only public data permitted by the source and keep crawl volume restrained.
