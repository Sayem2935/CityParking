package com.cityparking.backend.repository;

import com.cityparking.backend.entity.ParkingSlot;
import com.cityparking.backend.entity.ParkingSlot.SlotStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Long> {

    Optional<ParkingSlot> findBySlotCode(String slotCode);

    List<ParkingSlot> findByStatus(SlotStatus status);

    List<ParkingSlot> findByZone(String zone);


    long countByStatus(SlotStatus status);


    List<ParkingSlot> findByStatusAndZone(SlotStatus status, String zone);

    List<ParkingSlot> findByStatusOrderByZoneAscSlotCodeAsc(SlotStatus status);

    @Modifying
    @Query("UPDATE ParkingSlot s SET s.status = :status, s.updatedAt = CURRENT_TIMESTAMP WHERE s.slotCode = :slotCode")
    int updateStatusBySlotCode(@Param("slotCode") String slotCode, @Param("status") SlotStatus status);

    @Query("SELECT s.zone, s.status, COUNT(s) FROM ParkingSlot s GROUP BY s.zone, s.status ORDER BY s.zone, s.status")
    List<Object[]> countSlotsByZoneAndStatus();

    @Query("SELECT s FROM ParkingSlot s WHERE s.status = 'FREE' ORDER BY s.zone ASC, s.slotCode ASC")
    List<ParkingSlot> findAllFreeSlotsOrdered();


    @Query("SELECT COUNT(s) FROM ParkingSlot s WHERE s.status = 'OCCUPIED'")
    long countOccupied();
}
