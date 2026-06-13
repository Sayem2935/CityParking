import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleForm } from "@/components/vehicles";
import type { AddVehicleData } from "@/types";
import { ArrowLeft, CheckCircle2, Car } from "lucide-react";

const EditVehiclePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVehicleById, updateVehicle, isLoading, getVehicles } =
    useVehicleStore();
  const [showToast, setShowToast] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const vehicle = id ? getVehicleById(id) : undefined;

  useEffect(() => {
    if (!vehicle && id) {
      getVehicles().then(() => {
        const v = useVehicleStore.getState().getVehicleById(id);
        if (!v) setNotFound(true);
      });
    }
  }, [vehicle, id, getVehicles]);

  const handleSubmit = async (data: AddVehicleData) => {
    if (!id) return;
    await updateVehicle({ id, ...data });
    setShowToast(true);
    setTimeout(() => {
      navigate("/vehicles");
    }, 800);
  };

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 mb-4">
            <Car className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            Vehicle Not Found
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            The vehicle you're looking for doesn't exist.
          </p>
          <button onClick={() => navigate("/vehicles")} className="btn-primary">
            Back to Vehicles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-40 animate-slide-up">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            Vehicle updated successfully!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <button
          onClick={() => navigate("/vehicles")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-4 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vehicles
        </button>
        <h1 className="text-h1">Edit Vehicle</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update your vehicle information
        </p>
      </div>

      {/* Form Card */}
      {vehicle ? (
        <div className="card p-6 sm:p-8 animate-fade-in">
          <VehicleForm
            vehicle={vehicle}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/vehicles")}
            isLoading={isLoading}
          />
        </div>
      ) : (
        <div className="card p-6 sm:p-8 animate-fade-in">
          <div className="space-y-6">
            <div className="skeleton h-6 w-32 rounded-lg" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditVehiclePage;