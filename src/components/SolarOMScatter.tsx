"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import DeckGL from "@deck.gl/react";
import {
  OrbitView,
  LinearInterpolator,
  LightingEffect,
  AmbientLight,
  PointLight,
  TRANSITION_EVENTS,
} from "@deck.gl/core";
import { LineLayer, TextLayer, ScatterplotLayer, PathLayer, PolygonLayer } from "@deck.gl/layers";
import type { FeatureCollection } from "geojson";
import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { SphereGeometry } from "@luma.gl/engine";
import type { PickingInfo } from "@deck.gl/core";
import type { OperatorProfile } from "@/lib/operator-stats";
import type { PowerPlant, QueueProject } from "@/types";
import { FUEL_COLORS } from "@/lib/colors";
import type { Slide } from "@/components/SolarOMTourPanel";

// Unit sphere mesh. Created once, stable GPU reference.
const SPHERE_MESH = new SphereGeometry({ radius: 1, nlat: 20, nlong: 20 });

// Lighting: key light from upper-right + fill from left + ambient
const LIGHTING = new LightingEffect({
  ambient: new AmbientLight({ color: [255, 255, 255], intensity: 0.35 }),
  key: new PointLight({ color: [255, 250, 240], intensity: 3.0, position: [200, 200, 300] }),
  fill: new PointLight({ color: [180, 210, 255], intensity: 1.2, position: [-80, 80, 150] }),
});

// Axis orientation:
//   X (right) = site count        (solar HIGH, coal/gas LOW)
//   Y (up)    = fleet age         (solar LOW,  coal/gas HIGH)
//   Z (depth) = dispersion        (solar HIGH, coal/gas LOW)

const ORBIT_MIN_ZOOM = -2;
const ORBIT_MAX_ZOOM = 22;
// Global animation speed knob. 1.0 = as authored, 0.85 = 15% faster.
const ANIM_SPEED = 0.85;

type ViewState = {
  target: [number, number, number];
  zoom: number;
  rotationOrbit: number;
  rotationX: number;
  transitionDuration?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitionInterpolator?: any;
  transitionInterruption?: typeof TRANSITION_EVENTS[keyof typeof TRANSITION_EVENTS];
  minZoom?: number;
  maxZoom?: number;
  minRotationX?: number;
  maxRotationX?: number;
};

const TRANSITION_PROPS = ["rotationOrbit", "rotationX", "zoom", "target"];

// ────────────────────────────────────────────────────────────────────────────
// Scatter-scene decor
// ────────────────────────────────────────────────────────────────────────────

const AXIS_LINES = [
  { source: [0, 0, 0], target: [105, 0, 0], color: [100, 160, 255, 200] },
  { source: [0, 0, 0], target: [0, 105, 0], color: [100, 220, 140, 200] },
  { source: [0, 0, 0], target: [0, 0, 105], color: [255, 190, 80, 200] },
] as const;

const AXIS_LABELS = [
  { position: [114, 0, 0] as [number, number, number], text: "Sites →" },
  { position: [0, 114, 0] as [number, number, number], text: "Fleet Age →" },
  { position: [0, 0, 114] as [number, number, number], text: "Dispersion →" },
];

function buildGrid(): { source: [number, number, number]; target: [number, number, number] }[] {
  const lines = [];
  for (let i = 0; i <= 10; i++) {
    lines.push({
      source: [i * 10, 0, 0] as [number, number, number],
      target: [i * 10, 0, 100] as [number, number, number],
    });
    lines.push({
      source: [0, 0, i * 10] as [number, number, number],
      target: [100, 0, i * 10] as [number, number, number],
    });
  }
  return lines;
}
const GRID_LINES = buildGrid();

// Ring encircling one axis at a given offset along that axis.
//  "y" horizontal ring at height y (age metric, existing behavior)
//  "x" vertical ring in Y-Z plane at x offset (sites metric)
//  "z" vertical ring in X-Y plane at z offset (dispersion metric)
function buildRing(
  offset: number,
  radius: number,
  color: [number, number, number, number],
  axis: "x" | "y" | "z" = "y",
  segments = 48,
): { source: [number, number, number]; target: [number, number, number]; color: [number, number, number, number] }[] {
  const out = [];
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * 2 * Math.PI;
    const a1 = ((i + 1) / segments) * 2 * Math.PI;
    let source: [number, number, number];
    let target: [number, number, number];
    if (axis === "y") {
      source = [radius * Math.cos(a0), offset, radius * Math.sin(a0)];
      target = [radius * Math.cos(a1), offset, radius * Math.sin(a1)];
    } else if (axis === "x") {
      source = [offset, radius * Math.cos(a0), radius * Math.sin(a0)];
      target = [offset, radius * Math.cos(a1), radius * Math.sin(a1)];
    } else {
      source = [radius * Math.cos(a0), radius * Math.sin(a0), offset];
      target = [radius * Math.cos(a1), radius * Math.sin(a1), offset];
    }
    out.push({ source, target, color });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// US-map region. Lives in the SAME 3D scene as the scatter cube, offset to
// the left on X so the camera can simply pan/rotate to view it.
// ────────────────────────────────────────────────────────────────────────────

const US_LON_MIN = -125;
const US_LON_MAX = -66;
const US_LAT_MIN = 24;
const US_LAT_MAX = 50;

// Scatter cube occupies X ∈ [0, 100]. Put the US map off to the left.
// Width/depth respect the real US aspect ratio (equirectangular with a
// cos(avg_lat) correction) so the country looks like a country, not a square.
const US_AVG_LAT_RAD = ((US_LAT_MIN + US_LAT_MAX) / 2) * (Math.PI / 180);
const US_ASPECT =
  ((US_LON_MAX - US_LON_MIN) * Math.cos(US_AVG_LAT_RAD)) /
  (US_LAT_MAX - US_LAT_MIN);
const USMAP_DEPTH = 60;
const USMAP_WIDTH = USMAP_DEPTH * US_ASPECT; // ≈ 109
const USMAP_X_OFFSET = -140;
const USMAP_Z_OFFSET = 20; // vertically center within z ∈ [0, 100]

// Center of the US map region. Useful as a camera target.
export const USMAP_CENTER: [number, number, number] = [
  USMAP_X_OFFSET + USMAP_WIDTH / 2,
  0,
  USMAP_Z_OFFSET + USMAP_DEPTH / 2,
];

function projectLonLat([lon, lat]: [number, number]): [number, number, number] {
  const x = USMAP_X_OFFSET + ((lon - US_LON_MIN) / (US_LON_MAX - US_LON_MIN)) * USMAP_WIDTH;
  const z = USMAP_Z_OFFSET + ((US_LAT_MAX - lat) / (US_LAT_MAX - US_LAT_MIN)) * USMAP_DEPTH;
  return [x, 0, z];
}

function projectPlant(p: PowerPlant): [number, number, number] {
  return projectLonLat([p.lon, p.lat]);
}

// Rectangular frame outlining the US-map region on the ground plane.
const USMAP_FRAME = [
  {
    source: [USMAP_X_OFFSET, 0, USMAP_Z_OFFSET] as [number, number, number],
    target: [USMAP_X_OFFSET + USMAP_WIDTH, 0, USMAP_Z_OFFSET] as [number, number, number],
  },
  {
    source: [USMAP_X_OFFSET + USMAP_WIDTH, 0, USMAP_Z_OFFSET] as [number, number, number],
    target: [USMAP_X_OFFSET + USMAP_WIDTH, 0, USMAP_Z_OFFSET + USMAP_DEPTH] as [number, number, number],
  },
  {
    source: [USMAP_X_OFFSET + USMAP_WIDTH, 0, USMAP_Z_OFFSET + USMAP_DEPTH] as [number, number, number],
    target: [USMAP_X_OFFSET, 0, USMAP_Z_OFFSET + USMAP_DEPTH] as [number, number, number],
  },
  {
    source: [USMAP_X_OFFSET, 0, USMAP_Z_OFFSET + USMAP_DEPTH] as [number, number, number],
    target: [USMAP_X_OFFSET, 0, USMAP_Z_OFFSET] as [number, number, number],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export interface SolarOMScatterProps {
  profiles: OperatorProfile[];
  plants?: PowerPlant[];
  slide: Slide;
  slideIndex: number;
  activeFuels?: string[] | null;
  /** Resolved operator for the current slide's spotlight/usMap overlay */
  spotlightOperator?: string | null;
  /** GeoJSON for the US-map region (e.g. state borders) */
  mapBoundaries?: FeatureCollection | null;
  /** Interconnection-queue projects (for slide.overlay.showQueue) */
  queueProjects?: QueueProject[] | null;
  /** Called when a sphere is clicked in free-view mode. */
  onSelectOperator?: (operator: string) => void;
}

export default function SolarOMScatter({
  profiles,
  plants,
  slide,
  slideIndex,
  activeFuels = null,
  spotlightOperator = null,
  mapBoundaries = null,
  queueProjects = null,
  onSelectOperator,
}: SolarOMScatterProps) {
  // Uncontrolled view state: deck.gl manages interpolation + user interaction internally.
  // Changing `initialViewState` triggers a transition from the CURRENT camera to the new target,
  // interrupting any in-flight transition (transitionInterruption: BREAK).
  const [initialViewState, setInitialViewState] = useState<ViewState>({
    ...slide.viewState,
    minZoom: ORBIT_MIN_ZOOM,
    maxZoom: ORBIT_MAX_ZOOM,
    minRotationX: -10,
    maxRotationX: 89,
  });

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    operator: string;
    detail: string;
  } | null>(null);

  const normalized = useMemo(() => {
    if (!profiles.length) return [];
    const maxSites = Math.max(...profiles.map((p) => p.siteCount));
    const maxAge = Math.max(...profiles.map((p) => p.avgFleetAge));
    const maxDisp = Math.max(...profiles.map((p) => p.dispersionKm));
    return profiles.map((p) => ({
      ...p,
      x: maxSites > 0 ? (p.siteCount / maxSites) * 100 : 0,
      y: maxAge > 0 ? (p.avgFleetAge / maxAge) * 100 : 0,
      z: maxDisp > 0 ? (p.dispersionKm / maxDisp) * 100 : 0,
      radius: Math.max(1.0, Math.sqrt(p.totalCapacityGw) * 1.1) / 1.6,
    }));
  }, [profiles]);

  // Centroid of the spotlighted operator's plants in US-map cartesian coords.
  // Used both to anchor the zoom-in camera and to draw spokes from each site.
  // Respects slide.overlay.usMapCentroidFilter so we can bias away from
  // far-flung outliers (e.g. Hawaii) or focus on specific regional clusters.
  const operatorCentroid = useMemo<[number, number, number] | null>(() => {
    if (!spotlightOperator || !plants?.length) return null;
    const ops = plants.filter((p) => p.operator === spotlightOperator);
    if (!ops.length) return null;

    const filter = slide.overlay?.usMapCentroidFilter ?? "all";
    let subset = ops;
    if (filter === "contiguous") {
      subset = ops.filter((p) => p.lon > -130 && p.lon < -65 && p.lat > 24 && p.lat < 50);
    } else if (filter === "east") {
      subset = ops.filter((p) => p.lon > -90 && p.lat > 24 && p.lat < 50);
    }
    if (!subset.length) subset = ops; // fallback if filter empties

    const lon = subset.reduce((s, p) => s + p.lon, 0) / subset.length;
    const lat = subset.reduce((s, p) => s + p.lat, 0) / subset.length;
    return projectLonLat([lon, lat]);
  }, [spotlightOperator, plants, slide.overlay?.usMapCentroidFilter]);

  useEffect(() => {
    const sv = slide.viewState;
    // Scatter-cube spotlight: re-center on the operator's 3D position.
    let target = sv.target;
    if (slide.overlay?.spotlight && spotlightOperator && normalized.length) {
      const op = normalized.find((n) => n.operator === spotlightOperator);
      if (op) target = [op.x, op.y, op.z];
    }

    const firstDur = sv.duration * ANIM_SPEED;

    // First transition: the slide's base view (whole US for us-map slides).
    setInitialViewState({
      target,
      zoom: sv.zoom,
      rotationOrbit: sv.rotationOrbit,
      rotationX: sv.rotationX,
      transitionDuration: firstDur,
      transitionInterpolator: new LinearInterpolator(TRANSITION_PROPS),
      transitionInterruption: TRANSITION_EVENTS.BREAK,
      minZoom: ORBIT_MIN_ZOOM,
      maxZoom: ORBIT_MAX_ZOOM,
      minRotationX: -10,
      maxRotationX: 89,
    });

    // Chained zoom for us-map slides: after landing on the US, zoom into the
    // spotlighted operator's plant centroid. Zoom level scales with dispersion,
    // so a tight cluster (Alabama Power ~109 km) zooms in hard while a continental
    // fleet (sprawled solar operator, 2000+ km) stays wider.
    if (slide.overlay?.usMap && operatorCentroid) {
      const op = normalized.find((n) => n.operator === spotlightOperator);
      const dispKm = op?.dispersionKm ?? 100;
      const chainedZoom = Math.max(4.0, 7.0 - dispKm / 300);
      const zoomedTarget = operatorCentroid;
      const timer = setTimeout(() => {
        setInitialViewState({
          target: zoomedTarget,
          zoom: chainedZoom,
          rotationOrbit: sv.rotationOrbit,
          rotationX: sv.rotationX,
          transitionDuration: 1500 * ANIM_SPEED,
          transitionInterpolator: new LinearInterpolator(TRANSITION_PROPS),
          transitionInterruption: TRANSITION_EVENTS.BREAK,
          minZoom: ORBIT_MIN_ZOOM,
          maxZoom: ORBIT_MAX_ZOOM,
          minRotationX: -10,
          maxRotationX: 89,
        });
      }, firstDur + 500 * ANIM_SPEED);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, spotlightOperator, normalized, operatorCentroid]);

  // Clear any stale hover tooltip whenever the slide changes. The camera
  // moves out from under the cursor, so deck.gl never fires a "mouse left"
  // event, leaving the old tooltip pinned to its previous position.
  useEffect(() => {
    setTooltip(null);
  }, [slideIndex]);

  // Pre-compute per-fuel mean on each of the three cube axes, normalized to
  // [0, 100] to match the sphere coordinate space. Used to place metric rings.
  //  age        -> y offset  (horizontal ring)
  //  sites      -> x offset  (ring encircling X axis)
  //  dispersion -> z offset  (ring encircling Z axis)
  const avgAxisByFuel = useMemo(() => {
    const empty = {
      age: {} as Record<string, number>,
      sites: {} as Record<string, number>,
      dispersion: {} as Record<string, number>,
    };
    if (!profiles.length) return empty;
    const maxAge = Math.max(...profiles.map((p) => p.avgFleetAge));
    const maxSites = Math.max(...profiles.map((p) => p.siteCount));
    const maxDisp = Math.max(...profiles.map((p) => p.dispersionKm));

    const accum: Record<string, { ageSum: number; siteSum: number; dispSum: number; n: number }> = {};
    for (const p of profiles) {
      if (!accum[p.primaryFuel]) {
        accum[p.primaryFuel] = { ageSum: 0, siteSum: 0, dispSum: 0, n: 0 };
      }
      const a = accum[p.primaryFuel];
      a.ageSum += p.avgFleetAge;
      a.siteSum += p.siteCount;
      a.dispSum += p.dispersionKm;
      a.n += 1;
    }
    const out = { age: {} as Record<string, number>, sites: {} as Record<string, number>, dispersion: {} as Record<string, number> };
    for (const [fuel, v] of Object.entries(accum)) {
      out.age[fuel] = maxAge > 0 ? (v.ageSum / v.n / maxAge) * 100 : 0;
      out.sites[fuel] = maxSites > 0 ? (v.siteSum / v.n / maxSites) * 100 : 0;
      out.dispersion[fuel] = maxDisp > 0 ? (v.dispSum / v.n / maxDisp) * 100 : 0;
    }
    return out;
  }, [profiles]);

  const handleHover = useCallback((info: PickingInfo) => {
    if (!info.object) {
      setTooltip(null);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = info.object as any;
    if (d.operator && d.siteCount != null) {
      setTooltip({
        x: info.x,
        y: info.y,
        operator: d.operator,
        detail: `${d.siteCount} sites · ${d.totalCapacityGw.toFixed(1)} GW · ${d.avgFleetAge.toFixed(0)} yr avg · ${Math.round(d.dispersionKm * 0.621371)} mi spread`,
      });
    } else if (d.name && d.capacity_mw != null) {
      setTooltip({
        x: info.x,
        y: info.y,
        operator: d.name,
        detail: `${d.operator} · ${d.capacity_mw.toFixed(0)} MW · ${d.fuel_type}`,
      });
    }
  }, []);

  // Pre-project state boundary polygons from lon/lat into the US-map region
  // of cartesian space. Done once per geojson load.
  const projectedBoundaryFills = useMemo(() => {
    if (!mapBoundaries) return [];
    const out: { contour: [number, number, number][]; color: [number, number, number, number] }[] = [];
    for (const feature of mapBoundaries.features) {
      const g = feature.geometry;
      if (!g) continue;
      const color: [number, number, number, number] = [32, 42, 58, 90];
      if (g.type === "Polygon") {
        const coords = g.coordinates as number[][][];
        for (const ring of coords) {
          out.push({
            contour: ring.map((pt) => projectLonLat([pt[0], pt[1]])),
            color,
          });
        }
      } else if (g.type === "MultiPolygon") {
        const coords = g.coordinates as number[][][][];
        for (const poly of coords) {
          for (const ring of poly) {
            out.push({
              contour: ring.map((pt) => projectLonLat([pt[0], pt[1]])),
              color,
            });
          }
        }
      }
    }
    return out;
  }, [mapBoundaries]);

  const projectedBoundaryOutlines = useMemo(() => {
    return projectedBoundaryFills.map((f) => ({ path: f.contour }));
  }, [projectedBoundaryFills]);

  // Metric rings on the Y / X / Z axes (age / sites / dispersion).
  const ringData = useMemo(() => {
    const out: { source: [number, number, number]; target: [number, number, number]; color: [number, number, number, number] }[] = [];
    const pushRings = (fuels: readonly string[] | undefined, axis: "x" | "y" | "z", metric: "age" | "sites" | "dispersion") => {
      if (!fuels?.length) return;
      for (const fuel of fuels) {
        const offset = avgAxisByFuel[metric][fuel];
        if (offset == null) continue;
        const base = FUEL_COLORS[fuel as keyof typeof FUEL_COLORS] ?? [180, 180, 180, 255];
        const color: [number, number, number, number] = [base[0], base[1], base[2], 235];
        out.push(...buildRing(offset, 7, color, axis));
      }
    };
    pushRings(slide.overlay?.ageRingFuels, "y", "age");
    pushRings(slide.overlay?.siteRingFuels, "x", "sites");
    pushRings(slide.overlay?.dispersionRingFuels, "z", "dispersion");
    return out;
  }, [
    slide.overlay?.ageRingFuels,
    slide.overlay?.siteRingFuels,
    slide.overlay?.dispersionRingFuels,
    avgAxisByFuel,
  ]);

  // ── Layers ──────────────────────────────────────────────────────────────
  // Both regions (scatter cube + US map) live in the same world. The camera
  // just moves between them. Layers are always rendered.
  const layers = useMemo(() => {
    const isUsMap = slide.sceneMode === "usmap";
    const spotlightActive = Boolean(slide.overlay?.spotlight) && !!spotlightOperator;
    const all = [];

    // ── Scatter scene. The scatter cube. ───────────────────────────────
    all.push(
      new LineLayer({
        id: "grid",
        data: GRID_LINES,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: isUsMap ? [35, 40, 50, 25] : [35, 40, 50, 80],
        getWidth: 0.5,
        widthUnits: "pixels",
      }),
      new LineLayer({
        id: "axes",
        data: AXIS_LINES,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: (d) =>
          isUsMap
            ? ([d.color[0], d.color[1], d.color[2], 60] as [number, number, number, number])
            : ([d.color[0], d.color[1], d.color[2], d.color[3]] as [number, number, number, number]),
        getWidth: 1.5,
        widthUnits: "pixels",
        updateTriggers: { getColor: [isUsMap] },
      }),
      new TextLayer({
        id: "axis-labels",
        data: AXIS_LABELS,
        getPosition: (d) => d.position,
        getText: (d) => d.text,
        getSize: 13,
        getColor: isUsMap ? [160, 165, 180, 60] : [160, 165, 180, 200],
        billboard: true,
        fontFamily: "'Inter', system-ui, sans-serif",
        updateTriggers: { getColor: [isUsMap] },
      }),
    );

    if (ringData.length) {
      all.push(
        new LineLayer({
          id: "metric-rings",
          data: ringData,
          getSourcePosition: (d) => d.source,
          getTargetPosition: (d) => d.target,
          getColor: (d) => d.color,
          getWidth: 2.5,
          widthUnits: "pixels",
        }),
      );
    }

    all.push(
      new SimpleMeshLayer({
        id: "spheres",
        data: normalized,
        mesh: SPHERE_MESH,
        getPosition: (d) => [d.x, d.y, d.z],
        getScale: (d) => {
          const isLit = spotlightActive
            ? d.operator === spotlightOperator
            : activeFuels === null || activeFuels.includes(d.primaryFuel);
          const mult = spotlightActive && d.operator === spotlightOperator ? 1.6 : 1;
          return isLit ? [d.radius * mult, d.radius * mult, d.radius * mult] : [d.radius, d.radius, d.radius];
        },
        getColor: (d) => {
          const base =
            FUEL_COLORS[d.primaryFuel as keyof typeof FUEL_COLORS] ??
            ([100, 100, 100, 160] as [number, number, number, number]);
          const inFocus = spotlightActive
            ? d.operator === spotlightOperator
            : activeFuels === null || activeFuels.includes(d.primaryFuel);
          if (!inFocus) {
            return [base[0], base[1], base[2], 14] as [number, number, number, number];
          }
          if (isUsMap) {
            return [base[0], base[1], base[2], 40] as [number, number, number, number];
          }
          return base;
        },
        material: {
          ambient: 0.3,
          diffuse: 0.65,
          shininess: 48,
          specularColor: [40, 40, 50],
        },
        pickable: !isUsMap,
        onHover: handleHover,
        onClick: (info) => {
          if (!onSelectOperator) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const d = info.object as any;
          if (d?.operator) onSelectOperator(d.operator);
        },
        transitions: {
          getColor: { duration: 650 * ANIM_SPEED },
          getScale: { duration: 650 * ANIM_SPEED },
        },
        updateTriggers: {
          getColor: [
            activeFuels?.join("|") ?? "all",
            spotlightActive ? `spot:${spotlightOperator}` : "",
            isUsMap,
          ],
          getScale: [spotlightActive ? `spot:${spotlightOperator}` : ""],
        },
      }),
    );

    // ── US-map region (always rendered, lives off to the left in world space) ─
    if (projectedBoundaryFills.length) {
      all.push(
        new PolygonLayer({
          id: "usmap-state-fills",
          data: projectedBoundaryFills,
          getPolygon: (d) => d.contour,
          getFillColor: (d) => d.color,
          stroked: false,
          filled: true,
          extruded: false,
          pickable: false,
        }),
        new PathLayer({
          id: "usmap-state-outlines",
          data: projectedBoundaryOutlines,
          getPath: (d) => d.path,
          getColor: [150, 165, 190, 200],
          getWidth: 1,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
        }),
      );
    }

    all.push(
      new LineLayer({
        id: "usmap-frame",
        data: USMAP_FRAME,
        getSourcePosition: (d) => d.source,
        getTargetPosition: (d) => d.target,
        getColor: [55, 65, 80, 180],
        getWidth: 1,
        widthUnits: "pixels",
      }),
    );

    // Solar interconnection queue layer (Beat 3 slide 2).
    // Amber dots: every solar project waiting in an ISO queue.
    if (slide.overlay?.showQueue && queueProjects?.length) {
      const solarQueue = queueProjects
        .filter((q) => q.fuel_type === "solar")
        .map((q) => ({ ...q, pos: projectLonLat([q.lon, q.lat]) }));
      all.push(
        new ScatterplotLayer({
          id: "usmap-queue-solar",
          data: solarQueue,
          getPosition: (d) => d.pos,
          getRadius: 3,
          radiusUnits: "pixels",
          getFillColor: [255, 180, 60, 230],
          getLineColor: [255, 220, 140, 255],
          lineWidthUnits: "pixels",
          getLineWidth: 0.4,
          stroked: true,
          pickable: false,
          billboard: true,
        }),
      );
    }

    const plantsArr = plants ?? [];
    const targetOperator = spotlightOperator;
    if (plantsArr.length && targetOperator) {
      const othersData = plantsArr
        .filter((p) => p.operator !== targetOperator)
        .map((p) => ({ ...p, pos: projectPlant(p) }));
      const focusedData = plantsArr
        .filter((p) => p.operator === targetOperator)
        .map((p) => ({ ...p, pos: projectPlant(p) }));

      // Background: other plants, super tiny dots.
      all.push(
        new ScatterplotLayer({
          id: "usmap-others",
          data: othersData,
          getPosition: (d) => d.pos,
          getRadius: 0.5,
          radiusUnits: "pixels",
          getFillColor: [150, 160, 180, 80],
          stroked: false,
          pickable: false,
          billboard: true,
        }),
      );

      // Spokes: lines from each plant in the centroid's cluster to the centroid.
      // Plants outside the cluster (e.g. Hawaii/CA when we center on the east
      // coast) would draw enormous spokes across the whole map, so exclude them.
      if (operatorCentroid) {
        const centroidFilter = slide.overlay?.usMapCentroidFilter ?? "all";
        const inCluster = (p: { lon: number; lat: number }) => {
          if (centroidFilter === "contiguous")
            return p.lon > -130 && p.lon < -65 && p.lat > 24 && p.lat < 50;
          if (centroidFilter === "east")
            return p.lon > -90 && p.lat > 24 && p.lat < 50;
          return true;
        };
        const spokeData = focusedData.filter(inCluster);
        all.push(
          new LineLayer({
            id: "usmap-spokes",
            data: spokeData,
            getSourcePosition: (d) => d.pos,
            getTargetPosition: () => operatorCentroid,
            getColor: [200, 215, 240, 90],
            getWidth: 0.4,
            widthUnits: "pixels",
          }),
        );
      }

      // Foreground: spotlighted operator's plants. Fixed size, fuel-colored.
      all.push(
        new ScatterplotLayer({
          id: "usmap-focus",
          data: focusedData,
          getPosition: (d) => d.pos,
          getRadius: 3,
          radiusUnits: "pixels",
          getFillColor: (d) => {
            const base = FUEL_COLORS[d.fuel_type as keyof typeof FUEL_COLORS] ?? [
              200, 200, 200, 255,
            ];
            return [base[0], base[1], base[2], 245] as [number, number, number, number];
          },
          getLineColor: [255, 255, 255, 220],
          lineWidthUnits: "pixels",
          getLineWidth: 0.6,
          stroked: true,
          pickable: true,
          onHover: handleHover,
          billboard: true,
        }),
      );

      // Centroid marker. Small crosshair dot in the middle of the cluster.
      if (operatorCentroid) {
        all.push(
          new ScatterplotLayer({
            id: "usmap-centroid",
            data: [{ pos: operatorCentroid }],
            getPosition: (d) => d.pos,
            getRadius: 2,
            radiusUnits: "pixels",
            getFillColor: [240, 248, 255, 240],
            getLineColor: [30, 40, 55, 255],
            lineWidthUnits: "pixels",
            getLineWidth: 0.5,
            stroked: true,
            billboard: true,
            pickable: false,
          }),
        );
      }
    }

    return all;
  }, [
    slide.sceneMode,
    slide.overlay?.spotlight,
    normalized,
    activeFuels,
    handleHover,
    ringData,
    plants,
    spotlightOperator,
    projectedBoundaryFills,
    projectedBoundaryOutlines,
    operatorCentroid,
    queueProjects,
    slide.overlay?.showQueue,
    onSelectOperator,
  ]);

  return (
    <div className="absolute inset-0 z-0" style={{ background: "#030712" }}>
      <DeckGL
        views={new OrbitView({ id: "orbit", orbitAxis: "Y" })}
        initialViewState={initialViewState}
        controller={{ keyboard: false }}
        layers={layers}
        effects={[LIGHTING]}
        style={{ width: "100%", height: "100%" }}
      />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 max-w-xs rounded-md border border-gray-700 bg-gray-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className="font-medium text-gray-100">{tooltip.operator}</div>
          <div className="mt-0.5 text-gray-400">{tooltip.detail}</div>
        </div>
      )}
    </div>
  );
}
