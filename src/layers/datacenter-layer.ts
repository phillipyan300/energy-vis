import { ScatterplotLayer } from "@deck.gl/layers";
import type { AIDatacenter } from "@/types";
import type { PickingInfo } from "@deck.gl/core";
import { STATUS_COLORS } from "@/lib/colors";

export function createDatacenterLayer(
  data: AIDatacenter[],
  visible: boolean,
  onHover: (info: PickingInfo) => void,
  onClick: (info: PickingInfo) => void
) {
  return new ScatterplotLayer<AIDatacenter>({
    id: "datacenters",
    data,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.max(Math.sqrt(d.power_mw) * 120, 3000),
    getFillColor: (d) => STATUS_COLORS[d.status] || [255, 255, 255, 200],
    getLineColor: [255, 255, 255, 100],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    opacity: 0.9,
    radiusMinPixels: 5,
    radiusMaxPixels: 50,
    onHover,
    onClick,
  });
}

export function createDatacenterPulseLayer(
  data: AIDatacenter[],
  visible: boolean
) {
  return new ScatterplotLayer<AIDatacenter>({
    id: "datacenters-pulse",
    data: data.filter((d) => d.status === "operational"),
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.max(Math.sqrt(d.power_mw) * 160, 5000),
    getFillColor: (d) => {
      const c = STATUS_COLORS[d.status];
      return [c[0], c[1], c[2], 30] as [number, number, number, number];
    },
    pickable: false,
    opacity: 0.5,
    radiusMinPixels: 8,
    radiusMaxPixels: 70,
  });
}
