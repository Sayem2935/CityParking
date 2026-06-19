package com.cityparking.backend.controller;

import com.cityparking.backend.dto.enrollment.*;
import com.cityparking.backend.entity.*;
import com.cityparking.backend.repository.EnrollmentFrameRepository;
import com.cityparking.backend.repository.FaceEmbeddingRepository;
import com.cityparking.backend.repository.FaceEnrollmentRepository;
import com.cityparking.backend.repository.UserRepository;
import com.cityparking.backend.service.EnrollmentProcessingService;
import com.cityparking.backend.service.EnrollmentSessionService;
import com.cityparking.backend.service.ai.InsightFaceClient;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for guided enrollment sessions.
 *
 * Endpoints:
 *   POST   /api/enrollment/sessions/start              — Initialize session
 *   POST   /api/enrollment/sessions/{token}/frames      — Upload frames
 *   POST   /api/enrollment/sessions/{token}/process     — Trigger processing
 *   GET    /api/enrollment/sessions/{token}/status       — Poll status
 *   DELETE /api/enrollment/sessions/{token}              — Cancel session
 *   GET    /api/enrollment/sessions/history              — User's past sessions
 */
@RestController
@RequestMapping("/api/enrollment/sessions")
public class EnrollmentSessionController {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentSessionController.class);

    private final EnrollmentSessionService sessionService;
    private final EnrollmentProcessingService processingService;
    private final InsightFaceClient insightFaceClient;
    private final EnrollmentFrameRepository frameRepository;
    private final FaceEmbeddingRepository embeddingRepository;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    public EnrollmentSessionController(
            EnrollmentSessionService sessionService,
            EnrollmentProcessingService processingService,
            InsightFaceClient insightFaceClient,
            EnrollmentFrameRepository frameRepository,
            FaceEmbeddingRepository embeddingRepository,
            FaceEnrollmentRepository enrollmentRepository,
            UserRepository userRepository) {
        this.sessionService = sessionService;
        this.processingService = processingService;
        this.insightFaceClient = insightFaceClient;
        this.frameRepository = frameRepository;
        this.embeddingRepository = embeddingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
    }

    /**
     * POST /api/enrollment/sessions/start
     * Initialize a new guided enrollment session.
     */
    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSession(
            Authentication authentication,
            HttpServletRequest request) {

        Long userId = getUserId(authentication);
        String deviceInfo = request.getHeader("User-Agent");
        String ipAddress = request.getRemoteAddr();

        StartSessionResponse response = sessionService.startSession(userId, deviceInfo, ipAddress);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", response
        ));
    }

    /**
     * POST /api/enrollment/sessions/{token}/frames
     * Upload a batch of captured frames for a pose.
     */
    @PostMapping("/{token}/frames")
    public ResponseEntity<Map<String, Object>> uploadFrames(
            @PathVariable String token,
            @RequestParam("poseLabel") String poseLabel,
            @RequestParam("frames") MultipartFile[] frames,
            Authentication authentication) {

        Long userId = getUserId(authentication);

        // Verify session exists and belongs to user
        EnrollmentSession session = sessionService.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Session not found: " + token));

        if (!session.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", "Session does not belong to user"));
        }

        // Update session status to CAPTURING
        sessionService.markCapturing(token);

        int accepted = 0;
        int rejected = 0;
        List<FrameUploadResponse.RejectionDetail> rejections = new ArrayList<>();

        for (int i = 0; i < frames.length; i++) {
            MultipartFile file = frames[i];
            try {
                byte[] bytes = file.getBytes();
                if (bytes.length == 0) {
                    rejections.add(FrameUploadResponse.RejectionDetail.builder()
                            .frameIndex(i).reason("empty_file").build());
                    rejected++;
                    continue;
                }

                // Save frame to temp storage
                String framePath = saveFrameToTemp(session.getId(), i, poseLabel, bytes);

                // Create frame record
                EnrollmentFrame frame = EnrollmentFrame.builder()
                        .session(session)
                        .frameIndex(i)
                        .poseLabel(poseLabel)
                        .passedQuality(true) // Quality checked during processing
                        .framePath(framePath)
                        .capturedAt(LocalDateTime.now())
                        .build();
                frameRepository.save(frame);
                accepted++;

            } catch (IOException e) {
                log.error("Failed to process frame {}: {}", i, e.getMessage());
                rejections.add(FrameUploadResponse.RejectionDetail.builder()
                        .frameIndex(i).reason("io_error").build());
                rejected++;
            }
        }

        // Update session frame count
        sessionService.recordFramesReceived(token, accepted);

        // Build pose progress
        Map<String, FrameUploadResponse.PoseProgress> poseProgress = buildPoseProgress(session.getId());

        FrameUploadResponse response = FrameUploadResponse.builder()
                .framesReceived(frames.length)
                .framesAccepted(accepted)
                .framesRejected(rejected)
                .rejectionReasons(rejections)
                .poseProgress(poseProgress)
                .build();

        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }

    /**
     * POST /api/enrollment/sessions/{token}/validate-frame
     * Validate a single frame in real-time.
     */
    @PostMapping("/{token}/validate-frame")
    public ResponseEntity<Map<String, Object>> validateFrame(
            @PathVariable String token,
            @RequestParam("frame") MultipartFile frame,
            @RequestParam("poseLabel") String poseLabel,
            Authentication authentication) {

        Long userId = getUserId(authentication);
        EnrollmentSession session = sessionService.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Session not found: " + token));

        if (!session.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", "Session does not belong to user"));
        }

        try {
            byte[] bytes = frame.getBytes();
            if (bytes.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Empty frame"));
            }

            // Call FastAPI to validate the frame
            com.cityparking.backend.dto.enrollment.ValidateFrameResponse valResponse = 
                insightFaceClient.validateFrame(bytes, poseLabel);

            log.debug("[validate-frame] poseLabel={}, poseMetrics={}, qualityMetrics={}",
                    poseLabel, valResponse.getPoseMetrics(), valResponse.getQualityMetrics());

            // If valid, save it
            if (valResponse.isValid()) {
                // How many valid frames do we currently have for this pose?
                long currentValidFrames = frameRepository.findBySessionIdAndPoseLabel(session.getId(), poseLabel).stream()
                        .filter(f -> Boolean.TRUE.equals(f.getPassedQuality()))
                        .count();

                // Save frame
                String framePath = saveFrameToTemp(session.getId(), (int) currentValidFrames, poseLabel, bytes);
                EnrollmentFrame validFrame = EnrollmentFrame.builder()
                        .session(session)
                        .frameIndex((int) currentValidFrames)
                        .poseLabel(poseLabel)
                        .passedQuality(true)
                        .framePath(framePath)
                        .capturedAt(LocalDateTime.now())
                        .build();
                frameRepository.save(validFrame);
                
                sessionService.recordFramesReceived(token, 1);
                
                long updatedFrameCount = currentValidFrames + 1;
                
                // Bug 3 fix: Use MIN_FRAMES_PER_POSE (4) consistently
                valResponse.setAcceptedFrames((int) updatedFrameCount);
                valResponse.setTargetFrames(4);  // matches frontend TARGET_FRAMES_PER_POSE
                if (updatedFrameCount >= 4) {
                    valResponse.setPoseComplete(true);
                }
            } else {
                // Even for invalid frames, report current accepted count
                long currentValidFrames = frameRepository.findBySessionIdAndPoseLabel(session.getId(), poseLabel).stream()
                        .filter(f -> Boolean.TRUE.equals(f.getPassedQuality()))
                        .count();
                valResponse.setAcceptedFrames((int) currentValidFrames);
                valResponse.setTargetFrames(4);
            }

            return ResponseEntity.ok(Map.of("success", true, "data", valResponse));
        } catch (IOException e) {
            log.error("Failed to read frame: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "error", "IO Error"));
        }
    }

    /**
     * POST /api/enrollment/sessions/{token}/process
     * Trigger async processing of the session's frames.
     */
    @PostMapping("/{token}/process")
    public ResponseEntity<Map<String, Object>> processSession(
            @PathVariable String token,
            Authentication authentication) {

        Long userId = getUserId(authentication);

        EnrollmentSession session = sessionService.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Session not found: " + token));

        if (!session.getUserId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "error", "Session does not belong to user"));
        }

        // Run heavy processing asynchronously using CompletableFuture
        // Pass the session ID and token to avoid lazy-loading issues in the async thread
        Long sessionId = session.getId();
        String sessionToken = session.getSessionToken();
        Long sessionUserId = session.getUserId();
        java.util.concurrent.CompletableFuture.runAsync(
                () -> processSessionAsync(sessionId, sessionToken, sessionUserId),
                java.util.concurrent.Executors.newSingleThreadExecutor()
        );

        return ResponseEntity.accepted().body(Map.of(
                "success", true,
                "data", Map.of(
                        "sessionToken", token,
                        "status", "PROCESSING",
                        "estimatedDurationSeconds", 15,
                        "pollUrl", "/api/enrollment/sessions/" + token + "/status"
                )
        ));
    }

    /**
     * GET /api/enrollment/sessions/{token}/status
     * Poll session processing status.
     */
    @GetMapping("/{token}/status")
    public ResponseEntity<Map<String, Object>> getStatus(
            @PathVariable String token,
            Authentication authentication) {

        SessionStatusResponse response = sessionService.getSessionStatus(token);

        return ResponseEntity.ok(Map.of("success", true, "data", response));
    }

    /**
     * DELETE /api/enrollment/sessions/{token}
     * Cancel/abort a session.
     */
    @DeleteMapping("/{token}")
    public ResponseEntity<Map<String, Object>> cancelSession(
            @PathVariable String token,
            Authentication authentication) {

        Long userId = getUserId(authentication);
        boolean cancelled = sessionService.cancelSession(token, userId);

        if (cancelled) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Session cancelled"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("success", false, "error", "Session not found or not owned by user"));
    }

    /**
     * GET /api/enrollment/sessions/history
     * List user's past enrollment sessions.
     */
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getHistory(Authentication authentication) {
        Long userId = getUserId(authentication);
        List<SessionStatusResponse> history = sessionService.getSessionHistory(userId);

        return ResponseEntity.ok(Map.of("success", true, "data", history));
    }

    // ── Async Processing ─────────────────────────────────────

    /**
     * Async processing method. Runs in a CompletableFuture thread with NO Hibernate session.
     *
     * Frame data (paths and pose labels) are read as plain values.
     * The FastAPI call is made outside any transaction.
     * All Hibernate entity operations are delegated to EnrollmentProcessingService
     * which runs inside a single @Transactional boundary, preventing
     * detached-entity and lazy-initialization errors.
     */
    private void processSessionAsync(Long sessionId, String token, Long userId) {
        log.info("[processing] Starting async processing for session {}", token);

        List<EnrollmentFrame> frames = null;
        try {
            // Load frames using repository (each repo call opens/closes its own short transaction).
            // We only need the framePath and poseLabel as plain strings.
            frames = frameRepository.findBySessionIdOrderByFrameIndex(sessionId);

            if (frames.isEmpty()) {
                sessionService.failSession(token, "No frames to process");
                return;
            }

            // Read frame bytes from disk and collect pose labels
            List<byte[]> frameBytes = new ArrayList<>();
            List<String> poseLabels = new ArrayList<>();

            for (EnrollmentFrame frame : frames) {
                try {
                    Path path = Paths.get(frame.getFramePath());
                    if (Files.exists(path)) {
                        byte[] bytes = Files.readAllBytes(path);
                        frameBytes.add(bytes);
                        poseLabels.add(frame.getPoseLabel());
                    }
                } catch (IOException e) {
                    log.warn("Failed to read frame {}: {}", frame.getId(), e.getMessage());
                }
            }

            if (frameBytes.isEmpty()) {
                sessionService.failSession(token, "No readable frames");
                return;
            }

            log.info("[processing] userId={}, frameBytesLoaded={}, poseLabels={}", userId, frameBytes.size(), poseLabels);

            // Mark session as PROCESSING (via @Transactional service method)
            sessionService.markProcessing(token);

            // Call FastAPI batch enrollment (outside any Hibernate transaction)
            InsightFaceClient.BatchEnrollResult result = insightFaceClient.batchEnroll(
                    frameBytes, poseLabels, userId.intValue()
            );

            if (!result.isSuccess() || result.getEmbeddings() == null || result.getEmbeddings().isEmpty()) {
                String detail = String.format(
                    "Batch enrollment returned no embeddings. success=%s, totalFrames=%d, qualityPassed=%d, " +
                    "qualityFailed=%d, embeddingsExtracted=%d, embeddingsAfterDedup=%d, embeddingsListSize=%d",
                    result.isSuccess(), result.getTotalFrames(), result.getQualityPassed(),
                    result.getQualityFailed(), result.getEmbeddingsExtracted(),
                    result.getEmbeddingsAfterDedup(),
                    result.getEmbeddings() != null ? result.getEmbeddings().size() : 0
                );
                log.error(detail);
                sessionService.failSession(token, detail);
                return;
            }

            // Delegate all Hibernate entity operations to the @Transactional service.
            // This re-loads User, Session, and Enrollment within a single open transaction,
            // preventing detached-entity and lazy-initialization errors.
            processingService.storeEnrollmentResults(token, userId, result);

            log.info("[processing] Session {} completed successfully. Embeddings: {}", token, result.getEmbeddingsAfterDedup());

            // Cleanup temp frame files (plain I/O, no Hibernate)
            cleanupFrameFiles(frames);

        } catch (Exception e) {
            log.error("Session processing failed for {}: {}", token, e.getMessage(), e);
            sessionService.failSession(token, e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────

    private Long getUserId(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(com.cityparking.backend.entity.User::getId)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found: " + email));
    }

    private String saveFrameToTemp(Long sessionId, int frameIndex, String poseLabel, byte[] data) throws IOException {
        Path dir = Paths.get(System.getProperty("java.io.tmpdir"), "cityparking", "frames", String.valueOf(sessionId));
        Files.createDirectories(dir);
        String filename = String.format("%s_%03d.jpg", poseLabel, frameIndex);
        Path filePath = dir.resolve(filename);
        Files.write(filePath, data);
        return filePath.toString();
    }

    private Map<String, FrameUploadResponse.PoseProgress> buildPoseProgress(Long sessionId) {
        Map<String, FrameUploadResponse.PoseProgress> progress = new LinkedHashMap<>();
        for (String pose : List.of("center", "left", "right", "up", "down", "blink", "smile")) {
            List<EnrollmentFrame> poseFrames = frameRepository.findBySessionIdAndPoseLabel(sessionId, pose);
            int count = poseFrames.size();
            progress.put(pose, FrameUploadResponse.PoseProgress.builder()
                    .complete(count >= 4)
                    .framesAccepted(count)
                    .build());
        }
        return progress;
    }

    private void cleanupFrameFiles(List<EnrollmentFrame> frames) {
        for (EnrollmentFrame frame : frames) {
            if (frame.getFramePath() != null) {
                try {
                    Files.deleteIfExists(Paths.get(frame.getFramePath()));
                } catch (IOException e) {
                    log.warn("Failed to delete frame file: {}", frame.getFramePath());
                }
            }
        }
    }
}
