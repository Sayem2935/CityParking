package com.cityparking.backend.repository;

import com.cityparking.backend.entity.LivenessChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LivenessChallengeRepository extends JpaRepository<LivenessChallenge, Long> {

    List<LivenessChallenge> findBySessionId(Long sessionId);

    List<LivenessChallenge> findBySessionIdAndPassed(Long sessionId, Boolean passed);
}
