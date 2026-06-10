package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingAssignment;
import com.cityparking.backend.entity.ParkingAssignment.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingAssignmentRepository extends JpaRepository<ParkingAssignment, Long> {

    List<ParkingAssignment> findByUserId(Long userId);

    List<ParkingAssignment> findByVehicleId(Long vehicleId);

    List<ParkingAssignment> findByStatus(AssignmentStatus status);

    Optional<ParkingAssignment> findByStatusAndSlot_SlotCode(AssignmentStatus status, String slotCode);

    Optional<ParkingAssignment> findByStatusAndUserId(AssignmentStatus status, Long userId);

    Optional<ParkingAssignment> findByVehicleIdAndStatus(Long vehicleId, AssignmentStatus status);

    List<ParkingAssignment> findByUserIdAndStatus(Long userId, AssignmentStatus status);

    long countByStatus(AssignmentStatus status);

    @Query("SELECT COUNT(a) FROM ParkingAssignment a WHERE a.status = 'ACTIVE' AND a.slot.floorNumber = :floor")
    long countActiveByFloor(@Param("floor") Integer floor);

    @Query("SELECT a FROM ParkingAssignment a WHERE a.status = 'ACTIVE' AND a.assignedAt < :threshold")
    List<ParkingAssignment> findExpiredAssignments(@Param("threshold") LocalDateTime threshold);

    @Query("SELECT a.assignedAt, COUNT(a) FROM ParkingAssignment a WHERE a.assignedAt BETWEEN :start AND :end GROUP BY a.assignedAt ORDER BY a.assignedAt")
    List<Object[]> countAssignmentsByTimeRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT a.slot.zone, COUNT(a) FROM ParkingAssignment a WHERE a.status = 'ACTIVE' GROUP BY a.slot.zone ORDER BY a.slot.zone")
    List<Object[]> countActiveByZone();
}