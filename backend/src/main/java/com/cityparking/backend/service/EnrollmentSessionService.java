package com.cityparking.backend.service;

import com.cityparking.backend.dto.enrollment.*;
import com.cityparking.backend.entity.*;
import com.cityparking.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for managing guided enrollment sessions.
 *
 * Orchestrates the multi-pose enrollment workflow:
 *   1. Create session with unique token
 *   2. Receive and store frames with pose labels
 *   3. Trigger async processing (quality check → embedding extraction → dedup)
 *   4. Store resulting embeddings
 *   5. Update user enrollment status
 */
@Service
public class EnrollmentSessionService {

    private static final Logger log = LoggerFactory.getLogger(EnrollmentSessionService.class);

    // Pose configuration for guided enrollment
    private static final List<StartSessionResponse.PoseConfig> POSE_CONFIGS = List.of(
            StartSessionResponse.PoseConfig.builder().name("center").instruction("Look straight at the camera").durationMs(2000).order(1).build(),
            StartSessionResponse.PoseConfig.builder().name("left").instruction("Slowly turn your head left").durationMs(2000).order(2).build(),
            StartSessionResponse.PoseConfig.builder().name("right").instruction("Slowly turn your head right").durationMs(2000).order(3).build(),
            StartSessionResponse.PoseConfig.builder().name("up").instruction("Tilt your head slightly up").durationMs(1500).order(4).build(),
            StartSessionResponse.PoseConfig.builder().name("down").instruction("Tilt your head slightly down").durationMs(1500).order(5).build(),
            StartSessionResponse.PoseConfig.builder().name("blink").instruction("Blink naturally 2-3 times").durationMs(2000).order(6).build(),
            StartSessionResponse.PoseConfig.builder().name("smile").instruction("Give a natural smile").durationMs(2000).order(7).build()
    );

    private static final int SESSION_EXPIRY_MINUTES = 5;
    private static final int MIN_FRAMES_PER_POSE = 4;

    private final EnrollmentSessionRepository sessionRepository;
    private final EnrollmentFrameRepository frameRepository;
    private final LivenessChallengeRepository livenessRepository;
    private final FaceEmbeddingRepository embeddingRepository;
    private final FaceEnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;

    public EnrollmentSessionService(
            EnrollmentSessionRepository sessionRepository,
            EnrollmentFrameRepository frameRepository,
            LivenessChallengeRepository livenessRepository,
            FaceEmbeddingRepository embeddingRepository,
            FaceEnrollmentRepository enrollmentRepository,
            UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.frameRepository = frameRepository;
        this.livenessRepository = livenessRepository;
        this.embeddingRepository = embeddingRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
    }

    /**
     * Start a new enrollment session for a user.
     */
    @Transactional
    public StartSessionResponse startSession(Long userId, String deviceInfo, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Generate unique session token
        String token = "ses_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        // Create session
        EnrollmentSession session = EnrollmentSession.builder()
                .user(user)
                .sessionToken(token)
                .status(EnrollmentSession.SessionStatus.INITIATED)
                .deviceInfo(deviceInfo)
                .ipAddress(ipAddress)
                .startedAt(LocalDateTime.now())
                .poseCompletion(new HashMap<>())
                .build();

        sessionRepository.save(session);

        log.info("Enrollment session started: token={}, userId={}", token, userId);

        return StartSessionResponse.builder()
                .sessionToken(token)
                .poses(POSE_CONFIGS)
                .captureConfig(StartSessionResponse.CaptureConfig.builder()
                        .targetFps(3)
                        .minFramesPerPose(4)
                        .maxFramesPerPose(8)
                        .imageFormat("jpeg")
                        .imageQuality(90)
                        .resolution(StartSessionResponse.CaptureConfig.Resolution.builder()
                                .width(640).height(480).build())
                        .build())
                .expiresAt(LocalDateTime.now().plusMinutes(SESSION_EXPIRY_MINUTES))
                .build();
    }

    /**
     * Get session status.
     */
    @Transactional(readOnly = true)
    public SessionStatusResponse getSessionStatus(String sessionToken) {
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        return SessionStatusResponse.builder()
                .sessionToken(session.getSessionToken())
                .status(session.getStatus().name())
                .totalFramesCaptured(session.getTotalFramesCaptured())
                .qualityFramesAccepted(session.getQualityFramesAccepted())
                .embeddingsGenerated(session.getEmbeddingsGenerated())
                .embeddingsAfterDedup(session.getEmbeddingsAfterDedup())
                .livenessPassed(session.getLivenessPassed())
                .livenessScore(session.getLivenessScore())
                .poseCompletion(session.getPoseCompletion())
                .sessionDurationSeconds(session.getSessionDurationSeconds())
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .build();
    }

    /**
     * Update session status to CAPTURING when frames start arriving.
     */
    @Transactional
    public void markCapturing(String sessionToken) {
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        if (session.getStatus() == EnrollmentSession.SessionStatus.INITIATED) {
            session.setStatus(EnrollmentSession.SessionStatus.CAPTURING);
            sessionRepository.save(session);
        }
    }

    /**
     * Record frames received for a session.
     */
    @Transactional
    public void recordFramesReceived(String sessionToken, int count) {
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        session.setTotalFramesCaptured(
                (session.getTotalFramesCaptured() != null ? session.getTotalFramesCaptured() : 0) + count
        );
        sessionRepository.save(session);
    }

    /**
     * Update session with processing results.
     */
    @Transactional
    public void completeSession(
            String sessionToken,
            int qualityFrames,
            int embeddingsGenerated,
            int embeddingsAfterDedup,
            Boolean livenessPassed,
            Double livenessScore
    ) {
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        session.setStatus(EnrollmentSession.SessionStatus.COMPLETED);
        session.setQualityFramesAccepted(qualityFrames);
        session.setEmbeddingsGenerated(embeddingsGenerated);
        session.setEmbeddingsAfterDedup(embeddingsAfterDedup);
        session.setLivenessPassed(livenessPassed);
        session.setLivenessScore(livenessScore);
        session.setCompletedAt(LocalDateTime.now());

        if (session.getStartedAt() != null) {
            long seconds = java.time.Duration.between(session.getStartedAt(), session.getCompletedAt()).getSeconds();
            session.setSessionDurationSeconds((double) seconds);
        }

        sessionRepository.save(session);

        // Update user enrollment status
        User user = session.getUser();
        user.setFaceEnrolled(true);
        user.setFaceEnrolledAt(LocalDateTime.now());
        user.setFaceEmbeddingCount(embeddingsAfterDedup);
        userRepository.save(user);

        log.info("Session {} completed: {} embeddings stored for user {}",
                sessionToken, embeddingsAfterDedup, session.getUserId());
    }

    /**
     * Mark session as failed.
     */
    @Transactional
    public void failSession(String sessionToken, String reason) {
        EnrollmentSession session = sessionRepository.findBySessionToken(sessionToken)
                .orElseThrow(() -> new RuntimeException("Session not found: " + sessionToken));

        session.setStatus(EnrollmentSession.SessionStatus.FAILED);
        session.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(session);

        log.error("Session {} failed: {}", sessionToken, reason);
    }

    /**
     * Cancel/abort a session.
     */
    @Transactional
    public boolean cancelSession(String sessionToken, Long userId) {
        Optional<EnrollmentSession> opt = sessionRepository.findBySessionToken(sessionToken);
        if (opt.isEmpty()) {
            return false;
        }

        EnrollmentSession session = opt.get();
        if (!session.getUserId().equals(userId)) {
            return false;
        }

        session.setStatus(EnrollmentSession.SessionStatus.EXPIRED);
        session.setCompletedAt(LocalDateTime.now());
        sessionRepository.save(session);

        return true;
    }

    /**
     * Get enrollment history for a user.
     */
    @Transactional(readOnly = true)
    public List<SessionStatusResponse> getSessionHistory(Long userId) {
        return sessionRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(s -> SessionStatusResponse.builder()
                        .sessionToken(s.getSessionToken())
                        .status(s.getStatus().name())
                        .totalFramesCaptured(s.getTotalFramesCaptured())
                        .qualityFramesAccepted(s.getQualityFramesAccepted())
                        .embeddingsGenerated(s.getEmbeddingsGenerated())
                        .embeddingsAfterDedup(s.getEmbeddingsAfterDedup())
                        .livenessPassed(s.getLivenessPassed())
                        .livenessScore(s.getLivenessScore())
                        .poseCompletion(s.getPoseCompletion())
                        .sessionDurationSeconds(s.getSessionDurationSeconds())
                        .startedAt(s.getStartedAt())
                        .completedAt(s.getCompletedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get the EnrollmentSession entity by token.
     */
    @Transactional(readOnly = true)
    public Optional<EnrollmentSession> findByToken(String sessionToken) {
        return sessionRepository.findBySessionToken(sessionToken);
    }
}
