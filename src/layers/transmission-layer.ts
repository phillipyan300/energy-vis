import { GeoJsonLayer } from "@deck.gl/layers";
import type { FeatureCollection } from "geojson";
import { TRANSMISSION_VOLTAGE_COLORS } from "@/lib/constants";

export function createTransmissionLayer(
  data: FeatureCollection | null,
  visible: boolean
) {
  if (!data) return null;

  return new GeoJsonLayer({
    id: "transmission-lines",
    data,
    visible,
    getLineColor: (f) => {
      const voltage = f.properties?.VOLTAGE || f.properties?.voltage || 345;
      if (voltage >= 765) return TRANSMISSION_VOLTAGE_COLORS["765"];
      if (voltage >= 500) return TRANSMISSION_VOLTAGE_COLORS["500"];
      return TRANSMISSION_VOLTAGE_COLORS["345"];
    },
    getLineWidth: (f) => {
      const voltage = f.properties?.VOLTAGE || f.properties?.voltage || 345;
      if (voltage >= 765) return 3;
      if (voltage >= 500) return 2;
      return 1;
    },
    lineWidthMinPixels: 0.5,
    lineWidthMaxPixels: 4,
    pickable: false,
  });
}
