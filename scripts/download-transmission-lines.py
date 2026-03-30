#!/usr/bin/env python3
"""
Download US high-voltage transmission lines from HIFLD (Homeland Infrastructure
Foundation-Level Data) via ArcGIS REST API.

Fetches lines >= 345 kV (the backbone of the US grid) and saves as GeoJSON.
Output: public/data/transmission-lines.geojson
"""

import json
import os
import urllib.request
import urllib.parse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "transmission-lines.geojson")

BASE_URL = (
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/"
    "Electric_Power_Transmission_Lines/FeatureServer/0/query"
)

# Only fetch high-voltage backbone lines (345 kV+)
MIN_VOLTAGE = 345
FIELDS = "VOLTAGE,VOLT_CLASS,OWNER,STATUS,SUB_1,SUB_2"
PAGE_SIZE = 2000


def fetch_page(offset=0):
    """Fetch one page of transmission line features."""
    params = {
        "where": f"VOLTAGE >= {MIN_VOLTAGE}",
        "outFields": FIELDS,
        "f": "geojson",
        "outSR": "4326",
        "resultRecordCount": str(PAGE_SIZE),
        "resultOffset": str(offset),
    }
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    print(f"  Fetching offset {offset}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read())


def simplify_coords(coords, precision=4):
    """Reduce coordinate precision to shrink file size."""
    if isinstance(coords[0], (int, float)):
        return [round(c, precision) for c in coords]
    return [simplify_coords(c, precision) for c in coords]


def main():
    all_features = []
    offset = 0

    print(f"Downloading transmission lines >= {MIN_VOLTAGE} kV from HIFLD...")

    while True:
        data = fetch_page(offset)
        features = data.get("features", [])
        if not features:
            break

        all_features.extend(features)
        print(f"  Got {len(features)} features (total: {len(all_features)})")

        if len(features) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    if not all_features:
        print("ERROR: No features downloaded!")
        return

    # Simplify coordinates to reduce file size
    for feature in all_features:
        if feature.get("geometry") and feature["geometry"].get("coordinates"):
            feature["geometry"]["coordinates"] = simplify_coords(
                feature["geometry"]["coordinates"]
            )
        # Clean up properties - keep only what we need
        props = feature.get("properties", {})
        feature["properties"] = {
            "VOLTAGE": props.get("VOLTAGE"),
            "VOLT_CLASS": props.get("VOLT_CLASS"),
            "OWNER": props.get("OWNER"),
            "STATUS": props.get("STATUS"),
        }

    geojson = {
        "type": "FeatureCollection",
        "features": all_features,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(geojson, f)

    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"\nWritten {len(all_features)} transmission lines to {OUTPUT_PATH}")
    print(f"File size: {file_size / 1024 / 1024:.1f} MB")

    # Stats
    voltages = {}
    for feat in all_features:
        v = feat["properties"].get("VOLTAGE") or 0
        bucket = "765+" if v >= 765 else "500" if v >= 500 else "345"
        voltages[bucket] = voltages.get(bucket, 0) + 1
    print(f"Breakdown: {voltages}")


if __name__ == "__main__":
    main()
