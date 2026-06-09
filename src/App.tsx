import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Navbar, ProtectedRoute } from "@/components";
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProfilePage,
  EditProfilePage,
  VehiclesPage,
  AddVehiclePage,
  EditVehiclePage,
  NotFoundPage,
} from "@/pages";
import { useAuthStore } from "@/store";

const App: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Initialize auth state from storage on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            {/* Public routes - redirect to dashboard if already authenticated */}
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
              }
            />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <EditProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Vehicle routes */}
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <VehiclesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/add"
              element={
                <ProtectedRoute>
                  <AddVehiclePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:id/edit"
              element={
                <ProtectedRoute>
                  <EditVehiclePage />
                </ProtectedRoute>
              }
            />

            {/* Root redirect */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;