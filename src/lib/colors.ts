import type { FuelType, DatacenterStatus } from "@/types";

type RGBA = [number, number, number, number];

export const FUEL_COLORS: Record<FuelType, RGBA> = {
  gas: [148, 163, 184, 180],
  nuclear: [168, 85, 247, 200],
  wind: [34, 197, 94, 180],
  solar: [250, 204, 21, 180],
  coal: [120, 113, 108, 160],
  hydro: [56, 189, 248, 180],
  oil: [234, 88, 12, 160],
  other: [100, 100, 100, 120],
};

export const FUEL_HEX: Record<FuelType, string> = {
  gas: "#94a3b8",
  nuclear: "#a855f7",
  wind: "#22c55e",
  solar: "#facc15",
  coal: "#78716c",
  hydro: "#38bdf8",
  oil: "#ea580c",
  other: "#646464",
};

export const STATUS_COLORS: Record<DatacenterStatus, RGBA> = {
  operational: [34, 197, 94, 230],
  construction: [250, 204, 21, 230],
  planned: [96, 165, 250, 230],
  announced: [168, 85, 247, 210],
};

export const STATUS_HEX: Record<DatacenterStatus, string> = {
  operational: "#22c55e",
  construction: "#facc15",
  planned: "#60a5fa",
  announced: "#a855f7",
};

export const STATUS_LABELS: Record<DatacenterStatus, string> = {
  operational: "Operational",
  construction: "Under Construction",
  planned: "Planned",
  announced: "Announced",
};

export const ISO_COLORS: Record<string, RGBA> = {
  // ISO/RTO markets
  PJM: [59, 130, 246, 40],
  ERCOT: [239, 68, 68, 40],
  CAISO: [234, 179, 8, 40],
  MISO: [34, 197, 94, 40],
  SPP: [168, 85, 247, 40],
  NYISO: [236, 72, 153, 40],
  "ISO-NE": [20, 184, 166, 40],
  // Non-ISO balancing authorities
  TVA: [245, 158, 11, 35],
  SOCO: [220, 38, 38, 35],
  "Duke Carolinas": [6, 182, 212, 35],
  FRCC: [249, 115, 22, 35],
  BPA: [16, 185, 129, 35],
  "NV Energy": [217, 70, 239, 35],
  APS: [251, 146, 60, 35],
  "PSCo/Xcel": [56, 189, 248, 35],
  FPL: [249, 115, 22, 35],
  "Duke Florida": [251, 146, 60, 35],
};

export const ISO_BORDER_COLORS: Record<string, RGBA> = {
  PJM: [59, 130, 246, 120],
  ERCOT: [239, 68, 68, 120],
  CAISO: [234, 179, 8, 120],
  MISO: [34, 197, 94, 120],
  SPP: [168, 85, 247, 120],
  NYISO: [236, 72, 153, 120],
  "ISO-NE": [20, 184, 166, 120],
  TVA: [245, 158, 11, 100],
  SOCO: [220, 38, 38, 100],
  "Duke Carolinas": [6, 182, 212, 100],
  FRCC: [249, 115, 22, 100],
  BPA: [16, 185, 129, 100],
  "NV Energy": [217, 70, 239, 100],
  APS: [251, 146, 60, 100],
  "PSCo/Xcel": [56, 189, 248, 100],
  FPL: [249, 115, 22, 100],
  "Duke Florida": [251, 146, 60, 100],
};
