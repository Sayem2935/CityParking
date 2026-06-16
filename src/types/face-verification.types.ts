/** Verification step in the face verification flow */
export type VerificationStep = 'camera' | 'preview' | 'verifying' | 'result';

/** Specific error types for verification failures */
export type VerificationError =
  | 'no_face'
  | 'multiple_faces'
  | 'camera_unavailable'
  | 'network'
  | 'server_unavailable'
  | 'unknown';

/** Result returned from the face verification API */
export interface FaceVerificationResult {
  verified: boolean;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  confidence: number;
  externalFaceId: string | null;
  message: string;
  provider: string | null;
  multipleFacesDetected: boolean;
}

/** Verification session state */
export interface VerificationSession {
  id: string;
  imageBlob: Blob | null;
  imageUrl: string | null;
  capturedAt: string;
  verified: boolean;
}

/** Processing stage for the progress indicator */
export type VerificationStage =
  | 'idle'
  | 'uploading'
  | 'detecting'
  | 'comparing'
  | 'complete';

/** Stages configuration */
export interface ProcessingStage {
  id: VerificationStage;
  label: string;
  description: string;
}