import React from "react";
import { useFaceEnrollmentStore, ENROLLMENT_STEPS } from "@/store/faceEnrollmentStore";

const EnrollmentProgress: React.FC = () => {
  const { currentStepIndex, isGuidanceActive, recordingStatus } = useFaceEnrollmentStore();

  if (recordingStatus !== "recording" || !isGuidanceActive) return null;

  const currentStep = ENROLLMENT_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / ENROLLMENT_STEPS.length) * 100;

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
          Step {currentStepIndex + 1} of {ENROLLMENT_STEPS.length}
        </span>
        <span className="text-xs text-zinc-500">
          {Math.round(progress)}% complete
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {ENROLLMENT_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              index < currentStepIndex
                ? "bg-blue-500"
                : index === currentStepIndex
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                  : "bg-zinc-700"
            }`}
          />
        ))}
      </div>

      {/* Current step card */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900/80 backdrop-blur-md shadow-sm">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={currentStep.icon}
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-zinc-100">
              {currentStep.label}
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              {currentStep.instruction}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-zinc-500">
              {currentStep.duration}s
            </span>
          </div>
        </div>
      </div>

      {/* All steps list */}
      <div className="space-y-2">
        {ENROLLMENT_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
              index === currentStepIndex
                ? "bg-blue-500/10"
                : index < currentStepIndex
                  ? "opacity-50"
                  : "opacity-40"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                index < currentStepIndex
                  ? "bg-blue-500 text-white"
                  : index === currentStepIndex
                    ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                    : "bg-zinc-700 text-zinc-500"
              }`}
            >
              {index < currentStepIndex ? (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                index === currentStepIndex
                  ? "text-blue-400"
                  : index < currentStepIndex
                    ? "text-zinc-500 line-through"
                    : "text-zinc-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnrollmentProgress;