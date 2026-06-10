package com.cityparking.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Security utility for file uploads.
 * - Sanitizes filenames to prevent path traversal
 * - Validates content types against an allowlist
 * - Validates file signatures (magic bytes) to prevent content-type spoofing
 */
@Component
@Slf4j
public class FileUploadSecurity {

    // Path traversal patterns
    private static final Pattern PATH_TRAVERSAL_PATTERN = Pattern.compile(
            "(\\.\\./|\\.\\\\|%2e%2e%2f|%2e%2e/|\\.\\.%2f|%2e%2e%5c|%252e%252e)",
            Pattern.CASE_INSENSITIVE
    );

    // Allowed content types for video/image uploads
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private static final Set<String> ALLOWED_VIDEO_TYPES = Set.of(
            "video/mp4", "video/webm", "video/quicktime"
    );

    // Magic bytes for file signature validation
    private static final Map<String, byte[][]> SIGNATURES = Map.of(
            "image/jpeg", new byte[][]{
                    {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}
            },
            "image/png", new byte[][]{
                    {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
            },
            "image/webp", new byte[][]{
                    {0x52, 0x49, 0x46, 0x46}  // "RIFF"
            },
            "video/mp4", new byte[][]{
                    {0x00, 0x00, 0x00},  // ftyp box at offset 4
                    {0x66, 0x74, 0x79, 0x70}  // "ftyp"
            },
            "video/webm", new byte[][]{
                    {(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3}
            },
            "video/quicktime", new byte[][]{
                    {0x00, 0x00, 0x00},
                    {0x66, 0x74, 0x79, 0x70, 0x71, 0x74}  // "ftypqt"
            }
    );

    private static final int MAX_FILENAME_LENGTH = 255;
    private static final int MAX_SIGNATURE_BYTES = 12;

    /**
     * Sanitize a filename: strip path components, remove dangerous characters,
     * and generate a safe unique filename.
     */
    public String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return UUID.randomUUID().toString();
        }

        // Check for path traversal
        if (PATH_TRAVERSAL_PATTERN.matcher(originalFilename).find()) {
            log.warn("Path traversal attempt detected in filename: {}", originalFilename);
            throw new SecurityException("Invalid filename: path traversal detected");
        }

        // Strip path separators and keep only the base name
        String basename = originalFilename;
        int lastSlash = Math.max(basename.lastIndexOf('/'), basename.lastIndexOf('\\'));
        if (lastSlash >= 0) {
            basename = basename.substring(lastSlash + 1);
        }

        // Remove null bytes and control characters
        basename = basename.replaceAll("[\\x00-\\x1f\\x7f]", "");

        // Remove dangerous characters, keep only alphanumeric, dash, underscore, dot
        basename = basename.replaceAll("[^a-zA-Z0-9._-]", "_");

        // Collapse multiple dots (prevent double extension attacks like shell.jpg.jsp)
        basename = basename.replaceAll("\\.{2,}", ".");

        // Limit length
        if (basename.length() > MAX_FILENAME_LENGTH) {
            int dotIdx = basename.lastIndexOf('.');
            if (dotIdx > 0) {
                String ext = basename.substring(dotIdx);
                basename = basename.substring(0, MAX_FILENAME_LENGTH - ext.length()) + ext;
            } else {
                basename = basename.substring(0, MAX_FILENAME_LENGTH);
            }
        }

        // Prepend UUID to prevent overwrite attacks
        String safeName = UUID.randomUUID().toString().substring(0, 8) + "_" + basename;
        return safeName;
    }

    /**
     * Validate that the content type is in the allowed set.
     */
    public void validateContentType(String contentType, boolean isVideo) {
        if (contentType == null || contentType.isBlank()) {
            throw new SecurityException("Content type is required");
        }

        Set<String> allowed = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES;
        if (!allowed.contains(contentType.toLowerCase())) {
            log.warn("Blocked upload with disallowed content type: {}", contentType);
            throw new SecurityException("Content type not allowed: " + contentType);
        }
    }

    /**
     * Validate file signature (magic bytes) matches the declared content type.
     * This prevents content-type spoofing by verifying the actual file content.
     */
    public void validateFileSignature(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new SecurityException("Content type is required");
        }

        byte[][] expectedSignatures = SIGNATURES.get(contentType.toLowerCase());
        if (expectedSignatures == null) {
            // No signature check available for this type, rely on content-type validation only
            return;
        }

        byte[] header = new byte[MAX_SIGNATURE_BYTES];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                throw new SecurityException("File is too small to validate signature");
            }
        }

        boolean signatureMatch = false;
        for (byte[] sig : expectedSignatures) {
            if (matchesSignature(header, sig)) {
                signatureMatch = true;
                break;
            }
        }

        if (!signatureMatch) {
            log.warn("File signature does not match declared content type: {}", contentType);
            throw new SecurityException("File signature does not match declared content type");
        }
    }

    /**
     * Comprehensive file upload validation.
     */
    public String validateAndSanitize(MultipartFile file, boolean isVideo) {
        // 1. Validate content type
        validateContentType(file.getContentType(), isVideo);

        // 2. Validate file signature
        try {
            validateFileSignature(file);
        } catch (IOException e) {
            throw new SecurityException("Failed to read file for signature validation");
        }

        // 3. Sanitize filename
        return sanitizeFilename(file.getOriginalFilename());
    }

    private boolean matchesSignature(byte[] header, byte[] signature) {
        if (signature.length > header.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (header[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}