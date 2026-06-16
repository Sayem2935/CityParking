import type { FaceVerificationResult } from "@/types/face-verification.types";
import type { VerificationError } from "@/types/face-verification.types";
import { storage } from "@/utils";
import { API_BASE_URL } from "./api";

export interface VerificationServiceError {
  message: string;
  code: VerificationError;
  status: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const faceVerificationService = {
  validateImageFile(imageBlob: Blob): { valid: boolean; error?: string } {
    if (!ALLOWED_IMAGE_TYPES.includes(imageBlob.type)) {
      return {
        valid: false,
        error: `Invalid file type "${imageBlob.type}". Allowed: JPEG, PNG, WebP.`,
      };
    }
    if (imageBlob.size > MAX_FILE_SIZE) {
      const sizeMB = (imageBlob.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds 10 MB limit.`,
      };
    }
    return { valid: true };
  },

  async verifyFace(imageBlob: Blob): Promise<FaceVerificationResult> {
    const validation = this.validateImageFile(imageBlob);
    if (!validation.valid) {
      throw {
        message: validation.error!,
        code: "unknown" as VerificationError,
        status: 400,
      } as VerificationServiceError;
    }

    const token = storage.getToken();
    if (!token) {
      throw {
        message: "Authentication required. Please log in.",
        code: "unknown" as VerificationError,
        status: 401,
      } as VerificationServiceError;
    }

    const ext = imageBlob.type === "image/png" ? "png" : imageBlob.type === "image/webp" ? "webp" : "jpg";
    const formData = new FormData();
    const imageFile = new File([imageBlob], `verification.${ext}`, { type: imageBlob.type });
    formData.append("image", imageFile);

    const response = await fetch(`${API_BASE_URL}/face-verification/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      let errorBody: { message?: string } = {};
      try {
        errorBody = await response.json();
      } catch {
        // ignore parse error
      }
      const msg = errorBody.message || `Verification failed (${response.status})`;

      if (response.status === 503) {
        throw { message: "Face AI service is unavailable. Please try later.", code: "server_unavailable", status: 503 } as VerificationServiceError;
      }
      if (response.status === 400) {
        const lower = msg.toLowerCase();
        if (lower.includes("no face")) {
          throw { message: msg, code: "no_face", status: 400 } as VerificationServiceError;
        }
        if (lower.includes("multiple face")) {
          throw { message: msg, code: "multiple_faces", status: 400 } as VerificationServiceError;
        }
      }
      throw { message: msg, code: "unknown", status: response.status } as VerificationServiceError;
    }

    const json = await response.json();
    const data = json.data ?? json;
    return data as FaceVerificationResult;
  },
};