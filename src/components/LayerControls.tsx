"use client";

import type { LayerVisibility, FuelTypeFilters, FuelType } from "@/types";
import { FUEL_HEX } from "@/lib/colors";

interface Props {
  visibility: LayerVisibility;
  fuelFilters: FuelTypeFilters;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  toggleFuelFilter: (fuel: keyof FuelTypeFilters) => void;
  datacenterCount: number;
  powerPlantCount: number;
  hasTransmission: boolean;
  hasGridConnections: boolean;
  queueCount: number;
}

const FUEL_LABELS: Record<FuelType, string> = {
  gas: "Natural Gas",
  nuclear: "Nuclear",
  wind: "Wind",
  solar: "Solar",
  coal: "Coal",
  hydro: "Hydro",
  oil: "Oil",
  other: "Other",
};

function Toggle({
  checked,
  onChange,
  label,
  count,
  color,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  count?: number;
  color?: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-1 px-1 rounded hover:bg-white/5 transition-colors">
      <div
        className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors"
        style={{
          backgroundColor: checked
            ? color || "#60a5fa"
            : "transparent",
          borderColor: checked
            ? color || "#60a5fa"
            : "#6b7280",
        }}
        onClick={onChange}
      >
        {checked && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-200 select-none" onClick={onChange}>
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-500 ml-auto">{count.toLocaleString()}</span>
      )}
    </label>
  );
}

export default function LayerControls({
  visibility,
  fuelFilters,
  toggleLayer,
  toggleFuelFilter,
  datacenterCount,
  powerPlantCount,
  hasTransmission,
  hasGridConnections,
  queueCount,
}: Props) {
  return (
    <div className="panel absolute top-4 left-4 z-10 p-4 w-64">
      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
        Layers
      </h2>

      <div className="space-y-1">
        <Toggle
          checked={visibility.datacenters}
          onChange={() => toggleLayer("datacenters")}
          label="AI Datacenters"
          count={datacenterCount}
          color="#60a5fa"
        />
        <Toggle
          checked={visibility.isoBoundaries}
          onChange={() => toggleLayer("isoBoundaries")}
          label="ISO/RTO Regions"
          color="#4b5563"
        />
        <Toggle
          checked={visibility.powerPlants}
          onChange={() => toggleLayer("powerPlants")}
          label="Power Plants"
          count={powerPlantCount}
          color="#94a3b8"
        />

        {visibility.powerPlants && (
          <div className="pl-5 pt-1 space-y-0.5">
            {(Object.keys(FUEL_LABELS) as FuelType[]).map((fuel) => (
              <Toggle
                key={fuel}
                checked={fuelFilters[fuel]}
                onChange={() => toggleFuelFilter(fuel)}
                label={FUEL_LABELS[fuel]}
                color={FUEL_HEX[fuel]}
              />
            ))}
          </div>
        )}

        {hasTransmission && (
          <Toggle
            checked={visibility.transmissionLines}
            onChange={() => toggleLayer("transmissionLines")}
            label="Transmission Lines"
            color="#facc15"
          />
        )}
        {hasGridConnections && (
          <Toggle
            checked={visibility.gridConnections}
            onChange={() => toggleLayer("gridConnections")}
            label="Grid Connections"
            color="#78dcff"
          />
        )}
        {queueCount > 0 && (
          <Toggle
            checked={visibility.interconnectionQueue}
            onChange={() => toggleLayer("interconnectionQueue")}
            label="Interconnection Queue"
            count={queueCount}
            color="#a855f7"
          />
        )}
      </div>
    </div>
  );
}
