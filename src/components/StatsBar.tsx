"use client";

import type { AIDatacenter } from "@/types";
import { STATUS_HEX, STATUS_LABELS } from "@/lib/colors";

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
    0,
  );

  const byStatus = datacenters.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="panel absolute top-4 left-[272px] z-10 px-4 py-2">
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-baseline gap-1">
          <span className="text-gray-500 uppercase" style={{ fontSize: "8px", letterSpacing: "0.05em" }}>
            Capacity
          </span>
          <span className="font-bold text-white text-sm tabular-nums">
            {(totalMW / 1000).toFixed(1)}
          </span>
          <span className="text-gray-500 text-[10px]">GW</span>
        </div>

        {estimatedDrawMW > 0 && (
          <>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-baseline gap-1">
              <span className="text-gray-500 uppercase" style={{ fontSize: "8px", letterSpacing: "0.05em" }}>
                Draw
              </span>
              <span className="font-bold text-emerald-400 text-sm tabular-nums">
                {(estimatedDrawMW / 1000).toFixed(1)}
              </span>
              <span className="text-gray-500 text-[10px]">GW</span>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-gray-700" />

        <div className="flex items-baseline gap-1">
          <span className="font-bold text-white text-sm tabular-nums">
            {datacenters.length}
          </span>
          <span className="text-gray-500 text-[10px]">sites</span>
        </div>

        {totalGPUs > 0 && (
          <>
            <div className="h-4 w-px bg-gray-700" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white text-sm tabular-nums">
                {(totalGPUs / 1000).toFixed(0)}k
              </span>
              <span className="text-gray-500 text-[10px]">GPUs</span>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-gray-700" />

        <div className="flex items-center gap-1.5">
          {(
            ["operational", "construction", "planned", "announced"] as const
          ).map(
            (status) =>
              byStatus[status] && (
                <div
                  key={status}
                  className="flex items-center gap-0.5"
                  title={STATUS_LABELS[status]}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_HEX[status] }}
                  />
                  <span className="text-gray-400 tabular-nums text-[10px]">
                    {byStatus[status]}
                  </span>
                </div>
              ),
          )}
        </div>
      </div>
    </div>
  );
}
