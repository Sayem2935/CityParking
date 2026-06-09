import { create } from "zustand";
import type { User, UpdateProfileData } from "@/types";
import { userService } from "@/services";
import { useAuthStore } from "./authStore";

interface UserStore {
  profile: User | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await userService.getProfile();
      set({ profile: user, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch profile.";
      set({ isLoading: false, error: message });
    }
  },

  updateProfile: async (data: UpdateProfileData) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await userService.updateProfile(data);
      set({ profile: updatedUser, isLoading: false, error: null });
      // Also update the auth store user
      useAuthStore.getState().setUser(updatedUser);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));