import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleCard, DeleteVehicleModal, VehicleEmptyState } from "@/components/vehicles";
import type { Vehicle, VehicleType } from "@/types";

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { vehicles, isLoading, getVehicles, deleteVehicle, setPrimaryVehicle } =
    useVehicleStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<VehicleType | "all">("all");
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  useEffect(() => {
    getVehicles();
  }, [getVehicles]);

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((v) => v.vehicleType === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.vehicleNumber.toLowerCase().includes(query) ||
          v.vehicleBrand.toLowerCase().includes(query) ||
          v.vehicleModel.toLowerCase().includes(query) ||
          v.vehicleColor.toLowerCase().includes(query)
      );
    }

    // Sort by newest
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [vehicles, searchQuery, filterType]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVehicle(deleteTarget.id);
      setDeleteTarget(null);
      showToastMessage("Vehicle deleted successfully");
    } catch {
      // Error handled by store
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async (vehicleId: string) => {
    try {
      await setPrimaryVehicle(vehicleId);
      showToastMessage("Primary vehicle updated");
    } catch {
      // Error handled by store
    }
  };

  const showToastMessage = (message: string) => {
    setShowToast(message);
    setTimeout(() => setShowToast(null), 3000);
  };

  const typeFilters: { value: VehicleType | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "car", label: "🚗 Car" },
    { value: "motorcycle", label: "🏍️ Motorcycle" },
    { value: "bus", label: "🚌 Bus" },
    { value: "van", label: "🚐 Van" },
  ];

  // Loading skeleton
  if (isLoading && vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-800/50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-zinc-700 rounded-lg w-48" />
            <div className="h-4 bg-zinc-700 rounded-lg w-64" />
            <div className="flex gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-zinc-700 rounded-xl w-24" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-zinc-700 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-800/50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast */}
        {showToast && (
          <div className="fixed top-6 right-6 z-40 animate-slide-up">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-medium text-white shadow-lg">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {showToast}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">My Vehicles</h1>
            <p className="mt-1 text-zinc-500">
              Manage your registered vehicles for smart parking
            </p>
          </div>
          <button
            onClick={() => navigate("/vehicles/add")}
            className="btn-primary mt-4 sm:mt-0 inline-flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add Vehicle
          </button>
        </div>

        {vehicles.length === 0 ? (
          <VehicleEmptyState />
        ) : (
          <>
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 animate-fade-in">
              {/* Search */}
              <div className="relative flex-1">
                <svg
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur-md pl-11 pr-4 py-2.5 text-sm font-medium text-zinc-100 placeholder-gray-400 transition-all duration-200 focus:border-city-blue-500 focus:outline-none focus:ring-2 focus:ring-city-blue-500/20"
                />
              </div>

              {/* Type filters */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {typeFilters.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      filterType === type.value
                        ? "bg-city-blue-500 text-white shadow-sm"
                        : "bg-zinc-900/80 backdrop-blur-md text-zinc-400 border border-white/10 hover:bg-zinc-800/50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle count */}
            <p className="text-sm text-zinc-500 mb-4">
              Showing {filteredVehicles.length} of {vehicles.length} vehicle
              {vehicles.length !== 1 ? "s" : ""}
            </p>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <span className="text-3xl mb-3">🔍</span>
                <p className="text-sm font-medium text-zinc-500">
                  No vehicles found matching your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <VehicleCard
                      vehicle={vehicle}
                      onDelete={setDeleteTarget}
                      onSetPrimary={handleSetPrimary}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Delete Modal */}
        <DeleteVehicleModal
          vehicle={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default VehiclesPage;