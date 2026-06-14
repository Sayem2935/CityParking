export type VehicleType = "car" | "motorcycle";

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: VehicleType;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface AddVehicleData {
  vehicleNumber: string;
  vehicleType: VehicleType;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleYear: number;
}

export interface UpdateVehicleData extends AddVehicleData {
  id: string;
}

export interface VehicleState {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
}