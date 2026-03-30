#!/usr/bin/env python3
"""
Compute grid connections by extracting transmission line endpoints as proxy
substation nodes and matching power plants / AI datacenters to nearest nodes.

Input:
  - public/data/transmission-lines.geojson (345kV+ lines from HIFLD)
  - public/data/power-plants.json (EIA Form 860)
  - public/data/ai-datacenters.json

Output:
  - public/data/grid-connections.json
"""

import json
import math
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "public", "data")

TX_PATH = os.path.join(DATA_DIR, "transmission-lines.geojson")
PLANTS_PATH = os.path.join(DATA_DIR, "power-plants.json")
DC_PATH = os.path.join(DATA_DIR, "ai-datacenters.json")
OUTPUT_PATH = os.path.join(DATA_DIR, "grid-connections.json")

# Thresholds
MIN_PLANT_MW = 50          # Only connect plants >= 50 MW
PLANT_RADIUS_MI = 30       # Max distance plant-to-node
DC_RADIUS_MI = 50          # Max distance datacenter-to-node
CLUSTER_RADIUS_MI = 0.5    # Cluster endpoints within 0.5 miles

R_EARTH_MI = 3959.0


def haversine(lat1, lon1, lat2, lon2):
    """Distance in miles between two lat/lon points."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R_EARTH_MI * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def extract_endpoints(tx_geojson):
    """Extract first and last coordinate of each transmission line as endpoints."""
    endpoints = []  # list of (lon, lat, voltage, owner)
    for feature in tx_geojson.get("features", []):
        geom = feature.get("geometry", {})
        props = feature.get("properties", {})
        voltage = props.get("VOLTAGE") or props.get("voltage") or 0
        owner = props.get("OWNER") or props.get("owner") or ""

        coords = geom.get("coordinates", [])
        if not coords:
            continue

        # Handle MultiLineString vs LineString
        if geom.get("type") == "MultiLineString":
            for line in coords:
                if len(line) >= 2:
                    endpoints.append((line[0][0], line[0][1], voltage, owner))
                    endpoints.append((line[-1][0], line[-1][1], voltage, owner))
        elif geom.get("type") == "LineString":
            if len(coords) >= 2:
                endpoints.append((coords[0][0], coords[0][1], voltage, owner))
                endpoints.append((coords[-1][0], coords[-1][1], voltage, owner))

    return endpoints


def cluster_endpoints(endpoints, radius_mi=CLUSTER_RADIUS_MI):
    """Cluster nearby endpoints into single nodes."""
    nodes = []  # list of {lon, lat, voltages: set, owners: set, degree: int}

    for lon, lat, voltage, owner in endpoints:
        matched = None
        for node in nodes:
            dist = haversine(lat, lon, node["lat"], node["lon"])
            if dist <= radius_mi:
                matched = node
                break

        if matched:
            matched["degree"] += 1
            if voltage:
                matched["voltages"].add(int(voltage))
            if owner and owner != "NOT AVAILABLE":
                matched["owners"].add(owner)
            # Update centroid (running average)
            n = matched["degree"]
            matched["lon"] = matched["lon"] + (lon - matched["lon"]) / n
            matched["lat"] = matched["lat"] + (lat - matched["lat"]) / n
        else:
            node = {
                "lon": lon,
                "lat": lat,
                "degree": 1,
                "voltages": {int(voltage)} if voltage else set(),
                "owners": {owner} if owner and owner != "NOT AVAILABLE" else set(),
            }
            nodes.append(node)

    return nodes


def find_nearest_node(lat, lon, nodes, max_dist_mi):
    """Find the nearest node within max_dist_mi. Returns (node_index, distance) or (None, None)."""
    best_idx = None
    best_dist = max_dist_mi + 1
    for i, node in enumerate(nodes):
        dist = haversine(lat, lon, node["lat"], node["lon"])
        if dist < best_dist:
            best_dist = dist
            best_idx = i
    if best_dist <= max_dist_mi:
        return best_idx, round(best_dist, 1)
    return None, None


def main():
    print("Loading data...")
    with open(TX_PATH) as f:
        tx_data = json.load(f)
    with open(PLANTS_PATH) as f:
        plants = json.load(f)
    with open(DC_PATH) as f:
        datacenters = json.load(f)

    # Phase 1: Extract and cluster endpoints
    print("Extracting transmission line endpoints...")
    raw_endpoints = extract_endpoints(tx_data)
    print(f"  Raw endpoints: {len(raw_endpoints)}")

    print("Clustering endpoints into grid nodes...")
    nodes = cluster_endpoints(raw_endpoints)
    print(f"  Grid nodes: {len(nodes)}")

    multi_line_nodes = sum(1 for n in nodes if n["degree"] >= 2)
    print(f"  Nodes with 2+ lines: {multi_line_nodes}")

    # Phase 2: Match power plants to nearest node
    print(f"Matching power plants (>= {MIN_PLANT_MW} MW) to grid nodes...")
    large_plants = [p for p in plants if p.get("capacity_mw", 0) >= MIN_PLANT_MW]
    print(f"  Plants >= {MIN_PLANT_MW} MW: {len(large_plants)}")

    plant_connections = []
    for plant in large_plants:
        node_idx, dist = find_nearest_node(
            plant["lat"], plant["lon"], nodes, PLANT_RADIUS_MI
        )
        if node_idx is not None:
            plant_connections.append({
                "plant_id": plant["id"],
                "node_id": node_idx,
                "distance_mi": dist,
                "capacity_mw": plant["capacity_mw"],
                "fuel_type": plant.get("fuel_type", "other"),
                "source_lat": plant["lat"],
                "source_lon": plant["lon"],
                "target_lat": round(nodes[node_idx]["lat"], 4),
                "target_lon": round(nodes[node_idx]["lon"], 4),
            })

    print(f"  Plant connections made: {len(plant_connections)}")
    unmatched = len(large_plants) - len(plant_connections)
    print(f"  Plants without nearby node: {unmatched}")

    # Phase 3: Match datacenters to nearest node
    print("Matching AI datacenters to grid nodes...")
    dc_connections = []
    for i, dc in enumerate(datacenters):
        dc_id = dc.get("id", f"dc-{i}")
        node_idx, dist = find_nearest_node(
            dc["lat"], dc["lon"], nodes, DC_RADIUS_MI
        )
        if node_idx is not None:
            dc_connections.append({
                "dc_id": dc_id,
                "node_id": node_idx,
                "distance_mi": dist,
                "power_mw": dc.get("power_mw", 0),
                "status": dc.get("status", "unknown"),
                "source_lat": dc["lat"],
                "source_lon": dc["lon"],
                "target_lat": round(nodes[node_idx]["lat"], 4),
                "target_lon": round(nodes[node_idx]["lon"], 4),
            })

    print(f"  DC connections made: {len(dc_connections)} / {len(datacenters)}")

    # Phase 4: Serialize nodes
    nodes_out = []
    for i, node in enumerate(nodes):
        nodes_out.append({
            "id": i,
            "lon": round(node["lon"], 4),
            "lat": round(node["lat"], 4),
            "degree": node["degree"],
            "voltages": sorted(node["voltages"]),
            "owners": sorted(node["owners"])[:3],  # keep top 3 to limit size
        })

    output = {
        "nodes": nodes_out,
        "plant_connections": plant_connections,
        "dc_connections": dc_connections,
    }

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f)

    file_size = os.path.getsize(OUTPUT_PATH)
    print(f"\nWritten to {OUTPUT_PATH}")
    print(f"File size: {file_size / 1024:.0f} KB")
    print(f"  Nodes: {len(nodes_out)}")
    print(f"  Plant connections: {len(plant_connections)}")
    print(f"  DC connections: {len(dc_connections)}")

    # Stats
    degrees = [n["degree"] for n in nodes_out]
    print(f"\nNode degree stats:")
    print(f"  Max degree: {max(degrees)}")
    print(f"  Nodes with degree >= 4: {sum(1 for d in degrees if d >= 4)}")
    print(f"  Nodes with degree >= 6: {sum(1 for d in degrees if d >= 6)}")


if __name__ == "__main__":
    main()
