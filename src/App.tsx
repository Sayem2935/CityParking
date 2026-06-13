import React, { Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Navbar from "@/components/Navbar";
import PageSkeleton from "@/components/PageSkeleton";
import { useAuthStore } from "@/store";

// Lazy-loaded pages for code splitting
const LandingPage = React.lazy(() => import("@/pages/LandingPage"));
const LoginPage = React.lazy(() => import("@/pages/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/RegisterPage"));
const DashboardPage = React.lazy(() => import("@/pages/DashboardPage"));
const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const EditProfilePage = React.lazy(() => import("@/pages/EditProfilePage"));
const VehiclesPage = React.lazy(() => import("@/pages/VehiclesPage"));
const AddVehiclePage = React.lazy(() => import("@/pages/AddVehiclePage"));
const EditVehiclePage = React.lazy(() => import("@/pages/EditVehiclePage"));
const FaceEnrollmentPage = React.lazy(() => import("@/pages/FaceEnrollmentPage"));
const UniversityIdPage = React.lazy(() => import("@/pages/UniversityIdPage"));
const ParkingDashboardPage = React.lazy(() => import("@/pages/ParkingDashboardPage"));
const NotFoundPage = React.lazy(() => import("@/pages/NotFoundPage"));

// Loading fallback
const PageFallback: React.FC = () => <PageSkeleton variant="dashboard" />;

// App shell for authenticated pages
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-[#09090b]">
    {/* Desktop sidebar — hidden on mobile */}
    <Sidebar />

    {/* Main content area */}
    <div className="flex-1 lg:ml-[260px] transition-all duration-300 flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
        {children}
      </main>
    </div>

    {/* Mobile bottom nav — hidden on desktop */}
    <BottomNav />
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <div className="min-h-screen bg-[#09090b]">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Landing page — public */}
            <Route
              path="/"
              element={
                isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
              }
            />

            {/* Public routes — no shell */}
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

            {/* Protected routes with app shell */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <div id="main-content">
                      <DashboardPage />
                    </div>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell><ProfilePage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ProtectedRoute>
                  <AppShell><EditProfilePage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <ProtectedRoute>
                  <AppShell><VehiclesPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/add"
              element={
                <ProtectedRoute>
                  <AppShell><AddVehiclePage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/vehicles/:id/edit"
              element={
                <ProtectedRoute>
                  <AppShell><EditVehiclePage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/face-enrollment"
              element={
                <ProtectedRoute>
                  <AppShell><FaceEnrollmentPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/university-id"
              element={
                <ProtectedRoute>
                  <AppShell><UniversityIdPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/parking"
              element={
                <ProtectedRoute>
                  <AppShell><ParkingDashboardPage /></AppShell>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
};

export default App;