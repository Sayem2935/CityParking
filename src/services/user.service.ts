import api from './api';
import type { ApiResponse } from '@/types/api.types';
import type { User, UpdateProfileData } from '../types';

// Backend User response from GET /api/user/profile
interface BackendUserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: string;
  vehicleCount: number;
  hasFaceEnrollment: boolean;
  // University ID document extraction fields
  studentName: string | null;
  studentId: string | null;
  universityName: string | null;
  department: string | null;
  session: string | null;
  createdAt: string;
  updatedAt: string;
}

// Re-export for consumers that import from user.service
export type { UpdateProfileData };

function mapBackendUser(backend: BackendUserResponse): User {
  return {
    id: String(backend.id),
    firstName: backend.firstName,
    lastName: backend.lastName,
    email: backend.email,
    phone: backend.phone ?? undefined,
    avatar: backend.avatarUrl ?? undefined,
    role: backend.role ?? 'USER',
    isVerified: backend.isActive ?? false,
    // University ID document extraction fields
    studentName: backend.studentName ?? undefined,
    studentId: backend.studentId ?? undefined,
    universityName: backend.universityName ?? undefined,
    department: backend.department ?? undefined,
    session: backend.session ?? undefined,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

class UserService {
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<BackendUserResponse>>('/user/profile');
    const backendUser = response.data.data;
    return mapBackendUser(backendUser);
  }

  async updateProfile(data: UpdateProfileData): Promise<User> {
    // Map frontend fields to backend UpdateProfileRequest
    const backendPayload: Record<string, string> = {};
    if (data.firstName !== undefined) backendPayload.firstName = data.firstName;
    if (data.lastName !== undefined) backendPayload.lastName = data.lastName;
    if (data.phone !== undefined) backendPayload.phone = data.phone;
    if (data.avatarUrl !== undefined) backendPayload.avatarUrl = data.avatarUrl;

    const response = await api.put<ApiResponse<BackendUserResponse>>('/user/profile', backendPayload);
    const backendUser = response.data.data;
    return mapBackendUser(backendUser);
  }
}

export const userService = new UserService();