"use client";

import { STATUS_HEX, STATUS_LABELS, FUEL_HEX } from "@/lib/colors";
import type { DatacenterStatus, FuelType } from "@/types";

const FUEL_LABELS: Record<FuelType, string> = {
  gas: "Gas",
  nuclear: "Nuclear",
  wind: "Wind",
  solar: "Solar",
  coal: "Coal",
  hydro: "Hydro",
  oil: "Oil",
  other: "Other",
};

export default function Legend({
  showPlants,
  showConnections,
}: {
  showPlants: boolean;
  showConnections: boolean;
}) {
  return (
    <div className="panel absolute bottom-4 left-4 z-10 p-4">
      <div className="space-y-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Datacenter Status
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(Object.keys(STATUS_HEX) as DatacenterStatus[]).map((status) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_HEX[status] }}
                />
                <span className="text-xs text-gray-300">
                  {STATUS_LABELS[status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {showPlants && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Power Plants
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(Object.keys(FUEL_HEX) as FuelType[])
                .filter((f) => f !== "other" && f !== "oil")
                .map((fuel) => (
                  <div key={fuel} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: FUEL_HEX[fuel] }}
                    />
                    <span className="text-xs text-gray-300">
                      {FUEL_LABELS[fuel]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {showConnections && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              Grid Connections
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#78dcff" }} />
                <span className="text-xs text-gray-300">Grid Node</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 rounded" style={{ backgroundColor: "#78dcff" }} />
                <span className="text-xs text-gray-300">Grid Connection</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
