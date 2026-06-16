import React, { useState, useCallback } from "react";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";
import {
  FaceCamera,
  ImageCapture,
  ImagePreview,
  CameraPermission,
  FaceCameraGuide,
  FaceProcessingStatus,
} from "@/components/face-enrollment";

const ENROLLMENT_STAGES = [
  { id: "uploading", label: "Uploading Image", description: "Sending photo to server" },
  { id: "detecting", label: "Detecting Face", description: "Locating face in image" },
  { id: "extracting", label: "Extracting Embedding", description: "Generating face features" },
  { id: "saving", label: "Saving Enrollment", description: "Storing face data" },
  { id: "completed", label: "Completed", description: "Enrollment successful" },
];

const FaceEnrollmentPage: React.FC = () => {
  const {
    captureStatus,
    cameraPermission,
    currentSession,
    uploadStatus,
    uploadProgress,
    error,
    resetSession,
  } = useFaceEnrollmentStore();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraKey, setCameraKey] = useState(0);

  const handleStreamReady = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream);
  }, []);

  const handleStreamError = useCallback((_error: Error) => {
    setStream(null);
  }, []);

  const handleRetryCamera = useCallback(() => {
    useFaceEnrollmentStore.getState().setCameraPermission("prompt");
    setStream(null);
    setCameraKey((prev) => prev + 1);
  }, []);

  // Derive the current enrollment stage from upload progress
  const getEnrollmentStage = (): number => {
    if (uploadStatus === "success") return 4;
    if (uploadStatus === "failed") return -1;
    if (uploadStatus === "uploading") {
      if (uploadProgress < 25) return 0;
      if (uploadProgress < 50) return 1;
      if (uploadProgress < 75) return 2;
      return 3;
    }
    return -1; // not started
  };

  const isCaptured = captureStatus === "captured";
  const showCamera = cameraPermission === "granted" && !isCaptured;
  const showPreview = isCaptured && currentSession?.imageUrl;
  const isUploading = uploadStatus === "uploading";
  const isSuccess = uploadStatus === "success";
  const isFailed = uploadStatus === "failed";

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
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
                Capture a photo for face recognition setup
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Pre-capture tips — shown before camera opens */}
        {cameraPermission !== "granted" && !isSuccess && (
          <div className="mb-6 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-100 mb-4">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { step: 1, title: "Enable Camera", desc: "Allow camera access to begin" },
                { step: 2, title: "Capture Photo", desc: "Center your face and capture a clear photo" },
                { step: 3, title: "Enroll & Done", desc: "Review and submit for AI processing" },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 text-sm font-bold flex-shrink-0">
                    {step}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrollment Requirements — shown before capture and during camera */}
        {!isSuccess && !isUploading && (
          <div className="mb-6 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                <svg
                  className="h-4 w-4 text-amber-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-100">
                Before You Capture
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: "💡",
                  title: "Good Lighting Required",
                  desc: "Ensure your face is well-lit with even lighting, avoid harsh shadows",
                },
                {
                  icon: "🕶️",
                  title: "Remove Sunglasses",
                  desc: "Remove sunglasses, hats, or any face coverings",
                },
                {
                  icon: "👁️",
                  title: "Look Directly at Camera",
                  desc: "Face the camera with a neutral, relaxed expression",
                },
                {
                  icon: "👤",
                  title: "One Face Only",
                  desc: "Ensure only your face is visible in the frame",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-3"
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-200">{title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main capture area */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm overflow-hidden">
              <div className="p-4">
                {/* Camera permission states */}
                {cameraPermission !== "granted" && !showPreview && !isSuccess && (
                  <CameraPermission
                    permission={cameraPermission}
                    onRetry={handleRetryCamera}
                  />
                )}

                {/* Camera + capture controls with face guide overlay */}
                {!isCaptured && !isSuccess && (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden">
                      <FaceCamera
                        key={cameraKey}
                        onStreamReady={handleStreamReady}
                        onStreamError={handleStreamError}
                      />
                      {showCamera && (
                        <FaceCameraGuide
                          tipText="Position your face inside the circle"
                          showTips
                        />
                      )}
                    </div>
                    {showCamera && <ImageCapture stream={stream} />}
                  </div>
                )}

                {/* Image preview after capture */}
                {showPreview && !isUploading && !isSuccess && !isFailed && (
                  <ImagePreview />
                )}

                {/* Enrollment Processing Status */}
                {isUploading && (
                  <div className="py-6">
                    <FaceProcessingStatus
                      currentStageIndex={getEnrollmentStage()}
                      stages={ENROLLMENT_STAGES}
                    />
                  </div>
                )}

                {/* Error state */}
                {isFailed && error && (
                  <div className="py-4">
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                          <svg
                            className="h-5 w-5 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-300">
                            Enrollment Failed
                          </p>
                          <p className="text-xs text-red-400/80 mt-0.5">
                            {error}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => useFaceEnrollmentStore.getState().retryUpload()}
                          className="flex-1 rounded-xl bg-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-all"
                        >
                          Retry
                        </button>
                        <button
                          onClick={resetSession}
                          className="flex-1 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-all"
                        >
                          Start Over
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Screen */}
                {isSuccess && (
                  <div className="py-6">
                    <div className="text-center">
                      {/* Success icon */}
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
                        <svg
                          className="h-8 w-8 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>

                      <h2 className="text-xl font-bold text-zinc-100 mb-1">
                        Face Successfully Enrolled
                      </h2>
                      <p className="text-sm text-zinc-400 mb-6">
                        Your face has been registered for biometric verification
                      </p>

                      {/* Enrollment details */}
                      <div className="mx-auto max-w-sm rounded-xl bg-zinc-800/50 border border-zinc-700/50 p-4 mb-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                              Enrolled At
                            </span>
                            <span className="text-xs font-medium text-zinc-300">
                              {new Date().toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                              AI Provider
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                              InsightFace + ArcFace
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Status</span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Ready for Verification
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <a
                          href="/face-verification"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                            />
                          </svg>
                          Verify Your Identity
                        </a>
                        <button
                          onClick={resetSession}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-all"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                            />
                          </svg>
                          Enroll Again
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live camera tips — shown when camera is active */}
            {showCamera && !isCaptured && (
              <div className="mt-4 rounded-2xl bg-amber-900/30 border border-amber-800/50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0"
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
                    <h4 className="text-sm font-semibold text-amber-300">
                      Tips for best results
                    </h4>
                    <ul className="mt-1.5 space-y-1">
                      <li className="text-xs text-amber-200/70">
                        • Ensure your face is well-lit and clearly visible
                      </li>
                      <li className="text-xs text-amber-200/70">
                        • Remove sunglasses, hats, or face coverings
                      </li>
                      <li className="text-xs text-amber-200/70">
                        • Look directly at the camera with a neutral expression
                      </li>
                      <li className="text-xs text-amber-200/70">
                        • Position your face inside the circular guide
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Session info */}
            {currentSession && !isSuccess && (
              <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
                <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-blue-500"
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
                    <span className="text-xs text-zinc-500">Captured</span>
                    <span className="text-xs text-zinc-300">
                      {new Date(currentSession.capturedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {currentSession.imageBlob && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Image Size</span>
                      <span className="text-xs font-semibold text-zinc-300">
                        {(currentSession.imageBlob.size / 1024).toFixed(0)} KB
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
                            : "text-zinc-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          currentSession.uploadStatus === "success"
                            ? "bg-green-500"
                            : currentSession.uploadStatus === "failed"
                              ? "bg-red-500"
                              : "bg-zinc-500"
                        }`}
                      />
                      {currentSession.uploadStatus === "success"
                        ? "Enrolled"
                        : currentSession.uploadStatus === "failed"
                          ? "Failed"
                          : "Ready"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Requirements card */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-blue-500"
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
                {[
                  "Clear frontal face photo",
                  "Well-lit environment",
                  "No face coverings or sunglasses",
                  "Only one face visible",
                  "Face centered in frame",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
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
                    <span className="text-xs text-zinc-400">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Processing info */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-cyan-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
                AI Processing
              </h3>
              <div className="space-y-2 text-xs text-zinc-500">
                <p>Your photo will be processed using:</p>
                <ul className="space-y-1 ml-3">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-cyan-500" />
                    <span>
                      <strong className="text-zinc-400">RetinaFace</strong> —
                      Face detection
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-blue-500" />
                    <span>
                      <strong className="text-zinc-400">ArcFace</strong> — 512-d
                      embedding
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-indigo-500" />
                    <span>
                      <strong className="text-zinc-400">Cosine Similarity</strong>{" "}
                      — Matching
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceEnrollmentPage;