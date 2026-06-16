package com.cityparking.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates all required environment variables at application startup.
 * Application will fail fast if critical configuration is missing or invalid.
 */
@Component
@Slf4j
@Profile("!test")
public class StartupValidator {

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    @Value("${spring.datasource.username:}")
    private String dbUsername;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${app.jwt.secret:}")
    private String jwtSecret;

    @Value("${ai.service.url:}")
    private String aiServiceUrl;

    @Value("${ai.provider.face:mock}")
    private String faceProvider;

    @Value("${insightface.base-url:http://localhost:8001}")
    private String insightfaceBaseUrl;

    @Value("${insightface.similarity-threshold:0.45}")
    private double insightfaceThreshold;

    @Autowired
    private ApplicationContext applicationContext;

    @PostConstruct
    public void validate() {
        log.info("═══════════════════════════════════════════════════");
        log.info("  CityParking Backend - Startup Validation");
        log.info("═══════════════════════════════════════════════════");

        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Database validation
        if (dbUrl.isEmpty()) {
            errors.add("DB_URL / spring.datasource.url is required");
        } else {
            log.info("  ✓ Database URL configured: {}", maskUrl(dbUrl));
        }
        if (dbUsername.isEmpty()) {
            errors.add("DB_USERNAME / spring.datasource.username is required");
        } else {
            log.info("  ✓ Database username configured: {}", dbUsername);
        }
        if (dbPassword.isEmpty()) {
            errors.add("DB_PASSWORD / spring.datasource.password is required");
        } else {
            log.info("  ✓ Database password configured: ******");
        }

        // JWT validation
        if (jwtSecret.isEmpty()) {
            errors.add("JWT_SECRET / app.jwt.secret is required");
        } else if (jwtSecret.length() < 32) {
            errors.add("JWT_SECRET must be at least 32 characters (current: " + jwtSecret.length() + ")");
        } else if (jwtSecret.contains("changeMe") || jwtSecret.contains("secret") || jwtSecret.equals("defaultSecretKeyForDevelopmentOnly12345678901234567890")) {
            warnings.add("JWT_SECRET appears to be a default/placeholder value - change before production deployment");
        } else {
            log.info("  ✓ JWT secret configured ({} chars)", jwtSecret.length());
        }

        // AI Service validation
        if (aiServiceUrl.isEmpty()) {
            warnings.add("AI_SERVICE_URL is not configured - AI features will be unavailable");
        } else {
            log.info("  ✓ AI service URL configured: {}", aiServiceUrl);
        }

        // ── Face Provider Startup Logging ──────────────────────────────
        log.info("───────────────────────────────────────────────────");
        log.info("  FACE RECOGNITION PROVIDER");
        log.info("───────────────────────────────────────────────────");
        log.info("  Active face provider       : {}", faceProvider.toUpperCase());
        if ("insightface".equalsIgnoreCase(faceProvider)) {
            log.info("  InsightFace URL            : {}", insightfaceBaseUrl);
            log.info("  Similarity threshold       : {}", insightfaceThreshold);

            // Verify the InsightFaceFaceRecognitionService bean is loaded
            boolean insightfaceBeanLoaded = applicationContext.getBeansOfType(
                    com.cityparking.backend.service.ai.FaceRecognitionService.class)
                    .values().stream()
                    .anyMatch(b -> b.getClass().getSimpleName().equals("InsightFaceFaceRecognitionService"));
            log.info("  InsightFaceService loaded  : {}", insightfaceBeanLoaded);

            // Verify MockFaceRecognitionService is NOT active
            boolean mockBeanLoaded = applicationContext.getBeansOfType(
                    com.cityparking.backend.service.ai.FaceRecognitionService.class)
                    .values().stream()
                    .anyMatch(b -> b.getClass().getSimpleName().equals("MockFaceRecognitionService"));
            if (mockBeanLoaded) {
                log.warn("  ⚠ MockFaceRecognitionService is ALSO loaded — this should NOT happen!");
            } else {
                log.info("  MockFaceService active     : false (correct)");
            }

            if (!insightfaceBeanLoaded) {
                warnings.add("InsightFace provider selected but InsightFaceFaceRecognitionService bean was NOT loaded — check ai.provider.face property");
            }
        } else if ("mock".equalsIgnoreCase(faceProvider)) {
            log.warn("  ⚠ Face provider is MOCK — no real face recognition will occur!");
        }

        // Print warnings
        if (!warnings.isEmpty()) {
            log.warn("───────────────────────────────────────────────────");
            log.warn("  WARNINGS:");
            for (String warning : warnings) {
                log.warn("  ⚠ {}", warning);
            }
            log.warn("───────────────────────────────────────────────────");
        }

        // Fail fast on errors
        if (!errors.isEmpty()) {
            log.error("───────────────────────────────────────────────────");
            log.error("  STARTUP VALIDATION FAILED - Missing required configuration:");
            for (String error : errors) {
                log.error("  ✗ {}", error);
            }
            log.error("───────────────────────────────────────────────────");
            throw new IllegalStateException(
                    "Startup validation failed. Missing required environment variables: " +
                    String.join(", ", errors));
        }

        log.info("───────────────────────────────────────────────────");
        log.info("  ✓ All required configuration validated successfully");
        log.info("═══════════════════════════════════════════════════");
    }

    private String maskUrl(String url) {
        // Mask password in JDBC URL if present
        return url.replaceAll("password=[^&;]*", "password=******");
    }
}