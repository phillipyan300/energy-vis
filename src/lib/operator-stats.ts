import type { PowerPlant, FuelType } from "@/types";
import { FLEET_REFERENCE_YEAR } from "@/lib/fleet-age-stats";

export interface OperatorProfile {
  operator: string;
  siteCount: number;
  totalCapacityGw: number;
  avgFleetAge: number;
  dispersionKm: number;
  primaryFuel: FuelType;
  solarFraction: number;
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const FUEL_ORDER: FuelType[] = [
  "gas",
  "coal",
  "nuclear",
  "hydro",
  "wind",
  "solar",
  "oil",
  "other",
];

/**
 * Names that strongly signal a PE / fund / yieldco holding vehicle rather than
 * a company that actually manages O&M technicians. Substring match,
 * case-insensitive. Conservative list — easy to extend as we spot misses.
 */
const PE_NAME_SUBSTRINGS = [
  "blackstone",
  "brookfield",
  " kkr",           // leading space avoids matching e.g. "Kkr" names that aren't the firm
  "kkr ",
  "global infrastructure partners",
  "i squared capital",
  "i-squared capital",
  "macquarie",
  "stonepeak",
  "arclight",
  "ares management",
  "carlyle",
  "riverstone",
  "starwood energy",
  "energy capital partners",
  "energy investors funds",
  "nextera energy partners",  // yieldco, distinct from NextEra Energy proper
  "atlantica sustainable",
  "clearway energy",
  "pattern energy",
  "terraform power",
  "quinbrook infrastructure",
  "tortoise capital",
  "8point3 energy",
  "hannon armstrong",
  "bayou bend",
  "greenbacker",
  " lp,",
  "infrastructure fund",
  "private equity",
];

/**
 * Generic patterns that also flag financial / fund vehicles.
 * Kept narrow to avoid false positives on legit utility names.
 */
const PE_NAME_PATTERNS: RegExp[] = [
  /\basset management\b/i,
  /\bprivate equity\b/i,
  /\binfrastructure fund\b/i,
  /\bequity partners?\b/i,
  // "XXX Capital LLC" / "XXX Capital LP" — almost exclusively a PE/fund suffix.
  // Bare "Capital" without the legal entity tail stays allowed (e.g. Capital Power).
  /\bcapital\s+(llc|lp|l\.l\.c\.|l\.p\.)\b/i,
];

export function isPrivateEquityLike(name: string): boolean {
  const lower = name.toLowerCase();
  if (PE_NAME_SUBSTRINGS.some((s) => lower.includes(s))) return true;
  return PE_NAME_PATTERNS.some((p) => p.test(name));
}

export function computeOperatorProfiles(
  plants: PowerPlant[],
  refYear = FLEET_REFERENCE_YEAR,
  minSites = 2,
): OperatorProfile[] {
  const byOp = new Map<string, PowerPlant[]>();
  for (const p of plants) {
    const key = p.operator.trim();
    if (!byOp.has(key)) byOp.set(key, []);
    byOp.get(key)!.push(p);
  }

  const profiles: OperatorProfile[] = [];

  for (const [operator, ops] of byOp) {
    if (ops.length < minSites) continue;
    if (isPrivateEquityLike(operator)) continue;

    const totalMw = ops.reduce((s, p) => s + p.capacity_mw, 0);
    if (totalMw <= 0) continue;

    // MW-weighted fleet age (only plants with known operating_year)
    const withYear = ops.filter(
      (p): p is PowerPlant & { operating_year: number } =>
        p.operating_year != null && p.capacity_mw > 0,
    );
    const ageMw = withYear.reduce((s, p) => s + p.capacity_mw, 0);
    const ageSum = withYear.reduce(
      (s, p) => s + p.capacity_mw * (refYear - p.operating_year),
      0,
    );
    const avgFleetAge = ageMw > 0 ? ageSum / ageMw : 0;

    // Primary fuel by MW
    const fuelMw: Partial<Record<FuelType, number>> = {};
    for (const p of ops) {
      fuelMw[p.fuel_type] = (fuelMw[p.fuel_type] ?? 0) + p.capacity_mw;
    }
    let primaryFuel: FuelType = "other";
    let maxFuelMw = 0;
    for (const [fuel, mw] of Object.entries(fuelMw)) {
      if (mw > maxFuelMw) {
        maxFuelMw = mw;
        primaryFuel = fuel as FuelType;
      }
    }

    const solarFraction = (fuelMw.solar ?? 0) / totalMw;

    // Geographic dispersion: mean distance from centroid
    const centLat = ops.reduce((s, p) => s + p.lat, 0) / ops.length;
    const centLon = ops.reduce((s, p) => s + p.lon, 0) / ops.length;
    const dispersionKm =
      ops.length > 1
        ? ops.reduce(
            (s, p) => s + haversineKm(centLat, centLon, p.lat, p.lon),
            0,
          ) / ops.length
        : 0;

    profiles.push({
      operator,
      siteCount: ops.length,
      totalCapacityGw: totalMw / 1000,
      avgFleetAge,
      dispersionKm,
      primaryFuel,
      solarFraction,
    });
  }

  return profiles;
}
