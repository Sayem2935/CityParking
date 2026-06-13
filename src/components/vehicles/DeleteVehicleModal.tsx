import React from "react";
import type { Vehicle } from "@/types";

interface DeleteVehicleModalProps {
  vehicle: Vehicle | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeleteVehicleModal: React.FC<DeleteVehicleModalProps> = ({
  vehicle,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-2xl animate-slide-up">
        <div className="p-6">
          {/* Icon */}
          <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/30">
            <svg
              className="h-7 w-7 text-red-500"
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
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-zinc-100 text-center mb-2">
            Delete Vehicle
          </h3>

          {/* Message */}
          <p className="text-sm text-zinc-500 text-center mb-2">
            Are you sure you want to delete this vehicle?
          </p>
          <div className="bg-zinc-800/50 rounded-xl p-3 mb-6">
            <p className="text-sm font-bold text-zinc-100 text-center">
              {vehicle.vehicleNumber}
            </p>
            <p className="text-xs text-zinc-500 text-center">
              {vehicle.vehicleBrand} {vehicle.vehicleModel} •{" "}
              {vehicle.vehicleColor}
            </p>
          </div>
          <p className="text-xs text-zinc-500 text-center mb-6">
            This action cannot be undone. All parking history associated with
            this vehicle will be preserved.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete Vehicle"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteVehicleModal;