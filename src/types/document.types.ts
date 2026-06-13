export interface DocumentExtractionResult {
  studentName: string;
  studentId: string;
  universityName: string;
  department: string;
  session: string;
  success: boolean;
  errorMessage: string | null;
}

export interface DocumentExtractionState {
  isUploading: boolean;
  isExtracting: boolean;
  error: string | null;
  extractionResult: DocumentExtractionResult | null;
}