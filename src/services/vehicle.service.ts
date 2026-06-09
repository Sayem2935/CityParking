import type { Vehicle, AddVehicleData, UpdateVehicleData, ApiError } from "@/types";
import { storage } from "@/utils";

// Simulate network delay
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const simulateLatency = (): Promise<void> => delay(300 + Math.random() * 500);

// Mock vehicle database stored in localStorage
const VEHICLES_DB_KEY = "parking_mock_vehicles_db";

const getVehiclesDb = (): Record<string, Vehicle[]> => {
  try {
    const data = localStorage.getItem(VEHICLES_DB_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

const saveVehiclesDb = (db: Record<string, Vehicle[]>): void => {
  localStorage.setItem(VEHICLES_DB_KEY, JSON.stringify(db));
};

const generateId = (): string => {
  return `vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentUserId = (): string | null => {
  const user = storage.getUser<{ id: string }>();
  return user?.id || null;
};

export const vehicleService = {
  async getVehicles(): Promise<Vehicle[]> {
    await simulateLatency();

    const userId = getCurrentUserId();
    if (!userId) {
      const error: ApiError = {
        message: "User not authenticated.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    const db = getVehiclesDb();
    return db[userId] || [];
  },

  async addVehicle(data: AddVehicleData): Promise<Vehicle> {
    await simulateLatency();

    const userId = getCurrentUserId();
    if (!userId) {
      const error: ApiError = {
        message: "User not authenticated.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    const db = getVehiclesDb();
    const userVehicles = db[userId] || [];

    // Check for duplicate vehicle number
    const duplicate = userVehicles.find(
      (v) => v.vehicleNumber.toLowerCase() === data.vehicleNumber.toLowerCase()
    );
    if (duplicate) {
      const error: ApiError = {
        message: "A vehicle with this number already exists.",
        code: "DUPLICATE_VEHICLE",
        status: 409,
      };
      throw error;
    }

    const now = new Date().toISOString();
    const newVehicle: Vehicle = {
      id: generateId(),
      vehicleNumber: data.vehicleNumber.toUpperCase(),
      vehicleType: data.vehicleType,
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
      isPrimary: userVehicles.length === 0, // First vehicle is primary
      createdAt: now,
    };

    userVehicles.push(newVehicle);
    db[userId] = userVehicles;
    saveVehiclesDb(db);

    return newVehicle;
  },

  async updateVehicle(data: UpdateVehicleData): Promise<Vehicle> {
    await simulateLatency();

    const userId = getCurrentUserId();
    if (!userId) {
      const error: ApiError = {
        message: "User not authenticated.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    const db = getVehiclesDb();
    const userVehicles = db[userId] || [];

    const index = userVehicles.findIndex((v) => v.id === data.id);
    if (index === -1) {
      const error: ApiError = {
        message: "Vehicle not found.",
        code: "NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    // Check for duplicate vehicle number (excluding current vehicle)
    const duplicate = userVehicles.find(
      (v) =>
        v.id !== data.id &&
        v.vehicleNumber.toLowerCase() === data.vehicleNumber.toLowerCase()
    );
    if (duplicate) {
      const error: ApiError = {
        message: "A vehicle with this number already exists.",
        code: "DUPLICATE_VEHICLE",
        status: 409,
      };
      throw error;
    }

    const updatedVehicle: Vehicle = {
      ...userVehicles[index],
      vehicleNumber: data.vehicleNumber.toUpperCase(),
      vehicleType: data.vehicleType,
      vehicleBrand: data.vehicleBrand,
      vehicleModel: data.vehicleModel,
      vehicleColor: data.vehicleColor,
    };

    userVehicles[index] = updatedVehicle;
    db[userId] = userVehicles;
    saveVehiclesDb(db);

    return updatedVehicle;
  },

  async deleteVehicle(vehicleId: string): Promise<void> {
    await simulateLatency();

    const userId = getCurrentUserId();
    if (!userId) {
      const error: ApiError = {
        message: "User not authenticated.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    const db = getVehiclesDb();
    const userVehicles = db[userId] || [];

    const index = userVehicles.findIndex((v) => v.id === vehicleId);
    if (index === -1) {
      const error: ApiError = {
        message: "Vehicle not found.",
        code: "NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    const wasPrimary = userVehicles[index].isPrimary;
    userVehicles.splice(index, 1);

    // If deleted vehicle was primary, set the first remaining vehicle as primary
    if (wasPrimary && userVehicles.length > 0) {
      userVehicles[0].isPrimary = true;
    }

    db[userId] = userVehicles;
    saveVehiclesDb(db);
  },

  async setPrimaryVehicle(vehicleId: string): Promise<Vehicle[]> {
    await simulateLatency();

    const userId = getCurrentUserId();
    if (!userId) {
      const error: ApiError = {
        message: "User not authenticated.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    const db = getVehiclesDb();
    const userVehicles = db[userId] || [];

    const targetIndex = userVehicles.findIndex((v) => v.id === vehicleId);
    if (targetIndex === -1) {
      const error: ApiError = {
        message: "Vehicle not found.",
        code: "NOT_FOUND",
        status: 404,
      };
      throw error;
    }

    // Set all vehicles to non-primary, then set the target as primary
    userVehicles.forEach((v) => (v.isPrimary = false));
    userVehicles[targetIndex].isPrimary = true;

    db[userId] = userVehicles;
    saveVehiclesDb(db);

    return userVehicles;
  },
};