#!/usr/bin/env python3
"""
Download and process EIA Form 860 data into a JSON file of US power plants.
Output: public/data/power-plants.json

Handles both xlsx and csv formats found in the EIA zip file.
"""

import json
import csv
import os
import urllib.request
import zipfile
import tempfile

# EIA Form 860 download URL
EIA_URL = "https://www.eia.gov/electricity/data/eia860/xls/eia8602024.zip"

# Fuel code mapping
FUEL_MAP = {
    "NG": "gas", "LFG": "gas", "OBG": "gas", "BFG": "gas",
    "NUC": "nuclear",
    "WND": "wind",
    "SUN": "solar",
    "SUB": "coal", "BIT": "coal", "LIG": "coal", "RC": "coal", "WC": "coal", "SC": "coal",
    "WAT": "hydro",
    "DFO": "oil", "RFO": "oil", "JF": "oil", "KER": "oil",
    "WDS": "other", "BLQ": "other", "AB": "other", "MSW": "other",
    "OBS": "other", "WH": "other", "PUR": "other", "TDF": "other",
    "OTH": "other", "GEO": "other", "PC": "other", "OG": "other",
    "SLW": "other", "MWH": "other", "BAT": "other",
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_DIR, "public", "data", "power-plants.json")


def download_eia860():
    """Download EIA 860 zip file to temp directory."""
    print("Downloading EIA Form 860 data...")
    tmp_dir = tempfile.mkdtemp()
    zip_path = os.path.join(tmp_dir, "eia860.zip")

    req = urllib.request.Request(EIA_URL, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    })
    with urllib.request.urlopen(req) as response:
        with open(zip_path, "wb") as f:
            f.write(response.read())

    file_size = os.path.getsize(zip_path)
    print(f"Downloaded {file_size / 1024 / 1024:.1f} MB to {zip_path}")
    return tmp_dir, zip_path


def read_xlsx_sheet(filepath, skip_rows=1):
    """Read xlsx file using openpyxl, return list of dicts."""
    try:
        import openpyxl
    except ImportError:
        print("Installing openpyxl...")
        import subprocess
        subprocess.check_call(["pip3", "install", "openpyxl", "-q"])
        import openpyxl

    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    # Find header row (skip initial rows which may be titles)
    header_row = skip_rows
    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[header_row])]

    result = []
    for row in rows[header_row + 1:]:
        d = {}
        for i, val in enumerate(row):
            if i < len(headers):
                d[headers[i]] = val
        result.append(d)
    return result


def process_plants(zip_path):
    """Extract plant data from the zip file."""
    plants = {}
    tmp_dir = tempfile.mkdtemp()

    with zipfile.ZipFile(zip_path, "r") as zf:
        print("Zip contents:")
        for f in zf.namelist():
            if not f.startswith("__"):
                print(f"  {f}")

        zf.extractall(tmp_dir)

    # Find files
    all_files = []
    for root, dirs, files in os.walk(tmp_dir):
        for f in files:
            all_files.append(os.path.join(root, f))

    plant_file = None
    gen_file = None
    for f in all_files:
        basename = os.path.basename(f).lower()
        if "plant" in basename and ("2___" in basename or "2__" in basename or "plant_y" in basename):
            plant_file = f
        if "generator" in basename and ("3_1" in basename or "3_1_" in basename):
            gen_file = f

    # Fallback: broader search
    if not plant_file:
        for f in all_files:
            basename = os.path.basename(f).lower()
            if "plant" in basename and (basename.endswith(".xlsx") or basename.endswith(".csv")):
                if "generator" not in basename and "__macosx" not in f.lower():
                    plant_file = f
                    break

    if not gen_file:
        for f in all_files:
            basename = os.path.basename(f).lower()
            if "generator" in basename and (basename.endswith(".xlsx") or basename.endswith(".csv")):
                if "wind" not in basename and "solar" not in basename and "__macosx" not in f.lower():
                    gen_file = f
                    break

    print(f"Plant file: {plant_file}")
    print(f"Generator file: {gen_file}")

    if not plant_file:
        raise FileNotFoundError("Could not find plant data file in EIA zip")

    # Read plant data
    if plant_file.endswith(".xlsx"):
        plant_rows = read_xlsx_sheet(plant_file, skip_rows=1)
    else:
        with open(plant_file, "r", encoding="utf-8-sig") as f:
            plant_rows = list(csv.DictReader(f))

    print(f"Read {len(plant_rows)} plant rows")
    if plant_rows:
        print(f"Plant columns: {list(plant_rows[0].keys())[:10]}...")

    for row in plant_rows:
        plant_code = str(row.get("Plant Code", row.get("plant_code", row.get("Utility ID", "")))).strip()
        if not plant_code or plant_code == "None":
            continue

        lat = row.get("Latitude", row.get("latitude", ""))
        lon = row.get("Longitude", row.get("longitude", ""))
        try:
            lat_f = float(lat)
            lon_f = float(lon)
        except (ValueError, TypeError):
            continue

        if not (24 < lat_f < 50 and -125 < lon_f < -66):
            continue

        plant_name = str(row.get("Plant Name", row.get("plant_name", "Unknown")))
        operator = str(row.get("Utility Name", row.get("utility_name", "")))

        plants[plant_code] = {
            "id": f"pp-{plant_code}",
            "name": plant_name,
            "operator": operator,
            "lat": round(lat_f, 4),
            "lon": round(lon_f, 4),
            "state": str(row.get("State", row.get("state", ""))),
            "capacity_mw": 0,
            "fuel_type": "other",
        }

    print(f"Found {len(plants)} plants with valid coordinates")

    # Read generator data
    if gen_file:
        if gen_file.endswith(".xlsx"):
            gen_rows = read_xlsx_sheet(gen_file, skip_rows=1)
        else:
            with open(gen_file, "r", encoding="utf-8-sig") as f:
                gen_rows = list(csv.DictReader(f))

        print(f"Read {len(gen_rows)} generator rows")
        if gen_rows:
            print(f"Generator columns: {list(gen_rows[0].keys())[:10]}...")

        for row in gen_rows:
            plant_code = str(row.get("Plant Code", row.get("plant_code", ""))).strip()
            if plant_code not in plants:
                continue

            status = str(row.get("Status", row.get("status", "")))
            if status not in ("OP", "SB"):
                continue

            try:
                cap = float(row.get("Nameplate Capacity (MW)",
                                   row.get("nameplate_capacity_mw",
                                          row.get("Nameplate Capacity\n(MW)", 0))))
            except (ValueError, TypeError):
                cap = 0

            fuel = str(row.get("Energy Source 1", row.get("energy_source_1",
                              row.get("Technology", "OTH"))))
            fuel_type = FUEL_MAP.get(fuel, "other")

            plants[plant_code]["capacity_mw"] += cap
            if fuel_type != "other" or plants[plant_code]["fuel_type"] == "other":
                plants[plant_code]["fuel_type"] = fuel_type

    result = [p for p in plants.values() if p["capacity_mw"] >= 1]
    for p in result:
        p["capacity_mw"] = round(p["capacity_mw"], 1)

    import shutil
    shutil.rmtree(tmp_dir, ignore_errors=True)

    return result


def main():
    tmp_dir, zip_path = download_eia860()
    try:
        plants = process_plants(zip_path)
        print(f"\nProcessed {len(plants)} power plants")

        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, "w") as f:
            json.dump(plants, f)

        file_size = os.path.getsize(OUTPUT_PATH)
        print(f"Written to {OUTPUT_PATH} ({file_size / 1024:.0f} KB)")

        fuel_counts = {}
        total_mw = 0
        for p in plants:
            ft = p["fuel_type"]
            fuel_counts[ft] = fuel_counts.get(ft, 0) + 1
            total_mw += p["capacity_mw"]
        print(f"Total capacity: {total_mw / 1000:.1f} GW")
        print("Plants by fuel type:")
        for ft, count in sorted(fuel_counts.items(), key=lambda x: -x[1]):
            print(f"  {ft}: {count}")
    finally:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
