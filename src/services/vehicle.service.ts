import { apiClient } from "./api";
import type {
  Vehicle,
  AddVehicleData,
  UpdateVehicleData,
  VehicleType,
} from "@/types";

// Backend DTO types (as returned by the API)
interface BackendVehicleResponse {
  id: number;
  licensePlate: string;
  type: string;
  brand: string;
  model: string;
  color: string;
}

interface BackendVehicleRequest {
  licensePlate: string;
  type: string;
  brand: string;
  model: string;
  color: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Map backend vehicle type enum to frontend type
const mapVehicleType = (backendType: string): VehicleType => {
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
  vehicleType: mapVehicleType(backend.type),
  vehicleBrand: backend.brand,
  vehicleModel: backend.model,
  vehicleColor: backend.color,
  isPrimary: false,
  createdAt: new Date().toISOString(),
});

// Map frontend AddVehicleData to backend request
const mapToBackendRequest = (
  data: AddVehicleData
): BackendVehicleRequest => ({
  licensePlate: data.vehicleNumber,
  type: mapToBackendType(data.vehicleType),
  brand: data.vehicleBrand,
  model: data.vehicleModel,
  color: data.vehicleColor,
});

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