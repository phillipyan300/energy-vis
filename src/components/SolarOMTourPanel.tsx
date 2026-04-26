"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OperatorProfile } from "@/lib/operator-stats";
import { FUEL_HEX } from "@/lib/colors";

// ────────────────────────────────────────────────────────────────────────────
// Tour data model
// ────────────────────────────────────────────────────────────────────────────

export type CornerHint = "tl" | "tr" | "bl" | "br";
export type SceneMode = "scatter" | "usmap";

const KM_TO_MI = 0.621371;
const kmToMi = (km: number) => km * KM_TO_MI;

export interface SlideViewState {
  target: [number, number, number];
  zoom: number;
  rotationOrbit: number;
  rotationX: number;
  duration: number;
}

export type CompanyRole = "top-old-guard" | "top-solar" | "selected";

type RingFuel = "coal" | "gas" | "oil" | "solar" | "wind" | "nuclear" | "hydro";

export interface SlideOverlay {
  /** Draw a horizontal ring on the Y-axis at each listed fuel's avg age */
  ageRingFuels?: RingFuel[];
  /** Draw a ring encircling the X-axis at each listed fuel's avg site count */
  siteRingFuels?: RingFuel[];
  /** Draw a ring encircling the Z-axis at each listed fuel's avg dispersion */
  dispersionRingFuels?: RingFuel[];
  /** Role marker resolved at runtime to an operator name (spotlight / usmap) */
  companyRole?: CompanyRole;
  /** Operator to spotlight in 3D scatter (resolved via companyRole) */
  spotlight?: boolean;
  /** Switch to top-down US-map scene for this operator (resolved via companyRole) */
  usMap?: boolean;
  /**
   * How to compute the chained-zoom centroid on us-map slides.
   *  - "all"        (default): full centroid of the operator's plants
   *  - "contiguous": exclude Hawaii / Alaska (lon ∉ [-130,-65] or lat ∉ [24,50])
   *  - "east"      : only plants east of -90° longitude (densest east-coast cluster)
   */
  usMapCentroidFilter?: "all" | "contiguous" | "east";
  /** Render the solar interconnection queue as dots on the US map. */
  showQueue?: boolean;
}

export interface Slide {
  id: string;
  beatIndex: number;
  title: string;
  kicker?: string;
  viewState: SlideViewState;
  focusFuels: string[] | null;
  overlay?: SlideOverlay;
  cornerHint?: CornerHint;
  sceneMode?: SceneMode;
}

export interface Beat {
  index: number;
  title: string;
}

export const SOLAR_OM_BEATS: Beat[] = [
  { index: 0, title: "The fleet, in three dimensions" },
  { index: 1, title: "Coal & gas · tight, old iron" },
  { index: 2, title: "Solar · young, many, scattered" },
  { index: 3, title: "Why a young industry looks like this" },
  { index: 4, title: "Why O&M efficiency matters" },
  { index: 5, title: "Free view · explore any operator" },
];

export const SOLAR_OM_SLIDES: Slide[] = [
  // ── Beat 0 ────────────────────────────────────────────────────────────
  {
    id: "hook",
    beatIndex: 0,
    title: "Every US generation operator",
    kicker: "Slide 1 · one sphere each",
    viewState: { target: [25, 25, 25], zoom: 0.98, rotationOrbit: -28, rotationX: 22, duration: 1600 },
    focusFuels: null,
    cornerHint: "tr",
  },
  {
    id: "b0-s2-ages",
    beatIndex: 0,
    title: "Fleets by age",
    kicker: "Slide 2 · average fleet age, by fuel",
    viewState: { target: [8, 50, 8], zoom: 1.6, rotationOrbit: 25, rotationX: 15, duration: 1500 },
    focusFuels: null,
    overlay: { ageRingFuels: ["coal", "gas", "oil", "solar", "wind", "nuclear", "hydro"] },
    cornerHint: "tr",
  },
  {
    id: "b0-s3-sites",
    beatIndex: 0,
    title: "Fleets by site count",
    kicker: "Slide 3 · average sites per operator, by fuel",
    // Rings encircle the X-axis at each fuel's avg site count. Camera swings
    // around to face the X-axis from the Y-Z side so rings read as ellipses.
    viewState: { target: [50, 8, 8], zoom: 1.4, rotationOrbit: -65, rotationX: 18, duration: 1500 },
    focusFuels: null,
    overlay: { siteRingFuels: ["coal", "gas", "oil", "solar", "wind", "nuclear", "hydro"] },
    cornerHint: "tr",
  },
  {
    id: "b0-s4-dispersion",
    beatIndex: 0,
    title: "Fleets by dispersion",
    kicker: "Slide 4 · average geographic spread, by fuel",
    // Rings encircle the Z-axis at each fuel's avg dispersion. Camera tilts
    // into the X-Y plane so rings stacked along Z read as separable ellipses.
    viewState: { target: [8, 8, 50], zoom: 1.4, rotationOrbit: 35, rotationX: 18, duration: 1500 },
    focusFuels: null,
    overlay: { dispersionRingFuels: ["coal", "gas", "oil", "solar", "wind", "nuclear", "hydro"] },
    cornerHint: "tr",
  },

  // ── Beat 1 · Coal & gas · sites × age (4 slides) ──────────────────────
  {
    id: "b1-s1-old-guard",
    beatIndex: 1,
    title: "The old guard",
    kicker: "Slide 1 · few sites, old iron",
    viewState: { target: [14, 38, 25], zoom: 2.94, rotationOrbit: 0, rotationX: 0, duration: 1300 },
    focusFuels: ["coal", "gas"],
    cornerHint: "br",
  },
  {
    id: "b1-s2-age-ring",
    beatIndex: 1,
    title: "Half a century of coal",
    kicker: "Slide 2 · average fleet age, marked",
    viewState: { target: [8, 50, 15], zoom: 2.3, rotationOrbit: 0, rotationX: 0, duration: 1200 },
    focusFuels: ["coal", "gas"],
    overlay: { ageRingFuels: ["coal", "gas"] },
    cornerHint: "br",
  },
  {
    id: "b1-s3-spotlight",
    beatIndex: 1,
    title: "A regional utility, up close",
    kicker: "Slide 3 · meet one operator",
    // target is a fallback; when spotlight is active the scatter re-centers on
    // the operator's actual 3D position so the camera always frames them.
    viewState: { target: [60, 40, 25], zoom: 3.6, rotationOrbit: -22, rotationX: 14, duration: 1400 },
    focusFuels: null,
    overlay: { companyRole: "top-old-guard", spotlight: true },
    cornerHint: "tr",
  },
  {
    id: "b1-s4-usmap",
    beatIndex: 1,
    title: "Same operator, drawn on the map",
    kicker: "Slide 4 · geographic footprint",
    // Camera flies into the US-map region, centered on the map, top-down.
    // First half frames the whole US wide, then chained zoom closes in on the operator.
    viewState: { target: [-85, 0, 50], zoom: 2.0, rotationOrbit: 0, rotationX: 89, duration: 1700 },
    focusFuels: null,
    overlay: { companyRole: "top-old-guard", usMap: true },
    sceneMode: "usmap",
    cornerHint: "tr",
  },

  // ── Beat 2 · Solar · young, many, scattered (5 slides) ─────────────────
  {
    id: "b2-s1-reveal",
    beatIndex: 2,
    title: "Solar lives in the opposite corner",
    kicker: "Slide 1 · many sites, young fleet",
    viewState: { target: [38, 14, 25], zoom: 2.8, rotationOrbit: 0, rotationX: 0, duration: 1400 },
    focusFuels: ["solar"],
    cornerHint: "tr",
  },
  {
    id: "b2-s2-age-ring",
    beatIndex: 2,
    title: "Barely out of warranty",
    kicker: "Slide 2 · solar's average fleet age",
    viewState: { target: [22, 12, 18], zoom: 2.3, rotationOrbit: 0, rotationX: 0, duration: 1200 },
    focusFuels: ["solar"],
    overlay: { ageRingFuels: ["solar"] },
    cornerHint: "tr",
  },
  {
    id: "geography",
    beatIndex: 2,
    title: "And scattered across the country",
    kicker: "Slide 3 · top-down · sites × dispersion",
    viewState: { target: [25, 20, 28], zoom: 1.68, rotationOrbit: 0, rotationX: 85, duration: 1600 },
    focusFuels: ["solar", "gas", "coal"],
    cornerHint: "tr",
  },
  {
    id: "b2-s3-spotlight",
    beatIndex: 2,
    title: "A solar heavyweight",
    kicker: "Slide 4 · meet one operator",
    // Fallback target; scatter re-centers on the operator's actual position.
    viewState: { target: [70, 20, 55], zoom: 3.4, rotationOrbit: -18, rotationX: 12, duration: 1400 },
    focusFuels: null,
    overlay: { companyRole: "top-solar", spotlight: true },
    cornerHint: "tr",
  },
  {
    id: "b2-s4-usmap",
    beatIndex: 2,
    title: "Same operator, drawn on the map",
    kicker: "Slide 5 · continental sprawl",
    viewState: { target: [-85, 0, 50], zoom: 2.0, rotationOrbit: 0, rotationX: 89, duration: 1700 },
    focusFuels: null,
    // Chained zoom targets the east-coast cluster. Hawaii would pull the raw
    // centroid way off into the Pacific. The east coast is where the density
    // story lives anyway.
    overlay: { companyRole: "top-solar", usMap: true, usMapCentroidFilter: "east" },
    sceneMode: "usmap",
    cornerHint: "tr",
  },

  // ── Beat 3 · Why a young industry looks like this (4 slides) ───────────
  {
    id: "b3-s1-corner",
    beatIndex: 3,
    title: "A corner no other fuel occupies",
    kicker: "Slide 1 · why does solar sit here alone?",
    viewState: { target: [25, 14, 38], zoom: 2.8, rotationOrbit: 90, rotationX: 0, duration: 1500 },
    focusFuels: ["solar"],
    cornerHint: "tr",
  },
  {
    id: "b3-s2-queue",
    beatIndex: 3,
    title: "Queue, not choice",
    kicker: "Slide 2 · where the grid has headroom",
    viewState: { target: [-85, 0, 50], zoom: 2.0, rotationOrbit: 0, rotationX: 89, duration: 1700 },
    focusFuels: null,
    overlay: { showQueue: true },
    sceneMode: "usmap",
    cornerHint: "tr",
  },
  {
    id: "b3-s3-born-national",
    beatIndex: 3,
    title: "Born national",
    kicker: "Slide 3 · no service territory to defer to",
    viewState: { target: [30, 20, 40], zoom: 1.2, rotationOrbit: -10, rotationX: 25, duration: 1500 },
    focusFuels: ["solar"],
    overlay: { showQueue: true },
    cornerHint: "tr",
  },
  {
    id: "b3-s4-synthesis",
    beatIndex: 3,
    title: "Structural, not stylistic",
    kicker: "Slide 4 · why this shape is here to stay",
    viewState: { target: [25, 22, 25], zoom: 1.6, rotationOrbit: -18, rotationX: 24, duration: 1600 },
    focusFuels: ["solar"],
    overlay: { showQueue: true },
    cornerHint: "tr",
  },

  // ── Beat 4 · Why O&M efficiency matters ────────────────────────────────
  {
    id: "payoff",
    beatIndex: 4,
    title: "Why O&M efficiency is the prize",
    kicker: "The structural opportunity",
    // Camera faces solar's age ring (near the y-axis floor). Keeps the queue
    // dots rendered off to the left as the backdrop of the "growing" story.
    viewState: { target: [8, 20, 8], zoom: 1.9, rotationOrbit: 22, rotationX: 14, duration: 1700 },
    focusFuels: ["solar"],
    overlay: { showQueue: true, ageRingFuels: ["solar"] },
    cornerHint: "tr",
  },

  // ── Beat 5 · Free view (2 slides, interactive) ─────────────────────────
  {
    id: "b5-s1-pick",
    beatIndex: 5,
    title: "Pick any operator",
    kicker: "Slide 1 · click a sphere to see its footprint",
    viewState: { target: [25, 25, 25], zoom: 0.9, rotationOrbit: -22, rotationX: 20, duration: 1500 },
    focusFuels: null,
    cornerHint: "tr",
  },
  {
    id: "b5-s2-map",
    beatIndex: 5,
    title: "Operator on the map",
    kicker: "Slide 2 · centroid and every site",
    viewState: { target: [-85, 0, 50], zoom: 2.0, rotationOrbit: 0, rotationX: 89, duration: 1700 },
    focusFuels: null,
    overlay: { companyRole: "selected", usMap: true, usMapCentroidFilter: "contiguous" },
    sceneMode: "usmap",
    cornerHint: "tr",
  },
];

/** Legacy export (page still reads FOCUS_FUELS_BY_STEP for beat-dot dimming) */
export const FOCUS_FUELS_BY_STEP: (string[] | null)[] = SOLAR_OM_BEATS.map((b) => {
  const s = SOLAR_OM_SLIDES.find((slide) => slide.beatIndex === b.index);
  return s?.focusFuels ?? null;
});

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Spotlight operator for beat 1 slides 3 & 4.
 * Hardcoded to Alabama Power Co. Iconic regional utility, tight footprint,
 * effectively zero solar in their EIA entity. Falls back to a scored search
 * if the exact name isn't present in the data.
 */
const PREFERRED_OLD_GUARD = "Alabama Power Co";

export function findTopOldGuardOperator(
  profiles: OperatorProfile[],
): OperatorProfile | null {
  const preferred = profiles.find((p) => p.operator === PREFERRED_OLD_GUARD);
  if (preferred) return preferred;

  // Fallback: tight-cluster heavyweight gas operator with no solar.
  const candidates = profiles.filter(
    (p) =>
      p.primaryFuel === "gas" &&
      p.solarFraction < 0.005 &&
      p.siteCount >= 4 &&
      p.totalCapacityGw >= 1.5,
  );
  if (!candidates.length) return null;
  const scored = candidates
    .map((p) => ({ p, score: p.totalCapacityGw / (1 + p.dispersionKm / 100) }))
    .sort((a, b) => b.score - a.score);
  return scored[0].p;
}

/**
 * Spotlight operator for beat 2 slides 3 & 4: a sprawled, many-site solar
 * heavyweight. Picks by siteCount × totalCapacityGw among primary-fuel solar
 * operators with significant capacity and footprint. PE/fund vehicles have
 * already been filtered out upstream in operator-stats.
 */
export function findTopSolarOperator(
  profiles: OperatorProfile[],
): OperatorProfile | null {
  const candidates = profiles.filter(
    (p) =>
      p.primaryFuel === "solar" &&
      p.siteCount >= 8 &&
      p.totalCapacityGw >= 0.5,
  );
  if (!candidates.length) return null;
  const scored = candidates
    .map((p) => ({ p, score: p.siteCount * p.totalCapacityGw }))
    .sort((a, b) => b.score - a.score);
  return scored[0].p;
}

/**
 * Resolve the spotlight profile for a slide based on its companyRole.
 */
export function resolveSpotlightProfile(
  role: CompanyRole | undefined,
  topOldGuard: OperatorProfile | null,
  topSolar: OperatorProfile | null,
  selected: OperatorProfile | null = null,
): OperatorProfile | null {
  if (role === "top-old-guard") return topOldGuard;
  if (role === "top-solar") return topSolar;
  if (role === "selected") return selected;
  return null;
}

export function firstSlideIndexOfBeat(beatIndex: number): number {
  const idx = SOLAR_OM_SLIDES.findIndex((s) => s.beatIndex === beatIndex);
  return idx >= 0 ? idx : 0;
}

function cornerClasses(hint: CornerHint): string {
  switch (hint) {
    case "tl": return "left-32 top-20";
    case "tr": return "right-4 top-20";
    case "bl": return "left-32 bottom-4";
    case "br": return "right-4 bottom-4";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-700/80 bg-gray-900/50 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-500">{sub}</p>}
    </div>
  );
}

function FuelStat({ fuel, label, value }: { fuel: string; label: string; value: string }) {
  const hex = FUEL_HEX[fuel as keyof typeof FUEL_HEX] ?? "#64748b";
  return (
    <div className="flex items-center justify-between border-b border-gray-800/60 py-2 last:border-0">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
        <span className="capitalize text-gray-300">{label}</span>
      </div>
      <span className="tabular-nums text-gray-400">{value}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top bar
// ────────────────────────────────────────────────────────────────────────────

interface TopBarProps {
  beats: Beat[];
  currentBeatIndex: number;
  onBeat: (i: number) => void;
}

export function SolarOMTopBar({ beats, currentBeatIndex, onBeat }: TopBarProps) {
  const current = beats[currentBeatIndex] ?? beats[0];
  return (
    <div className="pointer-events-auto absolute left-0 right-0 top-0 z-40 border-b border-gray-800/70 bg-gray-950/80 backdrop-blur">
      <div className="flex items-center gap-5 px-4 py-2.5">
        <Link href="/" className="text-sm text-gray-400 transition hover:text-white">
          ← Energy Vis
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-gray-600">EIA 860 · operators</span>
        <div className="ml-2 flex items-center gap-1.5">
          {beats.map((b) => {
            const active = b.index === currentBeatIndex;
            return (
              <button
                key={b.index}
                type="button"
                title={`Beat ${b.index} · ${b.title}`}
                aria-label={`Beat ${b.index}: ${b.title}`}
                onClick={() => onBeat(b.index)}
                className={`rounded-full transition-all duration-200 ${
                  active ? "h-2.5 w-2.5 bg-blue-500" : "h-2 w-2 bg-gray-600 hover:bg-gray-400"
                }`}
              />
            );
          })}
        </div>
        <div className="ml-2 flex flex-col leading-tight">
          <span className="text-[9px] font-medium uppercase tracking-widest text-amber-400/80">
            Beat {current.index}
          </span>
          <span className="text-xs font-medium text-gray-100">{current.title}</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Corner info panel
// ────────────────────────────────────────────────────────────────────────────

interface SolarOMTourPanelProps {
  slides: Slide[];
  slideIndex: number;
  onSlide: (i: number) => void;
  profiles: OperatorProfile[];
  manualFuel: string | null;
  /** Resolved operator profile for the current slide's spotlight role. */
  spotlightProfile: OperatorProfile | null;
  /** Number of unique balancing authorities the spotlight operator has plants in. */
  spotlightIsoCount?: number | null;
  /** Plants outside the current centroid cluster (e.g. west + Hawaii when centering east). */
  spotlightOutlierCount?: number | null;
}

export default function SolarOMTourPanel({
  slides,
  slideIndex,
  onSlide,
  profiles,
  manualFuel,
  spotlightProfile,
  spotlightIsoCount = null,
  spotlightOutlierCount = null,
}: SolarOMTourPanelProps) {
  const slide = slides[slideIndex];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex >= slides.length - 1;
  const [collapsed, setCollapsed] = useState(false);

  const slidesInBeat = useMemo(
    () => slides.filter((s) => s.beatIndex === slide.beatIndex),
    [slides, slide.beatIndex],
  );
  const localSlideIndex = slidesInBeat.findIndex((s) => s.id === slide.id);

  const stats = useMemo(() => {
    if (!profiles.length) return null;
    const solar = profiles.filter((p) => p.primaryFuel === "solar");
    const gas = profiles.filter((p) => p.primaryFuel === "gas");
    const coal = profiles.filter((p) => p.primaryFuel === "coal");
    const avg = (arr: OperatorProfile[], fn: (p: OperatorProfile) => number) =>
      arr.length ? arr.reduce((s, p) => s + fn(p), 0) / arr.length : 0;

    // Per-fuel metrics (age, sites, dispersion). Each list sorted largest-first
    // so Beat 0 slides can walk the audience from the extreme down. Formulas
    // match the scatter's ring positions so numbers align with where rings draw.
    const metricAccum: Record<
      string,
      { ageSum: number; siteSum: number; dispSum: number; n: number }
    > = {};
    for (const p of profiles) {
      if (!metricAccum[p.primaryFuel]) {
        metricAccum[p.primaryFuel] = { ageSum: 0, siteSum: 0, dispSum: 0, n: 0 };
      }
      const a = metricAccum[p.primaryFuel];
      a.ageSum += p.avgFleetAge;
      a.siteSum += p.siteCount;
      a.dispSum += p.dispersionKm;
      a.n += 1;
    }
    const ageByFuel = Object.entries(metricAccum)
      .map(([fuel, v]) => ({ fuel, avgAge: v.ageSum / v.n, operatorCount: v.n }))
      .filter((x) => Number.isFinite(x.avgAge) && x.avgAge > 0)
      .sort((a, b) => b.avgAge - a.avgAge);
    const sitesByFuel = Object.entries(metricAccum)
      .map(([fuel, v]) => ({ fuel, avgSites: v.siteSum / v.n, operatorCount: v.n }))
      .filter((x) => Number.isFinite(x.avgSites) && x.avgSites > 0)
      .sort((a, b) => b.avgSites - a.avgSites);
    const dispByFuel = Object.entries(metricAccum)
      .map(([fuel, v]) => ({ fuel, avgDispKm: v.dispSum / v.n, operatorCount: v.n }))
      .filter((x) => Number.isFinite(x.avgDispKm) && x.avgDispKm > 0)
      .sort((a, b) => b.avgDispKm - a.avgDispKm);

    return {
      totalOperators: profiles.length,
      solarCount: solar.length,
      ageByFuel,
      sitesByFuel,
      dispByFuel,
      solar: {
        avgSites: avg(solar, (p) => p.siteCount),
        avgAge: avg(solar, (p) => p.avgFleetAge),
        avgDisp: avg(solar, (p) => p.dispersionKm),
        avgGw: avg(solar, (p) => p.totalCapacityGw),
        topBySites: [...solar].sort((a, b) => b.siteCount - a.siteCount).slice(0, 5),
      },
      gas: {
        avgSites: avg(gas, (p) => p.siteCount),
        avgAge: avg(gas, (p) => p.avgFleetAge),
        avgDisp: avg(gas, (p) => p.dispersionKm),
      },
      coal: {
        avgSites: avg(coal, (p) => p.siteCount),
        avgAge: avg(coal, (p) => p.avgFleetAge),
        avgDisp: avg(coal, (p) => p.dispersionKm),
      },
    };
  }, [profiles]);

  const fuelStats = useMemo(() => {
    if (!manualFuel || !profiles.length) return null;
    const subset = profiles.filter((p) => p.primaryFuel === manualFuel);
    if (!subset.length) return null;
    const avg = (fn: (p: OperatorProfile) => number) =>
      subset.reduce((s, p) => s + fn(p), 0) / subset.length;
    return {
      fuel: manualFuel,
      count: subset.length,
      avgSites: avg((p) => p.siteCount),
      avgAge: avg((p) => p.avgFleetAge),
      avgDisp: avg((p) => p.dispersionKm),
      totalGw: subset.reduce((s, p) => s + p.totalCapacityGw, 0),
      topBySites: [...subset].sort((a, b) => b.siteCount - a.siteCount).slice(0, 6),
    };
  }, [manualFuel, profiles]);

  const hint = slide.cornerHint ?? "tr";

  return (
    <div className={`pointer-events-auto absolute z-30 ${cornerClasses(hint)}`}>
      <div className="panel w-80 max-h-[calc(100vh-7rem)] overflow-y-auto px-4 py-3.5 shadow-xl">
        {fuelStats ? (
          // Manual fuel override
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: FUEL_HEX[fuelStats.fuel as keyof typeof FUEL_HEX] ?? "#64748b" }}
                  />
                  <p className="text-[10px] uppercase tracking-wider text-gray-400/90">
                    {fuelStats.fuel} operators
                  </p>
                </div>
                <h2 className="mt-0.5 text-base font-semibold capitalize leading-tight text-white">
                  {fuelStats.fuel} portfolio profile
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand details" : "Collapse details"}
                title={collapsed ? "Expand" : "Collapse"}
                className="grid h-5 w-5 shrink-0 place-items-center rounded border border-gray-700 text-[12px] leading-none text-gray-400 transition hover:border-gray-500 hover:text-gray-200"
              >
                {collapsed ? "+" : "−"}
              </button>
            </div>
            {!collapsed && (
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-400">
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Operators" value={fuelStats.count.toLocaleString()} sub="EIA 860" />
                  <StatCard label="Total GW" value={fuelStats.totalGw.toFixed(1)} sub="nameplate" />
                  <StatCard label="Avg sites" value={fuelStats.avgSites.toFixed(1)} sub="per operator" />
                  <StatCard label="Avg fleet age" value={`${fuelStats.avgAge.toFixed(1)} yr`} />
                </div>
                <StatCard
                  label="Avg dispersion"
                  value={`${Math.round(kmToMi(fuelStats.avgDisp))} mi`}
                  sub="mean dist from centroid"
                />
                <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
                  <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Top operators by site count
                  </p>
                  {fuelStats.topBySites.map((op) => (
                    <div
                      key={op.operator}
                      className="flex justify-between border-b border-gray-800/60 py-1.5 last:border-0"
                    >
                      <span className="truncate pr-2 text-gray-300">{op.operator}</span>
                      <span className="shrink-0 tabular-nums text-gray-500">
                        {op.siteCount} · {op.totalCapacityGw.toFixed(1)} GW
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {slide.kicker && (
                  <p className="truncate text-[10px] uppercase tracking-wider text-amber-400/90">
                    {slide.kicker}
                  </p>
                )}
                <h2 className="mt-1 text-base font-semibold leading-tight text-white">
                  {(slide.id === "b1-s3-spotlight" || slide.id === "b2-s3-spotlight") && spotlightProfile
                    ? spotlightProfile.operator
                    : slide.title}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {slidesInBeat.length > 1 && (
                  <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400">
                    {localSlideIndex + 1}/{slidesInBeat.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  aria-label={collapsed ? "Expand details" : "Collapse details"}
                  title={collapsed ? "Expand" : "Collapse"}
                  className="grid h-5 w-5 place-items-center rounded border border-gray-700 text-[12px] leading-none text-gray-400 transition hover:border-gray-500 hover:text-gray-200"
                >
                  {collapsed ? "+" : "−"}
                </button>
              </div>
            </div>

            {!collapsed && (
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-400">
                <SlideContent
                  slide={slide}
                  stats={stats}
                  spotlightProfile={spotlightProfile}
                  spotlightIsoCount={spotlightIsoCount}
                  spotlightOutlierCount={spotlightOutlierCount}
                />
              </div>
            )}
          </>
        )}

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-800 pt-3">
          <button
            type="button"
            className="rounded-md border border-gray-600 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
            disabled={isFirst}
            onClick={() => onSlide(slideIndex - 1)}
          >
            ← Back
          </button>
          <div className="flex items-center gap-1">
            {slidesInBeat.map((s) => {
              const globalIdx = slides.findIndex((x) => x.id === s.id);
              const isActive = globalIdx === slideIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-label={s.title}
                  onClick={() => onSlide(globalIdx)}
                  className={`rounded-full transition-all ${
                    isActive ? "h-1.5 w-5 bg-blue-500" : "h-1.5 w-1.5 bg-gray-600 hover:bg-gray-400"
                  }`}
                />
              );
            })}
          </div>
          {isLast ? (
            <span className="px-2 text-xs text-gray-500">Done</span>
          ) : (
            <button
              type="button"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
              onClick={() => onSlide(slideIndex + 1)}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Slide body switch
// ────────────────────────────────────────────────────────────────────────────

interface SlideContentProps {
  slide: Slide;
  stats: NonNullable<ReturnType<typeof computeStatsShape>> | null;
  spotlightProfile: OperatorProfile | null;
  spotlightIsoCount?: number | null;
  spotlightOutlierCount?: number | null;
}
// phantom helper to derive stats type cleanly
type StatsShape = {
  totalOperators: number;
  solarCount: number;
  ageByFuel: { fuel: string; avgAge: number; operatorCount: number }[];
  sitesByFuel: { fuel: string; avgSites: number; operatorCount: number }[];
  dispByFuel: { fuel: string; avgDispKm: number; operatorCount: number }[];
  solar: { avgSites: number; avgAge: number; avgDisp: number; avgGw: number; topBySites: OperatorProfile[] };
  gas: { avgSites: number; avgAge: number; avgDisp: number };
  coal: { avgSites: number; avgAge: number; avgDisp: number };
};
function computeStatsShape(): StatsShape | null {
  return null;
}

function SlideContent({
  slide,
  stats,
  spotlightProfile,
  spotlightIsoCount = null,
  spotlightOutlierCount = null,
}: SlideContentProps) {
  if (!stats) return null;

  switch (slide.id) {
    case "hook":
      return (
        <>
          <p>
            Every sphere is one <strong className="text-gray-200">US generation operator</strong>. Size&nbsp;= total GW,
            color&nbsp;= primary fuel, position&nbsp;= portfolio shape across three axes.
          </p>
          <p className="text-gray-500">
            Watch how solar ends up in a corner of this space that nothing else can reach.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Operators" value={stats.totalOperators.toLocaleString()} sub="≥ 2 sites, EIA 860" />
            <StatCard
              label="Solar operators"
              value={stats.solarCount.toLocaleString()}
              sub={`avg ${stats.solar.avgGw.toFixed(1)} GW each`}
            />
          </div>
        </>
      );

    case "b0-s2-ages":
      return (
        <>
          <p>
            Each fuel has an average fleet age. The rings on the Y-axis mark where each one sits.
          </p>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
            <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Capacity-weighted avg age
            </p>
            {stats.ageByFuel.map((row) => (
              <FuelStat
                key={row.fuel}
                fuel={row.fuel}
                label={row.fuel.charAt(0).toUpperCase() + row.fuel.slice(1)}
                value={`${row.avgAge.toFixed(1)} yr`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Coal sits half a century up. Solar is barely off the floor. That gap is the starting
            point for everything else.
          </p>
        </>
      );

    case "b0-s3-sites":
      return (
        <>
          <p>
            Same idea, different axis. Rings encircle the X-axis at each fuel&apos;s average site
            count per operator.
          </p>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
            <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Avg sites per operator
            </p>
            {stats.sitesByFuel.map((row) => (
              <FuelStat
                key={row.fuel}
                fuel={row.fuel}
                label={row.fuel.charAt(0).toUpperCase() + row.fuel.slice(1)}
                value={row.avgSites.toFixed(1)}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Solar sits far out. Every fossil fuel is closer to the Y-axis because each operator
            typically runs only a handful of plants.
          </p>
        </>
      );

    case "b0-s4-dispersion":
      return (
        <>
          <p>
            And the third axis: geographic spread, measured as average distance from each
            operator&apos;s centroid to their plants.
          </p>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
            <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Avg dispersion per operator
            </p>
            {stats.dispByFuel.map((row) => (
              <FuelStat
                key={row.fuel}
                fuel={row.fuel}
                label={row.fuel.charAt(0).toUpperCase() + row.fuel.slice(1)}
                value={`${Math.round(kmToMi(row.avgDispKm))} mi`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Three axes, three different stories. Where each fuel lands in the combined 3D space
            is what the rest of the tour is about.
          </p>
        </>
      );

    case "b1-s1-old-guard":
      return (
        <>
          <p>
            Start with the incumbents. Coal and gas operators sit <strong className="text-gray-200">top-left</strong>:
            a small handful of big, aging plants per company.
          </p>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
            <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">The old guard</p>
            <FuelStat fuel="coal" label="Coal · sites" value={stats.coal.avgSites.toFixed(1)} />
            <FuelStat fuel="coal" label="Coal · age" value={`${stats.coal.avgAge.toFixed(0)} yr`} />
            <FuelStat fuel="gas" label="Gas · sites" value={stats.gas.avgSites.toFixed(1)} />
            <FuelStat fuel="gas" label="Gas · age" value={`${stats.gas.avgAge.toFixed(0)} yr`} />
          </div>
          <p className="text-xs text-gray-500">
            Few, old, centralized. Maintenance = show up at the plant.
          </p>
        </>
      );

    case "b1-s2-age-ring":
      return (
        <>
          <p>
            Capacity-weighted average age, drawn as a <strong className="text-gray-200">ring on the Y-axis</strong>.
            Coal plants are built mostly in the 70s. Gas boomed in the 2000s.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Coal · avg age" value={`${stats.coal.avgAge.toFixed(0)} yr`} sub="1980 vintage" />
            <StatCard label="Gas · avg age" value={`${stats.gas.avgAge.toFixed(0)} yr`} sub="2000s wave" />
          </div>
          <p className="text-xs text-gray-500">
            These are assets whose economics revolve around depreciation, not uptime optimization.
          </p>
        </>
      );

    case "b1-s3-spotlight":
      if (!spotlightProfile) {
        return <p className="text-gray-500">No operator to spotlight.</p>;
      }
      return (
        <>
          <p>
            <strong className="text-gray-200">{spotlightProfile.operator}</strong>. Emblematic of the incumbent
            archetype: a regional {spotlightProfile.primaryFuel} utility with a concentrated fleet of big iron.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Sites" value={spotlightProfile.siteCount.toLocaleString()} />
            <StatCard label="Total GW" value={spotlightProfile.totalCapacityGw.toFixed(1)} sub="nameplate" />
            <StatCard label="Fleet age" value={`${spotlightProfile.avgFleetAge.toFixed(0)} yr`} />
            <StatCard label="Spread" value={`${Math.round(kmToMi(spotlightProfile.dispersionKm))} mi`} sub="centroid dist" />
          </div>
          <p className="text-xs text-gray-500">
            Built around centralized control rooms. A crew can be on-site within hours.
          </p>
        </>
      );

    case "b1-s4-usmap":
      if (!spotlightProfile) {
        return <p className="text-gray-500">No operator to map.</p>;
      }
      return (
        <>
          <p>
            On the map: every <strong className="text-gray-200">{spotlightProfile.operator}</strong> plant (bright)
            against the rest of the US fleet (dim).
          </p>
          <p>
            Tight regional cluster. <strong className="text-gray-200">{Math.round(kmToMi(spotlightProfile.dispersionKm))} mi</strong>{" "}
            average from centroid. A technician can be at any site within a day&apos;s drive.
          </p>
          <p className="text-xs text-gray-500">
            This is what &quot;manageable by drive-time&quot; looks like. Now hold this picture. We&apos;re
            about to contrast it.
          </p>
        </>
      );

    case "b2-s1-reveal":
      return (
        <>
          <p>
            Now solar lights up, <strong className="text-gray-200">bottom-right</strong>, the opposite corner. Lots
            of sites, fleet barely a decade old.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Solar · avg sites"
              value={stats.solar.avgSites.toFixed(0)}
              sub={`vs. ${stats.gas.avgSites.toFixed(0)} gas`}
            />
            <StatCard
              label="Solar · avg age"
              value={`${stats.solar.avgAge.toFixed(1)} yr`}
              sub={`vs. ${stats.coal.avgAge.toFixed(0)} yr coal`}
            />
          </div>
          <p>
            A solar operator runs{" "}
            <strong className="text-gray-200">
              ~{(stats.solar.avgSites / Math.max(stats.gas.avgSites, 1)).toFixed(1)}×
            </strong>{" "}
            more sites than a gas operator on average, with no legacy playbook.
          </p>
        </>
      );

    case "b2-s2-age-ring":
      return (
        <>
          <p>
            A ring on the Y-axis marks solar&apos;s capacity-weighted average age. It&apos;s sitting{" "}
            <strong className="text-gray-200">near the floor</strong>. Barely a decade old, against coal&apos;s
            half-century and gas&apos;s 20+ years.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Solar · avg age" value={`${stats.solar.avgAge.toFixed(1)} yr`} sub="post-2015 vintage" />
            <StatCard label="Coal · avg age" value={`${stats.coal.avgAge.toFixed(0)} yr`} sub="for contrast" />
          </div>
          <p className="text-xs text-gray-500">
            Most of this fleet hasn&apos;t finished its first warranty cycle. There&apos;s no 40-year
            O&amp;M playbook, because no one has run solar for 40 years.
          </p>
        </>
      );

    case "b2-s3-spotlight":
      if (!spotlightProfile) {
        return <p className="text-gray-500">No solar operator to spotlight.</p>;
      }
      return (
        <>
          <p>
            <strong className="text-gray-200">{spotlightProfile.operator}</strong>. A solar heavyweight,{" "}
            built almost entirely in the last decade.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Sites" value={spotlightProfile.siteCount.toLocaleString()} />
            <StatCard label="Total GW" value={spotlightProfile.totalCapacityGw.toFixed(1)} sub="nameplate" />
            <StatCard label="Fleet age" value={`${spotlightProfile.avgFleetAge.toFixed(1)} yr`} />
            <StatCard label="Spread" value={`${Math.round(kmToMi(spotlightProfile.dispersionKm))} mi`} sub="centroid dist" />
          </div>
          <p className="text-xs text-gray-500">
            A fleet this scattered had no precedent before solar. Every site is its own dispatch problem.
          </p>
        </>
      );

    case "b2-s4-usmap":
      if (!spotlightProfile) {
        return <p className="text-gray-500">No solar operator to map.</p>;
      }
      return (
        <>
          <p>
            Zooming into the East Coast, where <strong className="text-gray-200">{spotlightProfile.operator}</strong>&apos;s
            densest cluster sits. Many of these sites are distributed urban rooftop and community solar, not
            utility-scale ranches.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="Spread"
              value={`${Math.round(kmToMi(spotlightProfile.dispersionKm))} mi`}
              sub="centroid dist"
            />
            <StatCard
              label="Balancing authorities"
              value={spotlightIsoCount != null ? String(spotlightIsoCount) : "-"}
              sub="distinct utility regions"
            />
          </div>
          <p>
            {spotlightIsoCount != null ? (
              <>
                <strong className="text-gray-200">{spotlightIsoCount} balancing authorities</strong>.
                Each with its own interconnection process, tariffs, and dispatch rules.
              </>
            ) : (
              <>Multiple balancing authorities. Each with its own interconnection, tariffs, and dispatch rules.</>
            )}{" "}
            That&apos;s why ops have to be <strong className="text-gray-200">decentralized by design</strong>:
            no single control room can run a fleet across this many regulatory regimes.
          </p>
          {spotlightOutlierCount != null && spotlightOutlierCount > 0 && (
            <p>
              Beyond just the paperwork, the spread of sites across the East Coast makes it hard to imagine deploying enough technicians within driving distance. And notice, <strong className="text-gray-200">{spotlightOutlierCount} more sites</strong>{" "}
              sit outside this frame (West Coast, Hawaii). 
            </p>
          )}
          <p className="text-xs text-gray-500">
            The US has 3 synchronous grids and 7 market ISOs, but ~50 balancing authorities set the
            actual rules each plant lives under.
          </p>
        </>
      );

    case "geography":
      return (
        <>
          <p>
            From above: site count vs. <strong className="text-gray-200">geographic spread</strong>. More sites
            usually clusters. For solar, it also <em>scatters</em>.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <StatCard label="Solar" value={`${Math.round(kmToMi(stats.solar.avgDisp))} mi`} sub="avg spread" />
            <StatCard label="Gas" value={`${Math.round(kmToMi(stats.gas.avgDisp))} mi`} sub="avg spread" />
            <StatCard label="Coal" value={`${Math.round(kmToMi(stats.coal.avgDisp))} mi`} sub="avg spread" />
          </div>
          <p className="text-xs text-gray-500">
            Every mile between sites is a truck roll, a drive-time hour, a dispatcher ticket.
          </p>
        </>
      );

    case "b3-s1-corner":
      return (
        <>
          <p>
            Side view: fleet age × dispersion. Solar sits alone in the{" "}
            <strong className="text-gray-200">young-and-scattered</strong> corner.
          </p>
          <p className="text-gray-500">
            Nuclear is old and concentrated. Gas is old-ish and concentrated. Wind is the only
            neighbor, and it has roughly a tenth of solar&apos;s site count.
          </p>
          <p className="text-xs text-gray-500">
            So why is solar alone here? The next three slides answer that.
          </p>
        </>
      );

    case "b3-s2-queue":
      return (
        <>
          <p>
            Every amber dot is a <strong className="text-gray-200">planned</strong> solar plant tracked by
            EIA Form 860M. Filed for interconnection, permitting, or already under construction.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Solar planned" value="957" sub="EIA 860M, Feb 2026" />
            <StatCard label="BAs touched" value="42" sub="distinct utility regions" />
          </div>
          <p>
            Developers do not get to pick where they build. They pick among the queue slots and permit
            windows that open up. So the footprint scatters by <strong className="text-gray-200">where
            the grid has headroom</strong>, not by where operations would want.
          </p>
        </>
      );

    case "b3-s3-born-national":
      return (
        <>
          <p>
            A service territory is an inheritance. Alabama Power (founded 1906) operates inside
            Alabama because that was the regulated boundary when the company was formed. Duke (1904),
            Virginia Electric (1909), and every other incumbent grew up inside a specific state and
            stayed.
          </p>
          <p>
            Modern solar operators grew up after service territories stopped mattering.
          </p>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-1 text-xs">
            <p className="py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Founded in the national-market era
            </p>
            {[
              ["NextEra Energy Resources", "1998"],
              ["Invenergy", "2001"],
              ["Sunrun", "2007"],
              ["AES Distributed Energy", "2017"],
            ].map(([name, year]) => (
              <div
                key={name}
                className="flex justify-between border-b border-gray-800/60 py-1.5 last:border-0"
              >
                <span className="truncate pr-2 text-gray-300">{name}</span>
                <span className="shrink-0 tabular-nums text-gray-500">{year}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            If you are twenty years old and your market is the whole country, your footprint looks
            like the whole country.
          </p>
        </>
      );

    case "b3-s4-synthesis":
      return (
        <>
          <p>
            The shape is not a phase. It will not consolidate. Three forces compound:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              <strong className="text-gray-200">Queue dynamics</strong> decide where plants can physically get built.
            </li>
            <li>
              <strong className="text-gray-200">Youth</strong> means no service territory to fall back on.
            </li>
            <li>
              <strong className="text-gray-200">National offtake</strong> means no reason to cluster regionally.
            </li>
          </ol>
          <p>
            The shape is the starting point. Operations, tooling, and playbooks get built around it,
            with geography treated as a given to design for rather than a variable to optimize.
          </p>
        </>
      );

    case "payoff":
      return (
        <>
          <p>
            The thesis: solar operators inherited <strong className="text-gray-200">none of the incumbent playbooks</strong>.
            A gas operator running 3 plants can walk the floor. A solar operator running{" "}
            <strong className="text-gray-200">{stats.solar.avgSites.toFixed(0)}+ sites</strong> across thousands of miles cannot.
          </p>
          <p>
            The ring on the Y-axis is solar&apos;s capacity-weighted average age:
            about <strong className="text-gray-200">{stats.solar.avgAge.toFixed(1)} years</strong>. Most
            of this fleet has not finished its first warranty cycle. There is no 40-year O&amp;M playbook
            to copy, because no one has run solar for 40 years.
          </p>
          <p>
            And the problem is <em>growing</em>. <strong className="text-gray-200">118 GW</strong> of solar
            is planned across 957 projects (EIA 860M), nearly doubling the operating fleet. Every percent
            of O&amp;M cost saved compounds across a fleet that size.
          </p>
          <ul className="mt-1 space-y-1 text-xs text-gray-500">
            <li>
              <a
                href="https://www.eia.gov/electricity/data/eia860/"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                EIA Form 860
              </a>{" "}
              . Operator-level fleet data
            </li>
            <li>
              <Link href="/power-management" className="text-blue-400 hover:underline">
                Fleet age map →
              </Link>
            </li>
          </ul>
        </>
      );

    case "b5-s1-pick":
      return (
        <>
          <p>
            You&apos;ve seen how the structure shapes solar. Now look at whoever you want.
          </p>
          <p>
            <strong className="text-gray-200">Click any sphere</strong> in the 3D scatter to spotlight
            that operator and render their full site footprint on the map. The fuel filter on the left
            narrows what&apos;s visible.
          </p>
          {spotlightProfile && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2 text-xs">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-gray-500">Last selection</p>
              <p className="text-gray-200">{spotlightProfile.operator}</p>
              <p className="text-gray-500">
                {spotlightProfile.siteCount} sites · {spotlightProfile.totalCapacityGw.toFixed(1)} GW ·
                {" "}{spotlightProfile.primaryFuel}
              </p>
            </div>
          )}
        </>
      );

    case "b5-s2-map":
      if (!spotlightProfile) {
        return (
          <p className="text-gray-500">
            Go back to slide 1 and click a sphere to pick an operator.
          </p>
        );
      }
      return (
        <>
          <p>
            <strong className="text-gray-200">{spotlightProfile.operator}</strong>
            {spotlightProfile.primaryFuel ? ` (primarily ${spotlightProfile.primaryFuel})` : ""}.
            Every site, with spokes to the centroid.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Sites" value={spotlightProfile.siteCount.toLocaleString()} />
            <StatCard label="Total GW" value={spotlightProfile.totalCapacityGw.toFixed(1)} sub="nameplate" />
            <StatCard label="Fleet age" value={`${spotlightProfile.avgFleetAge.toFixed(1)} yr`} />
            <StatCard label="Spread" value={`${Math.round(kmToMi(spotlightProfile.dispersionKm))} mi`} sub="centroid dist" />
          </div>
          <p className="text-xs text-gray-500">
            Use Back to pick another, or the fuel filter to narrow the scatter.
          </p>
        </>
      );

    default:
      return null;
  }
}
