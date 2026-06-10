import { create } from "zustand";
import type { Vehicle, AddVehicleData, UpdateVehicleData, VehicleState } from "@/types";
import { vehicleService } from "@/services";

interface VehicleStore extends VehicleState {
  getVehicles: () => Promise<void>;
  addVehicle: (data: AddVehicleData) => Promise<Vehicle>;
  updateVehicle: (data: UpdateVehicleData) => Promise<Vehicle>;
  deleteVehicle: (vehicleId: string) => Promise<void>;
  setPrimaryVehicle: (vehicleId: string) => Promise<void>;
  getVehicleById: (vehicleId: string) => Vehicle | undefined;
  clearError: () => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  isLoading: false,
  error: null,

  getVehicles: async () => {
    set({ isLoading: true, error: null });
    try {
      const vehicles = await vehicleService.getVehicles();
      set({ vehicles, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load vehicles.";
      set({ isLoading: false, error: message });
    }
  },

  addVehicle: async (data: AddVehicleData) => {
    set({ isLoading: true, error: null });
    try {
      const newVehicle = await vehicleService.addVehicle(data);
      set((state) => ({
        vehicles: [...state.vehicles, newVehicle],
        isLoading: false,
      }));
      return newVehicle;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add vehicle.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  updateVehicle: async (data: UpdateVehicleData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedVehicle = await vehicleService.updateVehicle(data);
      set((state) => ({
        vehicles: state.vehicles.map((v) =>
          v.id === updatedVehicle.id ? updatedVehicle : v
        ),
        isLoading: false,
      }));
      return updatedVehicle;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update vehicle.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  deleteVehicle: async (vehicleId: string) => {
    set({ isLoading: true, error: null });
    try {
      await vehicleService.deleteVehicle(vehicleId);
      set((state) => ({
        vehicles: state.vehicles.filter((v) => v.id !== vehicleId),
        isLoading: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete vehicle.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  setPrimaryVehicle: async (vehicleId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Backend does not have a "set primary" endpoint;
      // toggle locally by re-fetching and flipping the flag client-side.
      const vehicles = await vehicleService.getVehicles();
      const updatedVehicles = vehicles.map((v) => ({
        ...v,
        isPrimary: v.id === vehicleId,
      }));
      set({ vehicles: updatedVehicles, isLoading: false });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to set primary vehicle.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  getVehicleById: (vehicleId: string) => {
    return get().vehicles.find((v) => v.id === vehicleId);
  },

  clearError: () => set({ error: null }),
}));