import { create } from "zustand";
import type {
  ParkingSlot,
  ParkingAvailability,
  ParkingScanResult,
  ParkingAssignment,
  ParkingStatistics,
} from "@/types/parking.types";
import { parkingService } from "@/services/parking.service";

interface ParkingState {
  slots: ParkingSlot[];
  availability: ParkingAvailability | null;
  statistics: ParkingStatistics | null;
  lastScanResult: ParkingScanResult | null;
  recentAssignments: ParkingAssignment[];
  loading: boolean;
  scanLoading: boolean;
  error: string | null;

  fetchSlots: () => Promise<void>;
  fetchAvailability: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  triggerScan: () => Promise<ParkingScanResult>;
  assignSlot: (userId: number, vehicleId: number) => Promise<ParkingAssignment>;
  releaseSlot: (assignmentId: number) => Promise<void>;
  clearError: () => void;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  slots: [],
  availability: null,
  statistics: null,
  lastScanResult: null,
  recentAssignments: [],
  loading: false,
  scanLoading: false,
  error: null,

  fetchSlots: async () => {
    set({ loading: true, error: null });
    try {
      const slots = await parkingService.getAllSlots();
      set({ slots, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch parking slots";
      set({ error: message, loading: false });
    }
  },

  fetchAvailability: async () => {
    set({ loading: true, error: null });
    try {
      const availability = await parkingService.getAvailability();
      set({ availability, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch availability";
      set({ error: message, loading: false });
    }
  },

  fetchStatistics: async () => {
    set({ loading: true, error: null });
    try {
      const statistics = await parkingService.getStatistics();
      set({ statistics, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch statistics";
      set({ error: message, loading: false });
    }
  },

  triggerScan: async () => {
    set({ scanLoading: true, error: null });
    try {
      const result = await parkingService.triggerScan();
      set({ lastScanResult: result, scanLoading: false });
      // Refresh availability after scan
      get().fetchAvailability();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      set({ error: message, scanLoading: false });
      throw err;
    }
  },

  assignSlot: async (userId: number, vehicleId: number) => {
    set({ loading: true, error: null });
    try {
      const assignment = await parkingService.assignSlot(userId, vehicleId);
      set((state) => ({
        recentAssignments: [assignment, ...state.recentAssignments],
        loading: false,
      }));
      // Refresh availability after assignment
      get().fetchAvailability();
      return assignment;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assignment failed";
      set({ error: message, loading: false });
      throw err;
    }
  },

  releaseSlot: async (assignmentId: number) => {
    set({ loading: true, error: null });
    try {
      await parkingService.releaseSlot(assignmentId);
      set((state) => ({
        recentAssignments: state.recentAssignments.map((a) =>
          a.id === assignmentId ? { ...a, status: "RELEASED", releasedAt: new Date().toISOString() } : a
        ),
        loading: false,
      }));
      // Refresh availability after release
      get().fetchAvailability();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Release failed";
      set({ error: message, loading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));