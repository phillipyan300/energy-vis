"use client";

import { useState, useEffect } from "react";
import type { AIDatacenter, PowerPlant, GridConnectionData, QueueProject } from "@/types";
import type { FeatureCollection } from "geojson";

interface MapData {
  datacenters: AIDatacenter[];
  powerPlants: PowerPlant[];
  isoBoundaries: FeatureCollection | null;
  transmissionLines: FeatureCollection | null;
  gridConnections: GridConnectionData | null;
  queueProjects: QueueProject[];
  loading: boolean;
  error: string | null;
}

export function useMapData(): MapData {
  const [data, setData] = useState<MapData>({
    datacenters: [],
    powerPlants: [],
    isoBoundaries: null,
    transmissionLines: null,
    gridConnections: null,
    queueProjects: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const results = await Promise.allSettled([
          fetch("/data/ai-datacenters.json").then((r) => r.json()),
          fetch("/data/power-plants.json").then((r) => r.json()),
          fetch("/data/iso-boundaries.geojson").then((r) => r.json()),
          fetch("/data/transmission-lines.geojson").then((r) => r.json()),
          fetch("/data/grid-connections.json").then((r) => r.json()),
          fetch("/data/interconnection-queue.json").then((r) => r.json()),
        ]);

        const datacentersRaw =
          results[0].status === "fulfilled" ? results[0].value : [];
        const datacenters = datacentersRaw.map(
          (d: Record<string, unknown>, i: number) => ({
            ...d,
            id: d.id || `dc-${i}`,
          })
        );

        const powerPlants =
          results[1].status === "fulfilled" ? results[1].value : [];
        const isoBoundaries =
          results[2].status === "fulfilled" ? results[2].value : null;
        const transmissionLines =
          results[3].status === "fulfilled" ? results[3].value : null;
        const gridConnections =
          results[4].status === "fulfilled" ? results[4].value : null;
        const queueProjects =
          results[5].status === "fulfilled" ? results[5].value : [];

        setData({
          datacenters,
          powerPlants,
          isoBoundaries,
          transmissionLines,
          gridConnections,
          queueProjects,
          loading: false,
          error: null,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load data",
        }));
      }
    }

    loadData();
  }, []);

  return data;
}
