import type { FeatureCollection } from "geojson";

/**
 * Ray-casting point-in-polygon test.
 */
export function pointInPolygon(
  point: [number, number],
  ring: number[][],
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Test if a point is inside a GeoJSON feature (handles Polygon and MultiPolygon).
 */
function pointInFeature(
  point: [number, number],
  geometry: { type: string; coordinates: number[][][] | number[][][][] },
): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates[0] as number[][]);
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).some((poly) =>
      pointInPolygon(point, poly[0]),
    );
  }
  return false;
}

/**
 * Assign each item to an ISO region based on its coordinates.
 * Returns a Map of item ID -> region name.
 */
export function assignRegions(
  items: { id: string; lat: number; lon: number }[],
  isoBoundaries: FeatureCollection | null,
): Map<string, string> {
  const regionMap = new Map<string, string>();
  if (!isoBoundaries) return regionMap;

  for (const item of items) {
    const point: [number, number] = [item.lon, item.lat];
    for (const feature of isoBoundaries.features) {
      if (
        feature.geometry &&
        feature.properties?.name &&
        pointInFeature(point, feature.geometry as { type: string; coordinates: number[][][] | number[][][][] })
      ) {
        regionMap.set(item.id, feature.properties.name as string);
        break;
      }
    }
  }
  return regionMap;
}
