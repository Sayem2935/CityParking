package com.cityparking.backend.dto.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of extracting student information from a university ID image.
 * Designed to be agnostic of the underlying AI service so that the
 * real Gemini API can be swapped in later with zero frontend changes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentExtractionResult {

    private String studentName;
    private String studentId;
    private String universityName;
    private String department;
    private String session;

    /**
     * Confidence score between 0.0 and 1.0 indicating
     * how confident the extraction service is in the results.
     */
    private double confidence;

    /**
     * Whether the extraction was successful.
     */
    private boolean success;

    /**
     * Optional message describing any issues during extraction.
     */
    private String message;
}