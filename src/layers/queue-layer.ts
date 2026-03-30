import { ScatterplotLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import type { QueueProject } from "@/types";

type RGBA = [number, number, number, number];

const QUEUE_COLORS: Record<string, RGBA> = {
  solar: [250, 204, 21, 140],
  wind: [56, 189, 248, 140],
  battery: [168, 85, 247, 140],
  gas: [251, 146, 60, 140],
  nuclear: [239, 68, 68, 140],
  load: [96, 165, 250, 180],
  other: [148, 163, 184, 120],
};

function getColor(p: QueueProject): RGBA {
  return QUEUE_COLORS[p.fuel_type] || QUEUE_COLORS.other;
}

export function createQueueLayer(
  data: QueueProject[],
  visible: boolean,
  onHover?: (info: PickingInfo) => void,
  onClick?: (info: PickingInfo) => void,
) {
  return new ScatterplotLayer<QueueProject>({
    id: "interconnection-queue",
    data,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.max(2000, Math.sqrt(d.capacity_mw) * 200),
    getFillColor: [0, 0, 0, 0], // transparent fill
    getLineColor: (d) => getColor(d),
    getLineWidth: 2,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1,
    lineWidthMaxPixels: 3,
    radiusMinPixels: 3,
    radiusMaxPixels: 15,
    pickable: true,
    onHover,
    onClick,
  });
}
