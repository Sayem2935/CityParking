package com.cityparking.backend.repository;

import com.cityparking.backend.entity.EnrollmentFrame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentFrameRepository extends JpaRepository<EnrollmentFrame, Long> {

    List<EnrollmentFrame> findBySessionIdOrderByFrameIndex(Long sessionId);

    List<EnrollmentFrame> findBySessionIdAndPassedQualityTrue(Long sessionId);

    List<EnrollmentFrame> findBySessionIdAndPoseLabel(Long sessionId, String poseLabel);

    long countBySessionId(Long sessionId);

    long countBySessionIdAndPassedQualityTrue(Long sessionId);

    void deleteBySessionId(Long sessionId);
}
