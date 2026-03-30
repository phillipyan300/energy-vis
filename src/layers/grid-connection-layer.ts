import { LineLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { GridNode, GridConnection, FuelType, DatacenterStatus } from "@/types";
import { FUEL_COLORS, STATUS_COLORS } from "@/lib/colors";
import {
  GRID_NODE_COLOR,
  GRID_NODE_GLOW_COLOR,
  CONNECTION_ZOOM_THRESHOLDS,
} from "@/lib/constants";

type RGBA = [number, number, number, number];

function getThresholds(zoom: number): { minMW: number; minDegree: number } {
  let minMW = 500;
  let minDegree = 6;
  for (const [z, mw, deg] of CONNECTION_ZOOM_THRESHOLDS) {
    if (zoom >= z) {
      minMW = mw;
      minDegree = deg;
    }
  }
  return { minMW, minDegree };
}

function getLineColor(conn: GridConnection): RGBA {
  if (conn.fuel_type) {
    const color = FUEL_COLORS[conn.fuel_type as FuelType];
    return color ? [color[0], color[1], color[2], 60] : [120, 220, 255, 40];
  }
  if (conn.status) {
    const color = STATUS_COLORS[conn.status as DatacenterStatus];
    return color ? [color[0], color[1], color[2], 80] : [120, 220, 255, 60];
  }
  return [120, 220, 255, 40];
}

function formatNodeLabel(node: GridNode): string {
  const voltageStr = node.voltages.length > 0
    ? node.voltages.map((v) => `${v}kV`).join("/")
    : "";
  const ownerStr = node.owners.length > 0
    ? node.owners[0].substring(0, 20)
    : "";
  if (voltageStr && ownerStr) return `${voltageStr} · ${ownerStr}`;
  return voltageStr || ownerStr || `Node ${node.id}`;
}

export function createGridConnectionLayers(
  nodes: GridNode[],
  plantConnections: GridConnection[],
  dcConnections: GridConnection[],
  visible: boolean,
  zoom: number,
) {
  if (!visible) return [];

  const { minMW, minDegree } = getThresholds(zoom);

  const filteredPlantConns = plantConnections.filter(
    (c) => (c.capacity_mw || 0) >= minMW,
  );

  const allConns = [...filteredPlantConns, ...dcConnections];

  // Collect node IDs that have connections
  const connectedNodeIds = new Set(allConns.map((c) => c.node_id));
  const filteredNodes = nodes.filter(
    (n) => connectedNodeIds.has(n.id) && n.degree >= minDegree,
  );

  const lineOpacity = Math.min(0.6, 0.15 + (zoom - 4) * 0.08);
  const showLabels = zoom >= 10;

  return [
    // Connection lines — thin, subtle
    new LineLayer<GridConnection>({
      id: "grid-connection-lines",
      data: allConns,
      getSourcePosition: (d) => [d.source_lon, d.source_lat],
      getTargetPosition: (d) => [d.target_lon, d.target_lat],
      getColor: (d) => getLineColor(d),
      getWidth: 1,
      widthMinPixels: 0.5,
      widthMaxPixels: 2,
      opacity: lineOpacity,
      pickable: false,
    }),
    // Node glow
    new ScatterplotLayer<GridNode>({
      id: "grid-nodes-glow",
      data: filteredNodes,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => Math.max(2500, d.degree * 600),
      getFillColor: GRID_NODE_GLOW_COLOR,
      pickable: false,
      radiusMinPixels: 3,
      radiusMaxPixels: 16,
    }),
    // Node dots — pickable for hover info
    new ScatterplotLayer<GridNode>({
      id: "grid-nodes",
      data: filteredNodes,
      getPosition: (d) => [d.lon, d.lat],
      getRadius: (d) => Math.max(1200, d.degree * 300),
      getFillColor: GRID_NODE_COLOR,
      stroked: true,
      getLineColor: [255, 255, 255, 80],
      lineWidthMinPixels: 0.5,
      pickable: false,
      radiusMinPixels: 2,
      radiusMaxPixels: 7,
    }),
    // Node labels at high zoom
    ...(showLabels
      ? [
          new TextLayer<GridNode>({
            id: "grid-node-labels",
            data: filteredNodes.filter((n) => n.degree >= 4).slice(0, 50),
            getPosition: (d) => [d.lon, d.lat],
            getText: (d) => formatNodeLabel(d),
            getColor: [200, 220, 240, 180],
            getSize: 11,
            getPixelOffset: [0, -14],
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 500,
            outlineWidth: 2,
            outlineColor: [10, 15, 25, 200],
            pickable: false,
            billboard: true,
          }),
        ]
      : []),
  ];
}
