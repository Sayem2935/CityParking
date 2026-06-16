import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useGuidedEnrollmentStore } from "@/store/guidedEnrollmentStore";
import type {
  PoseLabel,
  CapturedFrame,
} from "@/types/guided-enrollment.types";
import "./GuidedEnrollment.css";

/**
 * Guided multi-pose enrollment component.
 *
 * Walks the user through 7 poses (center, left, right, up, down, blink, smile),
 * auto-captures frames at ~3 FPS during each pose, uploads them to the backend,
 * then triggers async processing.
 */

// Pose icons for visual guidance
const POSE_ICONS: Record<PoseLabel, string> = {
  center: "👤",
  left: "👈",
  right: "👉",
  up: "☝️",
  down: "👇",
  blink: "😑",
  smile: "😊",
};

const CAPTURE_FPS = 3;
const CAPTURE_INTERVAL_MS = Math.round(1000 / CAPTURE_FPS);

export const GuidedEnrollment: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameBufferRef = useRef<CapturedFrame[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [poseTimer, setPoseTimer] = useState(0);

  const {
    session,
    startSession,
    uploadFrames,
    triggerProcessing,
    cancelSession,
    resetSession,
    advancePose,
    getCurrentPose,
    isLastPose,
    isAllPosesComplete,
  } = useGuidedEnrollmentStore();

  // Start session on mount
  const handleStart = useCallback(async () => {
    await startSession();
  }, [startSession]);

  // Auto-capture frames at target FPS
  const startCapture = useCallback(() => {
    if (!webcamRef.current) return;

    frameBufferRef.current = [];
    setIsCapturing(true);
    setPoseTimer(0);

    const currentPose = getCurrentPose();
    if (!currentPose) return;

    const maxFrames = session.captureConfig?.maxFramesPerPose ?? 8;
    let frameCount = 0;

    captureIntervalRef.current = setInterval(() => {
      if (!webcamRef.current || frameCount >= maxFrames) {
        stopCapture();
        return;
      }

      const canvas = webcamRef.current.getCanvas();
      if (!canvas) return;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            frameBufferRef.current.push({
              blob,
              poseLabel: currentPose.name as PoseLabel,
              timestamp: new Date().toISOString(),
              index: frameCount,
            });
            frameCount++;
          }
        },
        "image/jpeg",
        0.9
      );

      setPoseTimer((prev) => prev + CAPTURE_INTERVAL_MS);
    }, CAPTURE_INTERVAL_MS);

    // Auto-stop after pose duration
    setTimeout(() => {
      stopCapture();
    }, currentPose.durationMs + 500);
  }, [getCurrentPose, session.captureConfig]);

  const stopCapture = useCallback(async () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsCapturing(false);

    // Upload captured frames
    const frames = [...frameBufferRef.current];
    frameBufferRef.current = [];

    if (frames.length > 0) {
      await uploadFrames(frames);
    }
  }, [uploadFrames]);

  // Handle pose advancement
  const handleNextPose = useCallback(() => {
    if (isLastPose()) {
      // All poses done — trigger processing
      triggerProcessing();
    } else {
      advancePose();
      // Short delay before starting next capture
      setCountdown(3);
    }
  }, [isLastPose, triggerProcessing, advancePose]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setCountdown(null);
      startCapture();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, startCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, []);

  const currentPose = getCurrentPose();
  const progress =
    session.poses.length > 0
      ? ((session.currentPoseIndex + 1) / session.poses.length) * 100
      : 0;

  // ── Render States ───────────────────────────────────────

  // Idle state — show start button
  if (session.status === "idle") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-start-card">
          <div className="ge-icon-circle">🎯</div>
          <h2 className="ge-title">Multi-Pose Face Enrollment</h2>
          <p className="ge-description">
            We'll guide you through 7 quick poses to create a robust face
            profile. This takes about 15 seconds.
          </p>
          <div className="ge-pose-preview">
            {Object.entries(POSE_ICONS).map(([name, icon]) => (
              <div key={name} className="ge-pose-chip">
                <span className="ge-pose-chip-icon">{icon}</span>
                <span className="ge-pose-chip-label">{name}</span>
              </div>
            ))}
          </div>
          <button className="ge-btn ge-btn-primary" onClick={handleStart}>
            Start Enrollment
          </button>
        </div>
      </div>
    );
  }

  // Initializing
  if (session.status === "initializing") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-loading-card">
          <div className="ge-spinner" />
          <p className="ge-loading-text">Initializing session...</p>
        </div>
      </div>
    );
  }

  // Capturing state — show camera with pose overlay
  if (session.status === "capturing" && currentPose) {
    return (
      <div className="ge-container">
        <div className="ge-capture-layout">
          {/* Progress bar */}
          <div className="ge-progress-bar-container">
            <div className="ge-progress-bar" style={{ width: `${progress}%` }} />
            <span className="ge-progress-label">
              Pose {session.currentPoseIndex + 1} of {session.poses.length}
            </span>
          </div>

          {/* Camera view with overlay */}
          <div className="ge-camera-wrapper">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user",
              }}
              className="ge-webcam"
              mirrored
            />

            {/* Pose instruction overlay */}
            <div className="ge-pose-overlay">
              <div className="ge-pose-instruction">
                <span className="ge-pose-icon">{POSE_ICONS[currentPose.name as PoseLabel]}</span>
                <span className="ge-pose-text">{currentPose.instruction}</span>
              </div>
            </div>

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="ge-countdown-overlay">
                <div className="ge-countdown-number">{countdown}</div>
              </div>
            )}

            {/* Capture indicator */}
            {isCapturing && (
              <div className="ge-capture-indicator">
                <div className="ge-capture-dot" />
                <span>Capturing...</span>
              </div>
            )}
          </div>

          {/* Pose navigation */}
          <div className="ge-pose-nav">
            {!isCapturing && countdown === null && (
              <button
                className="ge-btn ge-btn-primary"
                onClick={() => setCountdown(3)}
              >
                {session.poseProgress[currentPose.name as PoseLabel]?.complete
                  ? "Retake"
                  : "Begin Capture"}
              </button>
            )}

            {!isCapturing &&
              session.poseProgress[currentPose.name as PoseLabel]?.complete && (
                <button
                  className="ge-btn ge-btn-secondary"
                  onClick={handleNextPose}
                >
                  {isLastPose() ? "Process Enrollment" : "Next Pose →"}
                </button>
              )}
          </div>

          {/* Pose completion chips */}
          <div className="ge-pose-status-row">
            {session.poses.map((pose, idx) => {
              const poseKey = pose.name as PoseLabel;
              const isComplete = session.poseProgress[poseKey]?.complete;
              const isCurrent = idx === session.currentPoseIndex;
              return (
                <div
                  key={poseKey}
                  className={`ge-pose-status-chip ${
                    isComplete ? "ge-pose-done" : ""
                  } ${isCurrent ? "ge-pose-current" : ""}`}
                >
                  {POSE_ICONS[poseKey]}
                </div>
              );
            })}
          </div>

          {/* Cancel button */}
          <button
            className="ge-btn ge-btn-ghost"
            onClick={cancelSession}
          >
            Cancel Enrollment
          </button>
        </div>
      </div>
    );
  }

  // Processing state
  if (session.status === "processing") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-processing-card">
          <div className="ge-spinner" />
          <h3 className="ge-processing-title">Processing Your Face Profile</h3>
          <p className="ge-processing-desc">
            Running quality checks, extracting embeddings, and deduplicating...
          </p>
          <div className="ge-processing-stats">
            <div className="ge-stat">
              <span className="ge-stat-value">{session.totalFramesCaptured}</span>
              <span className="ge-stat-label">Frames Captured</span>
            </div>
            {session.qualityFramesAccepted > 0 && (
              <div className="ge-stat">
                <span className="ge-stat-value">{session.qualityFramesAccepted}</span>
                <span className="ge-stat-label">Quality Passed</span>
              </div>
            )}
            {session.embeddingsAfterDedup > 0 && (
              <div className="ge-stat">
                <span className="ge-stat-value">{session.embeddingsAfterDedup}</span>
                <span className="ge-stat-label">Embeddings Stored</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Completed state
  if (session.status === "completed") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-success-card">
          <div className="ge-icon-circle ge-icon-success">✅</div>
          <h2 className="ge-title">Enrollment Complete!</h2>
          <p className="ge-description">
            Your multi-pose face profile has been created successfully.
          </p>
          <div className="ge-result-stats">
            <div className="ge-result-stat">
              <span className="ge-result-value">{session.embeddingsAfterDedup}</span>
              <span className="ge-result-label">Face Profiles Stored</span>
            </div>
            <div className="ge-result-stat">
              <span className="ge-result-value">{session.qualityFramesAccepted}</span>
              <span className="ge-result-label">Quality Frames</span>
            </div>
            {session.sessionDurationSeconds && (
              <div className="ge-result-stat">
                <span className="ge-result-value">
                  {session.sessionDurationSeconds.toFixed(1)}s
                </span>
                <span className="ge-result-label">Duration</span>
              </div>
            )}
          </div>
          <button className="ge-btn ge-btn-primary" onClick={resetSession}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // Failed state
  if (session.status === "failed") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-error-card">
          <div className="ge-icon-circle ge-icon-error">❌</div>
          <h2 className="ge-title">Enrollment Failed</h2>
          <p className="ge-error-message">{session.error || "An unexpected error occurred"}</p>
          <div className="ge-error-actions">
            <button className="ge-btn ge-btn-primary" onClick={handleStart}>
              Try Again
            </button>
            <button className="ge-btn ge-btn-ghost" onClick={resetSession}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GuidedEnrollment;
