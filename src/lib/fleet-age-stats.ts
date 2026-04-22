import type { FeatureCollection } from "geojson";
import type { PowerPlant } from "@/types";
import { assignRegions } from "@/lib/geo-utils";

/** Match EIA 860 reference in scripts/process-eia860.py */
export const FLEET_REFERENCE_YEAR = 2025;

export interface AgeBucket {
  label: string;
  minAge: number;
  maxAge: number;
  capacityMw: number;
  pctOfFleet: number;
}

export interface FuelAgeSummary {
  fuel: string;
  capacityMw: number;
  capacityGw: number;
  weightedAvgAge: number;
  plantCount: number;
}

export interface FleetAgeSummary {
  /** Capacity with known operating year (MW-weighted stats use this subset). */
  totalCapacityGw: number;
  /** Share of nameplate MW that has an operating year in EIA data. */
  coveredCapacityPct: number;
  weightedAvgAge: number;
  buckets: AgeBucket[];
  byFuel: FuelAgeSummary[];
}

const AGE_BUCKETS: { label: string; minAge: number; maxAge: number }[] = [
  { label: "0–9 years", minAge: 0, maxAge: 9 },
  { label: "10–19 years", minAge: 10, maxAge: 19 },
  { label: "20–29 years", minAge: 20, maxAge: 29 },
  { label: "30–39 years", minAge: 30, maxAge: 39 },
  { label: "40+ years", minAge: 40, maxAge: 999 },
];

const FUEL_ORDER = [
  "gas",
  "coal",
  "nuclear",
  "hydro",
  "wind",
  "solar",
  "oil",
  "other",
] as const;

export function computeFleetAgeSummary(
  plants: PowerPlant[],
  refYear: number = FLEET_REFERENCE_YEAR,
): FleetAgeSummary {
  const allMw = plants.reduce((s, p) => s + p.capacity_mw, 0);

  const withYear = plants.filter(
    (p) => p.operating_year != null && p.capacity_mw > 0,
  ) as (PowerPlant & { operating_year: number })[];

  const totalMw = withYear.reduce((s, p) => s + p.capacity_mw, 0);

  let weightedAgeSum = 0;
  for (const p of withYear) {
    const age = refYear - p.operating_year;
    weightedAgeSum += p.capacity_mw * age;
  }

  const bucketMw = AGE_BUCKETS.map(() => 0);
  for (const p of withYear) {
    const age = refYear - p.operating_year;
    const idx = AGE_BUCKETS.findIndex(
      (b) => age >= b.minAge && age <= b.maxAge,
    );
    if (idx >= 0) bucketMw[idx] += p.capacity_mw;
  }

  const buckets: AgeBucket[] = AGE_BUCKETS.map((b, i) => ({
    label: b.label,
    minAge: b.minAge,
    maxAge: b.maxAge,
    capacityMw: bucketMw[i],
    pctOfFleet: totalMw > 0 ? (100 * bucketMw[i]) / totalMw : 0,
  }));

  const fuelMap = new Map<
    string,
    { mw: number; ageSum: number; count: number }
  >();
  for (const f of FUEL_ORDER) {
    fuelMap.set(f, { mw: 0, ageSum: 0, count: 0 });
  }
  for (const p of withYear) {
    const age = refYear - p.operating_year;
    const key = fuelMap.has(p.fuel_type) ? p.fuel_type : "other";
    const cur = fuelMap.get(key)!;
    cur.mw += p.capacity_mw;
    cur.ageSum += p.capacity_mw * age;
    cur.count += 1;
    fuelMap.set(key, cur);
  }

  const byFuel: FuelAgeSummary[] = FUEL_ORDER.map((fuel) => {
    const cur = fuelMap.get(fuel)!;
    return {
      fuel,
      capacityMw: cur.mw,
      capacityGw: cur.mw / 1000,
      weightedAvgAge: cur.mw > 0 ? cur.ageSum / cur.mw : 0,
      plantCount: cur.count,
    };
  }).filter((f) => f.capacityMw > 0);

  return {
    totalCapacityGw: totalMw / 1000,
    coveredCapacityPct: allMw > 0 ? (100 * totalMw) / allMw : 0,
    weightedAvgAge: totalMw > 0 ? weightedAgeSum / totalMw : 0,
    buckets,
    byFuel,
  };
}

export interface RegionAgeRollup {
  regionId: string;
  capacityMw: number;
  capacityGw: number;
  weightedAvgAge: number;
  plantCount: number;
}

/** MW-weighted average age per ISO/RTO polygon (from point-in-polygon). */
export function computeIsoAgeRollup(
  plants: PowerPlant[],
  isoBoundaries: FeatureCollection | null,
  refYear: number = FLEET_REFERENCE_YEAR,
): RegionAgeRollup[] {
  const regionOfPlant = assignRegions(plants, isoBoundaries);
  const agg = new Map<string, { mw: number; ageSum: number; count: number }>();

  for (const p of plants) {
    if (p.operating_year == null || p.capacity_mw <= 0) continue;
    const iso = regionOfPlant.get(p.id);
    if (!iso) continue;
    const age = refYear - p.operating_year;
    const cur = agg.get(iso) ?? { mw: 0, ageSum: 0, count: 0 };
    cur.mw += p.capacity_mw;
    cur.ageSum += p.capacity_mw * age;
    cur.count += 1;
    agg.set(iso, cur);
  }

  const rows: RegionAgeRollup[] = [];
  for (const [regionId, v] of agg) {
    rows.push({
      regionId,
      capacityMw: v.mw,
      capacityGw: v.mw / 1000,
      weightedAvgAge: v.mw > 0 ? v.ageSum / v.mw : 0,
      plantCount: v.count,
    });
  }
  return rows.sort((a, b) => b.capacityMw - a.capacityMw);
}

/** MW-weighted average age per state (EIA state code on plant). */
export function computeStateAgeRollup(
  plants: PowerPlant[],
  refYear: number = FLEET_REFERENCE_YEAR,
): RegionAgeRollup[] {
  const agg = new Map<string, { mw: number; ageSum: number; count: number }>();

  for (const p of plants) {
    if (p.operating_year == null || p.capacity_mw <= 0) continue;
    const st = String(p.state || "").trim().toUpperCase();
    if (!st) continue;
    const age = refYear - p.operating_year;
    const cur = agg.get(st) ?? { mw: 0, ageSum: 0, count: 0 };
    cur.mw += p.capacity_mw;
    cur.ageSum += p.capacity_mw * age;
    cur.count += 1;
    agg.set(st, cur);
  }

  const rows: RegionAgeRollup[] = [];
  for (const [regionId, v] of agg) {
    rows.push({
      regionId,
      capacityMw: v.mw,
      capacityGw: v.mw / 1000,
      weightedAvgAge: v.mw > 0 ? v.ageSum / v.mw : 0,
      plantCount: v.count,
    });
  }
  return rows.sort((a, b) => b.capacityMw - a.capacityMw);
}

/** Map ISO name → MW-weighted average age (for choropleth). */
export function isoRollupToAgeMap(
  rollups: RegionAgeRollup[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rollups) {
    m.set(r.regionId, r.weightedAvgAge);
  }
  return m;
}
