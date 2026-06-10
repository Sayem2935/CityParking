package com.cityparking.backend.repository;

import com.cityparking.backend.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("AccessDecisionRepository Tests")
class AccessDecisionRepositoryTest {

    @Autowired
    private AccessDecisionRepository accessDecisionRepository;

    @Autowired
    private AccessLogRepository accessLogRepository;

    @Autowired
    private SecurityEventRepository securityEventRepository;

    @Autowired
    private UserRepository userRepository;

    private User savedUser;
    private AccessLog savedLog;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john@example.com");
        user.setPassword("encoded_password");
        user.setPhone("+1234567890");
        user.setRole(User.Role.USER);
        savedUser = userRepository.save(user);

        AccessLog log = new AccessLog();
        log.setUser(savedUser);
        log.setDecision(AccessDecision.ACCESS_GRANTED);
        log.setFaceVerified(true);
        log.setPlateVerified(true);
        log.setFaceConfidence(0.95);
        log.setPlateConfidence(0.98);
        savedLog = accessDecisionRepository.save(log);
    }

    @Test
    @DisplayName("Should find latest decision by user ID")
    void findTopByUserIdOrderByCreatedAtDesc() {
        Optional<AccessLog> found = accessDecisionRepository.findTopByUserIdOrderByCreatedAtDesc(savedUser.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getDecision()).isEqualTo(AccessDecision.ACCESS_GRANTED);
    }

    @Test
    @DisplayName("Should find decisions by user ID")
    void findByUserIdOrderByCreatedAtDesc() {
        List<AccessLog> decisions = accessDecisionRepository.findByUserIdOrderByCreatedAtDesc(savedUser.getId());

        assertThat(decisions).hasSize(1);
    }

    @Test
    @DisplayName("Should count decisions by decision type since date")
    void countByDecisionSince() {
        long count = accessDecisionRepository.countByDecisionSince(AccessDecision.ACCESS_GRANTED, LocalDateTime.now().minusDays(1));

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should count all decisions since date")
    void countSince() {
        long count = accessDecisionRepository.countSince(LocalDateTime.now().minusDays(1));

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should find decisions by date range")
    void findByDateRange() {
        List<AccessLog> decisions = accessDecisionRepository.findByDateRange(
                LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));

        assertThat(decisions).hasSize(1);
    }

    @Test
    @DisplayName("Should save and retrieve access log via accessLogRepository")
    void accessLogSave() {
        AccessLog log = new AccessLog();
        log.setUser(savedUser);
        log.setDecision(AccessDecision.ACCESS_DENIED);
        log.setFaceVerified(false);
        log.setPlateVerified(true);
        AccessLog saved = accessLogRepository.save(log);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getDecision()).isEqualTo(AccessDecision.ACCESS_DENIED);
    }

    @Test
    @DisplayName("Should save and retrieve security event")
    void securityEventSave() {
        SecurityEvent event = new SecurityEvent();
        event.setEventType(SecurityEventType.FACE_MISMATCH);
        event.setUser(savedUser);
        event.setDescription("Face verification failed");
        event.setSeverity(SecurityEvent.Severity.MEDIUM);
        event.setCreatedAt(LocalDateTime.now());
        SecurityEvent saved = securityEventRepository.save(event);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getEventType()).isEqualTo(SecurityEventType.FACE_MISMATCH);
    }
}