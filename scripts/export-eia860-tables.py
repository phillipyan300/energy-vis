#!/usr/bin/env python3
"""
Export every EIA Form 860 *data* table from the annual zip to JSON under
public/data/eia860/

This is the maximal tabular release EIA ships in the standard 860 zip:
utilities, plants, generator schedules (operable / proposed / retired),
wind, solar, energy storage, multifuel, ownership, and environmental
schedules (6A / 6B — each with multiple sheets).

Skipped (not survey data): blank form template, layout/field dictionary PDFs.

Usage:
  python3 scripts/export-eia860-tables.py
  python3 scripts/export-eia860-tables.py /path/to/eia8602024.zip

Optional env:
  EIA860_URL — override download URL (default in eia860_io.DEFAULT_EIA860_URL)
"""

from __future__ import annotations

import os
import shutil
import sys
import tempfile
import zipfile
from datetime import datetime, timezone

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(PROJECT_DIR, "public", "data", "eia860")

# Basenames in the official zip that contain respondent data (not blank forms / layout).
_DATA_PREFIXES = (
    "1___Utility",
    "2___Plant",
    "3_1_Generator",
    "3_2_Wind",
    "3_3_Solar",
    "3_4_Energy_Storage",
    "3_5_Multifuel",
    "4___Owner",
    "6_1_EnviroAssoc",
    "6_2_EnviroEquip",
)


def _is_data_xlsx(basename: str) -> bool:
    lower = basename.lower()
    if not lower.endswith(".xlsx"):
        return False
    if lower.startswith("~"):
        return False
    # Blank form workbook and layout metadata — huge, not useful for analytics.
    if "eia-860 form" in lower or lower.startswith("layout"):
        return False
    return any(basename.startswith(p) for p in _DATA_PREFIXES)


def export_from_extracted_root(extracted_root: str, out_dir: str) -> dict:
    from eia860_io import read_xlsx_all_sheets, safe_file_part, write_json_compact

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_root": extracted_root,
        "tables": [],
    }

    all_files = []
    for root, _dirs, files in os.walk(extracted_root):
        for f in files:
            all_files.append(os.path.join(root, f))

    os.makedirs(out_dir, exist_ok=True)

    for path in sorted(all_files):
        basename = os.path.basename(path)
        if not _is_data_xlsx(basename):
            continue

        base = os.path.splitext(basename)[0]
        sheets = read_xlsx_all_sheets(path, skip_rows=1)
        for sheet_name, rows in sheets.items():
            part = safe_file_part(sheet_name)
            out_name = f"{base}__{part}.json"
            out_path = os.path.join(out_dir, out_name)
            nbytes = write_json_compact(out_path, rows)
            manifest["tables"].append(
                {
                    "file": out_name,
                    "rows": len(rows),
                    "bytes": nbytes,
                    "source_xlsx": basename,
                    "sheet": sheet_name,
                }
            )
            print(f"  {out_name}  ({len(rows)} rows, {nbytes / 1024:.0f} KB)")

    manifest["tables"].sort(key=lambda x: x["file"])
    manifest_path = os.path.join(out_dir, "manifest.json")
    write_json_compact(manifest_path, manifest)
    print(f"\nWrote manifest: {manifest_path}")
    return manifest


def main():
    sys.path.insert(0, SCRIPT_DIR)
    from eia860_io import DEFAULT_EIA860_URL, download_eia860_zip

    url = os.environ.get("EIA860_URL", DEFAULT_EIA860_URL)
    tmp_dir = None
    if len(sys.argv) > 1:
        zip_path = os.path.abspath(sys.argv[1])
        if not os.path.isfile(zip_path):
            raise FileNotFoundError(f"Zip not found: {zip_path}")
        print(f"Using local zip: {zip_path}")
    else:
        tmp_dir, zip_path = download_eia860_zip(url=url)

    extract_dir = tempfile.mkdtemp(prefix="eia860-extract-")
    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(extract_dir)
        print(f"\nExporting tables to {OUT_DIR} ...\n")
        export_from_extracted_root(extract_dir, OUT_DIR)
    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
