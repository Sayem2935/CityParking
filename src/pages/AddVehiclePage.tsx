import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVehicleStore } from "@/store";
import { VehicleForm } from "@/components/vehicles";
import type { AddVehicleData } from "@/types";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

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
    <div className="max-w-2xl mx-auto py-6">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-6 right-6 z-40 animate-slide-up">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            Vehicle added successfully!
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
        <h1 className="text-h1">Add Vehicle</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Register a new vehicle for campus parking
        </p>
      </div>

      {/* Form Card */}
      <div className="card p-6 sm:p-8 animate-fade-in">
        <VehicleForm
          onSubmit={handleSubmit}
          onCancel={() => navigate("/vehicles")}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default AddVehiclePage;