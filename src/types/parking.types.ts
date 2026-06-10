export interface ParkingSlot {
  id: number;
  slotCode: string;
  slotType: string;
  status: "FREE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  floorNumber: number;
  zone: string;
  coordinatesJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingAssignment {
  id: number;
  userId: number;
  vehicleId: number;
  slotCode: string;
  zone: string;
  floor: number;
  distance: number;
  status: string;
  assignedAt: string;
  releasedAt?: string;
}

export interface ParkingAvailability {
  totalSlots: number;
  freeSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  utilizationPercent: number;
  zoneBreakdown: Record<string, ZoneAvailability>;
}

export interface ZoneAvailability {
  zone: string;
  total: number;
  free: number;
  occupied: number;
  reserved: number;
}

export interface ParkingScanResult {
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  detections: SlotDetection[];
  processingTimeMs: number;
  scannedAt: string;
}

export interface SlotDetection {
  slotCode: string;
  occupied: boolean;
  confidence: number;
}

export interface ParkingStatistics {
  totalSlots: number;
  freeSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  maintenanceSlots: number;
  utilizationPercent: number;
  activeAssignments: number;
  totalScansToday: number;
  averageOccupancyToday: number;
  peakHourOccupancy: number;
  peakHour: string;
  zoneBreakdown: Record<string, ZoneAvailability>;
  dailyStats: DailyStatistic[];
  occupancyTrend: OccupancyTrend[];
}

export interface DailyStatistic {
  date: string;
  totalAssignments: number;
  avgOccupancy: number;
  peakOccupancy: number;
  peakHour: string;
}

export interface OccupancyTrend {
  hour: string;
  occupancyPercent: number;
}