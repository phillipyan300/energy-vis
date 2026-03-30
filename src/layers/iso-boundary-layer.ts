import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { FeatureCollection } from "geojson";
function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
    alpha,
  ];
}

export function createIsoBoundaryLayer(
  data: FeatureCollection | null,
  visible: boolean,
  onHover?: (info: PickingInfo) => void,
  onClick?: (info: PickingInfo) => void,
) {
  if (!data) return null;

  return new GeoJsonLayer({
    id: "iso-boundaries",
    data,
    visible,
    getFillColor: (f) => {
      const color = f.properties?.color as string;
      return color ? hexToRgba(color, 35) : [100, 100, 100, 30];
    },
    getLineColor: (f) => {
      const color = f.properties?.color as string;
      return color ? hexToRgba(color, 100) : [100, 100, 100, 80];
    },
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    pickable: true,
    stroked: true,
    filled: true,
    onHover,
    onClick,
  });
}
