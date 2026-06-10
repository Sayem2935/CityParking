import React, { useState, useCallback } from "react";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";
import {
  FaceCamera,
  VideoRecorder,
  VideoPreview,
  EnrollmentProgress,
  CameraPermission,
} from "@/components/face-enrollment";

const FaceEnrollmentPage: React.FC = () => {
  const { recordingStatus, cameraPermission, currentSession } =
    useFaceEnrollmentStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  const handleStreamReady = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream);
  }, []);

  const handleStreamError = useCallback((_error: Error) => {
    setStream(null);
  }, []);

  const handleRetryCamera = useCallback(() => {
    // Reset camera permission in store so FaceCamera re-enters "prompt" state
    useFaceEnrollmentStore.getState().setCameraPermission("prompt");
    // Force FaceCamera to unmount and remount, which re-triggers getUserMedia
    setStream(null);
    setCameraKey((prev) => prev + 1);
  }, []);

  const isRecording = recordingStatus === "recording";
  const isCompleted = recordingStatus === "completed";
  const showCamera = cameraPermission === "granted" && !isCompleted;
  const showPreview = isCompleted && currentSession?.videoUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-city-blue-50/30">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-city-blue-500 to-city-cyan-500 shadow-lg shadow-city-blue-500/20">
              <svg
                className="h-5 w-5 text-white"
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
            <div>
              <h1 className="text-lg font-bold text-zinc-100">
                Face Enrollment
              </h1>
              <p className="text-xs text-zinc-500">
                Record a video for face recognition setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Instructions card */}
        {cameraPermission !== "granted" && (
          <div className="mb-6 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-100 mb-4">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-city-blue-50 text-city-blue-600 text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Enable Camera
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Allow camera access to begin recording
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-city-blue-50 text-city-blue-600 text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Record Video
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Follow the on-screen face movement guidance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-city-blue-50 text-city-blue-600 text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Upload & Done
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Review and upload your enrollment video
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main video area */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4">
                {/* Camera permission states - show UI hint when not yet granted */}
                {cameraPermission !== "granted" && !showPreview && (
                  <CameraPermission
                    permission={cameraPermission}
                    onRetry={handleRetryCamera}
                  />
                )}

                {/* Always render FaceCamera so it can request getUserMedia on mount.
                    FaceCamera internally returns null until permission is granted,
                    so it won't show anything until the user allows camera access. */}
                {!isCompleted && (
                  <div className={cameraPermission === "granted" ? "space-y-4" : "space-y-4"}>
                    <FaceCamera
                      key={cameraKey}
                      onStreamReady={handleStreamReady}
                      onStreamError={handleStreamError}
                    />
                    {/* Recording controls - only show when camera is ready */}
                    {showCamera && <VideoRecorder stream={stream} />}
                  </div>
                )}

                {/* Video preview after recording */}
                {showPreview && <VideoPreview />}
              </div>
            </div>

            {/* Tips card - shown during recording */}
            {isRecording && (
              <div className="mt-4 rounded-2xl bg-amber-900/30 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800">
                      Tips for best results
                    </h4>
                    <ul className="mt-1.5 space-y-1">
                      <li className="text-xs text-amber-700">
                        • Ensure your face is well-lit and clearly visible
                      </li>
                      <li className="text-xs text-amber-700">
                        • Remove sunglasses, hats, or face coverings
                      </li>
                      <li className="text-xs text-amber-700">
                        • Keep a neutral expression and follow the guidance
                      </li>
                      <li className="text-xs text-amber-700">
                        • Move slowly and deliberately during each step
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Enrollment guidance - shown during recording */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-city-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Enrollment Guidance
              </h3>
              <EnrollmentProgress />
              {!isRecording && !isCompleted && (
                <p className="text-xs text-gray-400 text-center py-4">
                  Start recording to see the step-by-step face movement
                  guidance
                </p>
              )}
            </div>

            {/* Session info */}
            {currentSession && (
              <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-sm p-4">
                <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-city-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  Session Details
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Session ID</span>
                    <span className="text-xs font-mono text-zinc-300 truncate ml-2 max-w-[140px]">
                      {currentSession.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Recorded</span>
                    <span className="text-xs text-zinc-300">
                      {new Date(currentSession.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {currentSession.duration > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Duration</span>
                      <span className="text-xs font-semibold text-zinc-300">
                        {currentSession.duration}s
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Status</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        currentSession.uploadStatus === "success"
                          ? "text-green-400"
                          : currentSession.uploadStatus === "failed"
                            ? "text-red-400"
                            : currentSession.status === "recording"
                              ? "text-red-500"
                              : "text-zinc-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          currentSession.uploadStatus === "success"
                            ? "bg-green-500"
                            : currentSession.uploadStatus === "failed"
                              ? "bg-red-500"
                              : currentSession.status === "recording"
                                ? "bg-red-500 animate-pulse"
                                : "bg-gray-400"
                        }`}
                      />
                      {currentSession.uploadStatus === "success"
                        ? "Uploaded"
                        : currentSession.uploadStatus === "failed"
                          ? "Failed"
                          : currentSession.status === "recording"
                            ? "Recording"
                            : "Ready"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements card */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-city-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                  />
                </svg>
                Requirements
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    Minimum 10 seconds recording
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    Maximum 30 seconds recording
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    Well-lit environment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    Follow all 5 face movement steps
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-xs text-zinc-400">
                    No face coverings or sunglasses
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceEnrollmentPage;