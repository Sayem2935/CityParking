import { create } from "zustand";
import { parkingService } from "@/services/parking.service";
import type {
  ParkingSlot,
  ParkingAvailability,
  ParkingAssignment,
  ParkingStatistics,
} from "@/types/parking.types";

interface ParkingState {
  slots: ParkingSlot[];
  availability: ParkingAvailability | null;
  statistics: ParkingStatistics | null;
  assignments: ParkingAssignment[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSlots: () => Promise<void>;
  fetchAvailability: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  refreshAll: () => Promise<void>;
  recordEntry: (userId: number, vehicleId: number) => Promise<void>;
  recordExit: (assignmentId: number) => Promise<void>;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  slots: [],
  availability: null,
  statistics: null,
  assignments: [],
  loading: false,
  error: null,

  fetchSlots: async () => {
    try {
      const slots = await parkingService.getAllSlots();
      set({ slots, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch slots";
      set({ error: message });
    }
  },

  fetchAvailability: async () => {
    try {
      const availability = await parkingService.getAvailability();
      set({ availability, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch availability";
      set({ error: message });
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await parkingService.getStatistics();
      set({ statistics, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch statistics";
      set({ error: message });
    }
  },

  refreshAll: async () => {
    set({ loading: true });
    try {
      await Promise.all([
        get().fetchSlots(),
        get().fetchAvailability(),
        get().fetchStatistics(),
      ]);
    } finally {
      set({ loading: false });
    }
  },

  /** Assign a slot to a vehicle — calls POST /api/parking/assign */
  recordEntry: async (userId: number, vehicleId: number) => {
    set({ loading: true, error: null });
    try {
      const assignment = await parkingService.assignSlot(userId, vehicleId);
      set((state) => ({ assignments: [...state.assignments, assignment] }));
      console.log(`[Parking] Assignment created: slot=${assignment.slotCode}, assignmentId=${assignment.id}`);
      // Refresh from server to get authoritative state
      await get().refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign slot";
      set({ error: message });
      console.error("[Parking] recordEntry failed:", message);
      await get().refreshAll();
    }
  },

  /** Release a parking assignment — calls POST /api/parking/release */
  recordExit: async (assignmentId: number) => {
    set({ loading: true, error: null });
    try {
      await parkingService.releaseSlot(assignmentId);
      set((state) => ({
        assignments: state.assignments.filter((a) => a.id !== assignmentId),
      }));
      console.log(`[Parking] Assignment released: assignmentId=${assignmentId}`);
      // Refresh from server to get authoritative state
      await get().refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to release slot";
      set({ error: message });
      console.error("[Parking] recordExit failed:", message);
      await get().refreshAll();
    }
  },
}));
