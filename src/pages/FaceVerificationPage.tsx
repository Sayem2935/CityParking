import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";
import {
  FaceCamera,
  ImageCapture,
  ImagePreview,
  CameraPermission,
  FaceCameraGuide,
  FaceProcessingStatus,
  FaceVerificationResult,
} from "@/components/face-enrollment";
import { faceVerificationService } from "@/services/face-verification.service";
import type {
  VerificationStep,
  VerificationError,
  FaceVerificationResult as VerificationResultType,
} from "@/types/face-verification.types";
import type { StageItem } from "@/components/face-enrollment/FaceProcessingStatus";

/** Ordered processing stages for the progress indicator */
const PROCESSING_STAGES: StageItem[] = [
  { id: "uploading", label: "Uploading Image", description: "Sending your photo to the server" },
  { id: "detecting", label: "Detecting Face", description: "Locating your face in the image" },
  { id: "comparing", label: "Comparing Features", description: "Matching against enrolled faces" },
  { id: "complete", label: "Complete", description: "Verification finished" },
];

const FaceVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { captureStatus, cameraPermission, currentSession, resetSession, setCameraPermission } =
    useFaceEnrollmentStore();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [step, setStep] = useState<VerificationStep>("camera");
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1);
  const [result, setResult] = useState<VerificationResultType | null>(null);
  const [error, setError] = useState<VerificationError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Camera handlers
  const handleStreamReady = useCallback((mediaStream: MediaStream) => {
    setStream(mediaStream);
  }, []);

  const handleStreamError = useCallback((_error: Error) => {
    setStream(null);
    setError("camera_unavailable");
    setStep("result");
  }, []);

  const handleRetryCamera = useCallback(() => {
    setCameraPermission("prompt");
    setStream(null);
    setCameraKey((prev) => prev + 1);
    setError(null);
    setErrorMessage(null);
    setResult(null);
    setStep("camera");
    setCurrentStageIndex(-1);
    resetSession();
  }, [setCameraPermission, resetSession]);

  // Detect when user captures a photo via ImageCapture → transitions to preview
  useEffect(() => {
    if (captureStatus === "captured" && currentSession?.imageBlob && step === "camera") {
      setStep("preview");
    }
  }, [captureStatus, currentSession, step]);

  // Handle retake
  const handleRetake = useCallback(() => {
    resetSession();
    setResult(null);
    setError(null);
    setErrorMessage(null);
    setStep("camera");
    setCurrentStageIndex(-1);
  }, [resetSession]);

  // Handle verify
  const handleVerify = useCallback(async () => {
    const blob = currentSession?.imageBlob;
    if (!blob) {
      setError("unknown");
      setErrorMessage("No captured image found. Please retake the photo.");
      setStep("result");
      return;
    }

    setStep("verifying");
    setError(null);
    setErrorMessage(null);
    setResult(null);

    try {
      // Stage 1: Uploading (index 0)
      setCurrentStageIndex(0);

      // Small delay to show the stage transition
      await new Promise((r) => setTimeout(r, 600));

      // Stage 2: Detecting (index 1)
      setCurrentStageIndex(1);

      // Call the real verification API
      const response = await faceVerificationService.verifyFace(blob);

      // Stage 3: Comparing (index 2)
      setCurrentStageIndex(2);
      await new Promise((r) => setTimeout(r, 500));

      // Stage 4: Complete (index 3)
      setCurrentStageIndex(3);
      await new Promise((r) => setTimeout(r, 400));

      // Handle multiple faces detected
      if (response.multipleFacesDetected) {
        setError("multiple_faces");
        setStep("result");
        return;
      }

      setResult(response);
      setStep("result");
    } catch (err: unknown) {
      setCurrentStageIndex(-1);

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();

        if (msg.includes("no face") || msg.includes("no_face") || msg.includes("could not detect")) {
          setError("no_face");
        } else if (msg.includes("multiple face") || msg.includes("multiple_face")) {
          setError("multiple_faces");
        } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) {
          setError("network");
        } else if (msg.includes("503") || msg.includes("unavailable") || msg.includes("service")) {
          setError("server_unavailable");
        } else {
          setError("unknown");
          setErrorMessage(err.message);
        }
      } else {
        setError("unknown");
      }
      setStep("result");
    }
  }, [currentSession]);

  const isCaptured = captureStatus === "captured";
  const showCamera = cameraPermission === "granted" && !isCaptured && step === "camera";
  const showPreview = isCaptured && currentSession?.imageUrl && step === "preview";

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
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
                  d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">Face Verification</h1>
              <p className="text-xs text-zinc-500">
                Verify your identity using facial recognition
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2">
            {(["camera", "preview", "verifying", "result"] as VerificationStep[]).map(
              (s, i) => {
                const isActive = s === step;
                const isPast =
                  (step === "preview" && s === "camera") ||
                  (step === "verifying" && (s === "camera" || s === "preview")) ||
                  (step === "result" && s !== "result");
                return (
                  <React.Fragment key={s}>
                    {i > 0 && (
                      <div
                        className={`h-0.5 w-8 sm:w-12 rounded-full transition-colors ${
                          isPast ? "bg-emerald-500" : "bg-zinc-700"
                        }`}
                      />
                    )}
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : isPast
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800/50 text-zinc-500"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold ${
                          isActive
                            ? "bg-emerald-500 text-white"
                            : isPast
                              ? "bg-emerald-500/80 text-white"
                              : "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {isPast ? "✓" : i + 1}
                      </span>
                      <span className="hidden sm:inline">
                        {s === "camera"
                          ? "Capture"
                          : s === "preview"
                            ? "Review"
                            : s === "verifying"
                              ? "Verifying"
                              : "Result"}
                      </span>
                    </div>
                  </React.Fragment>
                );
              }
            )}
          </div>
        </div>

        {/* Pre-capture tips */}
        {step === "camera" && cameraPermission !== "granted" && (
          <div className="mb-6 rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-6">
            <h2 className="text-base font-bold text-zinc-100 mb-4">How it works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  num: "1",
                  title: "Enable Camera",
                  desc: "Allow camera access to begin verification",
                },
                {
                  num: "2",
                  title: "Capture Photo",
                  desc: "Center your face and take a clear photo",
                },
                {
                  num: "3",
                  title: "Verify Identity",
                  desc: "AI compares your face against enrolled data",
                },
              ].map((item) => (
                <div key={item.num} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-bold flex-shrink-0">
                    {item.num}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">{item.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
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
                {cameraPermission !== "granted" && step === "camera" && (
                  <CameraPermission
                    permission={cameraPermission}
                    onRetry={handleRetryCamera}
                  />
                )}

                {/* Camera + capture with guide overlay */}
                {step === "camera" && (
                  <div className="space-y-4">
                    <div className="relative">
                      <FaceCamera
                        key={cameraKey}
                        onStreamReady={handleStreamReady}
                        onStreamError={handleStreamError}
                      />
                      {showCamera && <FaceCameraGuide showTips />}
                    </div>
                    {showCamera && <ImageCapture stream={stream} />}
                  </div>
                )}

                {/* Image preview after capture */}
                {showPreview && <ImagePreview />}

                {/* Verification progress */}
                {step === "verifying" && (
                  <div className="py-8">
                    <FaceProcessingStatus
                      currentStageIndex={currentStageIndex}
                      stages={PROCESSING_STAGES}
                    />
                  </div>
                )}

                {/* Verification result */}
                {step === "result" && (
                  <div className="py-6">
                    <FaceVerificationResult
                      result={result}
                      error={error}
                      errorMessage={errorMessage}
                      onRetry={handleRetryCamera}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons for preview step */}
            {step === "preview" && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl transition-colors border border-zinc-700"
                >
                  <svg
                    className="w-5 h-5"
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
                  Retake
                </button>
                <button
                  onClick={handleVerify}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <svg
                    className="w-5 h-5"
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
                  Verify Identity
                </button>
              </div>
            )}

            {/* Tips card — shown when camera is active */}
            {step === "camera" && showCamera && (
              <div className="mt-4 rounded-2xl bg-emerald-900/20 border border-emerald-800/40 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0"
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
                    <h4 className="text-sm font-semibold text-emerald-300">
                      Tips for successful verification
                    </h4>
                    <ul className="mt-1.5 space-y-1">
                      <li className="text-xs text-emerald-400/80">
                        • Ensure good lighting on your face
                      </li>
                      <li className="text-xs text-emerald-400/80">
                        • Remove sunglasses and face coverings
                      </li>
                      <li className="text-xs text-emerald-400/80">
                        • Look directly at the camera
                      </li>
                      <li className="text-xs text-emerald-400/80">
                        • Only one face should be visible
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick navigation */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z"
                  />
                </svg>
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/face-enrollment")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <svg
                    className="h-4 w-4 text-blue-400"
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
                  <span>Enroll Face</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 transition-colors border border-transparent hover:border-zinc-700"
                >
                  <svg
                    className="h-4 w-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                    />
                  </svg>
                  <span>Back to Dashboard</span>
                </button>
              </div>
            </div>

            {/* Requirements card */}
            <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
              <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-emerald-500"
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
                  "Must be enrolled first",
                  "Clear frontal face photo",
                  "Well-lit environment",
                  "No face coverings or sunglasses",
                  "Only one face visible",
                ].map((req) => (
                  <li key={req} className="flex items-start gap-2">
                    <svg
                      className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0"
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
                Verification Tech
              </h3>
              <div className="space-y-2 text-xs text-zinc-500">
                <p>Your photo will be verified using:</p>
                <ul className="space-y-1 ml-3">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-cyan-500" />
                    <span>
                      <strong className="text-zinc-400">RetinaFace</strong> — Face detection
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-blue-500" />
                    <span>
                      <strong className="text-zinc-400">ArcFace</strong> — 512-d embedding
                    </span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-indigo-500" />
                    <span>
                      <strong className="text-zinc-400">Cosine Similarity</strong> — Matching
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Session info (when captured) */}
            {currentSession && (step === "preview" || step === "verifying") && (
              <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 shadow-sm p-4">
                <h3 className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-emerald-500"
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
                  Capture Details
                </h3>
                <div className="space-y-2">
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
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Ready
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceVerificationPage;