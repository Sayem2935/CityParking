export type RecordingStatus = "idle" | "recording" | "paused" | "completed";

export type UploadStatus = "idle" | "uploading" | "success" | "failed";

export type EnrollmentStep =
  | "look_straight"
  | "turn_left"
  | "turn_right"
  | "look_up"
  | "look_down";

export interface EnrollmentStepConfig {
  id: EnrollmentStep;
  label: string;
  instruction: string;
  icon: string;
  duration: number; // seconds to hold each step
}

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

export interface EnrollmentSessionMetadata {
  id: string;
  duration: number;
  recordedAt: string;
  status: RecordingStatus;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  videoSize: number;
}

/** Backend enrollment record returned after successful upload */
export interface FaceEnrollmentRecord {
  id: number;
  userId: number;
  videoPath: string;
  videoSize: number;
  durationSeconds: number;
  status: string;
  uploadedAt: string;
  createdAt: string;
}

export interface FaceEnrollmentState {
  currentSession: EnrollmentSession | null;
  recordingStatus: RecordingStatus;
  recordingDuration: number;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  error: string | null;
  cameraPermission: "prompt" | "granted" | "denied" | "unavailable";
  currentStepIndex: number;
  isGuidanceActive: boolean;
  enrollmentRecord: FaceEnrollmentRecord | null;
  retryCount: number;
}

export interface FaceEnrollmentActions {
  startRecording: () => void;
  stopRecording: (videoBlob: Blob, duration: number) => void;
  saveSession: () => void;
  uploadSession: () => Promise<void>;
  retryUpload: () => Promise<void>;
  resetSession: () => void;
  setCameraPermission: (
    permission: "prompt" | "granted" | "denied" | "unavailable"
  ) => void;
  setError: (error: string | null) => void;
  setUploadProgress: (progress: number) => void;
  nextStep: () => void;
  resetSteps: () => void;
  setGuidanceActive: (active: boolean) => void;
}

export type FaceEnrollmentStore = FaceEnrollmentState & FaceEnrollmentActions;