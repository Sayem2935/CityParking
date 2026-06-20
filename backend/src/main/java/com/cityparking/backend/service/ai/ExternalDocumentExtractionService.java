package com.cityparking.backend.service.ai;

import com.cityparking.backend.dto.document.DocumentExtractionResult;
import com.cityparking.backend.dto.document.ExternalExtractionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * DocumentExtractionService implementation that calls the external ParkFlow
 * university ID extraction API.
 *
 * Activated when ai.provider.document=external (or ai.provider=external).
 *
 * External API:
 *   POST https://parkflow-api-1019160469821.us-central1.run.app/api/extract-student-id
 *   Multipart field: image
 *
 * Maps response:
 *   name -> studentName
 *   id_number -> studentId
 *   department -> department
 *   universityName -> "Daffodil International University" (always)
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "ai.provider.document", havingValue = "external")
public class ExternalDocumentExtractionService implements DocumentExtractionService {

    private static final String EXTERNAL_API_URL =
            "https://parkflow-api-1019160469821.us-central1.run.app/api/extract-student-id";

    private static final String UNIVERSITY_NAME = "Daffodil International University";

    private final RestTemplate restTemplate;

    public ExternalDocumentExtractionService() {
        this.restTemplate = new RestTemplate();
        // Configure timeouts
        this.restTemplate.setRequestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {{
            setConnectTimeout(10000);
            setReadTimeout(30000);
        }});
    }

    @Override
    public DocumentExtractionResult extractFromImage(byte[] imageBytes, String contentType) {
        log.info("Uploading image to external extraction API ({} bytes, type: {})", imageBytes.length, contentType);

        try {
            // Build multipart request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource imageResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "student-id" + getExtension(contentType);
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new HttpEntity<>(imageResource, headers));

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            log.info("Calling extraction API at {}", EXTERNAL_API_URL);

            ResponseEntity<ExternalExtractionResponse> response = restTemplate.exchange(
                    EXTERNAL_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    ExternalExtractionResponse.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                ExternalExtractionResponse externalResponse = response.getBody();

                if (externalResponse.getName() == null && externalResponse.getIdNumber() == null) {
                    log.warn("Extraction API returned empty response");
                    return DocumentExtractionResult.builder()
                            .success(false)
                            .message("Extraction API returned empty response. Please upload a clearer image.")
                            .build();
                }

                log.info("Extraction success: name={}, id={}, dept={}",
                        externalResponse.getName(),
                        externalResponse.getIdNumber(),
                        externalResponse.getDepartment());

                return DocumentExtractionResult.builder()
                        .success(true)
                        .studentName(externalResponse.getName())
                        .studentId(externalResponse.getIdNumber())
                        .department(externalResponse.getDepartment())
                        .universityName(UNIVERSITY_NAME)
                        .message("Document extracted successfully")
                        .build();
            }

            log.warn("Extraction API returned non-success status: {}", response.getStatusCode());
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Extraction API returned unexpected status: " + response.getStatusCode())
                    .build();

        } catch (HttpClientErrorException e) {
            log.error("Extraction API returned HTTP 4xx: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Invalid request to extraction service (HTTP " + e.getStatusCode().value() + "). Please check the image format.")
                    .build();

        } catch (HttpServerErrorException e) {
            log.error("Extraction API returned HTTP 5xx: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Extraction service is temporarily unavailable. Please try again later.")
                    .build();

        } catch (ResourceAccessException e) {
            log.error("Extraction API timeout or connection error: {}", e.getMessage());
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Connection to extraction service timed out. Please try again.")
                    .build();

        } catch (Exception e) {
            log.error("Unexpected error during document extraction: {}", e.getMessage(), e);
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("An unexpected error occurred during document extraction.")
                    .build();
        }
    }

    /**
     * Extract image from a MultipartFile directly (for controller convenience).
     */
    public DocumentExtractionResult extractFromMultipartFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("Empty file submitted for extraction");
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("No image file provided. Please upload an image of your university ID.")
                    .build();
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("Invalid file type submitted: {}", contentType);
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Invalid file type. Please upload a JPEG or PNG image.")
                    .build();
        }

        try {
            byte[] imageBytes = file.getBytes();
            return extractFromImage(imageBytes, contentType);
        } catch (IOException e) {
            log.error("Failed to read uploaded file: {}", e.getMessage());
            return DocumentExtractionResult.builder()
                    .success(false)
                    .message("Failed to read uploaded file. Please try again.")
                    .build();
        }
    }

    private String getExtension(String contentType) {
        if (contentType == null) return ".jpg";
        return switch (contentType.toLowerCase()) {
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}