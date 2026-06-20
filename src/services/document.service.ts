import { ApiResponse } from '../types/api.types';
import { DocumentExtractionResult } from '../types/document.types';
import { apiClient } from './api';

export const documentService = {
  async extractDocument(file: File): Promise<ApiResponse<DocumentExtractionResult>> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post<ApiResponse<DocumentExtractionResult>>(
      '/document/extract',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};