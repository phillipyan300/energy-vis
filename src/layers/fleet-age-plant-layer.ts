import { ScatterplotLayer } from "@deck.gl/layers";
import type { PowerPlant, FuelTypeFilters } from "@/types";
import type { PickingInfo } from "@deck.gl/core";
import { ageToRgba } from "@/lib/age-color";

const MIN_AGE = 0;
const MAX_AGE = 55;

export function createFleetAgePlantLayer(
  data: PowerPlant[],
  visible: boolean,
  filters: FuelTypeFilters,
  refYear: number,
  onHover: (info: PickingInfo) => void,
  onClick: (info: PickingInfo) => void,
) {
  const filteredData = data.filter((d) => {
    if (!filters[d.fuel_type as keyof FuelTypeFilters]) return false;
    return d.operating_year != null;
  });

  return new ScatterplotLayer<PowerPlant>({
    id: "fleet-age-plants",
    data: filteredData,
    visible,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.sqrt(d.capacity_mw) * 40,
    getFillColor: (d) => {
      const oy = d.operating_year;
      if (oy == null) return [100, 100, 100, 80];
      const age = refYear - oy;
      return ageToRgba(age, 200, MIN_AGE, MAX_AGE);
    },
    pickable: true,
    opacity: 0.75,
    radiusMinPixels: 1.5,
    radiusMaxPixels: 22,
    onHover,
    onClick,
    updateTriggers: {
      getFillColor: [refYear],
    },
  });
}
