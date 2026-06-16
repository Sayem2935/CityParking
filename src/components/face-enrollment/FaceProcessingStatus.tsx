import { CheckCircle, Loader2, Circle, XCircle } from "lucide-react";

export interface StageItem {
  id: string;
  label: string;
  description: string;
}

interface FaceProcessingStatusProps {
  stages: StageItem[];
  currentStageIndex: number;
  error?: string | null;
  className?: string;
}

const defaultStages: StageItem[] = [
  { id: "uploading", label: "Uploading Image", description: "Sending your photo securely" },
  { id: "detecting", label: "Detecting Face", description: "Locating face in the image" },
  { id: "comparing", label: "Comparing Features", description: "Matching against enrolled faces" },
  { id: "complete", label: "Complete", description: "Verification finished" },
];

export default function FaceProcessingStatus({
  stages = defaultStages,
  currentStageIndex,
  error,
  className = "",
}: FaceProcessingStatusProps) {
  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <div className="space-y-1">
        {stages.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isActive = index === currentStageIndex;
          const isFailed = isActive && !!error;
          const isPending = index > currentStageIndex;

          return (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isCompleted ? "bg-green-500 border-green-500" : ""}
                    ${isActive && !isFailed ? "bg-blue-500 border-blue-500" : ""}
                    ${isFailed ? "bg-red-500 border-red-500" : ""}
                    ${isPending ? "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600" : ""}
                  `}
                >
                  {isCompleted && <CheckCircle className="w-5 h-5 text-white" />}
                  {isActive && !isFailed && (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                  {isFailed && <XCircle className="w-5 h-5 text-white" />}
                  {isPending && (
                    <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div
                    className={`
                      w-0.5 h-8 transition-colors duration-300
                      ${isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}
                    `}
                  />
                )}
              </div>

              {/* Stage content */}
              <div className="pt-2 pb-4">
                <p
                  className={`
                    font-semibold text-sm transition-colors duration-300
                    ${isCompleted ? "text-green-600 dark:text-green-400" : ""}
                    ${isActive && !isFailed ? "text-blue-600 dark:text-blue-400" : ""}
                    ${isFailed ? "text-red-600 dark:text-red-400" : ""}
                    ${isPending ? "text-gray-400 dark:text-gray-500" : ""}
                  `}
                >
                  {stage.label}
                </p>
                <p
                  className={`
                    text-xs mt-0.5
                    ${isActive ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}
                  `}
                >
                  {isFailed ? error : stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}