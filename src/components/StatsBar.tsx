"use client";

import type { AIDatacenter } from "@/types";
import { STATUS_HEX } from "@/lib/colors";

export default function StatsBar({
  datacenters,
}: {
  datacenters: AIDatacenter[];
}) {
  if (datacenters.length === 0) return null;

  const totalMW = datacenters.reduce((sum, d) => sum + d.power_mw, 0);
  const estimatedDrawMW = datacenters
    .filter((d) => d.status === "operational")
    .reduce((sum, d) => sum + d.power_mw * 0.8, 0);
  const totalGPUs = datacenters.reduce(
    (sum, d) => sum + (d.gpu_count || 0),
    0
  );

  const byStatus = datacenters.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="panel absolute top-4 left-1/2 -translate-x-1/2 z-10 px-6 py-3">
      <div className="flex items-center gap-8 text-sm">
        <div>
          <span className="text-gray-400">Total AI DC Power</span>
          <span className="ml-2 font-bold text-white text-lg">
            {(totalMW / 1000).toFixed(1)} GW
          </span>
        </div>
        <div className="h-6 w-px bg-gray-700" />
        {estimatedDrawMW > 0 && (
          <>
            <div>
              <span className="text-gray-400">Est. Draw</span>
              <span className="ml-2 font-bold text-emerald-400 text-lg">
                {(estimatedDrawMW / 1000).toFixed(1)} GW
              </span>
            </div>
            <div className="h-6 w-px bg-gray-700" />
          </>
        )}
        <div>
          <span className="text-gray-400">Facilities</span>
          <span className="ml-2 font-bold text-white">
            {datacenters.length}
          </span>
        </div>
        {totalGPUs > 0 && (
          <>
            <div className="h-6 w-px bg-gray-700" />
            <div>
              <span className="text-gray-400">Tracked GPUs</span>
              <span className="ml-2 font-bold text-white">
                {(totalGPUs / 1000).toFixed(0)}k
              </span>
            </div>
          </>
        )}
        <div className="h-6 w-px bg-gray-700" />
        <div className="flex items-center gap-3">
          {(
            ["operational", "construction", "planned", "announced"] as const
          ).map(
            (status) =>
              byStatus[status] && (
                <div key={status} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: STATUS_HEX[status] }}
                  />
                  <span className="text-gray-300 text-xs">
                    {byStatus[status]}
                  </span>
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
}
