import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleCard, DeleteVehicleModal, VehicleEmptyState } from "@/components/vehicles";
import type { Vehicle, VehicleType } from "@/types";
import { Plus, Search, CheckCircle2 } from "lucide-react";

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
    if (filterType !== "all") {
      result = result.filter((v) => v.vehicleType === filterType);
    }
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
  ];

  // Loading skeleton
  if (isLoading && vehicles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-6 animate-fade-in">
        <div className="space-y-6">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded" />
          <div className="flex gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-10 w-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-40 animate-slide-up">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            {showToast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-h1">My Vehicles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your registered vehicles
          </p>
        </div>
        <button
          onClick={() => navigate("/vehicles/add")}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <VehicleEmptyState />
      ) : (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5 animate-fade-in">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b] focus-visible:border-blue-500 min-h-[44px]"
                aria-label="Search vehicles"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {typeFilters.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilterType(type.value)}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                    filterType === type.value
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <p className="text-sm text-zinc-500 mb-4">
            Showing {filteredVehicles.length} of {vehicles.length} vehicle
            {vehicles.length !== 1 ? "s" : ""}
          </p>

          {/* Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="w-8 h-8 text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-500">
                No vehicles found matching your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
};

export default VehiclesPage;