import apiClient from './api';
import type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from '../types';
import { storage } from '../utils';
import { AxiosError } from 'axios';

/* ------------------------------------------------------------------ */
/*  Backend DTO shapes                                                 */
/* ------------------------------------------------------------------ */

/** Shape of the ApiResponse wrapper from the backend */
interface ApiResponseWrapper<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
}

/** Shape of the data field from POST /api/auth/register and POST /api/auth/login */
interface BackendAuthResponse {
  accessToken: string;
  tokenType: string;
  user: BackendUserResponse;
}

/** Shape of the response from GET /api/auth/me */
interface BackendUserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  // University ID document extraction fields
  studentName?: string | null;
  studentId?: string | null;
  universityName?: string | null;
  department?: string | null;
  session?: string | null;
}

/** Shape of the error response from the backend GlobalExceptionHandler */
interface BackendErrorResponse {
  status: number;
  message: string;
  data: unknown;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Maps a backend UserResponse to the frontend User type.
 * - Converts `id` from number to string
 * - Provides defaults for fields not returned by the backend (phone, avatar, timestamps)
 */
function mapUserResponse(data: BackendUserResponse): User {
  return {
    id: String(data.id),
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: undefined,
    avatar: undefined,
    role: data.role ?? 'USER',
    isVerified: false,
    // University ID document extraction fields
    studentName: data.studentName ?? undefined,
    studentId: data.studentId ?? undefined,
    universityName: data.universityName ?? undefined,
    department: data.department ?? undefined,
    session: data.session ?? undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Extracts a human-readable error message from an Axios error response.
 * Falls back to the provided default message if extraction fails.
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError && error.response?.data) {
    const data = error.response.data;
    // Backend may return JSON { status, message, data } or plain text
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object' && data !== null && 'message' in data) {
      return (data as BackendErrorResponse).message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Auth Service — real Spring Boot API integration                    */
/* ------------------------------------------------------------------ */

export const authService = {
  /**
   * Register a new user.
   * POST /api/auth/register
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponseWrapper<BackendAuthResponse>>(
        '/auth/register',
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          role: 'USER',
        }
      );

      const authResponse = response.data.data;
      const user = mapUserResponse(authResponse.user);

      // Persist token and user for checkAuth on page refresh
      storage.setToken(authResponse.accessToken);
      storage.setUser(user);

      return { user, token: authResponse.accessToken };
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, 'Registration failed. Please try again.')
      );
    }
  },

  /**
   * Authenticate an existing user.
   * POST /api/auth/login
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<ApiResponseWrapper<BackendAuthResponse>>(
        '/auth/login',
        {
          email: credentials.email,
          password: credentials.password,
        }
      );

      const authResponse = response.data.data;
      const user = mapUserResponse(authResponse.user);

      // Persist token and user for checkAuth on page refresh
      storage.setToken(authResponse.accessToken);
      storage.setUser(user);

      return { user, token: authResponse.accessToken };
    } catch (error) {
      throw new Error(
        extractErrorMessage(
          error,
          'Login failed. Please check your credentials.'
        )
      );
    }
  },

  /**
   * Fetch the currently authenticated user's profile from the backend.
   * GET /api/auth/me  (requires Bearer token)
   * Returns null if the request fails (token expired, network error, etc.)
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get<ApiResponseWrapper<BackendUserResponse>>('/auth/me');
      const user = mapUserResponse(response.data.data);

      // Update cached user data
      storage.setUser(user);

      return user;
    } catch {
      return null;
    }
  },

  /**
   * Clear local auth state (token + cached user).
   */
  async logout(): Promise<void> {
    storage.clearAll();
  },
};