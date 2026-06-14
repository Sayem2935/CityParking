import { create } from "zustand";
import type { User, AuthState } from "@/types";
import { authService } from "@/services";
import type { LoginCredentials, RegisterData } from "@/types";
import { storage } from "@/utils";

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthStore>()((set, _get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login(credentials);
      // Token is persisted by auth.service via storage.setToken()
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login failed. Please try again.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(data);
      // Token is persisted by auth.service via storage.setToken()
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed. Please try again.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      // auth.logout() calls storage.clearAll() which removes token + user
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Verify auth state on app startup.
   * Reads token from localStorage (written by auth.service via storage utility),
   * then validates it by calling GET /api/auth/me.
   */
  checkAuth: async () => {
    // Read token from localStorage (auth.service persists it there)
    const storedToken = storage.getToken();
    if (!storedToken) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      // Validate token by fetching current user from backend
      const user = await authService.getCurrentUser();
      if (user) {
        set({
          user,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Token is invalid or expired
        storage.clearAll();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      // Network error or token rejected
      storage.clearAll();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User) => set({ user }),
  setToken: (token: string) => set({ token }),
}));