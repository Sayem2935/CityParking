/**
 * Types for the guided multi-pose enrollment session.
 */

// ── Pose Configuration ────────────────────────────────────

export interface PoseConfig {
  name: PoseLabel;
  instruction: string;
  durationMs: number;
  order: number;
}

export type PoseLabel =
  | "center"
  | "left"
  | "right"
  | "up"
  | "down"
  | "blink"
  | "smile";

export const ALL_POSES: PoseLabel[] = [
  "center",
  "left",
  "right",
  "up",
  "down",
  "blink",
  "smile",
];

// ── Capture Configuration ─────────────────────────────────

export interface CaptureConfig {
  targetFps: number;
  minFramesPerPose: number;
  maxFramesPerPose: number;
  imageFormat: string;
  imageQuality: number;
  resolution: { width: number; height: number };
}

// ── Session State ─────────────────────────────────────────

export type SessionStatus =
  | "idle"
  | "initializing"
  | "capturing"
  | "processing"
  | "completed"
  | "failed"
  | "expired";

export interface PoseProgress {
  complete: boolean;
  framesAccepted: number;
}

export interface SessionState {
  sessionToken: string | null;
  status: SessionStatus;
  poses: PoseConfig[];
  captureConfig: CaptureConfig | null;
  currentPoseIndex: number;
  poseProgress: Record<PoseLabel, PoseProgress>;
  totalFramesCaptured: number;
  qualityFramesAccepted: number;
  embeddingsGenerated: number;
  embeddingsAfterDedup: number;
  livenessPassed: boolean | null;
  livenessScore: number | null;
  sessionDurationSeconds: number | null;
  error: string | null;
}

// ── Captured Frame ────────────────────────────────────────

export interface CapturedFrame {
  blob: Blob;
  poseLabel: PoseLabel;
  timestamp: string;
  index: number;
}

// ── API Responses ─────────────────────────────────────────

export interface StartSessionApiResponse {
  success: boolean;
  data: {
    sessionToken: string;
    poses: PoseConfig[];
    captureConfig: CaptureConfig;
    expiresAt: string;
  };
}

export interface FrameUploadApiResponse {
  success: boolean;
  data: {
    framesReceived: number;
    framesAccepted: number;
    framesRejected: number;
    rejectionReasons: Array<{
      frameIndex: number;
      reason: string;
      blurScore?: number;
    }>;
    poseProgress: Record<string, PoseProgress>;
  };
}

export interface SessionStatusApiResponse {
  success: boolean;
  data: {
    sessionToken: string;
    status: string;
    totalFramesCaptured: number;
    qualityFramesAccepted: number;
    embeddingsGenerated: number;
    embeddingsAfterDedup: number;
    livenessPassed: boolean | null;
    livenessScore: number | null;
    poseCompletion: Record<string, boolean>;
    sessionDurationSeconds: number | null;
    startedAt: string | null;
    completedAt: string | null;
  };
}

// ── Store Interface ───────────────────────────────────────

export interface GuidedEnrollmentStore {
  session: SessionState;

  // Actions
  startSession: () => Promise<void>;
  uploadFrames: (frames: CapturedFrame[]) => Promise<void>;
  triggerProcessing: () => Promise<void>;
  pollStatus: () => Promise<void>;
  cancelSession: () => Promise<void>;
  resetSession: () => void;

  // Pose navigation
  advancePose: () => void;
  getCurrentPose: () => PoseConfig | null;
  isLastPose: () => boolean;
  isAllPosesComplete: () => boolean;
}
