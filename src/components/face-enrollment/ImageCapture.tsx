import React, { useRef, useCallback } from "react";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";

interface ImageCaptureProps {
  stream: MediaStream | null;
}

const ImageCapture: React.FC<ImageCaptureProps> = ({ stream }) => {
  const { captureStatus, capturePhoto } = useFaceEnrollmentStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCapture = useCallback(() => {
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const settings = videoTrack.getSettings();
    const width = settings.width || 640;
    const height = settings.height || 480;

    // Get the video element that's displaying the stream
    const videoElement = document.querySelector(
      "video[autoplay]"
    ) as HTMLVideoElement;
    if (!videoElement) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the current video frame to canvas
    ctx.drawImage(videoElement, 0, 0, width, height);

    // Convert to JPEG blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          capturePhoto(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  }, [stream, capturePhoto]);

  const isIdle = captureStatus === "idle";

  return (
    <div className="space-y-4">
      {/* Hidden canvas for image capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Capture button */}
      {isIdle && (
        <div className="flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={!stream}
            className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-10 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            id="capture-photo-btn"
          >
            {/* Camera shutter icon */}
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
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
            Capture Photo
          </button>
        </div>
      )}

      {/* Instruction hint */}
      {isIdle && stream && (
        <p className="text-center text-xs text-zinc-500">
          Center your face in the oval guide and click capture
        </p>
      )}
    </div>
  );
};

export default ImageCapture;
