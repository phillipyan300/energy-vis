export interface AIDatacenter {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lon: number;
  power_mw: number;
  status: "operational" | "construction" | "planned" | "announced";
  gpu_count: number | null;
  gpu_type: string | null;
  year: number | null;
  source_url: string | null;
  notes: string | null;
}

export interface PowerPlant {
  id: string;
  name: string;
  operator: string;
  lat: number;
  lon: number;
  capacity_mw: number;
  fuel_type: FuelType;
  state: string;
}

export type FuelType =
  | "gas"
  | "nuclear"
  | "wind"
  | "solar"
  | "coal"
  | "hydro"
  | "oil"
  | "other";

export type DatacenterStatus =
  | "operational"
  | "construction"
  | "planned"
  | "announced";

export interface GridNode {
  id: number;
  lon: number;
  lat: number;
  degree: number;
  voltages: number[];
  owners: string[];
}

export interface GridConnection {
  plant_id?: string;
  dc_id?: string;
  node_id: number;
  distance_mi: number;
  capacity_mw?: number;
  power_mw?: number;
  fuel_type?: FuelType;
  status?: DatacenterStatus;
  source_lat: number;
  source_lon: number;
  target_lat: number;
  target_lon: number;
}

export interface GridConnectionData {
  nodes: GridNode[];
  plant_connections: GridConnection[];
  dc_connections: GridConnection[];
}

export interface QueueProject {
  id: string;
  name: string;
  iso: string;
  type: "generation" | "load" | "storage";
  fuel_type: string;
  capacity_mw: number;
  lat: number;
  lon: number;
  status: string;
  queue_date: string;
  estimated_cod: string | null;
  state: string;
}

export interface LayerVisibility {
  datacenters: boolean;
  isoBoundaries: boolean;
  powerPlants: boolean;
  transmissionLines: boolean;
  gridConnections: boolean;
  interconnectionQueue: boolean;
}

export interface FuelTypeFilters {
  gas: boolean;
  nuclear: boolean;
  wind: boolean;
  solar: boolean;
  coal: boolean;
  hydro: boolean;
  oil: boolean;
  other: boolean;
}

export interface ISORegionSummary {
  name: string;
  color: string;
  totalDemandMW: number;
  totalGenerationMW: number;
  dcCount: number;
  dcByStatus: Record<string, number>;
  plantCount: number;
  topFacilities: { name: string; power_mw: number; type: string }[];
  // Grid stress forecast data
  stressForecast: {
    year: number;
    dcDemandGW: number;       // cumulative DC demand by this year
    existingGenGW: number;    // existing generation (constant)
    queueGenGW: number;       // cumulative queue generation by this year
  }[];
}

export type SelectedFeature =
  | { type: "datacenter"; data: AIDatacenter }
  | { type: "powerPlant"; data: PowerPlant }
  | { type: "isoRegion"; data: ISORegionSummary }
  | null;

export interface SearchResult {
  id: string;
  name: string;
  operator: string;
  type: "datacenter" | "powerPlant";
  lat: number;
  lon: number;
  detail: string;
}

export interface TooltipInfo {
  x: number;
  y: number;
  name: string;
  detail: string;
}
