"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { PowerPlant, FuelType, QueueProject } from "@/types";
import { computeOperatorProfiles } from "@/lib/operator-stats";
import { FUEL_HEX } from "@/lib/colors";
import { assignRegions } from "@/lib/geo-utils";
import SolarOMTourPanel, {
  SolarOMTopBar,
  SOLAR_OM_SLIDES,
  SOLAR_OM_BEATS,
  findTopOldGuardOperator,
  findTopSolarOperator,
  resolveSpotlightProfile,
  firstSlideIndexOfBeat,
} from "@/components/SolarOMTourPanel";

const SolarOMScatter = dynamic(() => import("@/components/SolarOMScatter"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Computing operator portfolios…</p>
      </div>
    </div>
  ),
});

const ALL_FUELS: FuelType[] = ["solar", "gas", "coal", "wind", "hydro", "nuclear", "oil", "other"];

const FUEL_LABELS: Record<FuelType, string> = {
  solar: "Solar", gas: "Gas", coal: "Coal", wind: "Wind",
  hydro: "Hydro", nuclear: "Nuclear", oil: "Oil", other: "Other",
};

import type { FeatureCollection } from "geojson";

export default function SolarOMPage() {
  const [plants, setPlants] = useState<PowerPlant[] | null>(null);
  const [usStates, setUsStates] = useState<FeatureCollection | null>(null);
  const [isoBoundaries, setIsoBoundaries] = useState<FeatureCollection | null>(null);
  const [queueProjects, setQueueProjects] = useState<QueueProject[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [manualFuel, setManualFuel] = useState<string | null>(null);
  // Fuel sidebar + manualFuel override are reserved for a future "free look"
  // mode the user enters after completing the walkthrough. Hidden for now.
  const freeLook = false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSlideIndex((s) => Math.min(s + 1, SOLAR_OM_SLIDES.length - 1));
      if (e.key === "ArrowLeft")  setSlideIndex((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plantsRes, statesRes, isoRes, queueRes] = await Promise.all([
          fetch("/data/power-plants.json"),
          fetch("/data/us-states.geojson"),
          fetch("/data/iso-boundaries.geojson"),
          fetch("/data/interconnection-queue.json"),
        ]);
        if (!plantsRes.ok) throw new Error("Could not load plant data");
        const plantsData = (await plantsRes.json()) as PowerPlant[];
        const statesData = statesRes.ok ? ((await statesRes.json()) as FeatureCollection) : null;
        const isoData = isoRes.ok ? ((await isoRes.json()) as FeatureCollection) : null;
        const queueData = queueRes.ok ? ((await queueRes.json()) as QueueProject[]) : null;
        if (!cancelled) {
          setPlants(plantsData);
          setUsStates(statesData);
          setIsoBoundaries(isoData);
          setQueueProjects(queueData);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const profiles = useMemo(() => {
    if (!plants?.length) return [];
    return computeOperatorProfiles(plants);
  }, [plants]);

  const topOldGuard = useMemo(() => findTopOldGuardOperator(profiles), [profiles]);
  const topSolar = useMemo(() => findTopSolarOperator(profiles), [profiles]);

  const slide = SOLAR_OM_SLIDES[slideIndex];
  const currentBeatIndex = slide.beatIndex;

  // Resolve spotlight/usMap operator role → operator profile & name
  const spotlightProfile = useMemo(
    () => resolveSpotlightProfile(slide.overlay?.companyRole, topOldGuard, topSolar),
    [slide.overlay?.companyRole, topOldGuard, topSolar],
  );
  const spotlightOperator = spotlightProfile?.operator ?? null;

  // ISOs the spotlight operator has plants in (point-in-polygon against
  // iso-boundaries). Only computed when we actually need it.
  const spotlightIsoCount = useMemo<number | null>(() => {
    if (!spotlightOperator || !plants?.length || !isoBoundaries) return null;
    const opPlants = plants
      .filter((p) => p.operator === spotlightOperator)
      .map((p) => ({ id: p.id, lat: p.lat, lon: p.lon }));
    if (!opPlants.length) return null;
    const regionByPlant = assignRegions(opPlants, isoBoundaries);
    const isoSet = new Set<string>();
    for (const region of regionByPlant.values()) {
      if (region) isoSet.add(region);
    }
    return isoSet.size;
  }, [spotlightOperator, plants, isoBoundaries]);

  // How many of the spotlighted operator's plants sit OUTSIDE the current
  // slide's centroid cluster (e.g. west-coast + Hawaii sites when we center
  // on the east coast). Useful for "N sites a day or more away" copy.
  const spotlightOutlierCount = useMemo<number | null>(() => {
    if (!spotlightOperator || !plants?.length) return null;
    const filter = slide.overlay?.usMapCentroidFilter;
    if (filter !== "east" && filter !== "contiguous") return null;
    const ops = plants.filter((p) => p.operator === spotlightOperator);
    if (!ops.length) return null;
    const inCluster = (p: { lon: number; lat: number }) => {
      if (filter === "contiguous") return p.lon > -130 && p.lon < -65 && p.lat > 24 && p.lat < 50;
      return p.lon > -90 && p.lat > 24 && p.lat < 50;
    };
    return ops.filter((p) => !inCluster(p)).length;
  }, [spotlightOperator, plants, slide.overlay?.usMapCentroidFilter]);

  // In usMap or spotlight slides, we want all the spheres filtered to just that operator.
  const activeFuels = useMemo<string[] | null>(() => {
    if (manualFuel) return [manualFuel];
    return slide.focusFuels;
  }, [manualFuel, slide.focusFuels]);

  const stepFocus = slide.focusFuels;

  const toggleFuel = (fuel: string) => {
    setManualFuel((prev) => (prev === fuel ? null : fuel));
  };

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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading EIA fleet…</p>
        </div>
      )}

      {profiles.length > 0 && plants && (
        <SolarOMScatter
          profiles={profiles}
          plants={plants}
          slide={slide}
          slideIndex={slideIndex}
          activeFuels={activeFuels}
          spotlightOperator={spotlightOperator}
          mapBoundaries={usStates}
          queueProjects={queueProjects}
        />
      )}

      <SolarOMTopBar
        beats={SOLAR_OM_BEATS}
        currentBeatIndex={currentBeatIndex}
        onBeat={(i) => setSlideIndex(firstSlideIndexOfBeat(i))}
      />

      {/* Fuel sidebar — only shown in free-look mode (post-walkthrough) */}
      {freeLook && profiles.length > 0 && (
        <div className="pointer-events-auto absolute left-3 top-20 z-40">
          <div className="panel flex flex-col gap-0.5 px-2.5 py-2.5 shadow-xl">
            <p className="mb-1.5 px-1 text-[9px] uppercase tracking-widest text-gray-500">Fuel</p>
            {ALL_FUELS.map((fuel) => {
              const hex = FUEL_HEX[fuel] ?? "#64748b";
              const isManual = manualFuel === fuel;
              const isStepFocused = stepFocus === null || stepFocus.includes(fuel);
              const isDimmed = !isManual && manualFuel !== null;
              return (
                <button
                  key={fuel}
                  type="button"
                  onClick={() => toggleFuel(fuel)}
                  title={FUEL_LABELS[fuel]}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all ${
                    isManual
                      ? "bg-white/10 text-white ring-1 ring-white/20"
                      : isDimmed
                      ? "text-gray-600 hover:text-gray-400"
                      : isStepFocused
                      ? "text-gray-200 hover:bg-white/5"
                      : "text-gray-500 hover:text-gray-400"
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-opacity ${
                      isDimmed ? "opacity-30" : "opacity-100"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                  <span className="w-12 text-left">{FUEL_LABELS[fuel]}</span>
                </button>
              );
            })}
            {manualFuel && (
              <button
                type="button"
                onClick={() => setManualFuel(null)}
                className="mt-1.5 rounded-md border border-gray-700 px-2 py-1 text-[10px] text-gray-500 transition hover:border-gray-500 hover:text-gray-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {profiles.length > 0 && (
        <SolarOMTourPanel
          slides={SOLAR_OM_SLIDES}
          slideIndex={slideIndex}
          onSlide={setSlideIndex}
          profiles={profiles}
          manualFuel={manualFuel}
          spotlightProfile={spotlightProfile}
          spotlightIsoCount={spotlightIsoCount}
          spotlightOutlierCount={spotlightOutlierCount}
        />
      )}
    </div>
  );
}
