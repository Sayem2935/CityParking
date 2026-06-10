package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingRlDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingRlDecisionRepository extends JpaRepository<ParkingRlDecision, Long> {

    List<ParkingRlDecision> findTop50ByOrderByCreatedAtDesc();

    List<ParkingRlDecision> findByEpisodeOrderByCreatedAtDesc(Integer episode);

    Optional<ParkingRlDecision> findTopByOrderByEpisodeDesc();

    @Query("SELECT d FROM ParkingRlDecision d WHERE d.episode >= :fromEpisode ORDER BY d.episode DESC")
    List<ParkingRlDecision> findByEpisodeGreaterThanEqual(@Param("fromEpisode") Integer fromEpisode);

    @Query("SELECT AVG(d.reward) FROM ParkingRlDecision d WHERE d.episode = :episode")
    Double getAverageRewardByEpisode(@Param("episode") Integer episode);
}