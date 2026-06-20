package com.cityparking.backend.controller;

import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.dto.document.DocumentExtractionResult;
import com.cityparking.backend.dto.user.UserResponse;
import com.cityparking.backend.entity.User;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.ai.DocumentExtractionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/document")
@RequiredArgsConstructor
public class DocumentExtractionController {

    private final DocumentExtractionService documentExtractionService;
    private final UserRepository userRepository;

    /**
     * Upload a university ID image, extract student information using
     * the configured DocumentExtractionService (mock or real Gemini),
     * and save the extracted data into the authenticated user's profile.
     */
    @PostMapping("/extract")
    public ResponseEntity<ApiResponse<DocumentExtractionResult>> extractDocument(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("image") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("File is empty"));
            }

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("File must be an image"));
            }

            byte[] imageBytes = file.getBytes();
            DocumentExtractionResult result = documentExtractionService.extractFromImage(imageBytes, contentType);

            if (result.isSuccess()) {
                // Save extracted data to user profile
                User user = userRepository.findByEmail(userDetails.getUsername())
                        .orElseThrow(() -> new RuntimeException("User not found"));

                user.setStudentName(result.getStudentName());
                user.setStudentId(result.getStudentId());
                user.setUniversityName(result.getUniversityName());
                user.setDepartment(result.getDepartment());
                user.setSession(result.getSession());
                userRepository.save(user);

                log.info("Document extraction successful and saved for user: {}", userDetails.getUsername());
            }

            return ResponseEntity.ok(ApiResponse.success("Document extracted successfully", result));

        } catch (Exception e) {
            log.error("Document extraction failed", e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Document extraction failed: " + e.getMessage()));
        }
    }
}