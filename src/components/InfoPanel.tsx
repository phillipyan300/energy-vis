"use client";

import type {
  SelectedFeature,
  AIDatacenter,
  PowerPlant,
  GridConnectionData,
  ISORegionSummary,
} from "@/types";
import { STATUS_HEX, STATUS_LABELS, FUEL_HEX } from "@/lib/colors";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function DatacenterPanel({
  dc,
  nearbyPlants,
  gridConnections,
}: {
  dc: AIDatacenter;
  nearbyPlants: PowerPlant[];
  gridConnections: GridConnectionData | null;
}) {
  // Find this DC's grid connection
  const dcConn = gridConnections?.dc_connections.find(
    (c) => c.dc_id === dc.id,
  );
  const gridNode = dcConn
    ? gridConnections?.nodes.find((n) => n.id === dcConn.node_id)
    : null;

  // Find other plants connected to the same grid node
  const nodeNeighbors = dcConn
    ? (gridConnections?.plant_connections || [])
        .filter((c) => c.node_id === dcConn.node_id)
        .sort((a, b) => (b.capacity_mw || 0) - (a.capacity_mw || 0))
        .slice(0, 8)
    : [];

  // Fallback: haversine-based nearby plants
  const nearby = nearbyPlants
    .map((p) => ({
      ...p,
      distance: haversineDistance(dc.lat, dc.lon, p.lat, p.lon),
    }))
    .filter((p) => p.distance <= 75)
    .sort((a, b) => b.capacity_mw - a.capacity_mw)
    .slice(0, 8);

  const nearbyTotalMW = nearby.reduce((s, p) => s + p.capacity_mw, 0);

  // Resolve plant names for node neighbors
  const neighborDetails = nodeNeighbors.map((conn) => {
    const plant = nearbyPlants.find((p) => p.id === conn.plant_id);
    return {
      ...conn,
      name: plant?.name || "Unknown Plant",
    };
  });

  const nodeTotalMW = nodeNeighbors.reduce(
    (s, c) => s + (c.capacity_mw || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_HEX[dc.status] }}
          />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: STATUS_HEX[dc.status] + "22",
              color: STATUS_HEX[dc.status],
            }}
          >
            {STATUS_LABELS[dc.status]}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mt-2">{dc.name}</h3>
        <p className="text-sm text-gray-400">{dc.operator}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Power Capacity" value={`${dc.power_mw.toLocaleString()} MW`} />
        {dc.gpu_count && (
          <Stat
            label="GPU Count"
            value={dc.gpu_count.toLocaleString()}
          />
        )}
        {dc.gpu_type && <Stat label="GPU Type" value={dc.gpu_type} />}
        {dc.year && <Stat label="Target Year" value={dc.year.toString()} />}
      </div>

      {dc.notes && (
        <p className="text-xs text-gray-400 leading-relaxed">{dc.notes}</p>
      )}

      {dc.source_url && (
        <a
          href={dc.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          Source
        </a>
      )}

      {/* Grid connection info */}
      {gridNode && dcConn && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Grid Interconnection Point
          </h4>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat
              label="Distance"
              value={`${dcConn.distance_mi.toFixed(0)} mi`}
            />
            <Stat
              label="TX Lines"
              value={`${gridNode.degree} lines`}
            />
            <Stat
              label="Voltages"
              value={
                gridNode.voltages.length > 0
                  ? gridNode.voltages.map((v) => `${v} kV`).join(", ")
                  : "N/A"
              }
            />
            {nodeTotalMW > 0 && (
              <Stat
                label="Node Generation"
                value={`${(nodeTotalMW / 1000).toFixed(1)} GW`}
              />
            )}
          </div>
          <p className="text-[10px] text-gray-600 mb-3">
            Estimated interconnection based on high-voltage transmission topology
          </p>
        </div>
      )}

      {/* Plants connected to the same grid node */}
      {neighborDetails.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Connected Generation ({(nodeTotalMW / 1000).toFixed(1)} GW)
          </h4>
          <div className="space-y-1.5">
            {neighborDetails.map((p, i) => (
              <div
                key={p.plant_id || i}
                className="flex items-center gap-2 text-xs text-gray-300"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      FUEL_HEX[p.fuel_type as keyof typeof FUEL_HEX] ||
                      "#666",
                  }}
                />
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-gray-500 flex-shrink-0">
                  {(p.capacity_mw || 0).toLocaleString()} MW
                </span>
                <span className="text-gray-600 flex-shrink-0">
                  {p.distance_mi.toFixed(0)} mi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback: haversine-based nearby if no grid connections */}
      {neighborDetails.length === 0 && nearby.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Nearby Generation (within 75 mi) —{" "}
            {(nearbyTotalMW / 1000).toFixed(1)} GW
          </h4>
          <div className="space-y-1.5">
            {nearby.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs text-gray-300"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor:
                      FUEL_HEX[p.fuel_type as keyof typeof FUEL_HEX] ||
                      "#666",
                  }}
                />
                <span className="truncate flex-1">{p.name}</span>
                <span className="text-gray-500 flex-shrink-0">
                  {p.capacity_mw.toLocaleString()} MW
                </span>
                <span className="text-gray-600 flex-shrink-0">
                  {p.distance.toFixed(0)} mi
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlantPanel({
  plant,
  gridConnections,
}: {
  plant: PowerPlant;
  gridConnections: GridConnectionData | null;
}) {
  const plantConn = gridConnections?.plant_connections.find(
    (c) => c.plant_id === plant.id,
  );
  const gridNode = plantConn
    ? gridConnections?.nodes.find((n) => n.id === plantConn.node_id)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor:
                FUEL_HEX[plant.fuel_type as keyof typeof FUEL_HEX] || "#666",
            }}
          />
          <span className="text-xs font-medium text-gray-400 uppercase">
            {plant.fuel_type}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mt-2">{plant.name}</h3>
        <p className="text-sm text-gray-400">{plant.operator}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Capacity" value={`${plant.capacity_mw.toLocaleString()} MW`} />
        <Stat label="State" value={plant.state} />
      </div>

      {gridNode && plantConn && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Grid Interconnection
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Distance to Node"
              value={`${plantConn.distance_mi.toFixed(0)} mi`}
            />
            <Stat label="TX Lines at Node" value={`${gridNode.degree}`} />
            <Stat
              label="Voltages"
              value={
                gridNode.voltages.length > 0
                  ? gridNode.voltages.map((v) => `${v} kV`).join(", ")
                  : "N/A"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ISORegionPanel({ region }: { region: ISORegionSummary }) {
  const ratio = region.totalGenerationMW > 0
    ? (region.totalDemandMW / region.totalGenerationMW) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: region.color }}
          />
          <span className="text-xs font-medium text-gray-400 uppercase">
            ISO/RTO Region
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mt-2">{region.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="AI DC Demand"
          value={`${(region.totalDemandMW / 1000).toFixed(1)} GW`}
        />
        <Stat
          label="Generation Capacity"
          value={`${(region.totalGenerationMW / 1000).toFixed(0)} GW`}
        />
        <Stat label="Datacenters" value={`${region.dcCount}`} />
        <Stat label="Power Plants" value={region.plantCount.toLocaleString()} />
      </div>

      {/* Demand/Supply ratio bar */}
      {region.totalGenerationMW > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">AI Demand / Generation</span>
            <span className="font-semibold text-white">{ratio.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(ratio, 100)}%`,
                backgroundColor: ratio > 10 ? "#ef4444" : ratio > 5 ? "#f59e0b" : "#22c55e",
              }}
            />
          </div>
        </div>
      )}

      {/* Grid Stress Forecast Chart */}
      <StressForecastChart
        data={region.stressForecast}
        regionName={region.name}
      />

      {/* DC count by status */}
      {region.dcCount > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Datacenters by Status
          </h4>
          <div className="flex gap-3">
            {(["operational", "construction", "planned", "announced"] as const).map(
              (status) =>
                (region.dcByStatus[status] || 0) > 0 && (
                  <div key={status} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_HEX[status] }}
                    />
                    <span className="text-xs text-gray-300">
                      {region.dcByStatus[status]} {STATUS_LABELS[status]}
                    </span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* Top facilities */}
      {region.topFacilities.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Largest AI Facilities
          </h4>
          <div className="space-y-1.5">
            {region.topFacilities.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-gray-300"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: STATUS_HEX[f.type as keyof typeof STATUS_HEX] || "#666",
                  }}
                />
                <span className="truncate flex-1">{f.name}</span>
                <span className="text-gray-500 flex-shrink-0">
                  {f.power_mw.toLocaleString()} MW
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StressForecastChart({
  data,
  regionName,
}: {
  data: ISORegionSummary["stressForecast"];
  regionName: string;
}) {
  if (!data || data.length === 0) return null;

  // Find the max DC demand to set scale (use % of existing generation)
  const existingGen = data[0]?.existingGenGW || 1;
  const maxDcDemand = Math.max(...data.map((d) => d.dcDemandGW));
  if (maxDcDemand === 0) return null;

  // Chart dimensions
  const W = 260;
  const H = 130;
  const PAD = { top: 8, right: 8, bottom: 20, left: 36 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Scale: Y axis shows DC demand as % of existing generation
  const maxPct = Math.max(Math.ceil((maxDcDemand / existingGen) * 100 / 2) * 2, 4);
  const years = data.map((d) => d.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const xScale = (year: number) =>
    PAD.left + ((year - minYear) / (maxYear - minYear)) * plotW;
  const yScale = (pct: number) =>
    PAD.top + plotH - (pct / maxPct) * plotH;

  // DC demand line (as % of generation)
  const dcPoints = data
    .map((d) => {
      const pct = (d.dcDemandGW / existingGen) * 100;
      return `${xScale(d.year)},${yScale(pct)}`;
    })
    .join(" ");

  // DC demand area fill
  const dcArea =
    `M${xScale(minYear)},${yScale(0)} ` +
    data
      .map((d) => {
        const pct = (d.dcDemandGW / existingGen) * 100;
        return `L${xScale(d.year)},${yScale(pct)}`;
      })
      .join(" ") +
    ` L${xScale(maxYear)},${yScale(0)} Z`;

  // Queue generation line (as % of existing — shows new capacity coming online)
  const queuePoints = data
    .map((d) => {
      const pct = (d.queueGenGW / existingGen) * 100;
      return `${xScale(d.year)},${yScale(pct)}`;
    })
    .join(" ");

  // Y-axis ticks
  const yTicks: number[] = [];
  for (let i = 0; i <= maxPct; i += Math.max(1, Math.round(maxPct / 4))) {
    yTicks.push(i);
  }

  // X-axis ticks (every 5 years)
  const xTicks = years.filter((y) => y % 5 === 0);

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
        Grid Stress Forecast
      </h4>
      <div className="bg-gray-900/50 rounded-lg p-2">
        <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
          {/* Grid lines */}
          {yTicks.map((pct) => (
            <g key={pct}>
              <line
                x1={PAD.left}
                y1={yScale(pct)}
                x2={W - PAD.right}
                y2={yScale(pct)}
                stroke="#374151"
                strokeWidth={0.5}
                strokeDasharray={pct === 0 ? undefined : "2,2"}
              />
              <text
                x={PAD.left - 4}
                y={yScale(pct) + 3}
                textAnchor="end"
                fill="#6b7280"
                fontSize={8}
              >
                {pct}%
              </text>
            </g>
          ))}
          {/* X-axis ticks */}
          {xTicks.map((year) => (
            <text
              key={year}
              x={xScale(year)}
              y={H - 4}
              textAnchor="middle"
              fill="#6b7280"
              fontSize={8}
            >
              {year}
            </text>
          ))}

          {/* Queue generation area (green, behind) */}
          <polyline
            points={queuePoints}
            fill="none"
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="3,2"
            opacity={0.6}
          />

          {/* DC demand area fill */}
          <path d={dcArea} fill="#ef4444" opacity={0.15} />
          {/* DC demand line */}
          <polyline
            points={dcPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
          />
        </svg>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-1.5 px-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500 rounded" />
            <span className="text-[9px] text-gray-400">AI DC Demand (% of gen)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500 rounded opacity-60" style={{ borderTop: "1px dashed" }} />
            <span className="text-[9px] text-gray-400">New Queue Gen</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-200">{value}</div>
    </div>
  );
}

export default function InfoPanel({
  selected,
  onClose,
  powerPlants,
  gridConnections,
}: {
  selected: SelectedFeature;
  onClose: () => void;
  powerPlants: PowerPlant[];
  gridConnections: GridConnectionData | null;
}) {
  if (!selected) return null;

  return (
    <div className="panel absolute top-4 right-4 z-10 w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <div className="p-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {selected.type === "datacenter" ? (
          <DatacenterPanel
            dc={selected.data}
            nearbyPlants={powerPlants}
            gridConnections={gridConnections}
          />
        ) : selected.type === "powerPlant" ? (
          <PlantPanel
            plant={selected.data}
            gridConnections={gridConnections}
          />
        ) : (
          <ISORegionPanel region={selected.data} />
        )}
      </div>
    </div>
  );
}
