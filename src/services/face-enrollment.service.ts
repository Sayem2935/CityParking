import type {
  EnrollmentSessionMetadata,
  FaceEnrollmentRecord,
} from "@/types/face-enrollment.types";
import { storage } from "@/utils";

const SESSIONS_STORAGE_KEY = "parking_face_enrollment_sessions";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_VIDEO_TYPES = ["video/webm", "video/mp4", "video/quicktime"];

export interface UploadError {
  message: string;
  code: string;
  status: number;
}

export const faceEnrollmentService = {
  /**
   * Validates the video file before upload.
   */
  validateVideoFile(videoBlob: Blob): { valid: boolean; error?: string } {
    if (!ALLOWED_VIDEO_TYPES.includes(videoBlob.type)) {
      return {
        valid: false,
        error: `Invalid file type "${videoBlob.type}". Allowed types: WebM, MP4, QuickTime.`,
      };
    }
    if (videoBlob.size > MAX_FILE_SIZE) {
      const sizeMB = (videoBlob.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds the maximum allowed size of 50 MB.`,
      };
    }
    return { valid: true };
  },

  /**
   * Uploads a face enrollment video to the backend.
   * Uses XMLHttpRequest for real upload progress tracking.
   */
  async uploadVideo(
    videoBlob: Blob,
    sessionId: string,
    duration: number,
    onProgress?: (progress: number) => void
  ): Promise<FaceEnrollmentRecord> {
    // Validate file before uploading
    const validation = this.validateVideoFile(videoBlob);
    if (!validation.valid) {
      const error: UploadError = {
        message: validation.error!,
        code: "VALIDATION_ERROR",
        status: 400,
      };
      throw error;
    }

    const token = storage.getToken();
    if (!token) {
      const error: UploadError = {
        message: "Authentication required. Please log in and try again.",
        code: "UNAUTHORIZED",
        status: 401,
      };
      throw error;
    }

    // Build multipart form data
    const formData = new FormData();
    // Create a File from Blob with proper name
    const videoFile = new File([videoBlob], `${sessionId}.webm`, {
      type: videoBlob.type,
    });
    formData.append("video", videoFile);
    formData.append("duration", Math.round(duration).toString());

    return new Promise<FaceEnrollmentRecord>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const record: FaceEnrollmentRecord = response.data;

            // Persist session metadata locally
            const metadata: EnrollmentSessionMetadata = {
              id: sessionId,
              duration: duration,
              recordedAt: new Date().toISOString(),
              status: "completed",
              uploadStatus: "success",
              uploadProgress: 100,
              videoSize: videoBlob.size,
            };
            this.persistSessionMetadata(metadata);

            resolve(record);
          } catch {
            const error: UploadError = {
              message: "Failed to parse server response.",
              code: "PARSE_ERROR",
              status: xhr.status,
            };
            reject(error);
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            const error: UploadError = {
              message:
                response.message ||
                `Upload failed with status ${xhr.status}.`,
              code: "UPLOAD_FAILED",
              status: xhr.status,
            };
            reject(error);
          } catch {
            const error: UploadError = {
              message: `Upload failed with status ${xhr.status}.`,
              code: "UPLOAD_FAILED",
              status: xhr.status,
            };
            reject(error);
          }
        }
      });

      xhr.addEventListener("error", () => {
        const error: UploadError = {
          message:
            "Network error. Please check your connection and try again.",
          code: "NETWORK_ERROR",
          status: 0,
        };
        reject(error);
      });

      xhr.addEventListener("timeout", () => {
        const error: UploadError = {
          message: "Upload timed out. Please try again.",
          code: "TIMEOUT",
          status: 0,
        };
        reject(error);
      });

      xhr.open("POST", `${API_BASE_URL}/face-enrollment/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 120000; // 2 minute timeout
      xhr.send(formData);
    });
  },

  /**
   * Persists session metadata to localStorage.
   */
  persistSessionMetadata(metadata: EnrollmentSessionMetadata): void {
    try {
      const existing = this.getAllSessionMetadata();
      existing.push(metadata);
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      console.error("Failed to persist enrollment session metadata.");
    }
  },

  /**
   * Retrieves all persisted session metadata from localStorage.
   */
  getAllSessionMetadata(): EnrollmentSessionMetadata[] {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves a specific session's metadata by ID.
   */
  getSessionMetadata(sessionId: string): EnrollmentSessionMetadata | null {
    const sessions = this.getAllSessionMetadata();
    return sessions.find((s) => s.id === sessionId) || null;
  },

  /**
   * Clears all stored enrollment session metadata.
   */
  clearAllSessions(): void {
    try {
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
    } catch {
      console.error("Failed to clear enrollment sessions.");
    }
  },
};