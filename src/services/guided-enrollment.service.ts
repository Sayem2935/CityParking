import api from "@/services/api";
import type {
  CapturedFrame,
  StartSessionApiResponse,
  FrameUploadApiResponse,
  SessionStatusApiResponse,
} from "@/types/guided-enrollment.types";

/**
 * Service for guided multi-pose enrollment sessions.
 *
 * Communicates with the Spring Boot backend:
 *   POST   /api/enrollment/sessions/start
 *   POST   /api/enrollment/sessions/{token}/frames
 *   POST   /api/enrollment/sessions/{token}/process
 *   GET    /api/enrollment/sessions/{token}/status
 *   DELETE /api/enrollment/sessions/{token}
 */
export const guidedEnrollmentService = {
  /**
   * Initialize a new enrollment session.
   */
  async startSession(): Promise<StartSessionApiResponse> {
    const response = await api.post<StartSessionApiResponse>(
      "/api/enrollment/sessions/start"
    );
    return response.data;
  },

  /**
   * Upload a batch of captured frames for a specific pose.
   */
  async uploadFrames(
    sessionToken: string,
    poseLabel: string,
    frames: CapturedFrame[]
  ): Promise<FrameUploadApiResponse> {
    const formData = new FormData();
    formData.append("poseLabel", poseLabel);

    frames.forEach((frame, index) => {
      formData.append("frames", frame.blob, `${poseLabel}_${index}.jpg`);
    });

    const response = await api.post<FrameUploadApiResponse>(
      `/api/enrollment/sessions/${sessionToken}/frames`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },

  /**
   * Trigger async processing of the session's frames.
   */
  async triggerProcessing(
    sessionToken: string
  ): Promise<{ success: boolean; data: { status: string } }> {
    const response = await api.post(
      `/api/enrollment/sessions/${sessionToken}/process`
    );
    return response.data;
  },

  /**
   * Poll session processing status.
   */
  async getStatus(sessionToken: string): Promise<SessionStatusApiResponse> {
    const response = await api.get<SessionStatusApiResponse>(
      `/api/enrollment/sessions/${sessionToken}/status`
    );
    return response.data;
  },

  /**
   * Cancel/abort a session.
   */
  async cancelSession(
    sessionToken: string
  ): Promise<{ success: boolean }> {
    const response = await api.delete(
      `/api/enrollment/sessions/${sessionToken}`
    );
    return response.data;
  },

  /**
   * Get enrollment session history.
   */
  async getHistory(): Promise<{ success: boolean; data: unknown[] }> {
    const response = await api.get("/api/enrollment/sessions/history");
    return response.data;
  },
};
