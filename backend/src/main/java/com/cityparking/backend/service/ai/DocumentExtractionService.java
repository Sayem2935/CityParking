package com.cityparking.backend.service.ai;

import com.cityparking.backend.dto.document.DocumentExtractionResult;

/**
 * Interface for extracting student information from university ID document images.
 * Implementations should be AI-service agnostic so that swapping between
 * mock and real Gemini API requires only a bean configuration change.
 */
public interface DocumentExtractionService {

    /**
     * Extract student information from an uploaded university ID image.
     *
     * @param imageBytes the raw bytes of the uploaded image
     * @param contentType the MIME type of the image (e.g., "image/jpeg", "image/png")
     * @return a DocumentExtractionResult containing the extracted fields
     */
    DocumentExtractionResult extractFromImage(byte[] imageBytes, String contentType);
}