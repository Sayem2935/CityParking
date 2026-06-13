import { apiClient } from "./api";
import type {
  ParkingSlot,
  ParkingAvailability,
  ParkingScanResult,
  ParkingAssignment,
  ParkingStatistics,
  ZoneAvailability,
} from "@/types/parking.types";

/* ── Helpers to unwrap axios + ApiResponse envelope ── */
function unwrap<T>(axiosResponse: { data: unknown }): T {
  const payload = axiosResponse.data as Record<string, unknown>;
  return ((payload?.data ?? payload) as T);
}

/** Normalize backend AvailabilityResponse → ParkingAvailability */
function normalizeAvailability(raw: Record<string, unknown>): ParkingAvailability {
  // Backend field "zones" → frontend expected "zoneBreakdown"
  const rawZones = (raw.zones ?? raw.zoneBreakdown ?? {}) as Record<string, Record<string, unknown>>;
  const zoneBreakdown: Record<string, ZoneAvailability> = {};

  for (const [key, z] of Object.entries(rawZones ?? {})) {
    zoneBreakdown[key] = {
      zone: String(z.zone ?? key),
      total: Number(z.totalSlots ?? z.total ?? 0),
      free: Number(z.freeSlots ?? z.free ?? 0),
      occupied: Number(z.occupiedSlots ?? z.occupied ?? 0),
      reserved: Number(z.reservedSlots ?? z.reserved ?? 0),
    };
  }

  return {
    totalSlots: Number(raw.totalSlots ?? 0),
    freeSlots: Number(raw.freeSlots ?? 0),
    occupiedSlots: Number(raw.occupiedSlots ?? 0),
    reservedSlots: Number(raw.reservedSlots ?? 0),
    maintenanceSlots: Number(raw.maintenanceSlots ?? 0),
    utilizationPercent: Number(raw.utilizationPercent ?? 0),
    zoneBreakdown,
  };
}

/** Normalize backend ParkingStatisticsResponse → ParkingStatistics */
function normalizeStatistics(raw: Record<string, unknown>): ParkingStatistics {
  // Backend "zoneStats" is a List<ZoneStats>, convert to Record<string, ZoneAvailability>
  const rawZoneStats = (raw.zoneStats ?? raw.zoneBreakdown ?? []) as Array<Record<string, unknown>> | Record<string, Record<string, unknown>>;
  const zoneBreakdown: Record<string, ZoneAvailability> = {};

  if (Array.isArray(rawZoneStats)) {
    for (const z of rawZoneStats) {
      const key = (z.zone as string) ?? "unknown";
      zoneBreakdown[key] = {
        zone: key,
        total: Number(z.totalSlots ?? z.total ?? 0),
        free: Number(z.freeSlots ?? z.free ?? 0),
        occupied: Number(z.occupiedSlots ?? z.occupied ?? 0),
        reserved: Number(z.reservedSlots ?? z.reserved ?? 0),
      };
    }
  } else if (rawZoneStats && typeof rawZoneStats === "object") {
    for (const [key, z] of Object.entries(rawZoneStats)) {
      zoneBreakdown[key] = {
        zone: String(z.zone ?? key),
        total: Number(z.totalSlots ?? z.total ?? 0),
        free: Number(z.freeSlots ?? z.free ?? 0),
        occupied: Number(z.occupiedSlots ?? z.occupied ?? 0),
        reserved: Number(z.reservedSlots ?? z.reserved ?? 0),
      };
    }
  }

  // Backend "hourlyDistribution" Map<String,Long> → OccupancyTrend[]
  const hourlyDist = raw.hourlyDistribution as Record<string, number> | undefined;
  const occupancyTrend = hourlyDist
    ? Object.entries(hourlyDist).map(([hour, pct]) => ({ hour, occupancyPercent: Number(pct) }))
    : [];

  return {
    totalSlots: Number(raw.totalSlots ?? 0),
    freeSlots: Number(raw.currentFree ?? raw.freeSlots ?? 0),
    occupiedSlots: Number(raw.currentOccupied ?? raw.occupiedSlots ?? 0),
    reservedSlots: Number(raw.reservedSlots ?? 0),
    maintenanceSlots: Number(raw.maintenanceSlots ?? 0),
    utilizationPercent: Number(raw.currentUtilization ?? raw.utilizationPercent ?? 0),
    activeAssignments: Number(raw.activeAssignments ?? raw.totalAssignmentsToday ?? 0),
    totalScansToday: Number(raw.totalScansToday ?? 0),
    averageOccupancyToday: Number(raw.averageOccupancyToday ?? 0),
    peakHourOccupancy: Number(raw.peakHourOccupancy ?? raw.peakOccupancyToday ?? 0),
    peakHour: (raw.peakHour as string) ?? "",
    zoneBreakdown,
    dailyStats: (raw.dailyStats as ParkingStatistics["dailyStats"]) ?? [],
    occupancyTrend,
  };
}

export const parkingService = {
  /** GET /api/parking/slots */
  async getAllSlots(): Promise<ParkingSlot[]> {
    const result = unwrap<ParkingSlot[]>(await apiClient.get("/parking/slots"));
    return Array.isArray(result) ? result : [];
  },

  /** GET /api/parking/availability */
  async getAvailability(): Promise<ParkingAvailability> {
    const raw = unwrap<Record<string, unknown>>(await apiClient.get("/parking/availability"));
    return normalizeAvailability(raw ?? {});
  },

  /** POST /api/parking/scan */
  async triggerScan(): Promise<ParkingScanResult> {
    return unwrap<ParkingScanResult>(await apiClient.post("/parking/scan"));
  },

  /** POST /api/parking/assign */
  async assignSlot(userId: number, vehicleId: number): Promise<ParkingAssignment> {
    return unwrap<ParkingAssignment>(await apiClient.post("/parking/assign", { userId, vehicleId }));
  },

  /** POST /api/parking/release */
  async releaseSlot(assignmentId: number): Promise<void> {
    await apiClient.post("/parking/release", { assignmentId });
  },

  /** GET /api/parking/statistics */
  async getStatistics(): Promise<ParkingStatistics> {
    const raw = unwrap<Record<string, unknown>>(await apiClient.get("/parking/statistics"));
    return normalizeStatistics(raw ?? {});
  },
};
