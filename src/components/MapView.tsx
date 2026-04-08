"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Map, useControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import type { PickingInfo, Layer } from "@deck.gl/core";
import type { LayersList } from "@deck.gl/core";
import { MAP_STYLE, INITIAL_VIEW_STATE } from "@/lib/constants";
import { assignRegions } from "@/lib/geo-utils";
import { useMapData } from "@/hooks/useMapData";
import { useLayerVisibility } from "@/hooks/useLayerVisibility";
import { useTimeline } from "@/hooks/useTimeline";
import {
  createDatacenterLayer,
  createDatacenterPulseLayer,
} from "@/layers/datacenter-layer";
import { createPowerPlantLayer } from "@/layers/power-plant-layer";
import { createIsoBoundaryLayer } from "@/layers/iso-boundary-layer";
import { createTransmissionLayer } from "@/layers/transmission-layer";
import { createGridConnectionLayers } from "@/layers/grid-connection-layer";
import { createConnectionHighlightLayers } from "@/layers/connection-highlight-layer";
import { createQueueLayer } from "@/layers/queue-layer";
import LayerControls from "./LayerControls";
import InfoPanel from "./InfoPanel";
import StatsBar from "./StatsBar";
import Legend from "./Legend";
import Tooltip from "./Tooltip";
import TimelineSlider from "./TimelineSlider";
import SearchBar from "./SearchBar";
import NarrativeTour from "./NarrativeTour";
import type { SelectedFeature, TooltipInfo, SearchResult, ISORegionSummary } from "@/types";

function DeckGLOverlay(props: { layers: LayersList }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true }),
  );
  overlay.setProps(props);
  return null;
}

export default function MapView() {
  const mapRef = useRef<MapRef>(null);
  const {
    datacenters,
    powerPlants,
    isoBoundaries,
    transmissionLines,
    gridConnections,
    queueProjects,
    loading,
  } = useMapData();
  const { visibility, setVisibility, fuelFilters, setFuelFilters, toggleLayer, toggleFuelFilter } =
    useLayerVisibility();
  const [selected, setSelected] = useState<SelectedFeature>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom);
  const [tourActive, setTourActive] = useState(true);

  // Timeline: compute year range from data + queue CODs
  const { minYear, maxYear } = useMemo(() => {
    const dcYears = datacenters
      .map((d) => d.year)
      .filter((y): y is number => y != null && y > 2000);
    const queueYears = queueProjects
      .map((q) => q.estimated_cod ? parseInt(q.estimated_cod.substring(0, 4)) : null)
      .filter((y): y is number => y != null && y > 2000 && y <= 2035);
    const allYears = [...dcYears, ...queueYears];
    if (allYears.length === 0) return { minYear: 2020, maxYear: 2035 };
    return { minYear: Math.min(...allYears), maxYear: Math.max(Math.max(...allYears), 2035) };
  }, [datacenters, queueProjects]);

  const timeline = useTimeline(minYear, maxYear);

  const filteredDatacenters = useMemo(
    () =>
      datacenters.filter(
        (d) => (d.year ?? 9999) <= timeline.currentYear,
      ),
    [datacenters, timeline.currentYear],
  );

  const filteredQueueProjects = useMemo(
    () =>
      queueProjects.filter((q) => {
        if (!q.estimated_cod) return false;
        const codYear = parseInt(q.estimated_cod.substring(0, 4));
        return codYear <= timeline.currentYear;
      }),
    [queueProjects, timeline.currentYear],
  );

  const filteredDcConnections = useMemo(() => {
    if (!gridConnections) return [];
    const dcIds = new Set(filteredDatacenters.map((d) => d.id));
    return gridConnections.dc_connections.filter(
      (c) => c.dc_id && dcIds.has(c.dc_id),
    );
  }, [gridConnections, filteredDatacenters]);

  // Search: build searchable items from DCs and large plants
  const searchItems = useMemo<SearchResult[]>(() => {
    const dcItems: SearchResult[] = datacenters.map((d) => ({
      id: d.id,
      name: d.name,
      operator: d.operator,
      type: "datacenter" as const,
      lat: d.lat,
      lon: d.lon,
      detail: `${d.power_mw.toLocaleString()} MW · ${d.status}`,
    }));
    const plantItems: SearchResult[] = powerPlants
      .filter((p) => p.capacity_mw >= 100)
      .map((p) => ({
        id: p.id,
        name: p.name,
        operator: p.operator,
        type: "powerPlant" as const,
        lat: p.lat,
        lon: p.lon,
        detail: `${p.capacity_mw.toLocaleString()} MW · ${p.fuel_type}`,
      }));
    return [...dcItems, ...plantItems];
  }, [datacenters, powerPlants]);

  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      mapRef.current?.flyTo({
        center: [result.lon, result.lat],
        zoom: 10,
        duration: 2000,
      });
      if (result.type === "datacenter") {
        const dc = datacenters.find((d) => d.id === result.id);
        if (dc) setSelected({ type: "datacenter", data: dc });
      } else {
        const plant = powerPlants.find((p) => p.id === result.id);
        if (plant) setSelected({ type: "powerPlant", data: plant });
      }
    },
    [datacenters, powerPlants],
  );

  // Region assignments for ISO summary cards
  const dcRegions = useMemo(
    () => assignRegions(datacenters, isoBoundaries),
    [datacenters, isoBoundaries],
  );
  const plantRegions = useMemo(
    () => assignRegions(powerPlants, isoBoundaries),
    [powerPlants, isoBoundaries],
  );

  const handleISOClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) return;
      const props = (info.object as { properties?: Record<string, unknown> }).properties;
      const regionName = props?.name as string;
      const regionColor = (props?.color as string) || "#666";
      if (!regionName) return;

      const regionDCs = datacenters.filter((d) => dcRegions.get(d.id) === regionName);
      const regionPlants = powerPlants.filter((p) => plantRegions.get(p.id) === regionName);

      const dcByStatus: Record<string, number> = {};
      for (const dc of regionDCs) {
        dcByStatus[dc.status] = (dcByStatus[dc.status] || 0) + 1;
      }

      // Compute grid stress forecast
      const existingGenGW = regionPlants.reduce((s, p) => s + p.capacity_mw, 0) / 1000;
      const regionQueue = queueProjects.filter((q) => q.iso === regionName);
      const years = Array.from({ length: 16 }, (_, i) => 2020 + i); // 2020-2035

      const stressForecast = years.map((year) => {
        const dcDemandGW = regionDCs
          .filter((d) => (d.year ?? 9999) <= year)
          .reduce((s, d) => s + d.power_mw, 0) / 1000;
        const queueGenGW = regionQueue
          .filter((q) => {
            if (!q.estimated_cod || q.type === "load") return false;
            return parseInt(q.estimated_cod.substring(0, 4)) <= year;
          })
          .reduce((s, q) => s + q.capacity_mw, 0) / 1000;
        return { year, dcDemandGW, existingGenGW, queueGenGW };
      });

      const summary: ISORegionSummary = {
        name: regionName,
        color: regionColor,
        totalDemandMW: regionDCs.reduce((s, d) => s + d.power_mw, 0),
        totalGenerationMW: regionPlants.reduce((s, p) => s + p.capacity_mw, 0),
        dcCount: regionDCs.length,
        dcByStatus,
        plantCount: regionPlants.length,
        topFacilities: regionDCs
          .sort((a, b) => b.power_mw - a.power_mw)
          .slice(0, 5)
          .map((d) => ({ name: d.name, power_mw: d.power_mw, type: d.status })),
        stressForecast,
      };
      setSelected({ type: "isoRegion", data: summary });
    },
    [datacenters, powerPlants, queueProjects, dcRegions, plantRegions],
  );

  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      const obj = info.object as Record<string, unknown>;

      // Grid node hover
      if (obj.degree !== undefined && obj.voltages !== undefined) {
        const node = obj as unknown as import("@/types").GridNode;
        const voltages = node.voltages.length > 0
          ? node.voltages.map((v) => `${v}kV`).join("/")
          : "Unknown kV";
        const owner = node.owners?.[0] || "Unknown";
        setTooltip({
          x: info.x, y: info.y,
          name: `Grid Node · ${voltages}`,
          detail: `${node.degree} TX lines · ${owner}`,
        });
        return;
      }

      // ISO region hover
      const props = (obj as { properties?: Record<string, unknown> }).properties;
      if (props?.name && !obj.power_mw && !obj.capacity_mw) {
        setTooltip({
          x: info.x, y: info.y,
          name: props.name as string,
          detail: "ISO/RTO Region — click for details",
        });
        return;
      }

      const name =
        (obj.name as string) ||
        (obj.operator as string) ||
        "Unknown";
      let detail = "";
      if (obj.power_mw) {
        detail = `${(obj.power_mw as number).toLocaleString()} MW — ${obj.status || obj.operator}`;
      } else if (obj.capacity_mw) {
        detail = `${(obj.capacity_mw as number).toLocaleString()} MW ${obj.fuel_type}`;
      }
      setTooltip({
        x: info.x,
        y: info.y,
        name,
        detail,
      });
    } else {
      setTooltip(null);
    }
  }, []);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (!info.object) {
        setSelected(null);
        return;
      }
      const obj = info.object as Record<string, unknown>;
      if (obj.power_mw !== undefined && obj.status !== undefined) {
        setSelected({
          type: "datacenter",
          data: obj as unknown as import("@/types").AIDatacenter,
        });
      } else if (obj.capacity_mw !== undefined) {
        setSelected({
          type: "powerPlant",
          data: obj as unknown as import("@/types").PowerPlant,
        });
      }
    },
    []
  );

  const selectedId = selected && selected.type !== "isoRegion"
    ? selected.data.id
    : null;

  const layers = useMemo(() => {
    const l: (Layer | null)[] = [];

    const isoLayers = createIsoBoundaryLayer(
      isoBoundaries,
      visibility.isoBoundaries,
      handleHover,
      handleISOClick,
    );
    l.push(...isoLayers);

    const txLayer = createTransmissionLayer(
      transmissionLines,
      visibility.transmissionLines
    );
    if (txLayer) l.push(txLayer);

    // Grid connection layers (lines + nodes)
    if (gridConnections) {
      const connLayers = createGridConnectionLayers(
        gridConnections.nodes,
        gridConnections.plant_connections,
        filteredDcConnections,
        visibility.gridConnections,
        zoom,
      );
      l.push(...connLayers);

      // Highlight layers for selected feature (not ISO regions, only when visible)
      if (selected && selected.type !== "isoRegion" && visibility.gridConnections) {
        const highlightLayers = createConnectionHighlightLayers(
          selectedId,
          selected.type,
          gridConnections.nodes,
          gridConnections.plant_connections,
          gridConnections.dc_connections,
        );
        l.push(...highlightLayers);
      }
    }

    l.push(
      createPowerPlantLayer(
        powerPlants,
        visibility.powerPlants,
        fuelFilters,
        handleHover,
        handleClick
      )
    );

    // Interconnection queue (hollow circles, filtered by timeline)
    l.push(
      createQueueLayer(
        filteredQueueProjects,
        visibility.interconnectionQueue,
        handleHover,
        handleClick,
      ),
    );

    l.push(createDatacenterPulseLayer(filteredDatacenters, visibility.datacenters));
    l.push(
      createDatacenterLayer(
        filteredDatacenters,
        visibility.datacenters,
        handleHover,
        handleClick
      )
    );

    return l.filter(Boolean) as Layer[];
  }, [
    filteredDatacenters,
    filteredDcConnections,
    powerPlants,
    isoBoundaries,
    transmissionLines,
    gridConnections,
    filteredQueueProjects,
    visibility,
    fuelFilters,
    zoom,
    selected,
    selectedId,
    handleHover,
    handleClick,
    handleISOClick,
  ]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading grid data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        onMove={(evt) => setZoom(evt.viewState.zoom)}
      >
        <DeckGLOverlay layers={layers} />
      </Map>

      <NarrativeTour
        mapRef={mapRef}
        setVisibility={setVisibility}
        setFuelFilters={setFuelFilters}
        setYear={timeline.setYear}
        onActiveChange={setTourActive}
      />

      {/* Always visible: tooltip + info panel (for hover/click during tour) */}
      <Tooltip info={tooltip} />
      <InfoPanel
        selected={selected}
        onClose={() => setSelected(null)}
        powerPlants={powerPlants}
        gridConnections={gridConnections}
      />

      {/* Hide controls during narrative tour */}
      <div
        className="transition-opacity duration-500"
        style={{ opacity: tourActive ? 0 : 1, pointerEvents: tourActive ? "none" : "auto" }}
      >
        <StatsBar datacenters={filteredDatacenters} />
        <SearchBar items={searchItems} onSelect={handleSearchSelect} />

        <LayerControls
          visibility={visibility}
          fuelFilters={fuelFilters}
          toggleLayer={toggleLayer}
          toggleFuelFilter={toggleFuelFilter}
          datacenterCount={filteredDatacenters.length}
          powerPlantCount={powerPlants.length}
          hasTransmission={transmissionLines !== null}
          hasGridConnections={gridConnections !== null}
          queueCount={filteredQueueProjects.length}
        />

        <Legend
          showPlants={visibility.powerPlants}
          showConnections={visibility.gridConnections}
        />

        <TimelineSlider
          currentYear={timeline.currentYear}
          isPlaying={timeline.isPlaying}
          minYear={timeline.minYear}
          maxYear={timeline.maxYear}
          setYear={timeline.setYear}
          togglePlay={timeline.togglePlay}
          cumulativeMW={filteredDatacenters.reduce((s, d) => s + d.power_mw, 0)}
          facilityCount={filteredDatacenters.length}
        />
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-xs text-gray-600">
        AI Power Map
      </div>
    </div>
  );
}
