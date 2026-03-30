"use client";

import type { TooltipInfo } from "@/types";

export default function Tooltip({ info }: { info: TooltipInfo | null }) {
  if (!info) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 px-3 py-2 text-sm rounded-lg shadow-xl"
      style={{
        left: info.x + 12,
        top: info.y + 12,
        background: "rgba(17, 24, 39, 0.95)",
        border: "1px solid rgba(75, 85, 99, 0.5)",
        color: "#f3f4f6",
        maxWidth: 300,
      }}
    >
      <div className="font-semibold">{info.name}</div>
      <div className="text-gray-400 text-xs">{info.detail}</div>
    </div>
  );
}
