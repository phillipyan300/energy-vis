import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { Layer } from "@deck.gl/core";
import type { FeatureCollection } from "geojson";
import { ageToRgba } from "@/lib/age-color";

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
    alpha,
  ];
}

/**
 * ISO/RTO polygons filled by MW-weighted average fleet age (cool = young, warm = old).
 * Strokes reuse region accent colors from GeoJSON properties.
 */
export function createIsoAgeChoroplethLayer(
  data: FeatureCollection | null,
  visible: boolean,
  ageByIsoName: Map<string, number>,
  onHover?: (info: PickingInfo) => void,
  onClick?: (info: PickingInfo) => void,
): Layer | null {
  if (!data || !data.features.length) return null;

  return new GeoJsonLayer({
    id: "iso-fleet-age-choropleth",
    data,
    visible,
    filled: true,
    stroked: true,
    getFillColor: (f) => {
      const name = f.properties?.name as string | undefined;
      if (!name) return [30, 30, 40, 15];
      const age = ageByIsoName.get(name);
      if (age == null) return [30, 30, 40, 14];
      return ageToRgba(age, 52, 0, 55);
    },
    getLineColor: (f) => {
      const color = f.properties?.color as string;
      return color ? hexToRgba(color, 110) : [100, 100, 100, 90];
    },
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    pickable: true,
    _subLayerProps: {
      "polygons-fill": {
        parameters: { depthTest: false },
      },
      "polygons-stroke": {
        parameters: { depthTest: false },
      },
    },
    onHover,
    onClick,
  });
}
