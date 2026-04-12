"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PowerPlant } from "@/types";
import {
  computeFleetAgeSummary,
  FLEET_REFERENCE_YEAR,
  type FleetAgeSummary,
} from "@/lib/fleet-age-stats";
import { FUEL_HEX } from "@/lib/colors";

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
    id: "next",
    title: "Ground truth & next steps",
    kicker: "Beyond the spreadsheet",
  },
];

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
    <div className="mb-4">
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="text-gray-200">{label}</span>
        <span className="shrink-0 text-gray-500">{sub}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-800">
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
    <div className="flex items-center justify-between gap-4 border-b border-gray-800/80 py-3 last:border-0">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: hex }}
        />
        <span className="capitalize text-gray-200">{fuel}</span>
      </div>
      <div className="text-right text-sm tabular-nums">
        <span className="text-gray-400">{formatGw(gw)} GW</span>
        <span className="mx-2 text-gray-600">·</span>
        <span className="text-gray-300">{avgAge.toFixed(1)} yr avg</span>
      </div>
    </div>
  );
}

export default function PowerManagementPage() {
  const [plants, setPlants] = useState<PowerPlant[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/data/power-plants.json");
        if (!r.ok) throw new Error("Could not load plant data");
        const data = (await r.json()) as PowerPlant[];
        if (!cancelled) setPlants(data);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary: FleetAgeSummary | null = useMemo(() => {
    if (!plants?.length) return null;
    return computeFleetAgeSummary(plants, FLEET_REFERENCE_YEAR);
  }, [plants]);

  const bucketColors = [
    "#38bdf8",
    "#22d3ee",
    "#818cf8",
    "#a78bfa",
    "#f472b6",
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800/80">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <Link
            href="/"
            className="text-sm text-gray-500 transition hover:text-gray-300"
          >
            ← Energy Vis
          </Link>
          <span className="text-xs text-gray-600">
            EIA Form 860 · {FLEET_REFERENCE_YEAR} reference
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-28 pt-10 sm:px-6 sm:pt-14">
        {err && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        )}

        {!plants && !err && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500">Loading EIA fleet…</p>
          </div>
        )}

        {summary && (
          <>
            <p className="text-sm font-medium text-amber-400/90">
              {STEPS[step].kicker}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {STEPS[step].title}
            </h1>

            {step === 0 && (
              <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-400">
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
                  how exposed a fleet is to gas price or environmental rules.
                </p>
                <p>
                  This page is a{" "}
                  <strong className="font-medium text-gray-200">
                    public-data baseline
                  </strong>
                  : every operating generator in EIA Form 860, rolled up to
                  plant-level capacity-weighted age. It is meant to complement
                  — not replace — what you learn from O&amp;M managers,
                  interconnection queues, and offtake contracts.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="mt-8 space-y-8">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Capacity-weighted avg age
                    </p>
                    <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
                      {summary.weightedAvgAge.toFixed(1)}
                      <span className="text-lg font-normal text-gray-500">
                        {" "}
                        yrs
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Nameplate MW across plants with reported online year
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Fleet covered
                    </p>
                    <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
                      {formatGw(summary.totalCapacityGw)}
                      <span className="text-lg font-normal text-gray-500">
                        {" "}
                        GW
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {summary.coveredCapacityPct.toFixed(1)}% of nameplate MW
                      has operating year in EIA
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-4 text-sm font-medium text-gray-300">
                    Nameplate by asset age ({FLEET_REFERENCE_YEAR} − online year)
                  </p>
                  {summary.buckets.map((b, i) => (
                    <BarBlock
                      key={b.label}
                      label={b.label}
                      pct={b.pctOfFleet}
                      sub={`${formatGw(b.capacityMw / 1000)} GW · ${b.pctOfFleet.toFixed(1)}%`}
                      color={bucketColors[i] ?? "#64748b"}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-8">
                <p className="mb-2 text-sm leading-relaxed text-gray-400">
                  Renewable buildout pulls solar and wind young; thermal fleets
                  often sit in mid-life, where major overhauls and merchant
                  exposure show up in diligence.
                </p>
                <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/30 px-4">
                  {summary.byFuel.map((f) => (
                    <FuelRow
                      key={f.fuel}
                      fuel={f.fuel}
                      gw={f.capacityGw}
                      avgAge={f.weightedAvgAge}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-400">
                <p>
                  <strong className="font-medium text-gray-200">
                    What this is not:
                  </strong>{" "}
                  It does not show forced outage rates, heat-rate degradation,
                  or repair spend — that needs operational data, maintenance
                  records, and often proprietary benchmarks.
                </p>
                <p>
                  <strong className="font-medium text-gray-200">
                    Where to go next:
                  </strong>{" "}
                  FERC eLibrary for PPAs and interconnection, asset-owner
                  filings (e.g. yieldco reports), and conversations with plant
                  managers, ESCOs, and grid operators — the voices named in your
                  research brief.
                </p>
                <ul className="list-inside list-disc space-y-2 pl-1 text-gray-500">
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://www.eia.gov/electricity/data/eia860/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      EIA Form 860
                    </a>{" "}
                    — generator vintages &amp; ownership
                  </li>
                  <li>
                    <a
                      className="text-blue-400 hover:underline"
                      href="https://www.ferc.gov/industries-data/electricity-industry"
                      target="_blank"
                      rel="noreferrer"
                    >
                      FERC eLibrary
                    </a>{" "}
                    — contracts &amp; interconnection
                  </li>
                  <li>
                    <Link
                      href="/ai-power-map"
                      className="text-blue-400 hover:underline"
                    >
                      AI Power Map
                    </Link>{" "}
                    — load growth vs grid &amp; queues
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </main>

      {summary && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-800/90 bg-gray-950/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <button
              type="button"
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-30"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={STEPS[i].id}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  className={`h-2 w-2 rounded-full transition ${
                    i === step ? "bg-blue-500" : "bg-gray-700"
                  }`}
                  onClick={() => setStep(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-30"
              disabled={step >= STEPS.length - 1}
              onClick={() =>
                setStep((s) => Math.min(STEPS.length - 1, s + 1))
              }
            >
              Next
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
