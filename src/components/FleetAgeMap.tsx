"use client";

import { useCallback, useMemo, useState } from "react";
import { Map, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { Layer, PickingInfo } from "@deck.gl/core";
import type { LayersList } from "@deck.gl/core";
import type { FeatureCollection } from "geojson";
import { MAP_STYLE, INITIAL_VIEW_STATE } from "@/lib/constants";
import type { PowerPlant, FuelTypeFilters } from "@/types";
import {
  computeIsoAgeRollup,
  FLEET_REFERENCE_YEAR,
  isoRollupToAgeMap,
} from "@/lib/fleet-age-stats";
import { createFleetAgePlantLayer } from "@/layers/fleet-age-plant-layer";
import { createIsoAgeChoroplethLayer } from "@/layers/fleet-age-iso-layer";
import {
  fercElibraryGoogleSearchUrl,
  fercPlantSearchQuery,
} from "@/lib/ferc-elibrary";

const DEFAULT_FUEL_FILTERS: FuelTypeFilters = {
  gas: true,
  nuclear: true,
  wind: true,
  solar: true,
  coal: true,
  hydro: true,
  oil: true,
  other: true,
};

const FUEL_KEYS = Object.keys(DEFAULT_FUEL_FILTERS) as (keyof FuelTypeFilters)[];

function DeckGLOverlay(props: { layers: LayersList }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true }),
  );
  overlay.setProps(props);
  return null;
}

function FleetTooltipContent(props: {
  title: string;
  detail: string;
  plant?: PowerPlant;
}) {
  const fercUrl = props.plant
    ? fercElibraryGoogleSearchUrl(fercPlantSearchQuery(props.plant))
    : null;
  return (
    <>
      <div className="font-medium text-gray-100">{props.title}</div>
      <div className="mt-0.5 text-gray-400">{props.detail}</div>
      {fercUrl && (
        <a
          href={fercUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto mt-2 inline-block text-blue-400 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Search FERC eLibrary (Google)
        </a>
      )}
    </>
  );
}

export interface FleetAgeMapProps {
  plants: PowerPlant[];
  isoBoundaries: FeatureCollection | null;
  refYear?: number;
  /** `fullscreen` fills the viewport (map under tour overlay); `card` is the bordered embed. */
  variant?: "card" | "fullscreen";
}

export default function FleetAgeMap({
  plants,
  isoBoundaries,
  refYear = FLEET_REFERENCE_YEAR,
  variant = "card",
}: FleetAgeMapProps) {
  const [fuelFilters, setFuelFilters] =
    useState<FuelTypeFilters>(DEFAULT_FUEL_FILTERS);
  const [showIsoFill, setShowIsoFill] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    detail: string;
    /** When set, show a link to search FERC eLibrary for this plant. */
    plant?: PowerPlant;
  } | null>(null);

  const isoRollup = useMemo(
    () => computeIsoAgeRollup(plants, isoBoundaries, refYear),
    [plants, isoBoundaries, refYear],
  );

  const ageByIsoName = useMemo(
    () => isoRollupToAgeMap(isoRollup),
    [isoRollup],
  );

  const handleHover = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        setTooltip(null);
        return;
      }
      const obj = info.object as Record<string, unknown>;
      const props = obj.properties as Record<string, unknown> | undefined;
      if (props?.name != null && "geometry" in obj) {
        const name = String(props.name);
        const age = ageByIsoName.get(name);
        const gw = isoRollup.find((r) => r.regionId === name)?.capacityGw;
        setTooltip({
          x: info.x,
          y: info.y,
          title: name,
          detail:
            age != null && gw != null
              ? `${gw.toFixed(1)} GW · avg age ${age.toFixed(1)} yr`
              : "No capacity in sample",
        });
        return;
      }
      const cap = obj.capacity_mw as number | undefined;
      const oy = obj.operating_year as number | undefined;
      const name = (obj.name as string) || "Plant";
      if (cap != null) {
        const plant = obj as PowerPlant;
        const agePart =
          oy != null ? `${refYear - oy} yr` : "age n/a";
        setTooltip({
          x: info.x,
          y: info.y,
          title: name,
          detail: `${cap.toLocaleString()} MW · ${agePart} · ${String(obj.fuel_type)}`,
          plant,
        });
        return;
      }
      setTooltip(null);
    },
    [ageByIsoName, isoRollup, refYear],
  );

  const handleClick = useCallback(() => {
    setTooltip(null);
  }, []);

  const layers = useMemo(() => {
    const list: Layer[] = [];
    if (showIsoFill && isoBoundaries) {
      const isoLayer = createIsoAgeChoroplethLayer(
        isoBoundaries,
        true,
        ageByIsoName,
        handleHover,
        handleClick,
      );
      if (isoLayer) list.push(isoLayer);
    }
    list.push(
      createFleetAgePlantLayer(
        plants,
        true,
        fuelFilters,
        refYear,
        handleHover,
        handleClick,
      ),
    );
    return list;
  }, [
    showIsoFill,
    isoBoundaries,
    ageByIsoName,
    plants,
    fuelFilters,
    refYear,
    handleHover,
    handleClick,
  ]);

  const toggleFuel = (fuel: keyof FuelTypeFilters) => {
    setFuelFilters((prev) => ({ ...prev, [fuel]: !prev[fuel] }));
  };

  const toolbar = (
    <div
      className={
        variant === "fullscreen"
          ? "panel pointer-events-auto absolute right-4 top-4 z-[40] flex max-w-[calc(100vw-7rem)] flex-wrap items-center gap-2 px-3 py-2"
          : "flex flex-wrap items-center gap-2 border-b border-gray-800/80 px-3 py-2"
      }
    >
      <span className="text-xs text-gray-500">Fuel:</span>
      {FUEL_KEYS.map((fuel) => (
        <button
          key={fuel}
          type="button"
          onClick={() => toggleFuel(fuel)}
          className={`rounded px-2 py-0.5 text-xs capitalize transition ${
            fuelFilters[fuel]
              ? "bg-gray-700 text-gray-100"
              : "text-gray-600 line-through"
          }`}
        >
          {fuel}
        </button>
      ))}
      <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-gray-400 sm:ml-0">
        <input
          type="checkbox"
          checked={showIsoFill}
          onChange={(e) => setShowIsoFill(e.target.checked)}
          className="rounded border-gray-600"
        />
        ISO fill
      </label>
    </div>
  );

  const legendStrip = (
    <div
      className={
        variant === "fullscreen"
          ? "pointer-events-none absolute bottom-6 right-4 z-[35] max-w-[200px] text-right"
          : "border-t border-gray-800/80 px-3 py-2"
      }
    >
      <div className="mb-1 flex items-center justify-end gap-2 text-[10px] text-gray-500">
        <span>Young</span>
        <div
          className="h-2 flex-1 max-w-[120px] rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #38bdf8, #fbbf24, #fb7185)",
          }}
        />
        <span>Old</span>
      </div>
      <p
        className={
          variant === "fullscreen"
            ? "text-[10px] leading-snug text-gray-500"
            : "text-[11px] leading-snug text-gray-600"
        }
      >
        Size ∝ √MW · color = age ({refYear} − online year)
      </p>
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className="absolute inset-0 z-0 bg-gray-950">
        {toolbar}
        {legendStrip}
        <div className="absolute inset-0">
          <Map
            initialViewState={INITIAL_VIEW_STATE}
            mapStyle={MAP_STYLE}
            style={{ width: "100%", height: "100%" }}
            onMove={() => setTooltip(null)}
          >
            <DeckGLOverlay layers={layers} />
          </Map>
          {tooltip && (
            <div
              className="pointer-events-none absolute z-[50] max-w-xs rounded-md border border-gray-700 bg-gray-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
              style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
            >
              <FleetTooltipContent
                title={tooltip.title}
                detail={tooltip.detail}
                plant={tooltip.plant}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40">
      {toolbar}
      <div className="relative h-[min(70vh,520px)] w-full min-h-[320px]">
        <Map
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          onMove={() => setTooltip(null)}
        >
          <DeckGLOverlay layers={layers} />
        </Map>
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 max-w-xs rounded-md border border-gray-700 bg-gray-950/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <FleetTooltipContent
              title={tooltip.title}
              detail={tooltip.detail}
              plant={tooltip.plant}
            />
          </div>
        )}
      </div>
      <p className="border-t border-gray-800/80 px-3 py-2 text-[11px] leading-snug text-gray-600">
        Point size ∝ √MW. Color = asset age ({refYear} − online year). ISO
        shading = MW-weighted average age of plants assigned to each market
        (point-in-polygon).
      </p>
    </div>
  );
}
