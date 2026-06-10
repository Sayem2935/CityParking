import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleForm } from "@/components/vehicles";
import type { AddVehicleData } from "@/types";

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
      // Try to load vehicles first
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
      <div className="min-h-screen bg-zinc-800/50/50">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl mb-4">🚗</span>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">
              Vehicle Not Found
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              The vehicle you're looking for doesn't exist.
            </p>
            <button
              onClick={() => navigate("/vehicles")}
              className="btn-primary"
            >
              Back to Vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-800/50/50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
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
              Vehicle updated successfully!
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => navigate("/vehicles")}
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Vehicles
          </button>
          <h1 className="text-3xl font-bold text-zinc-100">Edit Vehicle</h1>
          <p className="mt-1 text-zinc-500">
            Update your vehicle information
          </p>
        </div>

        {/* Form Card */}
        {vehicle ? (
          <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-card p-6 sm:p-8 animate-fade-in">
            <VehicleForm
              vehicle={vehicle}
              onSubmit={handleSubmit}
              onCancel={() => navigate("/vehicles")}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-card p-6 sm:p-8 animate-pulse">
            <div className="space-y-6">
              <div className="h-6 bg-zinc-700 rounded-lg w-32" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-zinc-700 rounded-xl" />
                ))}
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-zinc-700 rounded-xl" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditVehiclePage;