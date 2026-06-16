import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  WifiOff,
  ServerCrash,
  Scan,
  RotateCcw,
} from "lucide-react";
import type {
  FaceVerificationResult as VerificationResultType,
  VerificationError,
} from "@/types/face-verification.types";

interface FaceVerificationResultProps {
  result: VerificationResultType | null;
  error: VerificationError | null;
  errorMessage?: string | null;
  onRetry: () => void;
}

export default function FaceVerificationResult({
  result,
  error,
  errorMessage,
  onRetry,
}: FaceVerificationResultProps) {
  const isSuccess = result?.verified === true;
  const isFailure = result?.verified === false && !error;

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* SUCCESS */}
      {isSuccess && result && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">
              Identity Verified
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Your identity has been successfully confirmed.
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 space-y-3 text-left">
            <DetailRow label="Name" value={result.userName || "—"} />
            <DetailRow label="Email" value={result.userEmail || "—"} />
            <DetailRow
              label="Similarity Score"
              value={`${(result.confidence * 100).toFixed(1)}%`}
              highlight
            />
            {result.provider && (
              <DetailRow label="Provider" value={result.provider} />
            )}
            <DetailRow
              label="Verified At"
              value={new Date().toLocaleString()}
            />
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Scan className="w-5 h-5" />
            Verify Again
          </button>
        </div>
      )}

      {/* FAILURE — no match */}
      {isFailure && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-scale-in">
              <XCircle className="w-14 h-14 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
              No Match Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {result?.message ||
                "We could not find a matching enrollment. Please make sure you are enrolled."}
            </p>
          </div>
          {result?.confidence != null && result.confidence > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-left">
              <DetailRow
                label="Similarity Score"
                value={`${(result.confidence * 100).toFixed(1)}%`}
              />
              <p className="text-xs text-gray-400 mt-2">
                A higher similarity score is required for a successful match.
              </p>
            </div>
          )}
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      )}

      {/* ERROR STATES */}
      {error && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center animate-scale-in">
              {error === "no_face" && (
                <Camera className="w-14 h-14 text-amber-500" />
              )}
              {error === "multiple_faces" && (
                <AlertTriangle className="w-14 h-14 text-amber-500" />
              )}
              {error === "camera_unavailable" && (
                <CameraOff className="w-14 h-14 text-amber-500" />
              )}
              {error === "network" && (
                <WifiOff className="w-14 h-14 text-amber-500" />
              )}
              {error === "server_unavailable" && (
                <ServerCrash className="w-14 h-14 text-amber-500" />
              )}
              {error === "unknown" && (
                <AlertTriangle className="w-14 h-14 text-amber-500" />
              )}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {errorTitle(error)}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {errorMessage || errorDescription(error)}
            </p>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${
          highlight
            ? "text-green-600 dark:text-green-400"
            : "text-gray-800 dark:text-gray-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function errorTitle(error: VerificationError): string {
  switch (error) {
    case "no_face":
      return "No Face Detected";
    case "multiple_faces":
      return "Multiple Faces Detected";
    case "camera_unavailable":
      return "Camera Unavailable";
    case "network":
      return "Network Error";
    case "server_unavailable":
      return "Service Unavailable";
    default:
      return "Something Went Wrong";
  }
}

function errorDescription(error: VerificationError): string {
  switch (error) {
    case "no_face":
      return "We could not detect a face in the image. Please ensure your face is clearly visible and well-lit.";
    case "multiple_faces":
      return "Multiple faces were detected. Only one face should be in the frame.";
    case "camera_unavailable":
      return "Unable to access your camera. Please check permissions and try again.";
    case "network":
      return "A network error occurred. Please check your connection and try again.";
    case "server_unavailable":
      return "The face verification service is temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}