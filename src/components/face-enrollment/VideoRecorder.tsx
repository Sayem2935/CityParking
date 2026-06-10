import React, { useRef, useEffect, useCallback, useState } from "react";
import { useFaceEnrollmentStore, MIN_DURATION, MAX_DURATION } from "@/store/faceEnrollmentStore";

interface VideoRecorderProps {
  stream: MediaStream | null;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ stream }) => {
  const {
    recordingStatus,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recordingDuration: _recordingDuration,
    startRecording,
    stopRecording,
    nextStep,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isGuidanceActive: _isGuidanceActive,
  } = useFaceEnrollmentStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    if (!stream) return;

    chunksRef.current = [];
    setDuration(0);

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const finalDuration = duration;
        stopRecording(blob, finalDuration);
      };

      recorder.start(100); // Collect data every 100ms

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-stop at max duration
          if (newDuration >= MAX_DURATION) {
            handleStopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Guidance step timer - advance steps every 6 seconds
      stepTimerRef.current = setInterval(() => {
        nextStep();
      }, 6000);

      startRecording();
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [stream, startRecording, stopRecording, nextStep, handleStopRecording, duration]);

  // Start recording when store signals it
  useEffect(() => {
    if (recordingStatus === "recording" && !mediaRecorderRef.current) {
      // Already started via handleStartRecording
    }
  }, [recordingStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const isRecording = recordingStatus === "recording";
  const isIdle = !isRecording;
  const canStop = duration >= MIN_DURATION;
  const remainingTime = MAX_DURATION - duration;
  const isWarning = remainingTime <= 5 && isRecording;

  return (
    <div className="space-y-4">
      {/* Recording Timer */}
      {isRecording && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-semibold text-red-400">REC</span>
            </div>
            <span className="text-2xl font-mono font-bold text-zinc-100">
              {formatTime(duration)}
            </span>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-medium ${isWarning ? "text-red-500" : "text-zinc-500"}`}
            >
              {remainingTime}s remaining
            </span>
            {duration < MIN_DURATION && (
              <p className="text-xs text-gray-400">
                Min: {MIN_DURATION}s
              </p>
            )}
          </div>
        </div>
      )}

      {/* Progress bar for recording duration */}
      {isRecording && (
        <div className="w-full bg-zinc-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${
              isWarning
                ? "bg-red-500"
                : "bg-gradient-to-r from-city-blue-500 to-city-cyan-500"
            }`}
            style={{
              width: `${(duration / MAX_DURATION) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {isIdle && (
          <button
            onClick={handleStartRecording}
            disabled={!stream}
            className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-900/80 backdrop-blur-md opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-900/80 backdrop-blur-md" />
            </span>
            Start Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={handleStopRecording}
            disabled={!canStop}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !canStop
                ? `Minimum recording time is ${MIN_DURATION} seconds`
                : "Stop recording"
            }
          >
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop Recording
          </button>
        )}
      </div>

      {/* Min duration hint */}
      {isRecording && !canStop && (
        <p className="text-center text-xs text-gray-400">
          Record for at least {MIN_DURATION} seconds to enable stop
        </p>
      )}
    </div>
  );
};

export default VideoRecorder;