"use client";

import { useState, useCallback } from "react";
import type { LayerVisibility, FuelTypeFilters } from "@/types";

const DEFAULT_VISIBILITY: LayerVisibility = {
  datacenters: true,
  isoBoundaries: true,
  powerPlants: false,
  transmissionLines: false,
  gridConnections: true,
  interconnectionQueue: false,
};

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

export function useLayerVisibility() {
  const [visibility, setVisibility] =
    useState<LayerVisibility>(DEFAULT_VISIBILITY);
  const [fuelFilters, setFuelFilters] =
    useState<FuelTypeFilters>(DEFAULT_FUEL_FILTERS);

  const toggleLayer = useCallback((layer: keyof LayerVisibility) => {
    setVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const toggleFuelFilter = useCallback((fuel: keyof FuelTypeFilters) => {
    setFuelFilters((prev) => ({ ...prev, [fuel]: !prev[fuel] }));
  }, []);

  return { visibility, setVisibility, fuelFilters, setFuelFilters, toggleLayer, toggleFuelFilter };
}
