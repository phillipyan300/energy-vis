export const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const INITIAL_VIEW_STATE = {
  longitude: -96,
  latitude: 38.5,
  zoom: 4,
  pitch: 0,
  bearing: 0,
};

export const TRANSMISSION_VOLTAGE_COLORS: Record<
  string,
  [number, number, number, number]
> = {
  "765": [255, 255, 255, 160],
  "500": [250, 204, 21, 120],
  "345": [148, 163, 184, 80],
};

export const GRID_NODE_COLOR: [number, number, number, number] = [
  120, 220, 255, 200,
];

export const GRID_NODE_GLOW_COLOR: [number, number, number, number] = [
  120, 220, 255, 40,
];

export const CONNECTION_HIGHLIGHT_COLOR: [number, number, number, number] = [
  255, 255, 255, 220,
];

// Zoom-based filtering: [minZoom, minCapacityMW, minNodeDegree]
export const CONNECTION_ZOOM_THRESHOLDS: [number, number, number][] = [
  [0, 500, 6],
  [5, 200, 3],
  [7, 50, 2],
  [9, 0, 1],
];
