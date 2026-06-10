package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_slots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingSlot {

    public enum SlotStatus {
        FREE, RESERVED, OCCUPIED, MAINTENANCE
    }

    public enum SlotType {
        STANDARD, COMPACT, HANDICAPPED, EV_CHARGING, VIP
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_code", nullable = false, unique = true, length = 20)
    private String slotCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "slot_type", nullable = false, length = 30)
    @Builder.Default
    private SlotType slotType = SlotType.STANDARD;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SlotStatus status = SlotStatus.FREE;

    @Column(name = "floor_number", nullable = false)
    @Builder.Default
    private Integer floorNumber = 1;

    @Column(name = "zone", nullable = false, length = 10)
    @Builder.Default
    private String zone = "A";

    @Column(name = "coordinates_json", columnDefinition = "TEXT")
    private String coordinatesJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}