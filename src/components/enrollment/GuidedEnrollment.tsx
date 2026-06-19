import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useGuidedEnrollmentStore } from "@/store/guidedEnrollmentStore";
import type {
  PoseLabel,
} from "@/types/guided-enrollment.types";
import { guidedEnrollmentService } from "@/services/guided-enrollment.service";
import "./GuidedEnrollment.css";

/**
 * Guided multi-pose enrollment component.
 *
 * Phase 2: Real-time feedback with metrics (yaw, pitch, blur, faceScore)
 * Phase 3: Accepted frame counter per pose (e.g., "Accepted: 3 / 4")
 * Phase 4: 15-second per-pose timeout with graceful skip
 * Phase 5: Real failure reasons instead of generic errors
 * Phase 8: Enrollment quality summary screen
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

const POSE_DISPLAY_NAMES: Record<PoseLabel, string> = {
  center: "Center",
  left: "Left",
  right: "Right",
  up: "Up",
  down: "Down",
  blink: "Blink",
  smile: "Smile",
};

const TARGET_FRAMES_PER_POSE = 4;
const POSE_TIMEOUT_MS = 15000; // 15 seconds per pose

// Feedback severity coloring
function getFeedbackClass(feedback: string): string {
  if (feedback.startsWith("Good")) return "ge-feedback-good";
  if (
    feedback.includes("not detected") ||
    feedback.includes("not clearly visible") ||
    feedback.includes("too blurry")
  )
    return "ge-feedback-error";
  return "ge-feedback-warn";
}

// Metric bar component
const MetricBar: React.FC<{
  label: string;
  value: number;
  max: number;
  unit?: string;
  good?: boolean;
}> = ({ label, value, max, unit = "", good = true }) => {
  const pct = Math.min(100, Math.abs(value / max) * 100);
  return (
    <div className="ge-metric-bar">
      <span className="ge-metric-label">{label}</span>
      <div className="ge-metric-track">
        <div
          className={`ge-metric-fill ${good ? "ge-metric-good" : "ge-metric-bad"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="ge-metric-value">
        {typeof value === "number" ? value.toFixed(1) : value}
        {unit}
      </span>
    </div>
  );
};

export const GuidedEnrollment: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poseStartTimeRef = useRef<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  // Bug 1 fix: use ref instead of state to avoid stale closure in setInterval
  const isValidatingRef = useRef(false);
  const [feedback, setFeedback] = useState<string>("Hold still...");
  const [validationReasons, setValidationReasons] = useState<string[]>([]);

  // Phase 2: Live metrics state
  const [liveMetrics, setLiveMetrics] = useState<{
    yaw: number;
    pitch: number;
    blurScore: number;
    faceScore: number;
    faceAreaRatio: number;
    poseDetected: string;
  } | null>(null);

  // Phase 3: Per-pose accepted frame counter
  const [acceptedFrames, setAcceptedFrames] = useState<number>(0);
  const [targetFrames, setTargetFrames] = useState<number>(TARGET_FRAMES_PER_POSE);

  // Phase 4: Pose timeout remaining
  const [timeoutRemaining, setTimeoutRemaining] = useState<number | null>(null);
  const [skippedPoses, setSkippedPoses] = useState<Set<string>>(new Set());

  const {
    session,
    startSession,
    uploadFrames: _uploadFrames,
    triggerProcessing,
    cancelSession,
    resetSession,
    advancePose,
    markPoseComplete,
    getCurrentPose,
    isLastPose,
    isAllPosesComplete,
  } = useGuidedEnrollmentStore();

  // Start session on mount
  const handleStart = useCallback(async () => {
    await startSession();
  }, [startSession]);

  // Phase 4: Per-pose timeout handler
  const startPoseTimer = useCallback(() => {
    poseStartTimeRef.current = Date.now();
    setTimeoutRemaining(Math.ceil(POSE_TIMEOUT_MS / 1000));

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - poseStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((POSE_TIMEOUT_MS - elapsed) / 1000));
      setTimeoutRemaining(remaining);
    }, 1000);

    poseTimerRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      setTimeoutRemaining(null);
      // Timeout: stop capture and skip to next pose
      stopCapture();
      const pose = getCurrentPose();
      if (pose) {
        setSkippedPoses((prev) => new Set(prev).add(pose.name));
        setFeedback(`Unable to capture ${POSE_DISPLAY_NAMES[pose.name as PoseLabel]} pose. Continuing with available poses.`);
      }
      handleNextPose(true);
    }, POSE_TIMEOUT_MS);

    // Store interval for cleanup
    (poseTimerRef as unknown as { _interval: ReturnType<typeof setInterval> })._interval = countdownInterval;
  }, [getCurrentPose]);

  const stopPoseTimer = useCallback(() => {
    if (poseTimerRef.current) {
      clearTimeout(poseTimerRef.current);
      poseTimerRef.current = null;
    }
    const interval = (poseTimerRef as unknown as { _interval?: ReturnType<typeof setInterval> })._interval;
    if (interval) {
      clearInterval(interval);
    }
    setTimeoutRemaining(null);
  }, []);

  // Auto-capture frames at target FPS for real-time validation
  const startCapture = useCallback(() => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    setFeedback("Hold still...");
    setValidationReasons([]);
    setAcceptedFrames(0);
    setLiveMetrics(null);

    const currentPose = getCurrentPose();
    if (!currentPose) return;

    // Start per-pose timeout
    startPoseTimer();

    captureIntervalRef.current = setInterval(() => {
      if (!webcamRef.current) {
        stopCapture();
        return;
      }

      // Bug 1 fix: read ref instead of stale state closure
      if (isValidatingRef.current) return;

      const canvas = webcamRef.current.getCanvas();
      if (!canvas) return;

      isValidatingRef.current = true;
      canvas.toBlob(
        async (blob) => {
          if (blob && session.sessionToken) {
            try {
              const res = await guidedEnrollmentService.validateFrame(
                session.sessionToken,
                currentPose.name,
                blob
              );
              
              if (import.meta.env.DEV) {
                console.debug("validate-frame response", res.data);
              }

              if (res.success) {
                setFeedback(res.data.feedback);
                setValidationReasons(res.data.reasons);

                // Bug 2 fix: Extract metrics from nested poseMetrics/qualityMetrics maps
                const poseMetrics = (res.data as Record<string, unknown>).poseMetrics as Record<string, number> | undefined;
                const qualityMetrics = (res.data as Record<string, unknown>).qualityMetrics as Record<string, number> | undefined;
                setLiveMetrics({
                  yaw: poseMetrics?.yaw ?? res.data.yaw ?? 0,
                  pitch: poseMetrics?.pitch ?? res.data.pitch ?? 0,
                  blurScore: qualityMetrics?.blur_score ?? res.data.blurScore ?? 0,
                  faceScore: qualityMetrics?.face_score ?? res.data.faceScore ?? 0,
                  faceAreaRatio: qualityMetrics?.face_area_ratio ?? res.data.faceAreaRatio ?? 0,
                  poseDetected: res.data.poseDetected ?? "unknown",
                });

                // Phase 3: Update accepted frame counter
                if (res.data.acceptedFrames !== undefined) {
                  setAcceptedFrames(res.data.acceptedFrames);
                }
                if (res.data.targetFrames !== undefined) {
                  setTargetFrames(res.data.targetFrames);
                }
                
                if (res.data.poseComplete) {
                  // Bug 4 fix: Update poseProgress in the store so triggerProcessing sees completion
                  const accepted = res.data.acceptedFrames ?? 0;
                  markPoseComplete(currentPose.name, accepted);
                  console.log(
                    `[POSE] ${POSE_DISPLAY_NAMES[currentPose.name as PoseLabel]} COMPLETE — accepted=${accepted}/${res.data.targetFrames ?? TARGET_FRAMES_PER_POSE}`
                  );
                  stopPoseTimer();
                  stopCapture();
                  handleNextPose(false);
                }
              }
            } catch (err) {
              console.error("Frame validation failed", err);
            } finally {
              isValidatingRef.current = false;
            }
          } else {
            isValidatingRef.current = false;
          }
        },
        "image/jpeg",
        0.8
      );

    }, 300); // roughly 3 FPS

  }, [getCurrentPose, session.sessionToken, startPoseTimer, markPoseComplete]);

  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    setIsCapturing(false);
    stopPoseTimer();
  }, [stopPoseTimer]);

  // Handle pose advancement — FIX: require ALL poses complete before processing
  const handleNextPose = useCallback(
    (wasSkipped: boolean) => {
      if (isLastPose()) {
        if (isAllPosesComplete()) {
          console.log(`[POSE] All 7 poses complete. Triggering processing.`);
          setFeedback("All poses captured! Processing...");
          triggerProcessing();
        } else {
          // Last pose done but not all poses — find which are missing
          const incompletePoses = session.poses
            .filter((p) => !session.poseProgress[p.name as PoseLabel]?.complete)
            .map((p) => POSE_DISPLAY_NAMES[p.name as PoseLabel]);
          console.error(
            `[POSE] Last pose reached but incomplete: ${incompletePoses.join(", ")}`
          );
          setFeedback(
            `Cannot process yet. Missing: ${incompletePoses.join(", ")}`
          );
        }
      } else {
        advancePose();
        // Short delay before starting next capture
        setCountdown(3);
        if (wasSkipped) {
          // Show skip message briefly
          setTimeout(() => setFeedback(""), 3000);
        }
      }
    },
    [isLastPose, isAllPosesComplete, triggerProcessing, advancePose, session.poses, session.poseProgress]
  );

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
      stopPoseTimer();
    };
  }, [stopPoseTimer]);

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
    const poseKey = currentPose.name as PoseLabel;
    const poseProgress = session.poseProgress[poseKey];
    const currentAccepted = acceptedFrames || poseProgress?.framesAccepted || 0;

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
                <span className="ge-pose-icon">{POSE_ICONS[poseKey]}</span>
                <span className="ge-pose-text">{currentPose.instruction}</span>
              </div>
            </div>

            {/* Countdown overlay */}
            {countdown !== null && (
              <div className="ge-countdown-overlay">
                <div className="ge-countdown-number">{countdown}</div>
              </div>
            )}

            {/* Phase 3: Accepted Frame Counter — always visible when capturing */}
            {isCapturing && (
              <div className="ge-frame-counter-overlay">
                <div className="ge-frame-counter">
                  <span className="ge-frame-counter-label">Accepted</span>
                  <span className="ge-frame-counter-value">
                    {currentAccepted} / {targetFrames}
                  </span>
                </div>
              </div>
            )}

            {/* Phase 4: Timeout indicator */}
            {isCapturing && timeoutRemaining !== null && (
              <div className={`ge-timeout-indicator ${timeoutRemaining <= 5 ? "ge-timeout-warning" : ""}`}>
                {timeoutRemaining}s
              </div>
            )}

            {/* Capture indicator & Live Feedback */}
            {isCapturing && (
              <div className="ge-live-feedback-container">
                <div className={`ge-live-feedback ${getFeedbackClass(feedback)}`}>
                  {feedback}
                </div>
                {validationReasons.length > 0 && (
                  <div className="ge-validation-reasons">
                    {validationReasons.map((r, i) => (
                      <span key={i} className="ge-reason-badge">
                        {r.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Phase 2: Live Metrics Panel */}
                {liveMetrics && (
                  <div className="ge-live-metrics">
                    <MetricBar
                      label="Yaw"
                      value={liveMetrics.yaw}
                      max={30}
                      unit="°"
                      good={Math.abs(liveMetrics.yaw) < 15}
                    />
                    <MetricBar
                      label="Pitch"
                      value={liveMetrics.pitch}
                      max={30}
                      unit="°"
                      good={Math.abs(liveMetrics.pitch) < 15}
                    />
                    <MetricBar
                      label="Blur"
                      value={liveMetrics.blurScore}
                      max={100}
                      good={liveMetrics.blurScore >= 30}
                    />
                    <MetricBar
                      label="Face"
                      value={liveMetrics.faceScore}
                      max={1}
                      good={liveMetrics.faceScore >= 0.5}
                    />
                    <div className="ge-pose-detected">
                      Detected: <strong>{liveMetrics.poseDetected}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pose navigation */}
          <div className="ge-pose-nav">
            {!isCapturing && countdown === null && (
              <button
                className="ge-btn ge-btn-primary"
                onClick={() => {
                  // "Retake" must fully reset the enrollment (currentPoseIndex=0,
                  // CENTER active, all pose counts cleared) rather than re-capturing
                  // only the current (last) pose. "Begin Capture" just starts the
                  // current pose's countdown.
                  if (session.poseProgress[poseKey]?.complete) {
                    stopCapture();
                    setSkippedPoses(new Set());
                    void startSession();
                  } else {
                    setCountdown(3);
                  }
                }}
              >
                {session.poseProgress[poseKey]?.complete
                  ? "Retake"
                  : "Begin Capture"}
              </button>
            )}

            {!isCapturing &&
              (session.poseProgress[poseKey]?.complete ||
                skippedPoses.has(poseKey)) && (
                <button
                  className="ge-btn ge-btn-secondary"
                  onClick={() => handleNextPose(false)}
                >
                  {isLastPose() ? "Process Enrollment" : "Next Pose →"}
                </button>
              )}
          </div>

          {/* Phase 3: Pose completion chips with frame counts */}
          <div className="ge-pose-status-row">
            {session.poses.map((pose, idx) => {
              const pKey = pose.name as PoseLabel;
              const isComplete = session.poseProgress[pKey]?.complete;
              const isSkipped = skippedPoses.has(pKey);
              const isCurrent = idx === session.currentPoseIndex;
              const frames = session.poseProgress[pKey]?.framesAccepted || 0;
              return (
                <div
                  key={pKey}
                  className={`ge-pose-status-chip ${
                    isComplete ? "ge-pose-done" : ""
                  } ${isSkipped ? "ge-pose-skipped" : ""} ${
                    isCurrent ? "ge-pose-current" : ""
                  }`}
                  title={`${POSE_DISPLAY_NAMES[pKey]}: ${frames}/${TARGET_FRAMES_PER_POSE} frames`}
                >
                  <span className="ge-pose-chip-icon-small">{POSE_ICONS[pKey]}</span>
                  <span className="ge-pose-chip-count">
                    {isSkipped ? "–" : `${frames}/${TARGET_FRAMES_PER_POSE}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Skip message */}
          {feedback.includes("Unable to capture") && (
            <div className="ge-skip-message">{feedback}</div>
          )}

          {/* Cancel button */}
          <button className="ge-btn ge-btn-ghost" onClick={cancelSession}>
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

  // Phase 8: Completed state — Enrollment Quality Summary
  if (session.status === "completed") {
    const totalRejected = Math.max(
      0,
      session.totalFramesCaptured - session.qualityFramesAccepted
    );
    const qualityPct =
      session.totalFramesCaptured > 0
        ? Math.round(
            (session.qualityFramesAccepted / session.totalFramesCaptured) * 100
          )
        : 0;

    return (
      <div className="ge-container">
        <div className="ge-card ge-success-card">
          <div className="ge-icon-circle ge-icon-success">✅</div>
          <h2 className="ge-title">Enrollment Quality Report</h2>

          {/* Phase 8: Per-pose quality breakdown */}
          {session.poseQualityScores &&
            Object.keys(session.poseQualityScores).length > 0 && (
              <div className="ge-quality-report">
                <h4 className="ge-quality-section-title">Per-Pose Results</h4>
                <div className="ge-quality-grid">
                  {Object.entries(session.poseQualityScores).map(
                    ([pose, score]) => {
                      const poseKey = pose as PoseLabel;
                      const frames =
                        session.poseProgress[poseKey]?.framesAccepted ?? 0;
                      const pct = Math.round(score * 100);
                      const wasSkipped = skippedPoses.has(pose);
                      return (
                        <div key={pose} className="ge-quality-row">
                          <span className="ge-quality-pose-icon">
                            {POSE_ICONS[poseKey] ?? "❓"}
                          </span>
                          <span className="ge-quality-pose-name">
                            {POSE_DISPLAY_NAMES[poseKey] ?? pose}
                          </span>
                          <div className="ge-quality-bar-track">
                            <div
                              className={`ge-quality-bar-fill ${
                                pct >= 75
                                  ? "ge-quality-high"
                                  : pct >= 50
                                  ? "ge-quality-med"
                                  : "ge-quality-low"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="ge-quality-pct">
                            {wasSkipped ? "Skipped" : `${pct}%`}
                          </span>
                          <span className="ge-quality-frames">
                            {frames} frames
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          {/* Summary stats */}
          <div className="ge-result-stats">
            <div className="ge-result-stat">
              <span className="ge-result-value">{session.qualityFramesAccepted}</span>
              <span className="ge-result-label">Accepted Frames</span>
            </div>
            <div className="ge-result-stat">
              <span className="ge-result-value">{totalRejected}</span>
              <span className="ge-result-label">Rejected Frames</span>
            </div>
            <div className="ge-result-stat">
              <span className="ge-result-value">{session.embeddingsAfterDedup}</span>
              <span className="ge-result-label">Embeddings Generated</span>
            </div>
            <div className="ge-result-stat">
              <span className="ge-result-value">{qualityPct}%</span>
              <span className="ge-result-label">Overall Quality</span>
            </div>
            {session.sessionDurationSeconds && (
              <div className="ge-result-stat">
                <span className="ge-result-value">
                  {session.sessionDurationSeconds.toFixed(1)}s
                </span>
                <span className="ge-result-label">Duration</span>
              </div>
            )}
            {session.livenessScore !== null && (
              <div className="ge-result-stat">
                <span className="ge-result-value">
                  {session.livenessPassed ? "✅" : "⚠️"}{" "}
                  {((session.livenessScore ?? 0) * 100).toFixed(0)}%
                </span>
                <span className="ge-result-label">Liveness</span>
              </div>
            )}
          </div>

          {skippedPoses.size > 0 && (
            <div className="ge-skipped-summary">
              Skipped poses:{" "}
              {Array.from(skippedPoses)
                .map((p) => POSE_DISPLAY_NAMES[p as PoseLabel])
                .join(", ")}
            </div>
          )}

          <button className="ge-btn ge-btn-primary" onClick={resetSession}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // Phase 5: Failed state — show real failure reasons
  if (session.status === "failed") {
    return (
      <div className="ge-container">
        <div className="ge-card ge-error-card">
          <div className="ge-icon-circle ge-icon-error">❌</div>
          <h2 className="ge-title">Enrollment Failed</h2>

          {/* Phase 5: Show real failure reason */}
          <p className="ge-error-message">
            {session.failureReason ||
              session.error ||
              "Enrollment could not be completed. Please try again."}
          </p>

          {/* Show per-pose frame counts even on failure */}
          {session.poseQualityScores &&
            Object.keys(session.poseQualityScores).length > 0 && (
              <div className="ge-failure-pose-report">
                <h4>Frame Status at Failure</h4>
                <div className="ge-failure-pose-list">
                  {session.poses.map((pose) => {
                    const pKey = pose.name as PoseLabel;
                    const frames =
                      session.poseProgress[pKey]?.framesAccepted ?? 0;
                    const complete = session.poseProgress[pKey]?.complete;
                    return (
                      <div key={pKey} className="ge-failure-pose-item">
                        <span>{POSE_ICONS[pKey]}</span>
                        <span>{POSE_DISPLAY_NAMES[pKey]}</span>
                        <span>
                          {complete ? "✅" : "❌"} {frames}/{TARGET_FRAMES_PER_POSE}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {session.validationErrors &&
            session.validationErrors.length > 0 && (
              <div className="ge-validation-errors-list">
                {session.validationErrors.map((err, i) => (
                  <div key={i} className="ge-validation-error-item">
                    • {err.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            )}

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
