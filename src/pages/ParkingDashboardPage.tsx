import React, { useEffect, useState, useCallback } from "react";
import { useParkingStore } from "@/store";
import type { ParkingSlot, ZoneAvailability } from "@/types/parking.types";
import {
  RefreshCw,
  MapPin,
  Car,
  ParkingSquare,
  Zap,
  AlertCircle,
  CheckCircle2,
  Lock,
  Wrench,
} from "lucide-react";

/* ── Zone display names ── */
const ZONE_DISPLAY_NAMES: Record<string, string> = {
  "AB4 Parking": "AB4 Parking Area",
  "Engineering Parking": "Engineering Parking Area",
};

const getDisplayName = (zone: string) => ZONE_DISPLAY_NAMES[zone] ?? zone;

/* ── Status config ── */
const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  FREE: { color: "bg-emerald-500", label: "Available", icon: CheckCircle2 },
  OCCUPIED: { color: "bg-red-500", label: "Occupied", icon: Car },
  RESERVED: { color: "bg-amber-500", label: "Reserved", icon: Lock },
  MAINTENANCE: { color: "bg-zinc-500", label: "Maintenance", icon: Wrench },
};

/* ── Heat Map color ── */
function heatColor(pct: number): string {
  if (pct < 0.25) return "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20";
  if (pct < 0.5) return "from-lime-600/20 to-lime-600/5 border-lime-500/20";
  if (pct < 0.75) return "from-amber-600/20 to-amber-600/5 border-amber-500/20";
  return "from-red-600/20 to-red-600/5 border-red-500/20";
}

function heatDotColor(pct: number): string {
  if (pct < 0.25) return "bg-emerald-400";
  if (pct < 0.5) return "bg-lime-400";
  if (pct < 0.75) return "bg-amber-400";
  return "bg-red-400";
}

/* ── Metric card ── */
const Metric: React.FC<{ label: string; value: string | number; icon: React.ElementType; accent?: string }> = ({
  label,
  value,
  icon: Icon,
  accent = "text-zinc-100",
}) => (
  <div className="card p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 shrink-0">
        <Icon className="w-5 h-5 text-zinc-400" />
      </div>
      <div>
        <p className="text-xs text-zinc-500 font-medium">{label}</p>
        <p className={`text-xl font-bold ${accent}`}>{value}</p>
      </div>
    </div>
  </div>
);

/* ── Main page ── */
const REFRESH_INTERVAL = 15_000;

const ParkingDashboardPage: React.FC = () => {
  const {
    slots,
    availability,
    statistics,
    loading,
    error,
    refreshAll,
  } = useParkingStore();

  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refreshAll(), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefresh, refreshAll]);

  const zones = Array.from(new Set((slots ?? []).map((s) => s.zone))).sort();

  const displaySlots = selectedZone
    ? (slots ?? []).filter((s) => s.zone === selectedZone)
    : (slots ?? []);

  const zoneGroups = selectedZone ? [selectedZone] : zones;

  const handleSlotClick = useCallback(
    (slot: ParkingSlot) => {
      // Slot click currently informational only — entry/exit require userId + vehicleId / assignmentId
      console.log("Slot clicked:", slot.slotCode, slot.status);
    },
    []
  );

  /* ── Loading ── */
  if (loading && (slots ?? []).length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="skeleton h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="text-h1">Parking Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-2">
            Real-time campus parking occupancy
            {autoRefresh && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAutoRefresh((p) => !p)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors min-h-[44px] ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
            aria-label={`Auto-refresh ${autoRefresh ? 'on' : 'off'}`}
          >
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => refreshAll()}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50 min-h-[44px] flex items-center gap-1.5"
            aria-label="Refresh parking data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <Metric label="Total Slots" value={availability?.totalSlots ?? (slots ?? []).length} icon={ParkingSquare} />
        <Metric label="Available" value={availability?.freeSlots ?? 0} icon={CheckCircle2} accent="text-emerald-400" />
        <Metric label="Occupied" value={availability?.occupiedSlots ?? 0} icon={Car} accent="text-red-400" />
        <Metric label="Utilization" value={`${(availability?.utilizationPercent ?? 0).toFixed(1)}%`} icon={Zap} accent="text-amber-400" />
      </div>

      {/* Zone heat map */}
      <section className="card p-5 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <h2 className="text-base font-semibold text-zinc-100 mb-4">Parking Area Heat Map</h2>

        {zones.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No parking zones found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map((zone) => {
              const zoneSlots = (slots ?? []).filter((s) => s.zone === zone);
              const occupied = zoneSlots.filter((s) => s.status === "OCCUPIED" || s.status === "RESERVED").length;
              const pct = zoneSlots.length > 0 ? occupied / zoneSlots.length : 0;
              const free = zoneSlots.filter((s) => s.status === "FREE").length;
              const total = zoneSlots.length;

              return (
                <button
                  key={zone}
                  onClick={() => setSelectedZone((prev) => (prev === zone ? null : zone))}
                  className={`relative rounded-2xl p-5 border transition-all text-left bg-gradient-to-br ${heatColor(pct)} ${
                    selectedZone === zone
                      ? "ring-2 ring-blue-500/50 border-blue-500/30"
                      : "hover:brightness-110"
                  }`}
                  aria-pressed={selectedZone === zone}
                  aria-label={`${getDisplayName(zone)}: ${free} of ${total} available`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${heatDotColor(pct)}`} />
                    <p className="text-sm font-bold text-zinc-100">{getDisplayName(zone)}</p>
                  </div>

                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold text-zinc-100">{free}</span>
                    <span className="text-sm text-zinc-400 mb-1">/ {total} free</span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-black/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/40 transition-all duration-700"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">{(pct * 100).toFixed(0)}% occupied</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Zone breakdown cards (replaces table) */}
      {availability && Object.keys(availability?.zoneBreakdown ?? {}).length > 0 && (
        <section className="card p-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Zone Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(availability?.zoneBreakdown ?? {}).map((z: ZoneAvailability) => (
              <div key={z.zone} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <p className="text-sm font-semibold text-zinc-200 mb-3">{getDisplayName(z.zone)}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-zinc-200">{z.total}</p>
                    <p className="text-[10px] text-zinc-500">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-400">{z.free}</p>
                    <p className="text-[10px] text-zinc-500">Free</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-400">{z.occupied}</p>
                    <p className="text-[10px] text-zinc-500">Occupied</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-amber-400">{z.reserved}</p>
                    <p className="text-[10px] text-zinc-500">Reserved</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Slot grid */}
      <section className="card p-5 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100">
            Slot Map {selectedZone ? `— ${getDisplayName(selectedZone)}` : "(All Areas)"}
          </h2>
          {selectedZone && (
            <button
              onClick={() => setSelectedZone(null)}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Show all
            </button>
          )}
        </div>

        {zoneGroups.map((zone) => {
          const zoneSlots = (displaySlots ?? [])
            .filter((s) => s.zone === zone)
            .sort((a, b) => a.slotCode.localeCompare(b.slotCode));
          if (zoneSlots.length === 0) return null;

          return (
            <div key={zone} className="mb-5 last:mb-0">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-medium">
                {getDisplayName(zone)}
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {zoneSlots.map((slot) => {
                  const config = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.FREE;
                  const SlotIcon = config.icon;
                  const isClickable = slot.status === "FREE" || slot.status === "OCCUPIED";

                  return (
                    <button
                      key={slot.id}
                      onClick={() => isClickable && handleSlotClick(slot)}
                      title={`${slot.slotCode} — ${config.label}${slot.status === "FREE" ? " (click to record entry)" : slot.status === "OCCUPIED" ? " (click to record exit)" : ""}`}
                      className={`relative flex flex-col items-center justify-center rounded-xl p-2 min-h-[52px] min-w-[44px] border transition-all ${
                        slot.status === "FREE"
                          ? "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
                          : slot.status === "OCCUPIED"
                          ? "border-red-500/30 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                          : slot.status === "RESERVED"
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-zinc-700 bg-zinc-800/50"
                      }`}
                      aria-label={`Slot ${slot.slotCode}: ${config.label}`}
                      disabled={!isClickable}
                    >
                      <span className="text-[10px] sm:text-xs font-bold text-zinc-200 leading-tight">
                        {slot.slotCode}
                      </span>
                      <SlotIcon className="w-3 h-3 text-zinc-400 mt-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {(displaySlots ?? []).length === 0 && (
          <div className="text-center py-8">
            <ParkingSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No slots to display</p>
          </div>
        )}
      </section>

      {/* Legend */}
      <section className="card p-5 animate-fade-in" style={{ animationDelay: '250ms' }}>
        <h2 className="text-base font-semibold text-zinc-100 mb-3">Legend</h2>
        <div className="flex flex-wrap gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm ${config.color}`} />
              <span className="text-xs text-zinc-400">{config.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-600 mt-3">
          Click a <strong className="text-emerald-400">green</strong> slot to record entry.{" "}
          Click a <strong className="text-red-400">red</strong> slot to record exit.
        </p>
      </section>

      {/* Statistics */}
      {statistics && (
        <section className="card p-5 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h2 className="text-base font-semibold text-zinc-100 mb-4">Today's Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Active Assignments" value={statistics?.activeAssignments ?? 0} icon={Car} />
            <Metric label="Scans Today" value={statistics?.totalScansToday ?? 0} icon={Zap} />
            <Metric label="Peak Hour" value={statistics?.peakHour || "N/A"} icon={RefreshCw} accent="text-blue-400" />
            <Metric label="Peak Occupancy" value={`${(statistics?.peakHourOccupancy ?? 0).toFixed(1)}%`} icon={MapPin} accent="text-amber-400" />
          </div>
        </section>
      )}
    </div>
  );
};

export default ParkingDashboardPage;