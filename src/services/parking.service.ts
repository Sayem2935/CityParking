import { apiClient } from "./api";
import type {
  ParkingSlot,
  ParkingAvailability,
  ParkingScanResult,
  ParkingAssignment,
  ParkingStatistics,
} from "@/types/parking.types";
import type {
  PredictionResponse,
  TrendResponse,
  PeakHourResponse,
  AnalyticsResponse,
} from "@/types/prediction.types";

export const parkingService = {
  /** GET /api/parking/slots */
  async getAllSlots(): Promise<ParkingSlot[]> {
    const { data } = await apiClient.get("/parking/slots");
    return data.data ?? data;
  },

  /** GET /api/parking/availability */
  async getAvailability(): Promise<ParkingAvailability> {
    const { data } = await apiClient.get("/parking/availability");
    return data.data ?? data;
  },

  /** POST /api/parking/scan */
  async triggerScan(): Promise<ParkingScanResult> {
    const { data } = await apiClient.post("/parking/scan");
    return data.data ?? data;
  },

  /** POST /api/parking/assign */
  async assignSlot(userId: number, vehicleId: number): Promise<ParkingAssignment> {
    const { data } = await apiClient.post("/parking/assign", { userId, vehicleId });
    return data.data ?? data;
  },

  /** POST /api/parking/release */
  async releaseSlot(assignmentId: number): Promise<void> {
    await apiClient.post("/parking/release", { assignmentId });
  },

  /** GET /api/parking/statistics */
  async getStatistics(): Promise<ParkingStatistics> {
    const { data } = await apiClient.get("/parking/statistics");
    return data.data ?? data;
  },

  // --- Prediction Endpoints ---

  /** GET /api/parking/predictions */
  async getPredictions(zone?: string): Promise<PredictionResponse> {
    const { data } = await apiClient.get("/parking/predictions", {
      params: zone ? { zone } : undefined,
    });
    return data.data ?? data;
  },

  /** GET /api/parking/predictions/current */
  async getCurrentPredictions(zone?: string): Promise<PredictionResponse> {
    const { data } = await apiClient.get("/parking/predictions/current", {
      params: zone ? { zone } : undefined,
    });
    return data.data ?? data;
  },

  /** GET /api/parking/predictions/trends */
  async getTrends(): Promise<TrendResponse> {
    const { data } = await apiClient.get("/parking/predictions/trends");
    return data.data ?? data;
  },

  /** GET /api/parking/predictions/peak-hours */
  async getPeakHours(): Promise<PeakHourResponse> {
    const { data } = await apiClient.get("/parking/predictions/peak-hours");
    return data.data ?? data;
  },

  /** POST /api/parking/predictions/generate */
  async generatePredictions(zone?: string): Promise<PredictionResponse> {
    const { data } = await apiClient.post("/parking/predictions/generate", null, {
      params: zone ? { zone } : undefined,
    });
    return data.data ?? data;
  },

  /** GET /api/parking/predictions/analytics */
  async getAnalytics(): Promise<AnalyticsResponse> {
    const { data } = await apiClient.get("/parking/predictions/analytics");
    return data.data ?? data;
  },
};