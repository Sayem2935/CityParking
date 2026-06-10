import { useEffect, useState } from "react";
import { useParkingStore } from "@/store/parkingStore";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

const statusColorMap: Record<string, string> = {
  FREE: "bg-green-500",
  OCCUPIED: "bg-red-500",
  RESERVED: "bg-yellow-500",
  MAINTENANCE: "bg-gray-400",
};


export default function ParkingDashboardPage() {
  const {
    availability,
    statistics,
    slots,
    lastScanResult,
    loading,
    scanLoading,
    error,
    fetchAvailability,
    fetchStatistics,
    fetchSlots,
    triggerScan,
  } = useParkingStore();

  const [activeTab, setActiveTab] = useState<"overview" | "heatmap" | "statistics">("overview");

  useEffect(() => {
    fetchAvailability();
    fetchSlots();
    fetchStatistics();
  }, [fetchAvailability, fetchSlots, fetchStatistics]);

  const handleScan = async () => {
    try {
      await triggerScan();
    } catch {
      // Error handled by store
    }
  };

  if (loading && !availability) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Parking Dashboard</h1>
          <p className="text-zinc-400 mt-1">Real-time parking occupancy monitoring</p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {scanLoading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          {scanLoading ? "Scanning..." : "Scan Parking"}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Slots"
          value={availability?.totalSlots ?? statistics?.totalSlots ?? 0}
          icon="🅿️"
          color="bg-blue-900/30 border-blue-200"
        />
        <MetricCard
          title="Free Slots"
          value={availability?.freeSlots ?? statistics?.freeSlots ?? 0}
          icon="✅"
          color="bg-green-900/30 border-green-200"
        />
        <MetricCard
          title="Occupied Slots"
          value={availability?.occupiedSlots ?? statistics?.occupiedSlots ?? 0}
          icon="🚗"
          color="bg-red-900/30 border-red-200"
        />
        <MetricCard
          title="Utilization"
          value={`${(availability?.utilizationPercent ?? statistics?.utilizationPercent ?? 0).toFixed(1)}%`}
          icon="📊"
          color="bg-purple-900/30 border-purple-200"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Reserved Slots</div>
          <div className="text-2xl font-bold text-yellow-600">
            {availability?.reservedSlots ?? statistics?.reservedSlots ?? 0}
          </div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Active Assignments</div>
          <div className="text-2xl font-bold text-blue-400">
            {statistics?.activeAssignments ?? 0}
          </div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Scans Today</div>
          <div className="text-2xl font-bold text-indigo-600">
            {statistics?.totalScansToday ?? 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-6">
        <nav className="flex gap-6">
          {(["overview", "heatmap", "statistics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/20"
              }`}
            >
              {tab === "overview" ? "Zone Overview" : tab === "heatmap" ? "Parking Heat Map" : "Occupancy Trends"}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <ZoneOverview availability={availability} />
      )}

      {activeTab === "heatmap" && (
        <ParkingHeatMap slots={slots} />
      )}

      {activeTab === "statistics" && (
        <OccupancyTrends statistics={statistics} />
      )}

      {/* Last Scan Result */}
      {lastScanResult && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-100 mb-4">Last Scan Result</h3>
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-sm text-zinc-500">Total</span>
                <div className="text-xl font-bold">{lastScanResult.totalSlots}</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Occupied</span>
                <div className="text-xl font-bold text-red-400">{lastScanResult.occupiedSlots}</div>
              </div>
              <div>
                <span className="text-sm text-zinc-500">Free</span>
                <div className="text-xl font-bold text-green-400">{lastScanResult.freeSlots}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Scanned at {new Date(lastScanResult.scannedAt).toLocaleString()} · {lastScanResult.processingTimeMs}ms
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div className={`${color} border rounded-xl p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-zinc-100">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

/* ── Zone Overview ── */
function ZoneOverview({ availability }: { availability: import("@/types/parking.types").ParkingAvailability | null }) {
  if (!availability?.zoneBreakdown || Object.keys(availability.zoneBreakdown).length === 0) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-8 text-center text-zinc-500">
        No zone data available. Run a parking scan to populate zone information.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(availability.zoneBreakdown).map(([zone, data]) => {
        const occupancyPct = (data as import("@/types/parking.types").ZoneAvailability).total > 0
          ? ((data as import("@/types/parking.types").ZoneAvailability).occupied / (data as import("@/types/parking.types").ZoneAvailability).total) * 100
          : 0;
        return (
          <div key={zone} className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-zinc-100">Zone {zone}</h4>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  occupancyPct > 80
                    ? "bg-red-100 text-red-700"
                    : occupancyPct > 50
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                }`}
              >
                {occupancyPct.toFixed(0)}% full
              </span>
            </div>
            <div className="w-full bg-zinc-700 rounded-full h-2.5 mb-4">
              <div
                className={`h-2.5 rounded-full transition-all ${
                  occupancyPct > 80 ? "bg-red-500" : occupancyPct > 50 ? "bg-yellow-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(occupancyPct, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">{(data as import("@/types/parking.types").ZoneAvailability).free}</div>
                <div className="text-xs text-zinc-500">Free</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">{(data as import("@/types/parking.types").ZoneAvailability).occupied}</div>
                <div className="text-xs text-zinc-500">Occupied</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">{(data as import("@/types/parking.types").ZoneAvailability).reserved}</div>
                <div className="text-xs text-zinc-500">Reserved</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Parking Heat Map ── */
function ParkingHeatMap({ slots }: { slots: import("@/types/parking.types").ParkingSlot[] }) {
  if (slots.length === 0) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-8 text-center text-zinc-500">
        No slot data available. Run a parking scan to populate slot information.
      </div>
    );
  }

  // Group slots by zone
  const grouped: Record<string, import("@/types/parking.types").ParkingSlot[]> = {};
  slots.forEach((slot: import("@/types/parking.types").ParkingSlot) => {
    if (!grouped[slot.zone]) grouped[slot.zone] = [];
    grouped[slot.zone].push(slot);
  });

  return (
    <div className="space-y-8">
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([zone, zoneSlots]) => (
          <div key={zone} className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <h4 className="text-lg font-semibold text-zinc-100 mb-4">Zone {zone} — Floor {zoneSlots[0]?.floorNumber ?? "?"}</h4>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
              {zoneSlots
                .sort((a: import("@/types/parking.types").ParkingSlot, b: import("@/types/parking.types").ParkingSlot) => a.slotCode.localeCompare(b.slotCode))
                .map((slot: import("@/types/parking.types").ParkingSlot) => (
                  <div
                    key={slot.id}
                    title={`${slot.slotCode}: ${slot.status}`}
                    className={`
                      ${statusColorMap[slot.status]} 
                      rounded-md p-2 text-center text-white text-xs font-mono 
                      hover:ring-2 hover:ring-blue-400 transition-all cursor-default
                    `}
                  >
                    {slot.slotCode}
                  </div>
                ))}
            </div>
          </div>
        ))}

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        {Object.entries(statusColorMap).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${color}`} />
            <span className="text-zinc-400 capitalize">{status.toLowerCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Occupancy Trends ── */
function OccupancyTrends({ statistics }: { statistics: import("@/types/parking.types").ParkingStatistics | null }) {
  if (!statistics) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-8 text-center text-zinc-500">
        No statistics data available yet.
      </div>
    );
  }

  const trend = statistics.occupancyTrend ?? [];
  const dailyStats = statistics.dailyStats ?? [];
  const maxTrend = Math.max(...trend.map((t) => t.occupancyPercent), 1);

  return (
    <div className="space-y-8">
      {/* Peak Hour Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Average Occupancy Today</div>
          <div className="text-2xl font-bold text-zinc-100">
            {statistics.averageOccupancyToday?.toFixed(1) ?? 0}%
          </div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Peak Hour</div>
          <div className="text-2xl font-bold text-orange-400">{statistics.peakHour ?? "N/A"}</div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5">
          <div className="text-sm text-zinc-500 mb-1">Peak Hour Occupancy</div>
          <div className="text-2xl font-bold text-red-400">
            {statistics.peakHourOccupancy?.toFixed(1) ?? 0}%
          </div>
        </div>
      </div>

      {/* Hourly Trend Bar Chart */}
      <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h4 className="text-lg font-semibold text-zinc-100 mb-4">Today's Occupancy Trend</h4>
        {trend.length === 0 ? (
          <p className="text-zinc-500 text-center py-4">No trend data yet. Scan the parking lot to generate data.</p>
        ) : (
          <div className="flex items-end gap-1 h-40">
            {trend.map((t: import("@/types/parking.types").OccupancyTrend, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t transition-all ${
                    t.occupancyPercent > 80 ? "bg-red-400" : t.occupancyPercent > 50 ? "bg-yellow-400" : "bg-green-400"
                  }`}
                  style={{ height: `${(t.occupancyPercent / maxTrend) * 100}%`, minHeight: "4px" }}
                  title={`${t.hour}: ${t.occupancyPercent.toFixed(1)}%`}
                />
                <span className="text-[9px] text-gray-400 mt-1 -rotate-45 origin-top-left">{t.hour}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Stats Table */}
      {dailyStats.length > 0 && (
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h4 className="text-lg font-semibold text-zinc-100 mb-4">Daily Statistics</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-zinc-500 font-medium">Date</th>
                  <th className="text-right py-2 px-3 text-zinc-500 font-medium">Assignments</th>
                  <th className="text-right py-2 px-3 text-zinc-500 font-medium">Avg Occupancy</th>
                  <th className="text-right py-2 px-3 text-zinc-500 font-medium">Peak</th>
                  <th className="text-right py-2 px-3 text-zinc-500 font-medium">Peak Hour</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d: import("@/types/parking.types").DailyStatistic, i: number) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-zinc-800/50">
                    <td className="py-2 px-3">{d.date}</td>
                    <td className="py-2 px-3 text-right">{d.totalAssignments}</td>
                    <td className="py-2 px-3 text-right">{d.avgOccupancy?.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{d.peakOccupancy?.toFixed(1)}%</td>
                    <td className="py-2 px-3 text-right">{d.peakHour}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}