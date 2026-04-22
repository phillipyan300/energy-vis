# AI Power Map

Interactive map visualizing the intersection of AI infrastructure and the US power grid. Built with Next.js, deck.gl, and MapLibre.

## Features

- Power plant locations and capacity (EIA-860)
- Transmission line network
- ISO/RTO region boundaries
- Interconnection queue data (planned generation)
- Grid connection analysis between datacenters and substations

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Pipeline

Python scripts in `scripts/` process raw energy data:

- `process-eia860.py` — curated map layer `public/data/power-plants.json` from EIA Form 860 (annual zip)
- `export-eia860-tables.py` — **full** EIA-860 respondent tables from the same zip → `public/data/eia860/*.json` + `manifest.json` (utilities, all generator sheets including proposed/retired, wind/solar/storage/multifuel, ownership, environmental schedules; ~100MB+ — see `.gitignore`)
- `fetch-eia-opendata-sample.py` — optional [EIA Open Data API](https://www.eia.gov/opendata/) sample (`EIA_API_KEY`); complements the zip with time-series aggregates, not plant-level 860 microdata
- `download-transmission-lines.py` — HIFLD transmission lines
- `create-iso-boundaries.py` — ISO/RTO boundary polygons
- `process-interconnection-queues.py` / `create-queue-data.py` — interconnection queue processing
- `compute-grid-connections.py` — nearest grid connection analysis

Environment: `EIA860_URL` overrides the annual 860 zip URL used by `process-eia860.py` / `export-eia860-tables.py` when EIA publishes a new year.

### FERC eLibrary (beyond EIA 860)

EIA gives inventory; [FERC eLibrary](https://elibrary.ferc.gov/eLibrary/search) holds dockets, Form 1 filings, rate cases, and interconnection disputes. There is no official bulk download for “all plants”; research is search-driven.

- `scripts/ferc_elibrary_search.py` — CLI search against the same JSON API the eLibrary web app uses (run locally; be sparing). Example: `python3 scripts/ferc_elibrary_search.py "Company Name"` or `python3 scripts/ferc_elibrary_search.py "ER23-1703-000" --docket`. If TLS fails on your network, append `--insecure` once to confirm connectivity.
- `public/data/ferc-research-seeds.json` — optional manual list of docket/accession bookmarks your team fills in while researching
- Fleet age map tooltips include **Search FERC eLibrary (Google)** using `site:elibrary.ferc.gov` plus plant name and operator (`src/lib/ferc-elibrary.ts`)

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Map:** deck.gl, MapLibre GL, react-map-gl
- **Data:** Python (processing), GeoJSON
