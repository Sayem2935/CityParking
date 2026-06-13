import React from "react";
import { useNavigate } from "react-router-dom";
import { Car, Plus } from "lucide-react";

const VehicleEmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-800 mb-6">
        <Car className="w-10 h-10 text-zinc-500" />
      </div>
      <h3 className="text-xl font-bold text-zinc-100 mb-2">
        No Vehicles Registered Yet
      </h3>
      <p className="text-sm text-zinc-500 text-center max-w-sm mb-8">
        Register your vehicles to get started with smart parking. You can add
        multiple vehicles and set one as your primary.
      </p>
      <button
        onClick={() => navigate("/vehicles/add")}
        className="btn-primary"
      >
        <Plus className="h-4 w-4" />
        Add Your First Vehicle
      </button>
    </div>
  );
};

export default VehicleEmptyState;