import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Vehicle } from "@/types";

interface VehicleCardProps {
  vehicle: Vehicle;
  onDelete: (vehicle: Vehicle) => void;
  onSetPrimary: (vehicleId: string) => void;
}

const vehicleTypeConfig = {
  car: {
    label: "Car",
    color: "bg-blue-900/30 text-blue-400 border-blue-100",
    icon: "🚗",
  },
  motorcycle: {
    label: "Motorcycle",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: "🏍️",
  },
  bus: {
    label: "Bus",
    color: "bg-amber-900/30 text-amber-400 border-amber-100",
    icon: "🚌",
  },
  van: {
    label: "Van",
    color: "bg-purple-900/30 text-purple-400 border-purple-100",
    icon: "🚐",
  },
};

const VehicleCard: React.FC<VehicleCardProps> = ({
  vehicle,
  onDelete,
  onSetPrimary,
}) => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const typeConfig = vehicleTypeConfig[vehicle.vehicleType];

  const handleSetPrimary = () => {
    if (!vehicle.isPrimary) {
      setIsAnimating(true);
      onSetPrimary(vehicle.id);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-zinc-900/80 backdrop-blur-md border transition-all duration-300 hover:-translate-y-1 ${
        vehicle.isPrimary
          ? "border-blue-500/30 shadow-md ring-2 ring-blue-500/10"
          : "border-zinc-800 shadow-card hover:shadow-card-hover"
      }`}
    >
      {/* Primary badge */}
      {vehicle.isPrimary && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-xl">
            ★ Primary
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                vehicle.isPrimary
                  ? "bg-blue-500/10"
                  : "bg-zinc-800/50"
              } transition-colors duration-200`}
            >
              {typeConfig.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-100 tracking-wide">
                {vehicle.vehicleNumber}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${typeConfig.color}`}
              >
                {typeConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle details */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Brand
            </p>
            <p className="text-sm font-semibold text-zinc-300 mt-0.5">
              {vehicle.vehicleBrand}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Model
            </p>
            <p className="text-sm font-semibold text-zinc-300 mt-0.5">
              {vehicle.vehicleModel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Color
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-block h-3.5 w-3.5 rounded-full border border-white/10"
                style={{
                  backgroundColor: vehicle.vehicleColor.toLowerCase(),
                }}
              />
              <p className="text-sm font-semibold text-zinc-300">
                {vehicle.vehicleColor}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Added
            </p>
            <p className="text-sm font-semibold text-zinc-300 mt-0.5">
              {new Date(vehicle.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-zinc-800">
          <button
            onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 transition-colors duration-200 min-h-[44px]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            Edit
          </button>

          <button
            onClick={handleSetPrimary}
            disabled={vehicle.isPrimary || isAnimating}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 min-h-[44px] ${
              vehicle.isPrimary
                ? "text-blue-400 bg-blue-500/10 cursor-default"
                : "text-zinc-400 bg-zinc-800/50 hover:bg-blue-500/10 hover:text-blue-400"
            } ${isAnimating ? "scale-95" : ""}`}
          >
            <svg
              className="h-4 w-4"
              fill={vehicle.isPrimary ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
            {vehicle.isPrimary ? "Primary" : "Set Primary"}
          </button>

          <button
            onClick={() => onDelete(vehicle)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors duration-200 ml-auto min-h-[44px]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;