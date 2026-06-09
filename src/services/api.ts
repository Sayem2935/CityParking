import type { ApiResponse, ApiError } from "@/types";

// Simulate network delay
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Simulate random latency (300-800ms)
const simulateLatency = (): Promise<void> => delay(300 + Math.random() * 500);

// Simulate API error (10% chance when simulateErrors is true)
const shouldSimulateError = (simulateErrors = false): boolean =>
  simulateErrors && Math.random() < 0.1;

export const apiClient = {
  async get<T>(_endpoint: string, simulateErrors = false): Promise<ApiResponse<T>> {
    await simulateLatency();

    if (shouldSimulateError(simulateErrors)) {
      const error: ApiError = {
        message: "Network error. Please try again.",
        status: 500,
        code: "NETWORK_ERROR",
      };
      throw error;
    }

    // This would normally make an HTTP GET request
    // For now, it's a passthrough for mock services
    return {
      data: null as unknown as T,
      message: "Success",
      success: true,
    };
  },

  async post<T>(
    _endpoint: string,
    _data?: unknown,
    simulateErrors = false
  ): Promise<ApiResponse<T>> {
    await simulateLatency();

    if (shouldSimulateError(simulateErrors)) {
      const error: ApiError = {
        message: "Server error. Please try again.",
        status: 500,
        code: "SERVER_ERROR",
      };
      throw error;
    }

    return {
      data: null as unknown as T,
      message: "Success",
      success: true,
    };
  },

  async put<T>(
    _endpoint: string,
    _data?: unknown,
    simulateErrors = false
  ): Promise<ApiResponse<T>> {
    await simulateLatency();

    if (shouldSimulateError(simulateErrors)) {
      const error: ApiError = {
        message: "Server error. Please try again.",
        status: 500,
        code: "SERVER_ERROR",
      };
      throw error;
    }

    return {
      data: null as unknown as T,
      message: "Success",
      success: true,
    };
  },

  async delete<T>(
    _endpoint: string,
    simulateErrors = false
  ): Promise<ApiResponse<T>> {
    await simulateLatency();

    if (shouldSimulateError(simulateErrors)) {
      const error: ApiError = {
        message: "Server error. Please try again.",
        status: 500,
        code: "SERVER_ERROR",
      };
      throw error;
    }

    return {
      data: null as unknown as T,
      message: "Success",
      success: true,
    };
  },
};