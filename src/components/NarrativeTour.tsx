"use client";

import { useState, useCallback, useEffect } from "react";
import type { LayerVisibility, FuelTypeFilters } from "@/types";

const ALL_FUELS_OFF: FuelTypeFilters = {
  gas: false, nuclear: false, wind: false, solar: false, coal: false, hydro: false, oil: false, other: false,
};
const ALL_FUELS_ON: FuelTypeFilters = {
  gas: true, nuclear: true, wind: true, solar: true, coal: true, hydro: true, oil: true, other: true,
};

interface LegendItem {
  color: string;
  label: string;
}

interface TourStep {
  title: string;
  subtitle: string;
  body: string;
  source: string;
  camera: { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number };
  layers: LayerVisibility;
  fuelFilters?: FuelTypeFilters;
  year?: number;
  legend?: LegendItem[];
}

interface Storyline {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: TourStep[];
}

// --- Storyline: AI Datacenter Buildout ---
const AI_BUILDOUT: TourStep[] = [
  {
    title: "AI is devouring the grid",
    subtitle: "US datacenter demand: 183 TWh and climbing",
    body: "In 2024, US datacenters consumed 183 TWh of electricity — over 4% of total US generation. By 2030, that number triples to 426 TWh. The grid wasn't built for this.",
    source: "IEA, S&P Global (2025)",
    camera: { longitude: -96, latitude: 38.5, zoom: 4, pitch: 0, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2025,
    legend: [
      { color: "#22c55e", label: "Operational datacenter" },
      { color: "#eab308", label: "Under construction" },
      { color: "#3b82f6", label: "Planned" },
      { color: "#a855f7", label: "Announced" },
    ],
  },
  {
    title: "Data Center Alley",
    subtitle: "70% of global internet traffic, one Virginia county",
    body: "Loudoun County, Virginia hosts 150+ datacenters — the largest concentration on Earth. Dominion Energy projects datacenter peak demand will hit 13.3 GW by 2038, up from 2.8 GW in 2022. Residential rates are rising 14% to pay for upgrades.",
    source: "Dominion Energy IRP, Cardinal News (2026)",
    camera: { longitude: -77.5, latitude: 38.9, zoom: 8, pitch: 30, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: true, gridConnections: true, interconnectionQueue: false },
    year: 2035,
    legend: [
      { color: "#22c55e", label: "Datacenter" },
      { color: "#94a3b8", label: "Transmission line (345kV+)" },
      { color: "#78dcff", label: "Grid node" },
    ],
  },
  {
    title: "The queue bottleneck",
    subtitle: "2,300 GW waiting. Only 13% will ever connect.",
    body: "There are 10,300 power projects in US interconnection queues totaling 2,300 GW — more than double current US generation capacity. The median wait is 4+ years and growing. 77% of projects are eventually withdrawn.",
    source: "LBNL Queued Up Report (2025)",
    camera: { longitude: -96, latitude: 38.5, zoom: 4, pitch: 0, bearing: 0 },
    layers: { datacenters: false, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: false, interconnectionQueue: true },
    year: 2030,
    legend: [
      { color: "#60a5fa", label: "Queued project (hollow = pending)" },
    ],
  },
  {
    title: "Texas: the next frontier",
    subtitle: "226 GW of new load requests — 73% are datacenters",
    body: "ERCOT received 226 GW of large-load interconnection requests in 2025, nearly 4x the prior year. Texas's deregulated market, cheap gas, and abundant wind/solar make it the top destination for new AI compute. But the transmission grid needs $30B+ in upgrades.",
    source: "Latitude Media, CNBC (2025)",
    camera: { longitude: -97.5, latitude: 31.5, zoom: 6, pitch: 30, bearing: 10 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: true, gridConnections: true, interconnectionQueue: true },
    year: 2030,
    legend: [
      { color: "#22c55e", label: "Datacenter" },
      { color: "#60a5fa", label: "Queued project" },
      { color: "#94a3b8", label: "Transmission line" },
      { color: "#ef4444", label: "ERCOT region" },
    ],
  },
  {
    title: "The nuclear bet",
    subtitle: "Big Tech ordered 10+ GW. Delivery: TBD.",
    body: "Amazon committed to 5 GW of SMRs. Google signed for 500 MW. Microsoft is restarting Three Mile Island (837 MW). Meta issued an RFP for 4 GW. But realistic timelines put meaningful nuclear at a decade out. The datacenters need power now.",
    source: "Various utility filings (2024-2025)",
    camera: { longitude: -82, latitude: 36, zoom: 4.5, pitch: 0, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: false, powerPlants: true, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    fuelFilters: { ...ALL_FUELS_OFF, nuclear: true },
    year: 2035,
    legend: [
      { color: "#f97316", label: "Nuclear power plant" },
      { color: "#22c55e", label: "Datacenter (operational)" },
      { color: "#eab308", label: "Datacenter (construction)" },
    ],
  },
];

// --- Storyline: Isolated Grids ---
const ISOLATED_GRIDS: TourStep[] = [
  {
    title: "America's forgotten grids",
    subtitle: "Not all of the US is connected",
    body: "The contiguous US runs on three massive interconnections. But millions of Americans live on isolated grids — islands, territories, and remote communities where the rules are completely different. Electricity can cost 5-10x the mainland average.",
    source: "EIA, DOE",
    camera: { longitude: -96, latitude: 38.5, zoom: 3.5, pitch: 0, bearing: 0 },
    layers: { datacenters: false, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2025,
    legend: [
      { color: "#3b82f6", label: "ISO/RTO regions (connected grid)" },
    ],
  },
  {
    title: "Alaska: 100+ microgrids",
    subtitle: "No connection to the Lower 48",
    body: "Alaska's grid is fractured into over 100 isolated microgrids — more than any other state. Remote villages pay over $1/kWh for diesel-barged electricity. The state has enormous untapped wind and tidal potential, but no transmission to move it.",
    source: "Alaska Energy Authority, EIA",
    camera: { longitude: -152, latitude: 64, zoom: 4, pitch: 0, bearing: 0 },
    layers: { datacenters: false, isoBoundaries: false, powerPlants: true, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2025,
    legend: [
      { color: "#ef4444", label: "Oil/diesel plant" },
      { color: "#3b82f6", label: "Hydro" },
      { color: "#06b6d4", label: "Wind" },
      { color: "#64748b", label: "Coal" },
    ],
  },
  {
    title: "Hawaii: the solar island",
    subtitle: "41c/kWh — highest electricity prices in the US",
    body: "Each Hawaiian island runs its own isolated grid with zero interconnection. A single plant trip can cause island-wide blackouts. But 1 in 3 homes now has rooftop solar — the highest adoption rate in the nation — driving Hawaii past 40% renewable generation.",
    source: "Hawaiian Electric, EIA (2024)",
    camera: { longitude: -157.5, latitude: 20.5, zoom: 7, pitch: 30, bearing: 0 },
    layers: { datacenters: false, isoBoundaries: false, powerPlants: true, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2025,
    legend: [
      { color: "#facc15", label: "Solar" },
      { color: "#06b6d4", label: "Wind" },
      { color: "#ef4444", label: "Oil/diesel" },
      { color: "#3b82f6", label: "Hydro" },
    ],
  },
  {
    title: "Puerto Rico: fragile by design",
    subtitle: "11-month blackout. 800% solar surge.",
    body: "Hurricane Maria caused the longest blackout in US history — 11 months for some residents. The grid still loses ~10% of generated electricity to line losses and theft, double the mainland average. Over 40,000 rooftop solar systems have been installed as residents abandon grid reliability.",
    source: "DOE, LUMA Energy, SEIA",
    camera: { longitude: -66.5, latitude: 18.2, zoom: 9, pitch: 35, bearing: -10 },
    layers: { datacenters: false, isoBoundaries: false, powerPlants: false, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2025,
  },
];

// --- Storyline: ISO/RTO Highlights ---
const ISO_HIGHLIGHTS: TourStep[] = [
  {
    title: "The grid operators",
    subtitle: "7 ISOs and dozens of utilities divide the US grid",
    body: "Independent System Operators (ISOs) coordinate electricity markets and transmission across most of the US. Each has its own rules, queue process, and bottlenecks. Understanding them is key to understanding where energy can — and can't — flow.",
    source: "",
    camera: { longitude: -96, latitude: 38.5, zoom: 4, pitch: 0, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: false, interconnectionQueue: false },
    year: 2035,
    legend: [
      { color: "#22c55e", label: "Datacenter" },
      { color: "#3b82f6", label: "PJM" },
      { color: "#ef4444", label: "ERCOT" },
      { color: "#22c55e", label: "MISO" },
      { color: "#eab308", label: "CAISO" },
      { color: "#a855f7", label: "SPP" },
    ],
  },
  {
    title: "ERCOT: the lone star grid",
    subtitle: "Texas runs its own grid — by choice",
    body: "ERCOT is the only major grid in the US with virtually no interconnection to neighbors. This deregulated island attracted 226 GW of new load requests in 2025 — mostly datacenters drawn by cheap power and fast permitting. But Winter Storm Uri showed the risk: 246 people died when the isolated grid collapsed.",
    source: "ERCOT, Latitude Media, Texas DSHS",
    camera: { longitude: -98.5, latitude: 31, zoom: 5.5, pitch: 20, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: true, gridConnections: true, interconnectionQueue: true },
    year: 2030,
    legend: [
      { color: "#22c55e", label: "Datacenter" },
      { color: "#60a5fa", label: "Queued project" },
      { color: "#94a3b8", label: "Transmission line (345kV+)" },
      { color: "#ef4444", label: "ERCOT boundary" },
    ],
  },
  {
    title: "PJM: backbone of the East",
    subtitle: "The largest grid operator in the world",
    body: "PJM coordinates the grid across 13 states and DC, serving 65 million people. It hosts Data Center Alley and the densest transmission network in the country. But its interconnection queue has a 5+ year backlog, and new capacity can't keep pace with datacenter demand.",
    source: "PJM Interconnection (2025)",
    camera: { longitude: -79, latitude: 39.5, zoom: 5.5, pitch: 15, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: true, gridConnections: true, interconnectionQueue: true },
    year: 2030,
    legend: [
      { color: "#22c55e", label: "Datacenter" },
      { color: "#60a5fa", label: "Queued project" },
      { color: "#94a3b8", label: "Transmission line (345kV+)" },
      { color: "#3b82f6", label: "PJM boundary" },
    ],
  },
  {
    title: "CAISO: California's clean grid",
    subtitle: "60%+ renewable on sunny afternoons — then what?",
    body: "California's grid regularly hits 60%+ renewable generation midday thanks to massive solar buildout. But as the sun sets, CAISO faces the infamous 'duck curve' — a steep ramp requiring fast-start gas plants or imports. Battery storage is growing fast but can't yet fill the gap.",
    source: "CAISO, EIA (2024)",
    camera: { longitude: -119.5, latitude: 37, zoom: 5.5, pitch: 15, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: true, transmissionLines: false, gridConnections: false, interconnectionQueue: true },
    fuelFilters: { ...ALL_FUELS_OFF, solar: true, gas: true },
    year: 2030,
    legend: [
      { color: "#facc15", label: "Solar plant" },
      { color: "#ef4444", label: "Gas plant" },
      { color: "#22c55e", label: "Datacenter" },
      { color: "#60a5fa", label: "Queued project" },
      { color: "#eab308", label: "CAISO boundary" },
    ],
  },
  {
    title: "MISO: the wind corridor",
    subtitle: "From North Dakota to Louisiana — one grid",
    body: "MISO stretches 1,200 miles from the Canadian border to the Gulf Coast, managing the largest wind generation fleet in the US. Its 'MISO Tranche' transmission plan calls for $10B+ in new high-voltage lines to move wind power south and east to load centers.",
    source: "MISO Long Range Transmission Plan (2024)",
    camera: { longitude: -92, latitude: 40, zoom: 5, pitch: 10, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: true, transmissionLines: true, gridConnections: false, interconnectionQueue: false },
    fuelFilters: { ...ALL_FUELS_OFF, wind: true },
    year: 2030,
    legend: [
      { color: "#06b6d4", label: "Wind farm" },
      { color: "#94a3b8", label: "Transmission line (345kV+)" },
      { color: "#22c55e", label: "MISO boundary" },
    ],
  },
  {
    title: "SPP: the wind capital",
    subtitle: "First US grid to hit 90%+ wind penetration",
    body: "The Southwest Power Pool has repeatedly set records for wind penetration, briefly exceeding 90% of total load. Spanning the Great Plains from Oklahoma to the Dakotas, SPP has more wind in its queue than any other ISO. The challenge: building transmission to export it.",
    source: "SPP (2024)",
    camera: { longitude: -99, latitude: 37, zoom: 5.5, pitch: 10, bearing: 0 },
    layers: { datacenters: true, isoBoundaries: true, powerPlants: true, transmissionLines: true, gridConnections: false, interconnectionQueue: false },
    fuelFilters: { ...ALL_FUELS_OFF, wind: true },
    year: 2030,
    legend: [
      { color: "#06b6d4", label: "Wind farm" },
      { color: "#94a3b8", label: "Transmission line (345kV+)" },
      { color: "#a855f7", label: "SPP boundary" },
    ],
  },
];

const STORYLINES: Storyline[] = [
  {
    id: "ai-buildout",
    name: "The AI Power Surge",
    description: "How AI datacenters are reshaping the US grid",
    icon: "\u26A1",
    steps: AI_BUILDOUT,
  },
  {
    id: "isolated-grids",
    name: "Isolated Grids",
    description: "Alaska, Hawaii, Puerto Rico — America's forgotten grids",
    icon: "\uD83C\uDFDD\uFE0F",
    steps: ISOLATED_GRIDS,
  },
  {
    id: "iso-highlights",
    name: "ISO/RTO Tour",
    description: "The grid operators that run America's electricity",
    icon: "\uD83D\uDDFA\uFE0F",
    steps: ISO_HIGHLIGHTS,
  },
];

interface NarrativeTourProps {
  mapRef: React.RefObject<import("react-map-gl/maplibre").MapRef | null>;
  setVisibility: (v: LayerVisibility) => void;
  setFuelFilters: (f: FuelTypeFilters) => void;
  setYear: (year: number) => void;
  onActiveChange?: (active: boolean) => void;
}

export default function NarrativeTour({
  mapRef,
  setVisibility,
  setFuelFilters,
  setYear,
  onActiveChange,
}: NarrativeTourProps) {
  const [mode, setMode] = useState<"menu" | "playing">("menu");
  const [storyline, setStoryline] = useState<Storyline | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [active, setActiveState] = useState(true);
  const [fadeIn, setFadeIn] = useState(true);

  const setActive = useCallback((v: boolean) => {
    setActiveState(v);
    onActiveChange?.(v);
  }, [onActiveChange]);

  const applyStep = useCallback(
    (steps: TourStep[], index: number) => {
      const step = steps[index];
      mapRef.current?.flyTo({
        center: [step.camera.longitude, step.camera.latitude],
        zoom: step.camera.zoom,
        pitch: step.camera.pitch,
        bearing: step.camera.bearing,
        duration: 2500,
        essential: true,
      });
      setVisibility(step.layers);
      setFuelFilters(step.fuelFilters ?? ALL_FUELS_ON);
      if (step.year) setYear(step.year);
    },
    [mapRef, setVisibility, setFuelFilters, setYear],
  );

  const startStoryline = useCallback(
    (s: Storyline) => {
      setStoryline(s);
      setStepIndex(0);
      setFadeIn(true);
      setMode("playing");
      applyStep(s.steps, 0);
    },
    [applyStep],
  );

  const goTo = useCallback(
    (index: number) => {
      if (!storyline) return;
      setFadeIn(false);
      setTimeout(() => {
        setStepIndex(index);
        applyStep(storyline.steps, index);
        setFadeIn(true);
      }, 300);
    },
    [applyStep, storyline],
  );

  const next = useCallback(() => {
    if (!storyline) return;
    if (stepIndex < storyline.steps.length - 1) {
      goTo(stepIndex + 1);
    } else {
      // Return to menu
      setMode("menu");
      setStoryline(null);
      // Reset to default view
      mapRef.current?.flyTo({
        center: [-96, 38.5], zoom: 4, pitch: 0, bearing: 0, duration: 2000,
      });
      setVisibility({ datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: true, interconnectionQueue: false });
      setFuelFilters(ALL_FUELS_ON);
      setYear(2035);
    }
  }, [storyline, stepIndex, goTo, mapRef, setVisibility, setFuelFilters, setYear]);

  const prev = useCallback(() => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }, [stepIndex, goTo]);

  const backToMenu = useCallback(() => {
    setMode("menu");
    setStoryline(null);
    mapRef.current?.flyTo({
      center: [-96, 38.5], zoom: 4, pitch: 0, bearing: 0, duration: 2000,
    });
    setVisibility({ datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: true, interconnectionQueue: false });
    setFuelFilters(ALL_FUELS_ON);
    setYear(2035);
  }, [mapRef, setVisibility, setFuelFilters, setYear]);

  const dismiss = useCallback(() => {
    setVisibility({ datacenters: true, isoBoundaries: true, powerPlants: false, transmissionLines: false, gridConnections: true, interconnectionQueue: false });
    setFuelFilters(ALL_FUELS_ON);
    setYear(2035);
    setActive(false);
  }, [setVisibility, setFuelFilters, setYear, setActive]);

  // Notify parent on mount
  useEffect(() => {
    onActiveChange?.(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;

  // --- Menu mode ---
  if (mode === "menu") {
    return (
      <div className="absolute top-0 left-0 z-30 pointer-events-none" style={{ width: "100%", height: "100%" }}>
        {/* Slight overlay */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)" }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="panel px-8 py-7 max-w-lg">
            <h1 className="text-2xl font-bold text-white mb-1">AI Power Map</h1>
            <p className="text-sm text-gray-400 mb-6">Choose a story to explore</p>

            <div className="flex flex-col gap-3">
              {STORYLINES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => startStoryline(s)}
                  className="flex items-start gap-4 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition-all text-left group"
                >
                  <span className="text-2xl mt-0.5">{s.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {s.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                  </div>
                  <span className="ml-auto text-gray-600 group-hover:text-gray-400 transition-colors text-xs mt-1">
                    {s.steps.length} stops
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={dismiss}
              className="mt-5 w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
            >
              Skip — go straight to the map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Playing mode ---
  const steps = storyline!.steps;
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="absolute top-0 left-0 z-30 pointer-events-none" style={{ width: "100%", height: "100%" }}>
      {/* Cinematic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Story card */}
      <div
        className="absolute bottom-32 left-8 pointer-events-auto max-w-md transition-all duration-500"
        style={{
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <div className="panel px-6 py-5">
          {/* Storyline label + step indicator */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              {storyline!.icon} {storyline!.name}
            </span>
            <div className="flex items-center gap-1.5 ml-auto">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="transition-all duration-300"
                  style={{
                    width: i === stepIndex ? 20 : 6,
                    height: 3,
                    borderRadius: 2,
                    background:
                      i === stepIndex
                        ? "#60a5fa"
                        : i < stepIndex
                          ? "rgba(96,165,250,0.4)"
                          : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
              <span className="text-[10px] text-gray-600 ml-1">
                {stepIndex + 1}/{steps.length}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white leading-tight">
            {step.title}
          </h2>
          <p className="text-sm text-blue-400 font-medium mt-1">
            {step.subtitle}
          </p>
          <p className="text-sm text-gray-300 mt-3 leading-relaxed">
            {step.body}
          </p>
          {step.source && (
            <p className="text-[10px] text-gray-500 mt-2">{step.source}</p>
          )}

          {/* Contextual legend — what's on the map */}
          {step.legend && step.legend.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-white/10">
              {step.legend.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[10px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              {isLast ? "Done" : "Next"}
            </button>
            <button
              onClick={backToMenu}
              className="ml-auto text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              All stories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
