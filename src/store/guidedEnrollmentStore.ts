import { create } from "zustand";
import type {
  GuidedEnrollmentStore,
  SessionState,
  PoseConfig,
  PoseLabel,
  PoseProgress,
  CapturedFrame,
  ALL_POSES,
} from "@/types/guided-enrollment.types";
import { guidedEnrollmentService } from "@/services/guided-enrollment.service";

const INITIAL_POSE_PROGRESS: Record<PoseLabel, PoseProgress> = {
  center: { complete: false, framesAccepted: 0 },
  left: { complete: false, framesAccepted: 0 },
  right: { complete: false, framesAccepted: 0 },
  up: { complete: false, framesAccepted: 0 },
  down: { complete: false, framesAccepted: 0 },
  blink: { complete: false, framesAccepted: 0 },
  smile: { complete: false, framesAccepted: 0 },
};

const INITIAL_SESSION: SessionState = {
  sessionToken: null,
  status: "idle",
  poses: [],
  captureConfig: null,
  currentPoseIndex: 0,
  poseProgress: { ...INITIAL_POSE_PROGRESS },
  totalFramesCaptured: 0,
  qualityFramesAccepted: 0,
  embeddingsGenerated: 0,
  embeddingsAfterDedup: 0,
  livenessPassed: null,
  livenessScore: null,
  sessionDurationSeconds: null,
  error: null,
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30; // 60 seconds max

export const useGuidedEnrollmentStore = create<GuidedEnrollmentStore>(
  (set, get) => ({
    session: { ...INITIAL_SESSION },

    startSession: async () => {
      set({
        session: {
          ...INITIAL_SESSION,
          status: "initializing",
        },
      });

      try {
        const response = await guidedEnrollmentService.startSession();

        if (response.success) {
          set({
            session: {
              ...INITIAL_SESSION,
              sessionToken: response.data.sessionToken,
              status: "capturing",
              poses: response.data.poses,
              captureConfig: response.data.captureConfig,
              currentPoseIndex: 0,
            },
          });
        } else {
          set({
            session: {
              ...get().session,
              status: "failed",
              error: "Failed to start enrollment session",
            },
          });
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        set({
          session: {
            ...get().session,
            status: "failed",
            error: err?.message || "Failed to start enrollment session",
          },
        });
      }
    },

    uploadFrames: async (frames: CapturedFrame[]) => {
      const { session } = get();
      if (!session.sessionToken || frames.length === 0) return;

      const poseLabel = frames[0].poseLabel;

      try {
        const response = await guidedEnrollmentService.uploadFrames(
          session.sessionToken,
          poseLabel,
          frames
        );

        if (response.success) {
          // Update pose progress from response
          const newPoseProgress = { ...session.poseProgress };
          for (const [key, value] of Object.entries(
            response.data.poseProgress
          )) {
            if (key in newPoseProgress) {
              newPoseProgress[key as PoseLabel] = value;
            }
          }

          set({
            session: {
              ...session,
              totalFramesCaptured:
                session.totalFramesCaptured + response.data.framesAccepted,
              poseProgress: newPoseProgress,
            },
          });
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        set({
          session: {
            ...session,
            error: `Frame upload failed: ${err?.message || "Unknown error"}`,
          },
        });
      }
    },

    triggerProcessing: async () => {
      const { session } = get();
      if (!session.sessionToken) return;

      set({
        session: { ...session, status: "processing", error: null },
      });

      try {
        await guidedEnrollmentService.triggerProcessing(session.sessionToken);

        // Start polling
        let attempts = 0;
        const poll = async () => {
          if (attempts >= MAX_POLL_ATTEMPTS) {
            set({
              session: {
                ...get().session,
                status: "failed",
                error: "Processing timed out",
              },
            });
            return;
          }

          attempts++;
          await get().pollStatus();

          const currentStatus = get().session.status;
          if (
            currentStatus === "processing" ||
            currentStatus === "initializing"
          ) {
            setTimeout(poll, POLL_INTERVAL_MS);
          }
        };

        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error: unknown) {
        const err = error as { message?: string };
        set({
          session: {
            ...get().session,
            status: "failed",
            error: `Processing failed: ${err?.message || "Unknown error"}`,
          },
        });
      }
    },

    pollStatus: async () => {
      const { session } = get();
      if (!session.sessionToken) return;

      try {
        const response = await guidedEnrollmentService.getStatus(
          session.sessionToken
        );

        if (response.success) {
          const data = response.data;
          const status = data.status.toLowerCase() as SessionState["status"];

          set({
            session: {
              ...session,
              status:
                status === "completed" || status === "failed"
                  ? status
                  : session.status,
              qualityFramesAccepted: data.qualityFramesAccepted ?? 0,
              embeddingsGenerated: data.embeddingsGenerated ?? 0,
              embeddingsAfterDedup: data.embeddingsAfterDedup ?? 0,
              livenessPassed: data.livenessPassed,
              livenessScore: data.livenessScore,
              sessionDurationSeconds: data.sessionDurationSeconds,
            },
          });
        }
      } catch {
        // Silently retry — polling is best-effort
      }
    },

    cancelSession: async () => {
      const { session } = get();
      if (!session.sessionToken) return;

      try {
        await guidedEnrollmentService.cancelSession(session.sessionToken);
      } catch {
        // Ignore cancel errors
      }

      set({ session: { ...INITIAL_SESSION } });
    },

    resetSession: () => {
      set({ session: { ...INITIAL_SESSION } });
    },

    advancePose: () => {
      const { session } = get();
      if (session.currentPoseIndex < session.poses.length - 1) {
        set({
          session: {
            ...session,
            currentPoseIndex: session.currentPoseIndex + 1,
          },
        });
      }
    },

    getCurrentPose: (): PoseConfig | null => {
      const { session } = get();
      if (session.currentPoseIndex < session.poses.length) {
        return session.poses[session.currentPoseIndex];
      }
      return null;
    },

    isLastPose: (): boolean => {
      const { session } = get();
      return session.currentPoseIndex >= session.poses.length - 1;
    },

    isAllPosesComplete: (): boolean => {
      const { session } = get();
      return Object.values(session.poseProgress).every((p) => p.complete);
    },
  })
);
