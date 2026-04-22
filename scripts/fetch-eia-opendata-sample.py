#!/usr/bin/env python3
"""
Fetch a small sample from the EIA Open Data API (v2).

This does NOT replace Form EIA-860: plant/generator microdata is published in the
annual xlsx zip. The API instead exposes time series and aggregates (generation,
capacity by fuel, retail sales, fuel receipts, STEO, etc.).

Register for a key: https://www.eia.gov/opendata/register.php
  export EIA_API_KEY=your_key

Example (monthly net generation for the US electric power sector):
  python3 scripts/fetch-eia-opendata-sample.py

Writes: public/data/eia-opendata-sample.json
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "eia-opendata-sample.json")

# Documented example: monthly residential retail sales, Colorado (EIA API v2 guide).
# Browse routes: https://www.eia.gov/opendata/browser/electricity
API_URL = "https://api.eia.gov/v2/electricity/retail-sales/data/"


def main():
    key = os.environ.get("EIA_API_KEY")
    if not key:
        print(
            "Set EIA_API_KEY (register at https://www.eia.gov/opendata/register.php)",
            file=sys.stderr,
        )
        sys.exit(1)

    params = {
        "api_key": key,
        "frequency": "monthly",
        "data[0]": "sales",
        "facets[stateid][]": "CO",
        "facets[sectorid][]": "RES",
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "offset": "0",
        "length": "12",
    }
    q = urllib.parse.urlencode(params)
    url = f"{API_URL}?{q}"

    req = urllib.request.Request(url, headers={"User-Agent": "energy-vis-pipeline/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    data = json.loads(raw.decode("utf-8"))

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    n = len(data.get("response", {}).get("data", []))
    print(f"Wrote {OUT_PATH} ({n} rows returned)")


if __name__ == "__main__":
    main()
