import { create } from "zustand";
import { parkingService } from "@/services/parking.service";
import type {
  ParkingSlot,
  ParkingAvailability,
  ParkingStatistics,
} from "@/types/parking.types";

interface ParkingState {
  slots: ParkingSlot[];
  availability: ParkingAvailability | null;
  statistics: ParkingStatistics | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchSlots: () => Promise<void>;
  fetchAvailability: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  refreshAll: () => Promise<void>;
  recordEntry: (slotCode: string) => Promise<void>;
  recordExit: (slotCode: string) => Promise<void>;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  slots: [],
  availability: null,
  statistics: null,
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

  recordEntry: async (slotCode: string) => {
    set({ loading: true });
    try {
      // Find a slot and assign it – simplified for demo
      const slot = get().slots.find((s) => s.slotCode === slotCode);
      if (slot) {
        // Mark as occupied locally for instant UI feedback
        set((state) => ({
          slots: state.slots.map((s) =>
            s.slotCode === slotCode ? { ...s, status: "OCCUPIED" as const } : s
          ),
        }));
      }
      // Refresh from server to get authoritative state
      await get().refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record entry";
      set({ error: message });
      await get().refreshAll();
    }
  },

  recordExit: async (slotCode: string) => {
    set({ loading: true });
    try {
      // Find the assignment for this slot and release it
      const stats = get().statistics;
      if (stats) {
        // Optimistic update – mark as free locally
        set((state) => ({
          slots: state.slots.map((s) =>
            s.slotCode === slotCode ? { ...s, status: "FREE" as const } : s
          ),
        }));
      }
      // Refresh from server
      await get().refreshAll();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to record exit";
      set({ error: message });
      await get().refreshAll();
    }
  },
}));