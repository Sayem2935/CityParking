import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import type { LoginCredentials, RegisterData } from "@/types";

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    checkAuth,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (credentials: LoginCredentials) => {
    await storeLogin(credentials);
    navigate("/dashboard");
  };

  const register = async (data: RegisterData) => {
    await storeRegister(data);
    navigate("/dashboard");
  };

  const logout = async () => {
    await storeLogout();
    navigate("/login");
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};