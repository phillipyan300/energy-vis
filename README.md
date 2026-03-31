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

- `process-eia860.py` — power plant data from EIA Form 860
- `download-transmission-lines.py` — HIFLD transmission lines
- `create-iso-boundaries.py` — ISO/RTO boundary polygons
- `process-interconnection-queues.py` / `create-queue-data.py` — interconnection queue processing
- `compute-grid-connections.py` — nearest grid connection analysis

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Map:** deck.gl, MapLibre GL, react-map-gl
- **Data:** Python (processing), GeoJSON
