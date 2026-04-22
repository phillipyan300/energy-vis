#!/usr/bin/env python3
"""
Search FERC eLibrary via the same JSON API the web UI uses (unofficial but public).

  python3 scripts/ferc_elibrary_search.py "Appalachian Power"
  python3 scripts/ferc_elibrary_search.py "ER23-1703" --docket
  python3 scripts/ferc_elibrary_search.py "solar" --json-out /tmp/ferc-hits.json

Respect FERC infrastructure: run interactively, do not batch-scrape. See
https://www.ferc.gov/ferc-online/elibrary

API endpoint: POST https://elibrary.ferc.gov/eLibrarywebapi/api/Search/AdvancedSearch
"""

from __future__ import annotations

import argparse
import json
import ssl
import sys
import urllib.request

API = "https://elibrary.ferc.gov/eLibrarywebapi/api/Search/AdvancedSearch"
USER_AGENT = "energy-vis-research/1.0 (local; +https://github.com/)"

# Body shape matches the SPA; omitting fields the server defaults caused 400s in some tests.
def _body_text_search(
    search_text: str,
    *,
    results_per_page: int,
    page: int,
) -> dict:
    return {
        "searchText": search_text,
        "searchFullText": True,
        "searchDescription": True,
        "dateSearches": [],
        "availability": None,
        "affiliations": [],
        "categories": [],
        "libraries": [],
        "accessionNumber": None,
        "eFiling": False,
        "docketSearches": [],
        "resultsPerPage": results_per_page,
        "curPage": page,
        "classTypes": [],
        "sortBy": "",
        "groupBy": "NONE",
        "idolResultID": "",
        "allDates": False,
    }


def _body_docket_search(
    docket: str,
    *,
    results_per_page: int,
    page: int,
) -> dict:
    return {
        "searchText": "*",
        "searchFullText": True,
        "searchDescription": True,
        "dateSearches": [],
        "availability": None,
        "affiliations": [],
        "categories": [],
        "libraries": [],
        "accessionNumber": None,
        "eFiling": False,
        "docketSearches": [
            {"docketNumber": docket.strip(), "subDocketNumbers": []},
        ],
        "resultsPerPage": results_per_page,
        "curPage": page,
        "classTypes": [],
        "sortBy": "",
        "groupBy": "NONE",
        "idolResultID": "",
        "allDates": False,
    }


def search(payload: dict, *, ssl_context: ssl.SSLContext | None) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60, context=ssl_context) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    p = argparse.ArgumentParser(description="FERC eLibrary search (AdvancedSearch API)")
    p.add_argument("query", help='Keywords, company name, or docket e.g. "ER23-1703-000"')
    p.add_argument(
        "--docket",
        action="store_true",
        help="Treat query as a docket number (Document Number field)",
    )
    p.add_argument("--limit", type=int, default=15, help="Max hits to print (default 15)")
    p.add_argument("--page", type=int, default=1, help="Result page (1-based)")
    p.add_argument(
        "--json-out",
        metavar="FILE",
        help="Write full API JSON response to FILE",
    )
    p.add_argument(
        "--insecure",
        action="store_true",
        help="Disable TLS certificate verification (only if your network breaks SSL)",
    )
    args = p.parse_args()

    ssl_ctx: ssl.SSLContext | None
    if args.insecure:
        print("Warning: TLS verification disabled (--insecure)", file=sys.stderr)
        ssl_ctx = ssl._create_unverified_context()
    else:
        ssl_ctx = None

    if args.docket:
        body = _body_docket_search(
            args.query, results_per_page=args.limit, page=args.page
        )
    else:
        body = _body_text_search(
            args.query, results_per_page=args.limit, page=args.page
        )

    try:
        out = search(body, ssl_context=ssl_ctx)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(str(e.reason), file=sys.stderr)
        sys.exit(1)

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"Wrote {args.json_out}")

    hits = out.get("searchHits") or []
    total = out.get("totalHits")
    print(f"Query: {args.query!r}  mode: {'docket' if args.docket else 'text'}")
    if total is not None:
        print(f"Total hits (reported): {total}  showing {len(hits)}\n")
    else:
        print(f"Showing {len(hits)} hits\n")

    for i, h in enumerate(hits, 1):
        desc = (h.get("description") or "").replace("\n", " ")[:120]
        filed = h.get("filedDate") or h.get("postedDate") or ""
        acc = h.get("acesssionNumber") or h.get("accessionNumber") or ""
        docks = h.get("docketNumbers") or []
        dock_s = ", ".join(docks[:3]) if docks else ""
        print(f"{i:2}. {filed}  accession={acc}")
        if dock_s:
            print(f"    dockets: {dock_s}")
        print(f"    {desc}")
        trans = (h.get("transmittals") or [{}])[0]
        fn = trans.get("fileName")
        if fn:
            print(f"    file: {fn}")
        print()


if __name__ == "__main__":
    main()
