import { create } from "zustand";
import type {
  FaceEnrollmentStore,
  EnrollmentStepConfig,
} from "@/types/face-enrollment.types";
import { faceEnrollmentService } from "@/services/face-enrollment.service";

export const ENROLLMENT_STEPS: EnrollmentStepConfig[] = [
  {
    id: "look_straight",
    label: "Look Straight",
    instruction: "Face the camera directly and hold still",
    icon: "M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z",
    duration: 6,
  },
  {
    id: "turn_left",
    label: "Turn Left",
    instruction: "Slowly turn your head to the left",
    icon: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18",
    duration: 5,
  },
  {
    id: "turn_right",
    label: "Turn Right",
    instruction: "Slowly turn your head to the right",
    icon: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3",
    duration: 5,
  },
  {
    id: "look_up",
    label: "Look Up",
    instruction: "Slowly tilt your head upward",
    icon: "M4.5 15.75l7.5-7.5 7.5 7.5",
    duration: 5,
  },
  {
    id: "look_down",
    label: "Look Down",
    instruction: "Slowly tilt your head downward",
    icon: "M19.5 8.25l-7.5 7.5-7.5-7.5",
    duration: 5,
  },
];

const generateSessionId = (): string =>
  `enrollment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const MIN_DURATION = 10;
const MAX_DURATION = 30;

export { MIN_DURATION, MAX_DURATION };

const MAX_RETRY_COUNT = 3;

export const useFaceEnrollmentStore = create<FaceEnrollmentStore>((set, get) => ({
  currentSession: null,
  recordingStatus: "idle",
  recordingDuration: 0,
  uploadStatus: "idle",
  uploadProgress: 0,
  error: null,
  cameraPermission: "prompt",
  currentStepIndex: 0,
  isGuidanceActive: false,
  enrollmentRecord: null,
  retryCount: 0,

  startRecording: () => {
    const sessionId = generateSessionId();
    set({
      recordingStatus: "recording",
      recordingDuration: 0,
      error: null,
      uploadStatus: "idle",
      uploadProgress: 0,
      currentStepIndex: 0,
      isGuidanceActive: true,
      enrollmentRecord: null,
      retryCount: 0,
      currentSession: {
        id: sessionId,
        videoBlob: null,
        videoUrl: null,
        duration: 0,
        recordedAt: new Date().toISOString(),
        status: "recording",
        uploadStatus: "idle",
        uploadProgress: 0,
      },
    });
  },

  stopRecording: (videoBlob: Blob, duration: number) => {
    const videoUrl = URL.createObjectURL(videoBlob);
    const session = get().currentSession;
    if (!session) return;

    set({
      recordingStatus: "completed",
      recordingDuration: duration,
      isGuidanceActive: false,
      currentSession: {
        ...session,
        videoBlob,
        videoUrl,
        duration,
        status: "completed",
      },
    });
  },

  saveSession: () => {
    const session = get().currentSession;
    if (!session) return;
    set({ uploadStatus: "idle" });
  },

  uploadSession: async () => {
    const session = get().currentSession;
    if (!session || !session.videoBlob) {
      set({ error: "No video recorded. Please record a video first." });
      return;
    }

    set({ uploadStatus: "uploading", uploadProgress: 0, error: null });

    try {
      const record = await faceEnrollmentService.uploadVideo(
        session.videoBlob,
        session.id,
        session.duration,
        (progress: number) => {
          set({ uploadProgress: progress });
        }
      );

      set((state) => ({
        uploadStatus: "success",
        uploadProgress: 100,
        enrollmentRecord: record,
        retryCount: 0,
        currentSession: state.currentSession
          ? { ...state.currentSession, uploadStatus: "success", uploadProgress: 100 }
          : null,
      }));
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; status?: number };
      const message = err?.message || "Upload failed. Please try again.";
      set((state) => ({
        uploadStatus: "failed",
        error: message,
        currentSession: state.currentSession
          ? { ...state.currentSession, uploadStatus: "failed" }
          : null,
      }));
    }
  },

  retryUpload: async () => {
    const { retryCount } = get();
    if (retryCount >= MAX_RETRY_COUNT) {
      set({ error: "Maximum retry attempts reached. Please record a new video." });
      return;
    }

    set((state) => ({
      retryCount: state.retryCount + 1,
      uploadStatus: "idle",
      uploadProgress: 0,
      error: null,
    }));

    // Small delay before retrying
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await get().uploadSession();
  },

  resetSession: () => {
    const session = get().currentSession;
    if (session?.videoUrl) {
      URL.revokeObjectURL(session.videoUrl);
    }
    set({
      currentSession: null,
      recordingStatus: "idle",
      recordingDuration: 0,
      uploadStatus: "idle",
      uploadProgress: 0,
      error: null,
      currentStepIndex: 0,
      isGuidanceActive: false,
      enrollmentRecord: null,
      retryCount: 0,
    });
  },

  setCameraPermission: (permission) => {
    set({ cameraPermission: permission });
  },

  setError: (error) => {
    set({ error });
  },

  setUploadProgress: (progress) => {
    set({ uploadProgress: progress });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < ENROLLMENT_STEPS.length) {
      set({ currentStepIndex: nextIndex });
    }
  },

  resetSteps: () => {
    set({ currentStepIndex: 0 });
  },

  setGuidanceActive: (active) => {
    set({ isGuidanceActive: active });
  },
}));