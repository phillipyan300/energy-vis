import { ScatterplotLayer } from "@deck.gl/layers";
import type { PowerPlant, FuelTypeFilters } from "@/types";
import type { PickingInfo } from "@deck.gl/core";
import { FUEL_COLORS } from "@/lib/colors";

export function createPowerPlantLayer(
  data: PowerPlant[],
  visible: boolean,
  filters: FuelTypeFilters,
  onHover: (info: PickingInfo) => void,
  onClick: (info: PickingInfo) => void
) {
  const filteredData = data.filter(
    (d) => filters[d.fuel_type as keyof FuelTypeFilters]
  );

  return new ScatterplotLayer<PowerPlant>({
    id: "power-plants",
    data: filteredData,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.sqrt(d.capacity_mw) * 40,
    getFillColor: (d) => FUEL_COLORS[d.fuel_type] || FUEL_COLORS.other,
    pickable: true,
    opacity: 0.7,
    radiusMinPixels: 1.5,
    radiusMaxPixels: 25,
    onHover,
    onClick,
  });
}
