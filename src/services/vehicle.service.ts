import { apiClient } from "./api";
import type {
  Vehicle,
  AddVehicleData,
  UpdateVehicleData,
  VehicleType,
} from "@/types";

// Backend DTO types (as expected by the API - matches VehicleRequest.java and VehicleResponse.java)
interface BackendVehicleResponse {
  id: number;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vehicleType: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendVehicleRequest {
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vehicleType: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Map backend vehicle type to frontend type
const mapVehicleType = (backendType: string | undefined): VehicleType => {
  if (!backendType) return "car";
  const typeMap: Record<string, VehicleType> = {
    CAR: "car",
    MOTORCYCLE: "motorcycle",
  };
  return typeMap[backendType.toUpperCase()] ?? "car";
};

// Map frontend vehicle type to backend enum
const mapToBackendType = (frontendType: VehicleType): string => {
  const typeMap: Record<VehicleType, string> = {
    car: "CAR",
    motorcycle: "MOTORCYCLE",
  };
  return typeMap[frontendType] ?? "CAR";
};

// Map backend response to frontend Vehicle type
const mapToFrontendVehicle = (backend: BackendVehicleResponse): Vehicle => ({
  id: String(backend.id),
  vehicleNumber: backend.licensePlate,
  vehicleType: mapVehicleType(backend.vehicleType),
  vehicleBrand: backend.make,
  vehicleModel: backend.model,
  vehicleColor: backend.color,
  isPrimary: Boolean(backend.isDefault),
  createdAt: backend.createdAt || new Date().toISOString(),
});

// Map frontend AddVehicleData to backend request
const mapToBackendRequest = (
  data: AddVehicleData
): BackendVehicleRequest => {
  const payload: BackendVehicleRequest = {
    licensePlate: data.vehicleNumber,
    make: data.vehicleBrand,
    model: data.vehicleModel,
    year: data.vehicleYear,
    color: data.vehicleColor,
    vehicleType: mapToBackendType(data.vehicleType),
  };
  console.log("Vehicle payload being sent to backend:", payload);
  return payload;
};

class VehicleService {
  /**
   * Fetch all vehicles for the authenticated user
   */
  async getVehicles(): Promise<Vehicle[]> {
    const response = await apiClient.get<ApiResponse<BackendVehicleResponse[]>>(
      "/vehicles"
    );
    const backendVehicles = response.data.data ?? [];
    return backendVehicles.map(mapToFrontendVehicle);
  }

  /**
   * Add a new vehicle
   */
  async addVehicle(data: AddVehicleData): Promise<Vehicle> {
    const backendRequest = mapToBackendRequest(data);
    const response = await apiClient.post<ApiResponse<BackendVehicleResponse>>(
      "/vehicles",
      backendRequest
    );
    return mapToFrontendVehicle(response.data.data);
  }

  /**
   * Update an existing vehicle
   */
  async updateVehicle(data: UpdateVehicleData): Promise<Vehicle> {
    const backendRequest = mapToBackendRequest(data);
    const response = await apiClient.put<ApiResponse<BackendVehicleResponse>>(
      `/vehicles/${data.id}`,
      backendRequest
    );
    return mapToFrontendVehicle(response.data.data);
  }

  /**
   * Delete a vehicle by ID
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    await apiClient.delete<ApiResponse<void>>(`/vehicles/${vehicleId}`);
  }
}

export const vehicleService = new VehicleService();