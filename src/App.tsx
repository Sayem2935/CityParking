import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Navbar, ProtectedRoute } from "@/components";
import Sidebar from "@/components/Sidebar";
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProfilePage,
  EditProfilePage,
  VehiclesPage,
  AddVehiclePage,
  EditVehiclePage,
  FaceEnrollmentPage,
  NotFoundPage,
} from "@/pages";
import LandingPage from "@/pages/LandingPage";
import ParkingDashboardPage from "@/pages/ParkingDashboardPage";
import ParkingPredictionDashboard from "@/pages/ParkingPredictionDashboard";
import ParkingOptimizationDashboard from "@/pages/ParkingOptimizationDashboard";
import ParkingDigitalTwinDashboard from "@/pages/ParkingDigitalTwinDashboard";
import { useAuthStore } from "@/store";

// Layout for authenticated pages with sidebar
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-[#09090b]">
    <Sidebar />
    <div className="flex-1 lg:ml-[260px] transition-all duration-300">
      <Navbar />
      <main className="p-4 lg:p-6">
        {children}
      </main>
    </div>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  // Initialize auth state from storage on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <div className="min-h-screen bg-[#09090b]">
        <Routes>
          {/* Landing page - public */}
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
            }
          />

          {/* Public routes - no sidebar */}
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

          {/* Protected routes with sidebar layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Vehicle routes */}
          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <VehiclesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/add"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddVehiclePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vehicles/:id/edit"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EditVehiclePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Face Enrollment route */}
          <Route
            path="/face-enrollment"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FaceEnrollmentPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Parking Dashboard route */}
          <Route
            path="/parking"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ParkingDashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Parking Prediction Dashboard route */}
          <Route
            path="/parking/predictions"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ParkingPredictionDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Parking Optimization Dashboard route */}
          <Route
            path="/parking/optimization"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ParkingOptimizationDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Digital Twin Dashboard route */}
          <Route
            path="/parking/digital-twin"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ParkingDigitalTwinDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />


          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;