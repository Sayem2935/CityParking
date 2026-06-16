import type {
  CaptureSessionMetadata,
  FaceEnrollmentRecord,
} from "@/types/face-enrollment.types";
import { storage } from "@/utils";
import { API_BASE_URL } from "./api";

const SESSIONS_STORAGE_KEY = "parking_face_enrollment_sessions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (image, not video)
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadError {
  message: string;
  code: string;
  status: number;
}

export const faceEnrollmentService = {
  /**
   * Validates the image file before upload.
   */
  validateImageFile(imageBlob: Blob): { valid: boolean; error?: string } {
    if (!ALLOWED_IMAGE_TYPES.includes(imageBlob.type)) {
      return {
        valid: false,
        error: `Invalid file type "${imageBlob.type}". Allowed types: JPEG, PNG, WebP.`,
      };
    }
    if (imageBlob.size > MAX_FILE_SIZE) {
      const sizeMB = (imageBlob.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds the maximum allowed size of 10 MB.`,
      };
    }
    return { valid: true };
  },

  /**
   * Uploads a face enrollment image to the backend.
   * Uses XMLHttpRequest for real upload progress tracking.
   */
  async uploadImage(
    imageBlob: Blob,
    sessionId: string,
    onProgress?: (progress: number) => void
  ): Promise<FaceEnrollmentRecord> {
    // Validate file before uploading
    const validation = this.validateImageFile(imageBlob);
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

    // Determine file extension from type
    const ext = imageBlob.type === "image/png" ? "png" : imageBlob.type === "image/webp" ? "webp" : "jpg";

    // Build multipart form data
    const formData = new FormData();
    const imageFile = new File([imageBlob], `${sessionId}.${ext}`, {
      type: imageBlob.type,
    });
    formData.append("image", imageFile);

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
            const metadata: CaptureSessionMetadata = {
              id: sessionId,
              capturedAt: new Date().toISOString(),
              status: "captured",
              uploadStatus: "success",
              uploadProgress: 100,
              imageSize: imageBlob.size,
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
      xhr.timeout = 60000; // 1 minute timeout (image is smaller than video)
      xhr.send(formData);
    });
  },

  /**
   * Persists session metadata to localStorage.
   */
  persistSessionMetadata(metadata: CaptureSessionMetadata): void {
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
  getAllSessionMetadata(): CaptureSessionMetadata[] {
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
  getSessionMetadata(sessionId: string): CaptureSessionMetadata | null {
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