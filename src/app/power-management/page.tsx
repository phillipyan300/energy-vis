"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { PowerPlant } from "@/types";
import {
  computeFleetAgeSummary,
  computeIsoAgeRollup,
  computeStateAgeRollup,
  FLEET_REFERENCE_YEAR,
} from "@/lib/fleet-age-stats";
import FleetAgeTourPanel from "@/components/FleetAgeTourPanel";

const FleetAgeMap = dynamic(() => import("@/components/FleetAgeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading map…</p>
      </div>
    </div>
  ),
});

const STEPS = [
  {
    id: "intro",
    title: "Why fleet age matters",
    kicker: "Power management · public baseline",
  },
  {
    id: "snapshot",
    title: "US fleet at a glance",
    kicker: "Capacity-weighted age (EIA 860)",
  },
  {
    id: "fuel",
    title: "Age by fuel type",
    kicker: "Same data, broken out",
  },
  {
    id: "markets",
    title: "Markets & states",
    kicker: "ISO / BA and state rollups",
  },
  {
    id: "next",
    title: "Ground truth & next steps",
    kicker: "Beyond the spreadsheet",
  },
];

export default function PowerManagementPage() {
  const [plants, setPlants] = useState<PowerPlant[] | null>(null);
  const [isoBoundaries, setIsoBoundaries] =
    useState<FeatureCollection | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pr, ir] = await Promise.all([
          fetch("/data/power-plants.json"),
          fetch("/data/iso-boundaries.geojson"),
        ]);
        if (!pr.ok) throw new Error("Could not load plant data");
        if (!ir.ok) throw new Error("Could not load ISO boundaries");
        const [plantData, isoData] = await Promise.all([
          pr.json() as Promise<PowerPlant[]>,
          ir.json() as Promise<FeatureCollection>,
        ]);
        if (!cancelled) {
          setPlants(plantData);
          setIsoBoundaries(isoData);
        }
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (!plants?.length) return null;
    return computeFleetAgeSummary(plants, FLEET_REFERENCE_YEAR);
  }, [plants]);

  const isoRollup = useMemo(() => {
    if (!plants?.length) return [];
    return computeIsoAgeRollup(plants, isoBoundaries, FLEET_REFERENCE_YEAR);
  }, [plants, isoBoundaries]);

  const stateRollup = useMemo(() => {
    if (!plants?.length) return [];
    return computeStateAgeRollup(plants, FLEET_REFERENCE_YEAR);
  }, [plants]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      {err && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950 p-6">
          <p className="max-w-md rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        </div>
      )}

      {!plants && !err && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading EIA fleet…</p>
        </div>
      )}

      {plants && isoBoundaries && (
        <>
          <FleetAgeMap
            variant="fullscreen"
            plants={plants}
            isoBoundaries={isoBoundaries}
            refYear={FLEET_REFERENCE_YEAR}
          />
          <div className="pointer-events-auto absolute left-4 top-4 z-40 flex flex-col gap-1">
            <Link
              href="/"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              ← Energy Vis
            </Link>
            <span className="text-[10px] text-gray-600">
              EIA 860 · {FLEET_REFERENCE_YEAR}
            </span>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 z-40 hidden text-right text-[10px] text-gray-600 sm:block">
            Fleet age map
          </div>
        </>
      )}

      {summary && plants && isoBoundaries && (
        <FleetAgeTourPanel
          steps={STEPS}
          step={step}
          onStep={setStep}
          summary={summary}
          isoRollup={isoRollup}
          stateRollup={stateRollup}
        />
      )}
    </div>
  );
}
