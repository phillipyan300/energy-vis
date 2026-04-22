"use client";

import Link from "next/link";
import type { FleetAgeSummary, RegionAgeRollup } from "@/lib/fleet-age-stats";
import { FLEET_REFERENCE_YEAR } from "@/lib/fleet-age-stats";
import { FUEL_HEX } from "@/lib/colors";

export interface TourStepMeta {
  id: string;
  title: string;
  kicker: string;
}

function formatGw(gw: number) {
  return gw >= 100 ? gw.toFixed(0) : gw.toFixed(1);
}

function BarBlock({
  label,
  pct,
  sub,
  color,
}: {
  label: string;
  pct: number;
  sub: string;
  color: string;
}) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="text-gray-200">{label}</span>
        <span className="shrink-0 text-gray-500">{sub}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${w}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function FuelRow({
  fuel,
  gw,
  avgAge,
}: {
  fuel: string;
  gw: number;
  avgAge: number;
}) {
  const hex = FUEL_HEX[fuel as keyof typeof FUEL_HEX] ?? "#64748b";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-800/80 py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: hex }}
        />
        <span className="capitalize text-gray-200">{fuel}</span>
      </div>
      <div className="text-right text-xs tabular-nums">
        <span className="text-gray-400">{formatGw(gw)} GW</span>
        <span className="mx-2 text-gray-600">·</span>
        <span className="text-gray-300">{avgAge.toFixed(1)} yr</span>
      </div>
    </div>
  );
}

const BUCKET_COLORS = [
  "#38bdf8",
  "#22d3ee",
  "#818cf8",
  "#a78bfa",
  "#f472b6",
];

interface FleetAgeTourPanelProps {
  steps: TourStepMeta[];
  step: number;
  onStep: (i: number) => void;
  summary: FleetAgeSummary;
  isoRollup: RegionAgeRollup[];
  stateRollup: RegionAgeRollup[];
}

export default function FleetAgeTourPanel({
  steps,
  step,
  onStep,
  summary,
  isoRollup,
  stateRollup,
}: FleetAgeTourPanelProps) {
  const meta = steps[step];
  const isLast = step >= steps.length - 1;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30"
      style={{ width: "100%", height: "100%" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.35) 100%)",
        }}
      />

      <div className="pointer-events-auto absolute bottom-8 left-6 right-6 max-w-lg sm:right-auto">
        <div className="panel max-h-[min(52vh,480px)] overflow-y-auto px-5 py-4 shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-amber-400/90">
              {meta.kicker}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {steps.map((_, i) => (
                <button
                  key={steps[i].id}
                  type="button"
                  aria-label={`Step ${i + 1}`}
                  className={`h-1.5 rounded-full transition ${
                    i === step ? "w-5 bg-blue-500" : "w-1.5 bg-gray-600"
                  }`}
                  onClick={() => onStep(i)}
                />
              ))}
            </div>
          </div>

          <h2 className="text-lg font-semibold leading-tight text-white sm:text-xl">
            {meta.title}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-400">
            {step === 0 && (
              <>
                <p>
                  For VCs, buyers, and operators, the useful picture blends{" "}
                  <strong className="font-medium text-gray-200">
                    capital structure
                  </strong>
                  ,{" "}
                  <strong className="font-medium text-gray-200">
                    physical asset life
                  </strong>
                  , and{" "}
                  <strong className="font-medium text-gray-200">
                    who actually runs the plant
                  </strong>
                  . Vintage drives maintenance intensity, repower timing, and
                  exposure to fuel and environmental rules.
                </p>
                <p>
                  The map shows EIA Form 860 plants: color = asset age, size =
                  capacity. Use fuel toggles (top right) to filter.
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-700/80 bg-gray-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Avg age (MW-weighted)
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {summary.weightedAvgAge.toFixed(1)}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        yrs
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-700/80 bg-gray-900/50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">
                      Fleet w/ year
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {formatGw(summary.totalCapacityGw)}
                      <span className="text-sm font-normal text-gray-500">
                        {" "}
                        GW
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500">
                      {summary.coveredCapacityPct.toFixed(1)}% MW coverage
                    </p>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-300">
                  Nameplate by age ({FLEET_REFERENCE_YEAR} − online year)
                </p>
                {summary.buckets.map((b, i) => (
                  <BarBlock
                    key={b.label}
                    label={b.label}
                    pct={b.pctOfFleet}
                    sub={`${formatGw(b.capacityMw / 1000)} GW`}
                    color={BUCKET_COLORS[i] ?? "#64748b"}
                  />
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <p>
                  Renewable buildout keeps solar and wind young; thermal fleets
                  often sit in mid-life — where overhauls and merchant exposure
                  matter in diligence.
                </p>
                <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-3">
                  {summary.byFuel.map((f) => (
                    <FuelRow
                      key={f.fuel}
                      fuel={f.fuel}
                      gw={f.capacityGw}
                      avgAge={f.weightedAvgAge}
                    />
                  ))}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p>
                  ISO/RTO shading reflects MW-weighted average age of plants
                  assigned to each market (same point-in-polygon logic as the AI
                  Power Map). Tables highlight where the most nameplate sits.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-gray-300">
                      Top ISO / BA
                    </h3>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800">
                      <table className="w-full text-left text-[11px] text-gray-400">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-500">
                            <th className="px-2 py-1.5">Region</th>
                            <th className="px-2 py-1.5">GW</th>
                            <th className="px-2 py-1.5">Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isoRollup.slice(0, 10).map((r) => (
                            <tr
                              key={r.regionId}
                              className="border-b border-gray-800/60"
                            >
                              <td className="px-2 py-1 text-gray-200">
                                {r.regionId}
                              </td>
                              <td className="px-2 py-1 tabular-nums">
                                {formatGw(r.capacityGw)}
                              </td>
                              <td className="px-2 py-1 tabular-nums">
                                {r.weightedAvgAge.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-gray-300">
                      Top states
                    </h3>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800">
                      <table className="w-full text-left text-[11px] text-gray-400">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-500">
                            <th className="px-2 py-1.5">St</th>
                            <th className="px-2 py-1.5">GW</th>
                            <th className="px-2 py-1.5">Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stateRollup.slice(0, 12).map((r) => (
                            <tr
                              key={r.regionId}
                              className="border-b border-gray-800/60"
                            >
                              <td className="px-2 py-1 text-gray-200">
                                {r.regionId}
                              </td>
                              <td className="px-2 py-1 tabular-nums">
                                {formatGw(r.capacityGw)}
                              </td>
                              <td className="px-2 py-1 tabular-nums">
                                {r.weightedAvgAge.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p>
                  <strong className="font-medium text-gray-200">
                    What this is not:
                  </strong>{" "}
                  Forced outage rates, heat-rate degradation, or repair spend
                  — that needs operational data and proprietary benchmarks.
                </p>
                <p>
                  <strong className="font-medium text-gray-200">
                    Where to go next:
                  </strong>{" "}
                  FERC eLibrary for dockets and qualifying facility filings;
                  SEC and company IR for asset-owner narrative; ISO/RTO
                  interconnection and planning for grid-operator context; plant
                  managers and ESCOs through stakeholder processes and direct
                  outreach—not another public spreadsheet.
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-1 text-xs text-gray-500">
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://www.eia.gov/electricity/data/eia860/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      EIA Form 860
                    </a>{" "}
                    (inventory baseline)
                  </li>
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://elibrary.ferc.gov/eLibrary/search"
                      target="_blank"
                      rel="noreferrer"
                    >
                      FERC eLibrary search
                    </a>{" "}
                    (dockets, filings, Form 1 utility data)
                  </li>
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://www.sec.gov/edgar/search-and-access"
                      target="_blank"
                      rel="noreferrer"
                    >
                      SEC EDGAR
                    </a>{" "}
                    (10-K / 10-Q for listed owners and utilities)
                  </li>
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://www.ferc.gov/industries-data/electricity-industry/electric-power-markets"
                      target="_blank"
                      rel="noreferrer"
                    >
                      FERC: ISOs &amp; RTOs
                    </a>{" "}
                    (links to market operators and planning)
                  </li>
                  <li>
                    <Link
                      href="/ai-power-map"
                      className="text-blue-400 hover:underline"
                    >
                      AI Power Map
                    </Link>
                  </li>
                </ul>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              className="rounded-md border border-gray-600 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-30"
              disabled={step === 0}
              onClick={() => onStep(Math.max(0, step - 1))}
            >
              Back
            </button>
            {!isLast ? (
              <button
                type="button"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-500"
                onClick={() => onStep(Math.min(steps.length - 1, step + 1))}
              >
                Next
              </button>
            ) : (
              <span className="text-xs text-gray-500">End of tour</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
