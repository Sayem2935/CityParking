import React from "react";
import { useNavigate } from "react-router-dom";

const VehicleEmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <span className="text-4xl">🚗</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        No Vehicles Registered Yet
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-8">
        Register your vehicles to get started with smart parking. You can add
        multiple vehicles and set one as your primary.
      </p>
      <button
        onClick={() => navigate("/vehicles/add")}
        className="btn-primary inline-flex items-center gap-2"
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
        Add Your First Vehicle
      </button>
    </div>
  );
};

export default VehicleEmptyState;