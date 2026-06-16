export type CaptureStatus = "idle" | "captured" | "processing";

export type UploadStatus = "idle" | "uploading" | "success" | "failed";

export interface CaptureSession {
  id: string;
  imageBlob: Blob | null;
  imageUrl: string | null;
  capturedAt: string;
  status: CaptureStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
}

export interface CaptureSessionMetadata {
  id: string;
  capturedAt: string;
  status: CaptureStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  imageSize: number;
}

/** Backend enrollment record returned after successful upload */
export interface FaceEnrollmentRecord {
  id: number;
  userId: number;
  status: string;
  provider: string;
  confidence: number;
  createdAt: string;
}

export interface FaceEnrollmentState {
  currentSession: CaptureSession | null;
  captureStatus: CaptureStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  error: string | null;
  cameraPermission: "prompt" | "granted" | "denied" | "unavailable";
  enrollmentRecord: FaceEnrollmentRecord | null;
  retryCount: number;
}

export interface FaceEnrollmentActions {
  capturePhoto: (imageBlob: Blob) => void;
  uploadSession: () => Promise<void>;
  retryUpload: () => Promise<void>;
  resetSession: () => void;
  setCameraPermission: (
    permission: "prompt" | "granted" | "denied" | "unavailable"
  ) => void;
  setError: (error: string | null) => void;
  setUploadProgress: (progress: number) => void;
}

export type FaceEnrollmentStore = FaceEnrollmentState & FaceEnrollmentActions;

// ── Legacy types kept for backward compatibility ────────────
// These are deprecated and will be removed in the next major version.

/** @deprecated Use CaptureStatus instead */
export type RecordingStatus = "idle" | "recording" | "paused" | "completed";

/** @deprecated No longer used in image capture flow */
export type EnrollmentStep =
  | "look_straight"
  | "turn_left"
  | "turn_right"
  | "look_up"
  | "look_down";

/** @deprecated No longer used in image capture flow */
export interface EnrollmentStepConfig {
  id: EnrollmentStep;
  label: string;
  instruction: string;
  icon: string;
  duration: number;
}

/** @deprecated Use CaptureSession instead */
export interface EnrollmentSession {
  id: string;
  videoBlob: Blob | null;
  videoUrl: string | null;
  duration: number;
  recordedAt: string;
  status: RecordingStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
}

/** @deprecated Use CaptureSessionMetadata instead */
export interface EnrollmentSessionMetadata {
  id: string;
  duration: number;
  recordedAt: string;
  status: RecordingStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  videoSize: number;
}