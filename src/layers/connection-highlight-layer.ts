import { LineLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { GridNode, GridConnection, FuelType } from "@/types";
import { FUEL_COLORS } from "@/lib/colors";
import { CONNECTION_HIGHLIGHT_COLOR, GRID_NODE_COLOR } from "@/lib/constants";

type RGBA = [number, number, number, number];

/**
 * Creates highlight layers when a datacenter or plant is selected.
 * Shows the selected item's connection to its grid node, plus
 * secondary connections from other plants sharing that node.
 */
export function createConnectionHighlightLayers(
  selectedId: string | null,
  selectedType: "datacenter" | "powerPlant" | null,
  nodes: GridNode[],
  plantConnections: GridConnection[],
  dcConnections: GridConnection[],
) {
  if (!selectedId || !selectedType) return [];

  // Find the selected item's connection
  let primaryConn: GridConnection | undefined;
  if (selectedType === "datacenter") {
    primaryConn = dcConnections.find((c) => c.dc_id === selectedId);
  } else {
    primaryConn = plantConnections.find((c) => c.plant_id === selectedId);
  }

  if (!primaryConn) return [];

  const nodeId = primaryConn.node_id;
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return [];

  // Find other plants connected to the same node
  const secondaryConns = plantConnections.filter(
    (c) => c.node_id === nodeId && c.plant_id !== selectedId,
  );

  // Also find DCs connected to same node (if selected is a plant)
  const secondaryDCConns =
    selectedType === "powerPlant"
      ? dcConnections.filter((c) => c.node_id === nodeId)
      : [];

  const allSecondary = [...secondaryConns, ...secondaryDCConns];

  return [
    // Secondary connections (dimmer)
    new LineLayer<GridConnection>({
      id: "highlight-secondary-lines",
      data: allSecondary,
      getSourcePosition: (d) => [d.source_lon, d.source_lat],
      getTargetPosition: (d) => [d.target_lon, d.target_lat],
      getColor: (d) => {
        if (d.fuel_type) {
          const c = FUEL_COLORS[d.fuel_type as FuelType];
          return c ? ([c[0], c[1], c[2], 140] as RGBA) : [180, 180, 180, 100];
        }
        return [180, 180, 180, 100];
      },
      getWidth: 1.5,
      widthMinPixels: 1,
      widthMaxPixels: 3,
      opacity: 0.7,
      pickable: false,
    }),
    // Primary connection (bright white)
    new LineLayer<GridConnection>({
      id: "highlight-primary-line",
      data: [primaryConn],
      getSourcePosition: (d) => [d.source_lon, d.source_lat],
      getTargetPosition: (d) => [d.target_lon, d.target_lat],
      getColor: CONNECTION_HIGHLIGHT_COLOR,
      getWidth: 3,
      widthMinPixels: 2,
      widthMaxPixels: 5,
      opacity: 1,
      pickable: false,
    }),
    // Highlighted grid node
    new ScatterplotLayer<GridNode>({
      id: "highlight-node",
      data: [node],
      getPosition: (d) => [d.lon, d.lat],
      getRadius: 5000,
      getFillColor: GRID_NODE_COLOR,
      stroked: true,
      getLineColor: CONNECTION_HIGHLIGHT_COLOR,
      lineWidthMinPixels: 2,
      pickable: false,
      radiusMinPixels: 6,
      radiusMaxPixels: 16,
    }),
  ];
}
