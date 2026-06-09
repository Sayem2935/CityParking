import { useEffect } from "react";
import { useUserStore } from "@/store";
import type { UpdateProfileData } from "@/types";

export const useProfile = () => {
  const { profile, isLoading, error, fetchProfile, updateProfile, clearError } =
    useUserStore();

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  const handleUpdateProfile = async (data: UpdateProfileData) => {
    await updateProfile(data);
  };

  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile: handleUpdateProfile,
    clearError,
  };
};