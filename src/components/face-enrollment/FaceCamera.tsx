import React, { useRef, useEffect, useCallback } from "react";
import { useFaceEnrollmentStore } from "@/store/faceEnrollmentStore";

interface FaceCameraProps {
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: Error) => void;
  mirrored?: boolean;
}

const FaceCamera: React.FC<FaceCameraProps> = ({
  onStreamReady,
  onStreamError,
  mirrored = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { setCameraPermission, cameraPermission } = useFaceEnrollmentStore();

  const requestCamera = useCallback(async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraPermission("unavailable");
        onStreamError?.(new Error("Camera not available on this device."));
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraPermission("granted");
      onStreamReady?.(stream);
    } catch (err) {
      const error = err as Error & { name?: string };
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setCameraPermission("denied");
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setCameraPermission("unavailable");
      } else {
        setCameraPermission("unavailable");
      }
      onStreamError?.(error);
    }
  }, [setCameraPermission, onStreamReady, onStreamError]);

  useEffect(() => {
    requestCamera();

    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [requestCamera]);

  if (cameraPermission !== "granted") {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-auto object-cover ${mirrored ? "scale-x-[-1]" : ""}`}
        style={{ maxHeight: "480px" }}
      />
      {/* Face guide overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <svg
            viewBox="0 0 200 240"
            className="w-40 h-48 md:w-48 md:h-56"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
            strokeDasharray="8 4"
          >
            {/* Oval face guide */}
            <ellipse cx="100" cy="110" rx="70" ry="90" />
            {/* Shoulder hint */}
            <path d="M30 200 Q100 170 170 200" />
          </svg>
        </div>
      </div>
      {/* Corner indicators */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/40 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-white/40 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-white/40 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/40 rounded-br-lg" />
    </div>
  );
};

export default FaceCamera;