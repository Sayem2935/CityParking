import React from "react";

interface CameraPermissionProps {
  permission: "prompt" | "granted" | "denied" | "unavailable";
  onRetry: () => void;
}

const CameraPermission: React.FC<CameraPermissionProps> = ({
  permission,
  onRetry,
}) => {
  if (permission === "granted") return null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800">
        <svg
          className="h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
          />
        </svg>
      </div>

      {permission === "prompt" && (
        <>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Camera Access Required
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm mb-6">
            We need access to your camera to record your face enrollment video.
            Please allow camera access when prompted by your browser.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-city-blue-500 to-city-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
              />
            </svg>
            Enable Camera
          </button>
        </>
      )}

      {permission === "denied" && (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Camera Access Denied
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm mb-2">
            You've denied camera access. To record your face enrollment video,
            please enable camera access in your browser settings.
          </p>
          <div className="mb-6 rounded-xl bg-amber-900/30 border border-amber-200 px-4 py-3 max-w-sm">
            <p className="text-xs text-amber-700">
              <strong>How to fix:</strong> Click the camera/lock icon in your
              browser's address bar and select "Allow" for camera access, then
              refresh this page.
            </p>
          </div>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/10 bg-zinc-900/80 backdrop-blur-md px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:bg-zinc-800/50 transition-all duration-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Try Again
          </button>
        </>
      )}

      {permission === "unavailable" && (
        <>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-6 w-6 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">
            Camera Not Available
          </h3>
          <p className="text-sm text-zinc-500 text-center max-w-sm mb-6">
            No camera was detected on your device. Please connect a camera and
            try again, or use a device with a built-in camera.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/10 bg-zinc-900/80 backdrop-blur-md px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-white/20 hover:bg-zinc-800/50 transition-all duration-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Retry
          </button>
        </>
      )}
    </div>
  );
};

export default CameraPermission;