import React, { useState, useEffect } from "react";
import type { Vehicle, VehicleType, AddVehicleData } from "@/types";

interface VehicleFormProps {
  vehicle?: Vehicle | null;
  onSubmit: (data: AddVehicleData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const vehicleTypes: { value: VehicleType; label: string; icon: string }[] = [
  { value: "car", label: "Car", icon: "🚗" },
  { value: "motorcycle", label: "Motorcycle", icon: "🏍️" },
];

const VehicleForm: React.FC<VehicleFormProps> = ({
  vehicle,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState<AddVehicleData>({
    vehicleNumber: "",
    vehicleType: "car",
    vehicleBrand: "",
    vehicleModel: "",
    vehicleColor: "",
    vehicleYear: currentYear,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vehicle) {
      setFormData({
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        vehicleBrand: vehicle.vehicleBrand,
        vehicleModel: vehicle.vehicleModel,
        vehicleColor: vehicle.vehicleColor,
        vehicleYear: currentYear,
      });
    }
  }, [vehicle]);

  // Regex: Bangla Unicode block (\u0980-\u09FF), word chars, spaces, hyphens
  const LICENSE_PLATE_REGEX = /^[\u0980-\u09FF\w\s\-]+$/;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = "Vehicle number is required";
    } else if (formData.vehicleNumber.trim().length < 2) {
      newErrors.vehicleNumber = "Vehicle number must be at least 2 characters";
    } else if (formData.vehicleNumber.trim().length > 50) {
      newErrors.vehicleNumber = "Vehicle number must not exceed 50 characters";
    } else if (!LICENSE_PLATE_REGEX.test(formData.vehicleNumber.trim())) {
      newErrors.vehicleNumber = "Only Bangla/English letters, numbers, spaces, and hyphens are allowed";
    }

    if (!formData.vehicleBrand.trim()) {
      newErrors.vehicleBrand = "Brand is required";
    }

    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = "Model is required";
    }

    if (!formData.vehicleColor.trim()) {
      newErrors.vehicleColor = "Color is required";
    }

    if (!formData.vehicleYear || formData.vehicleYear < 1900 || formData.vehicleYear > currentYear + 1) {
      newErrors.vehicleYear = `Year must be between 1900 and ${currentYear + 1}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch {
      // Error handled by store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Type */}
      <div>
        <label className="block text-sm font-semibold text-zinc-300 mb-3">
          Vehicle Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {vehicleTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, vehicleType: type.value }))
              }
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 ${
                formData.vehicleType === type.value
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-white/10 bg-zinc-900/80 backdrop-blur-md hover:border-white/20 hover:bg-zinc-800/50"
              }`}
            >
              <span className="text-2xl">{type.icon}</span>
              <span
                className={`text-sm font-medium ${
                  formData.vehicleType === type.value
                    ? "text-blue-600"
                    : "text-zinc-400"
                }`}
              >
                {type.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Number */}
      <div>
        <label
          htmlFor="vehicleNumber"
          className="block text-sm font-semibold text-zinc-300 mb-1.5"
        >
          Vehicle Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="vehicleNumber"
          name="vehicleNumber"
          value={formData.vehicleNumber}
          onChange={handleChange}
          placeholder="e.g., ঢাকা মেট্রো-গ ১২-৩৪৫৬ or Dhaka Metro-G 12-3456"
          className={`w-full rounded-xl border ${
            errors.vehicleNumber ? "border-red-300" : "border-white/10"
          } bg-zinc-900/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
        {errors.vehicleNumber && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {errors.vehicleNumber}
          </p>
        )}
      </div>

      {/* Brand */}
      <div>
        <label
          htmlFor="vehicleBrand"
          className="block text-sm font-semibold text-zinc-300 mb-1.5"
        >
          Brand <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="vehicleBrand"
          name="vehicleBrand"
          value={formData.vehicleBrand}
          onChange={handleChange}
          placeholder="e.g., Toyota, Honda, BMW"
          className={`w-full rounded-xl border ${
            errors.vehicleBrand ? "border-red-300" : "border-white/10"
          } bg-zinc-900/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
        {errors.vehicleBrand && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {errors.vehicleBrand}
          </p>
        )}
      </div>

      {/* Model */}
      <div>
        <label
          htmlFor="vehicleModel"
          className="block text-sm font-semibold text-zinc-300 mb-1.5"
        >
          Model <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="vehicleModel"
          name="vehicleModel"
          value={formData.vehicleModel}
          onChange={handleChange}
          placeholder="e.g., Camry, Civic, X5"
          className={`w-full rounded-xl border ${
            errors.vehicleModel ? "border-red-300" : "border-white/10"
          } bg-zinc-900/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
        {errors.vehicleModel && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {errors.vehicleModel}
          </p>
        )}
      </div>

      {/* Color */}
      <div>
        <label
          htmlFor="vehicleColor"
          className="block text-sm font-semibold text-zinc-300 mb-1.5"
        >
          Color <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="vehicleColor"
          name="vehicleColor"
          value={formData.vehicleColor}
          onChange={handleChange}
          placeholder="e.g., White, Black, Silver"
          className={`w-full rounded-xl border ${
            errors.vehicleColor ? "border-red-300" : "border-white/10"
          } bg-zinc-900/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
        {errors.vehicleColor && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {errors.vehicleColor}
          </p>
        )}
      </div>

      {/* Year */}
      <div>
        <label
          htmlFor="vehicleYear"
          className="block text-sm font-semibold text-zinc-300 mb-1.5"
        >
          Year <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="vehicleYear"
          name="vehicleYear"
          value={formData.vehicleYear}
          onChange={(e) => {
            const val = e.target.value;
            setFormData((prev) => ({
              ...prev,
              vehicleYear: val ? parseInt(val, 10) : currentYear,
            }));
            if (errors.vehicleYear) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.vehicleYear;
                return next;
              });
            }
          }}
          min={1900}
          max={currentYear + 1}
          placeholder={`e.g., ${currentYear}`}
          className={`w-full rounded-xl border ${
            errors.vehicleYear ? "border-red-300" : "border-white/10"
          } bg-zinc-900/80 backdrop-blur-md px-4 py-3 text-sm font-medium text-zinc-100 placeholder-zinc-500 transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
        />
        {errors.vehicleYear && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {errors.vehicleYear}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary inline-flex items-center gap-2"
        >
          {isLoading && (
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
          )}
          {vehicle ? "Update Vehicle" : "Save Vehicle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;