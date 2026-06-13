package com.cityparking.backend.service.ai;

import com.cityparking.backend.dto.document.DocumentExtractionResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Mock implementation of DocumentExtractionService that simulates
 * extracting student information from a university ID image.
 * This service is active when ai.provider=mock (default).
 *
 * To switch to real Gemini API, create a GeminiDocumentService
 * implementing DocumentExtractionService and change the ai.provider
 * property to "gemini". Zero frontend changes required.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "ai.provider", havingValue = "mock", matchIfMissing = true)
public class MockGeminiDocumentService implements DocumentExtractionService {

    @Override
    public DocumentExtractionResult extractFromImage(byte[] imageBytes, String contentType) {
        log.info("MockGeminiDocumentService: Simulating document extraction from image ({} bytes, type: {})",
                imageBytes.length, contentType);

        // Simulate processing delay
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Return mock extracted data
        return DocumentExtractionResult.builder()
                .studentName("John Doe")
                .studentId("STU-2024-001")
                .universityName("City University")
                .department("Computer Science")
                .session("2023-2024")
                .confidence(0.92)
                .success(true)
                .message("Document extracted successfully (mock)")
                .build();
    }
}