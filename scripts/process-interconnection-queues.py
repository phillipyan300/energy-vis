#!/usr/bin/env python3
"""
Download and process interconnection queue data from US ISOs.
Sources: MISO JSON API, PJM Excel API
Output: public/data/interconnection-queue.json
"""

import json
import os
import urllib.request
import csv
import io

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "interconnection-queue.json")

# US county centroids for geocoding (state FIPS -> {county_name -> (lat, lon)})
# We'll use a simplified approach: state centroids as fallback
STATE_CENTROIDS = {
    "AL": (32.8, -86.8), "AK": (64.2, -152.5), "AZ": (34.3, -111.7),
    "AR": (34.8, -92.2), "CA": (37.2, -119.7), "CO": (39.0, -105.5),
    "CT": (41.6, -72.7), "DE": (39.0, -75.5), "FL": (28.6, -82.4),
    "GA": (32.7, -83.5), "HI": (20.5, -157.5), "ID": (44.4, -114.6),
    "IL": (40.0, -89.2), "IN": (39.8, -86.3), "IA": (42.0, -93.5),
    "KS": (38.5, -98.3), "KY": (37.8, -85.7), "LA": (31.0, -91.9),
    "ME": (45.4, -69.2), "MD": (39.0, -76.8), "MA": (42.3, -71.8),
    "MI": (44.2, -84.5), "MN": (46.3, -94.2), "MS": (32.7, -89.7),
    "MO": (38.5, -92.3), "MT": (47.0, -109.6), "NE": (41.5, -99.8),
    "NV": (39.5, -116.9), "NH": (43.7, -71.6), "NJ": (40.1, -74.7),
    "NM": (34.4, -106.1), "NY": (42.9, -75.5), "NC": (35.6, -79.8),
    "ND": (47.4, -100.5), "OH": (40.4, -82.8), "OK": (35.6, -97.5),
    "OR": (44.0, -120.5), "PA": (40.9, -77.8), "RI": (41.7, -71.5),
    "SC": (33.9, -80.9), "SD": (44.4, -100.2), "TN": (35.8, -86.4),
    "TX": (31.5, -99.3), "UT": (39.3, -111.7), "VT": (44.1, -72.6),
    "VA": (37.5, -78.9), "WA": (47.4, -120.5), "WV": (38.6, -80.6),
    "WI": (44.6, -89.7), "WY": (43.0, -107.5), "DC": (38.9, -77.0),
}

# Add some county-level precision for key datacenter counties
COUNTY_OVERRIDES = {
    ("VA", "LOUDOUN"): (39.08, -77.64),
    ("VA", "PRINCE WILLIAM"): (38.69, -77.48),
    ("VA", "FAIRFAX"): (38.85, -77.28),
    ("TX", "TAYLOR"): (32.30, -99.80),
    ("TX", "HARRIS"): (29.76, -95.37),
    ("TX", "DALLAS"): (32.78, -96.80),
    ("OH", "FRANKLIN"): (39.96, -82.99),
    ("OH", "NEW ALBANY"): (40.08, -82.81),
    ("IL", "COOK"): (41.88, -87.63),
    ("IN", "MARION"): (39.77, -86.15),
    ("PA", "ALLEGHENY"): (40.44, -80.0),
    ("NJ", "BERGEN"): (40.96, -74.07),
}


def geocode(state, county=None):
    """Get approximate lat/lon from state and optional county."""
    if county and state:
        key = (state.upper().strip(), county.upper().strip())
        if key in COUNTY_OVERRIDES:
            return COUNTY_OVERRIDES[key]
    if state:
        st = state.upper().strip()
        if st in STATE_CENTROIDS:
            # Add small random offset to avoid exact overlaps
            lat, lon = STATE_CENTROIDS[st]
            import hashlib
            h = hashlib.md5(f"{state}{county}".encode()).hexdigest()
            offset_lat = (int(h[:4], 16) / 65536 - 0.5) * 1.5
            offset_lon = (int(h[4:8], 16) / 65536 - 0.5) * 1.5
            return (lat + offset_lat, lon + offset_lon)
    return None


def fetch_miso_queue():
    """Fetch MISO interconnection queue via their JSON API."""
    url = "https://www.misoenergy.org/api/giqueue/getprojects"
    print(f"Fetching MISO queue from {url}...")
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        print(f"  Got {len(data)} MISO projects")
        return data
    except Exception as e:
        print(f"  Failed: {e}")
        return []


def process_miso(raw_projects):
    """Process MISO queue data into standard format."""
    projects = []
    for p in raw_projects:
        status = (p.get("applicationStatus") or "").strip()
        if status.lower() in ("withdrawn", "done", "suspended"):
            continue

        capacity = 0
        try:
            summer = float(p.get("summerNetMW") or 0)
            winter = float(p.get("winterNetMW") or 0)
            capacity = max(summer, winter)
        except (ValueError, TypeError):
            continue

        if capacity < 20:
            continue

        state = (p.get("state") or "").strip()
        county = (p.get("county") or "").strip()
        coords = geocode(state, county)
        if not coords:
            continue

        fuel = (p.get("fuelType") or "").strip()
        proj_type = classify_fuel(fuel)

        projects.append({
            "id": f"MISO-{p.get('projectNumber', '')}",
            "name": (p.get("poiName") or f"MISO Queue {p.get('projectNumber', '')}").strip(),
            "iso": "MISO",
            "type": proj_type,
            "fuel_type": normalize_fuel(fuel),
            "capacity_mw": round(capacity, 1),
            "lat": round(coords[0], 4),
            "lon": round(coords[1], 4),
            "status": "active",
            "queue_date": (p.get("queueDate") or "")[:10],
            "estimated_cod": (p.get("doneDate") or "")[:10] or None,
            "county": county,
            "state": state,
        })
    return projects


def fetch_pjm_queue():
    """Fetch PJM queue via their planning API (JSON endpoint)."""
    url = "https://services.pjm.com/PJMPlanningApi/api/Queue/ExportToXls"
    print(f"Fetching PJM queue...")

    # Try the JSON list endpoint first
    list_url = "https://services.pjm.com/PJMPlanningApi/api/Queue"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "api-subscription-key": "E29477D0-70E0-4825-89B0-43F460BF9AB4",
        "Host": "services.pjm.com",
        "Origin": "https://www.pjm.com",
        "Referer": "https://www.pjm.com/",
        "Accept": "application/json",
    }
    req = urllib.request.Request(list_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
        if isinstance(data, list):
            print(f"  Got {len(data)} PJM projects")
            return data
        elif isinstance(data, dict) and "items" in data:
            print(f"  Got {len(data['items'])} PJM projects")
            return data["items"]
        else:
            print(f"  Unexpected PJM response format: {type(data)}")
            return []
    except Exception as e:
        print(f"  PJM API failed: {e}")
        return []


def process_pjm(raw_projects):
    """Process PJM queue data into standard format."""
    projects = []
    for p in raw_projects:
        status = str(p.get("status") or p.get("Status") or "").strip()
        if status.lower() in ("withdrawn", "deactivated", "retracted"):
            continue

        capacity = 0
        for key in ["mw", "MW", "mwCapacity", "MWCapacity", "capacityMW",
                     "mFO", "summerMW", "nameplateMW"]:
            try:
                val = float(p.get(key) or 0)
                if val > capacity:
                    capacity = val
            except (ValueError, TypeError):
                pass

        if capacity < 20:
            continue

        state = str(p.get("state") or p.get("State") or "").strip()
        county = str(p.get("county") or p.get("County") or "").strip()
        coords = geocode(state, county)
        if not coords:
            continue

        fuel = str(p.get("fuelType") or p.get("Fuel") or
                    p.get("generationType") or "").strip()
        proj_type = classify_fuel(fuel)

        name = str(p.get("projectName") or p.get("name") or
                   p.get("Name") or f"PJM-{p.get('queueNumber', '')}").strip()

        queue_id = str(p.get("queueNumber") or p.get("QueueNumber") or
                       p.get("id") or "").strip()

        projects.append({
            "id": f"PJM-{queue_id}",
            "name": name,
            "iso": "PJM",
            "type": proj_type,
            "fuel_type": normalize_fuel(fuel),
            "capacity_mw": round(capacity, 1),
            "lat": round(coords[0], 4),
            "lon": round(coords[1], 4),
            "status": "active",
            "queue_date": str(p.get("queueDate") or p.get("submittedDate") or "")[:10],
            "estimated_cod": str(p.get("commercialOperationDate") or
                               p.get("expectedInServiceDate") or "")[:10] or None,
            "county": county,
            "state": state,
        })
    return projects


def classify_fuel(fuel_str):
    """Classify fuel type into generation/load/storage."""
    f = fuel_str.lower()
    if any(w in f for w in ["battery", "storage", "bess", "flywheel"]):
        return "storage"
    if any(w in f for w in ["load", "data center", "datacenter", "demand"]):
        return "load"
    return "generation"


def normalize_fuel(fuel_str):
    """Normalize fuel type string to standard categories."""
    f = fuel_str.lower()
    if "solar" in f or "photovoltaic" in f:
        return "solar"
    if "wind" in f:
        return "wind"
    if "battery" in f or "storage" in f or "bess" in f:
        return "battery"
    if "gas" in f or "natural" in f or "ct" in f or "cc" in f:
        return "gas"
    if "nuclear" in f:
        return "nuclear"
    if "hydro" in f:
        return "hydro"
    if "coal" in f:
        return "coal"
    if "load" in f or "data center" in f:
        return "load"
    return "other"


def main():
    all_projects = []

    # MISO
    miso_raw = fetch_miso_queue()
    if miso_raw:
        miso = process_miso(miso_raw)
        print(f"  Processed {len(miso)} active MISO projects (≥20 MW)")
        all_projects.extend(miso)

    # PJM
    pjm_raw = fetch_pjm_queue()
    if pjm_raw:
        pjm = process_pjm(pjm_raw)
        print(f"  Processed {len(pjm)} active PJM projects (≥20 MW)")
        all_projects.extend(pjm)

    print(f"\nTotal: {len(all_projects)} queue projects")

    # Summary stats
    by_iso = {}
    by_type = {}
    total_mw = 0
    for p in all_projects:
        by_iso[p["iso"]] = by_iso.get(p["iso"], 0) + 1
        by_type[p["type"]] = by_type.get(p["type"], 0) + 1
        total_mw += p["capacity_mw"]

    print(f"  Total capacity: {total_mw/1000:.1f} GW")
    print(f"  By ISO: {by_iso}")
    print(f"  By type: {by_type}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_projects, f)

    size = os.path.getsize(OUTPUT_PATH)
    print(f"\nWritten to {OUTPUT_PATH} ({size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
