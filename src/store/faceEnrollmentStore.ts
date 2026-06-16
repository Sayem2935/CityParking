import { create } from "zustand";
import type { FaceEnrollmentStore } from "@/types/face-enrollment.types";
import { faceEnrollmentService } from "@/services/face-enrollment.service";

const generateSessionId = (): string =>
  `enrollment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const MAX_RETRY_COUNT = 3;

export const useFaceEnrollmentStore = create<FaceEnrollmentStore>((set, get) => ({
  currentSession: null,
  captureStatus: "idle",
  uploadStatus: "idle",
  uploadProgress: 0,
  error: null,
  cameraPermission: "prompt",
  enrollmentRecord: null,
  retryCount: 0,

  capturePhoto: (imageBlob: Blob) => {
    const sessionId = generateSessionId();
    const imageUrl = URL.createObjectURL(imageBlob);

    set({
      captureStatus: "captured",
      error: null,
      uploadStatus: "idle",
      uploadProgress: 0,
      enrollmentRecord: null,
      retryCount: 0,
      currentSession: {
        id: sessionId,
        imageBlob,
        imageUrl,
        capturedAt: new Date().toISOString(),
        status: "captured",
        uploadStatus: "idle",
        uploadProgress: 0,
      },
    });
  },

  uploadSession: async () => {
    const session = get().currentSession;
    if (!session || !session.imageBlob) {
      set({ error: "No photo captured. Please capture a photo first." });
      return;
    }

    set({ uploadStatus: "uploading", uploadProgress: 0, error: null });

    try {
      const record = await faceEnrollmentService.uploadImage(
        session.imageBlob,
        session.id,
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
      set({ error: "Maximum retry attempts reached. Please capture a new photo." });
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
    if (session?.imageUrl) {
      URL.revokeObjectURL(session.imageUrl);
    }
    set({
      currentSession: null,
      captureStatus: "idle",
      uploadStatus: "idle",
      uploadProgress: 0,
      error: null,
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
}));