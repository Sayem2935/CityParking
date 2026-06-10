import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleForm } from "@/components/vehicles";
import type { AddVehicleData } from "@/types";

const AddVehiclePage: React.FC = () => {
  const navigate = useNavigate();
  const { addVehicle, isLoading } = useVehicleStore();
  const [showToast, setShowToast] = useState(false);

  const handleSubmit = async (data: AddVehicleData) => {
    await addVehicle(data);
    setShowToast(true);
    setTimeout(() => {
      navigate("/vehicles");
    }, 800);
  };

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
              Vehicle added successfully!
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
          <h1 className="text-3xl font-bold text-zinc-100">Add Vehicle</h1>
          <p className="mt-1 text-zinc-500">
            Register a new vehicle for smart parking
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-card p-6 sm:p-8 animate-fade-in">
          <VehicleForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/vehicles")}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default AddVehiclePage;