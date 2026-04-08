# Narrative Expansion Design Doc

## Goal
Expand the AI Power Map's narrative tour system with new data layers and storylines that tell a cohesive story about US energy infrastructure — not just AI datacenters, but the full energy supply chain from fuel source to electron delivery.

## Current State
- **3 storylines**: AI Power Surge (5 stops), Isolated Grids (4 stops), ISO/RTO Tour (6 stops)
- **5 data layers**: AI Datacenters, Power Plants (EIA 860), ISO Boundaries, Transmission Lines (HIFLD 345kV+), Grid Connections, Interconnection Queue
- **Coverage**: CONUS + Alaska + Hawaii (newly added). Puerto Rico has no EIA plant data.

---

## New Data Layer: LNG Terminals

### Why
Natural gas is the backbone fuel for US electricity (~40% of generation). LNG export terminals are reshaping domestic gas markets — more gas exported means higher domestic prices and potential supply constraints for gas-fired power plants that backstop renewable intermittency. This is directly relevant to the AI power story: datacenters need reliable baseload, and gas plants provide it.

### Data Source
- **Primary**: HIFLD Open Data — LNG Terminals (GeoJSON with coordinates, capacity, operator, status)
  - URL: `https://hifld-geoplatform.opendata.arcgis.com/` (search "LNG")
- **Enrichment**: FERC LNG terminal list for capacity (Bcf/d), approved/proposed status
  - URL: `https://www.ferc.gov/industries-data/natural-gas/overview/lng`
- **Enrichment**: EIA Natural Gas imports/exports for throughput volumes

### Data Schema
```typescript
interface LNGTerminal {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lon: number;
  type: "export" | "import" | "both";
  capacity_bcfd: number;  // billion cubic feet per day
  status: "operating" | "approved" | "proposed";
  state: string;
}
```

### Visualization
- **Icon**: Diamond or hexagon marker (distinct from round DC/plant dots)
- **Color**: Orange-amber gradient by capacity
- **Size**: Scaled by capacity_bcfd
- **Layer toggle**: "LNG Terminals" in LayerControls

### Script
`scripts/download-lng-terminals.py` — download from HIFLD, parse, enrich with FERC data, output to `public/data/lng-terminals.json`

---

## New Storyline: "The Gas Pipeline"

Tells the story of natural gas from wellhead to power plant to LNG export dock.

### Stops

1. **"America runs on gas"** (national view)
   - Show gas power plants only (fuel filter: gas)
   - Stat: "Natural gas generates ~40% of US electricity — 1.7 trillion kWh in 2024"
   - Source: EIA

2. **"The Permian Basin"** (zoom to west Texas/NM)
   - Show gas plants + LNG terminals
   - Stat: "The Permian produces 23 Bcf/d — enough to power every US datacenter 10x over"
   - Source: EIA

3. **"Sabine Pass: gas goes global"** (zoom to Louisiana Gulf Coast)
   - Show LNG export terminals
   - Stat: "The US became the world's #1 LNG exporter in 2023. Sabine Pass alone ships 4.5 Bcf/d"
   - Source: Cheniere Energy, EIA

4. **"The export dilemma"** (zoom back to national)
   - Show gas plants + LNG terminals together
   - Stat: "Every Bcf exported is a Bcf not powering US datacenters. Domestic gas prices rose 40% as exports surged."
   - Source: EIA, industry analysis

5. **"Alaska LNG: the stranded giant"** (zoom to North Slope)
   - Show Alaska plants + proposed Alaska LNG terminal
   - Stat: "Alaska sits on 35 trillion cubic feet of proven gas reserves with no pipeline to the Lower 48"
   - Source: Alaska DNR

---

## New Storyline: "Renewables vs. Reliability"

Tells the story of the renewable buildout and its grid integration challenges.

### Stops

1. **"The solar flood"** (national view, solar plants only)
   - Stat: "Solar capacity doubled in 3 years. 6,400+ solar plants now online."

2. **"The wind belt"** (zoom to Great Plains)
   - Wind plants + transmission lines
   - Stat: "The Great Plains could power the entire US with wind. The problem is getting it out."

3. **"The duck curve"** (zoom to California)
   - Solar + gas plants in CAISO
   - Stat: "California curtailed 2.4 TWh of solar in 2024 — enough to power 360,000 homes."

4. **"Battery frontier"** (zoom to Texas/California)
   - Queue projects filtered for storage
   - Stat: "890 GW of battery storage is in the interconnection queue. Most won't get built."

---

## Implementation Plan

### Phase 1: LNG Data (this session)
1. Write `scripts/download-lng-terminals.py` to fetch HIFLD LNG data
2. Create `src/layers/lng-terminal-layer.ts` — diamond markers
3. Add `lngTerminals` to `useMapData`, `LayerVisibility`, `LayerControls`
4. Add "The Gas Pipeline" storyline to NarrativeTour

### Phase 2: Enhanced Narratives (next session)
1. Add "Renewables vs. Reliability" storyline
2. Add storage/battery data from queue (already have queue data, just need filtering)
3. Add curtailment annotations for CAISO duck curve step

### Phase 3: Puerto Rico Data (future)
- PR isn't in EIA Form 860. Need to source from:
  - PREPA/LUMA filings
  - DOE Puerto Rico Energy Recovery reports
  - Manual curation of major plants (AES Guayama, EcoElectrica, etc.)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scripts/download-lng-terminals.py` | Create | Download + process HIFLD LNG data |
| `public/data/lng-terminals.json` | Create | LNG terminal dataset |
| `src/types/index.ts` | Modify | Add LNGTerminal type, update LayerVisibility |
| `src/layers/lng-terminal-layer.ts` | Create | Diamond marker layer |
| `src/hooks/useMapData.ts` | Modify | Fetch LNG data |
| `src/hooks/useLayerVisibility.ts` | Modify | Add lngTerminals toggle |
| `src/components/LayerControls.tsx` | Modify | Add LNG toggle |
| `src/components/MapView.tsx` | Modify | Wire LNG layer |
| `src/components/NarrativeTour.tsx` | Modify | Add "Gas Pipeline" storyline |
