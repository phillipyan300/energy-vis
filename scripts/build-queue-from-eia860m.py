#!/usr/bin/env python3
"""
Build public/data/interconnection-queue.json from the EIA Form 860M "Planned"
generator inventory. Replaces the prior synthetic placeholder with real,
plant-level planned-project locations (lat/lon, capacity, fuel, state, BA).

Input : scripts/downloads/eia860m_*.xlsx  (the 'Planned' sheet)
Output: public/data/interconnection-queue.json  (QueueProject[] shape)

Run:
    python3 scripts/build-queue-from-eia860m.py scripts/downloads/eia860m_feb2026.xlsx

QueueProject TS shape (see src/types/index.ts):
    id, name, iso, type, fuel_type, capacity_mw, lat, lon,
    status, queue_date, estimated_cod, state
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import openpyxl  # noqa


# EIA BA Code to our short ISO label. Anything not in this map keeps its BA code
# (so non-ISO balancing authorities still show up honestly instead of being
# smushed into "Other").
BA_TO_ISO = {
    "PJM": "PJM",
    "MISO": "MISO",
    "ERCO": "ERCOT",
    "CISO": "CAISO",
    "SWPP": "SPP",
    "ISNE": "ISO-NE",
    "NYIS": "NYISO",
}

# Map EIA technology / energy-source text to our fuel_type slug.
def classify_fuel(tech: str | None, esrc: str | None) -> str:
    t = (tech or "").lower()
    e = (esrc or "").upper()
    if e == "SUN" or "solar" in t:
        return "solar"
    if e == "WND" or "wind" in t:
        return "wind"
    if e in {"MWH", "LIB"} or "battery" in t or "storage" in t or "energy storage" in t:
        return "battery"
    if e in {"NG", "OG", "PG", "BFG"} or "gas" in t:
        return "gas"
    if e in {"BIT", "SUB", "LIG", "WC"} or "coal" in t:
        return "coal"
    if e == "NUC" or "nuclear" in t:
        return "nuclear"
    if e == "WAT" or "hydro" in t:
        return "hydro"
    if e in {"DFO", "RFO", "JF", "KER"} or "oil" in t or "petroleum" in t:
        return "oil"
    return "other"


def norm_month(m) -> str:
    if m is None:
        return "01"
    try:
        mi = int(m)
        return f"{mi:02d}"
    except (TypeError, ValueError):
        return "01"


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: build-queue-from-eia860m.py <eia860m.xlsx>", file=sys.stderr)
        sys.exit(1)

    src = Path(sys.argv[1])
    if not src.exists():
        print(f"file not found: {src}", file=sys.stderr)
        sys.exit(1)

    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    ws = wb["Planned"]

    rows = ws.iter_rows(values_only=True)
    # Row 2 (0-indexed) is the header based on EIA 860M layout
    header: tuple | None = None
    projects: list[dict] = []
    seen_ids: set[str] = set()

    for i, row in enumerate(rows):
        if i == 2:
            header = row
            continue
        if header is None or row is None:
            continue
        rec = dict(zip(header, row))

        plant_id = rec.get("Plant ID")
        gen_id = rec.get("Generator ID")
        name = rec.get("Plant Name")
        state = rec.get("Plant State")
        ba_code = rec.get("Balancing Authority Code") or ""
        tech = rec.get("Technology")
        esrc = rec.get("Energy Source Code")
        capacity = rec.get("Nameplate Capacity (MW)")
        status = rec.get("Status")
        op_year = rec.get("Planned Operation Year")
        op_month = rec.get("Planned Operation Month")
        lat = rec.get("Latitude")
        lon = rec.get("Longitude")

        # Skip rows without geolocation (can't map them) or without capacity
        if lat is None or lon is None:
            continue
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (TypeError, ValueError):
            continue
        try:
            cap_f = float(capacity) if capacity is not None else 0.0
        except (TypeError, ValueError):
            cap_f = 0.0
        if cap_f <= 0:
            continue

        fuel = classify_fuel(tech, esrc)
        iso = BA_TO_ISO.get(str(ba_code).strip(), str(ba_code).strip() or "Other")

        pid = f"{plant_id}-{gen_id}" if plant_id and gen_id else f"row-{i}"
        if pid in seen_ids:
            continue
        seen_ids.add(pid)

        cod = None
        if op_year:
            try:
                cod = f"{int(op_year)}-{norm_month(op_month)}-01"
            except (TypeError, ValueError):
                cod = None

        project = {
            "id": f"EIA-{pid}",
            "name": str(name or "").strip()[:120] or f"Plant {plant_id}",
            "iso": iso,
            "type": "generation",
            "fuel_type": fuel,
            "capacity_mw": round(cap_f, 2),
            "lat": round(lat_f, 4),
            "lon": round(lon_f, 4),
            "status": str(status or "").strip() or "planned",
            "queue_date": "",
            "estimated_cod": cod,
            "state": str(state or "").strip()[:2],
        }
        projects.append(project)

    out_path = Path("public/data/interconnection-queue.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(projects, f, indent=0, separators=(",", ":"))

    # Stats for the run log
    by_fuel: dict[str, int] = {}
    by_iso: dict[str, int] = {}
    for p in projects:
        by_fuel[p["fuel_type"]] = by_fuel.get(p["fuel_type"], 0) + 1
        by_iso[p["iso"]] = by_iso.get(p["iso"], 0) + 1
    print(f"Wrote {len(projects)} projects to {out_path}")
    print("By fuel:", dict(sorted(by_fuel.items(), key=lambda kv: -kv[1])))
    print("By ISO (top 10):", dict(sorted(by_iso.items(), key=lambda kv: -kv[1])[:10]))


if __name__ == "__main__":
    main()
