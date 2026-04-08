import { GeoJsonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { Layer } from "@deck.gl/core";
import type { FeatureCollection, Feature } from "geojson";

function hexToRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
    alpha,
  ];
}

// Desaturate a hex color toward gray for minor BAs
function hexToDesaturatedRgba(hex: string, alpha: number): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Blend 70% toward gray
  const gray = (r + g + b) / 3;
  const mix = 0.7;
  return [
    Math.round(r * (1 - mix) + gray * mix),
    Math.round(g * (1 - mix) + gray * mix),
    Math.round(b * (1 - mix) + gray * mix),
    alpha,
  ];
}

const MAJOR_ISOS = new Set([
  "PJM", "ERCOT", "CAISO", "MISO", "SPP", "NYISO", "ISO-NE",
]);

export function createIsoBoundaryLayer(
  data: FeatureCollection | null,
  visible: boolean,
  onHover?: (info: PickingInfo) => void,
  onClick?: (info: PickingInfo) => void,
): Layer[] {
  if (!data) return [];

  const majorFeatures: Feature[] = [];
  const minorFeatures: Feature[] = [];

  for (const f of data.features) {
    const name = f.properties?.name as string;
    if (MAJOR_ISOS.has(name)) {
      majorFeatures.push(f);
    } else {
      minorFeatures.push(f);
    }
  }

  const majorData: FeatureCollection = { type: "FeatureCollection", features: majorFeatures };
  const minorData: FeatureCollection = { type: "FeatureCollection", features: minorFeatures };

  const layers: Layer[] = [];

  // Minor BAs: desaturated gray fill + thin dashed-style border
  if (minorFeatures.length > 0) {
    layers.push(
      new GeoJsonLayer({
        id: "iso-boundaries-minor",
        data: minorData,
        visible,
        filled: true,
        stroked: true,
        getFillColor: (f) => {
          const color = f.properties?.color as string;
          return color ? hexToDesaturatedRgba(color, 12) : [80, 80, 80, 10];
        },
        getLineColor: (f) => {
          const color = f.properties?.color as string;
          return color ? hexToDesaturatedRgba(color, 45) : [80, 80, 80, 35];
        },
        getLineWidth: 1,
        lineWidthMinPixels: 0.5,
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
      }),
    );
  }

  // Major ISOs: saturated color fill + bold border
  layers.push(
    new GeoJsonLayer({
      id: "iso-boundaries-major",
      data: majorData,
      visible,
      filled: true,
      stroked: true,
      getFillColor: (f) => {
        const color = f.properties?.color as string;
        return color ? hexToRgba(color, 25) : [100, 100, 100, 20];
      },
      getLineColor: (f) => {
        const color = f.properties?.color as string;
        return color ? hexToRgba(color, 130) : [100, 100, 100, 100];
      },
      getLineWidth: 2.5,
      lineWidthMinPixels: 1.5,
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
    }),
  );

  return layers;
}
