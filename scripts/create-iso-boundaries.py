#!/usr/bin/env python3
"""
Create simplified ISO/RTO boundary GeoJSON from known approximate boundaries.
These are simplified polygons - not legally precise boundaries.
Output: public/data/iso-boundaries.geojson
"""

import json
import os
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "iso-boundaries.geojson")

# Try to download from a known ArcGIS source first
ARCGIS_URLS = [
    "https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/RTO_Boundaries/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&outSR=4326",
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Independent_System_Operators/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&outSR=4326",
    "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Planning_Areas/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&outSR=4326",
]

# Simplified ISO boundaries as approximate polygons
# These are rough outlines for visualization purposes
ISO_BOUNDARIES = {
    # --- ISO/RTO organized wholesale markets ---
    "ERCOT": {
        "color": "#ef4444",
        "coordinates": [[
            [-106.6, 31.8], [-103.0, 31.8], [-103.0, 33.0], [-100.0, 33.8],
            [-100.0, 36.5], [-97.0, 36.5], [-94.5, 33.8], [-93.5, 30.0],
            [-94.0, 29.5], [-97.0, 25.8], [-99.5, 26.0], [-103.3, 29.0],
            [-106.6, 31.8]
        ]]
    },
    "PJM": {
        "color": "#3b82f6",
        "coordinates": [[
            [-90.5, 38.0], [-87.5, 37.5], [-87.5, 39.0], [-84.8, 39.0],
            [-82.0, 37.0], [-81.0, 37.0], [-79.0, 36.5], [-76.0, 36.5],
            [-75.5, 38.5], [-74.0, 39.5], [-74.0, 41.5], [-75.0, 42.0],
            [-77.0, 42.5], [-80.5, 42.5], [-84.0, 41.7], [-87.0, 41.8],
            [-90.5, 38.0]
        ]]
    },
    "MISO": {
        "color": "#22c55e",
        "coordinates": [[
            [-104.0, 46.0], [-96.5, 49.0], [-89.0, 48.0], [-84.5, 46.0],
            [-84.5, 43.0], [-87.5, 41.5], [-87.5, 39.0], [-90.5, 38.0],
            [-91.0, 36.5], [-91.0, 33.0], [-93.5, 30.0], [-94.0, 29.5],
            [-94.5, 29.5], [-94.5, 33.8], [-94.0, 37.0], [-95.0, 40.0],
            [-97.0, 43.0], [-104.0, 46.0]
        ]]
    },
    "CAISO": {
        "color": "#eab308",
        "coordinates": [[
            [-124.5, 42.0], [-120.0, 42.0], [-120.0, 39.0], [-118.0, 36.0],
            [-117.0, 34.5], [-114.5, 32.7], [-117.0, 32.5], [-118.5, 33.5],
            [-120.5, 34.5], [-122.5, 37.0], [-124.0, 39.0], [-124.5, 42.0]
        ]]
    },
    "SPP": {
        "color": "#a855f7",
        "coordinates": [[
            [-104.0, 46.0], [-97.0, 43.0], [-95.0, 40.0], [-94.0, 37.0],
            [-94.5, 33.8], [-97.0, 36.5], [-100.0, 36.5], [-100.0, 33.8],
            [-103.0, 33.0], [-103.0, 31.8], [-106.6, 31.8], [-106.6, 35.0],
            [-109.0, 37.0], [-109.0, 41.0], [-104.0, 41.0], [-104.0, 46.0]
        ]]
    },
    "NYISO": {
        "color": "#ec4899",
        "coordinates": [[
            [-79.8, 42.5], [-75.0, 42.0], [-74.0, 41.5], [-73.5, 41.0],
            [-72.0, 41.0], [-71.8, 42.0], [-73.3, 42.8], [-73.5, 44.0],
            [-74.0, 44.5], [-76.0, 44.0], [-79.0, 43.3], [-79.8, 42.5]
        ]]
    },
    "ISO-NE": {
        "color": "#14b8a6",
        "coordinates": [[
            [-73.5, 41.0], [-72.0, 41.0], [-71.8, 42.0], [-71.0, 42.0],
            [-70.0, 41.5], [-69.8, 41.2], [-69.5, 43.5], [-67.0, 44.5],
            [-67.0, 47.5], [-71.0, 45.3], [-73.3, 45.0], [-73.3, 42.8],
            [-71.8, 42.0], [-72.0, 41.0], [-73.5, 41.0]
        ]]
    },
    # --- Non-ISO balancing authorities / utility territories ---
    "TVA": {
        "color": "#f59e0b",
        "coordinates": [[
            [-91.0, 36.5], [-88.0, 37.5], [-86.5, 37.5], [-84.0, 37.0],
            [-82.0, 36.0], [-81.7, 35.2], [-82.5, 34.5], [-84.0, 34.5],
            [-85.5, 33.5], [-88.5, 33.5], [-91.0, 33.0], [-91.0, 36.5]
        ]]
    },
    "SOCO": {
        "color": "#dc2626",
        "coordinates": [[
            [-88.5, 33.5], [-85.5, 33.5], [-84.0, 34.5], [-82.5, 34.5],
            [-81.7, 35.2], [-81.0, 34.8], [-80.5, 33.0], [-80.8, 32.0],
            [-81.5, 31.0], [-82.0, 30.5], [-84.5, 30.5], [-85.0, 30.0],
            [-87.5, 30.3], [-88.5, 30.5], [-91.0, 33.0], [-88.5, 33.5]
        ]]
    },
    "Duke Carolinas": {
        "color": "#06b6d4",
        "coordinates": [[
            [-82.0, 36.0], [-81.0, 36.5], [-79.0, 36.5], [-76.0, 36.5],
            [-75.5, 35.5], [-76.5, 34.5], [-78.0, 33.8], [-79.0, 33.2],
            [-80.5, 33.0], [-81.0, 34.8], [-81.7, 35.2], [-82.0, 36.0]
        ]]
    },
    "FRCC": {
        "color": "#f97316",
        "coordinates": [[
            [-87.5, 30.3], [-85.0, 30.0], [-84.5, 30.5], [-82.0, 30.5],
            [-81.5, 31.0], [-81.0, 30.0], [-80.5, 28.5], [-80.2, 27.0],
            [-80.5, 25.5], [-81.5, 25.0], [-82.0, 26.5], [-82.5, 27.5],
            [-82.8, 28.5], [-83.5, 29.5], [-85.0, 29.5], [-86.5, 30.3],
            [-87.5, 30.3]
        ]]
    },
    "BPA": {
        "color": "#10b981",
        "coordinates": [[
            [-124.5, 48.5], [-124.5, 42.0], [-120.0, 42.0],
            [-117.0, 42.0], [-116.5, 44.0], [-117.0, 46.0], [-117.0, 49.0],
            [-122.0, 49.0], [-124.5, 48.5]
        ]]
    },
    "NV Energy": {
        "color": "#d946ef",
        "coordinates": [[
            [-120.0, 42.0], [-120.0, 39.0], [-119.0, 37.5], [-117.5, 36.0],
            [-114.5, 36.0], [-114.0, 37.0], [-114.0, 42.0], [-117.0, 42.0],
            [-120.0, 42.0]
        ]]
    },
    "APS": {
        "color": "#fb923c",
        "coordinates": [[
            [-114.5, 36.0], [-114.5, 32.7], [-114.8, 32.5], [-111.0, 31.3],
            [-109.0, 31.3], [-109.0, 37.0], [-114.0, 37.0], [-114.5, 36.0]
        ]]
    },
    "PSCo/Xcel": {
        "color": "#38bdf8",
        "coordinates": [[
            [-109.0, 41.0], [-109.0, 37.0], [-106.6, 35.0], [-104.0, 37.0],
            [-102.0, 37.0], [-102.0, 41.0], [-104.0, 41.0], [-109.0, 41.0]
        ]]
    },
}


def try_download():
    """Try downloading official boundaries."""
    for url in ARCGIS_URLS:
        try:
            print(f"Trying {url[:80]}...")
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read())
                if data.get("features") and len(data["features"]) > 0:
                    print(f"Downloaded {len(data['features'])} features")
                    return data
        except Exception as e:
            print(f"  Failed: {e}")
    return None


def create_simplified_boundaries():
    """Create simplified GeoJSON from hardcoded boundaries."""
    features = []
    for name, info in ISO_BOUNDARIES.items():
        feature = {
            "type": "Feature",
            "properties": {
                "name": name,
                "color": info["color"],
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": info["coordinates"],
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def normalize_downloaded_data(data):
    """Normalize property names in downloaded GeoJSON."""
    iso_names = {"PJM", "ERCOT", "CAISO", "MISO", "SPP", "NYISO", "ISO-NE", "ISONE"}

    for feature in data.get("features", []):
        props = feature.get("properties", {})
        # Try to find the ISO name in properties
        name = None
        for key in ["NAME", "name", "RTO_ISO", "RTO", "ISO", "ABBREV", "Label"]:
            val = str(props.get(key, ""))
            if val.upper() in {n.upper() for n in iso_names}:
                name = val.upper()
                if name == "ISONE":
                    name = "ISO-NE"
                break

        if name:
            props["name"] = name

    # Filter to only ISO features
    data["features"] = [
        f for f in data["features"]
        if f.get("properties", {}).get("name") in iso_names
    ]

    return data


def main():
    # Try official sources first
    data = try_download()

    if data and data.get("features"):
        data = normalize_downloaded_data(data)
        if data["features"]:
            print(f"Using downloaded data with {len(data['features'])} ISO regions")
        else:
            print("Downloaded data didn't contain recognizable ISOs, using simplified")
            data = create_simplified_boundaries()
    else:
        print("Could not download official boundaries, using simplified polygons")
        data = create_simplified_boundaries()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f)

    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"Written to {OUTPUT_PATH} ({file_size / 1024:.0f} KB)")
    print(f"ISO regions: {[f['properties']['name'] for f in data['features']]}")


if __name__ == "__main__":
    main()
