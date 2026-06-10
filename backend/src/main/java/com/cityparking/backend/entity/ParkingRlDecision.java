package com.cityparking.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "parking_rl_decisions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParkingRlDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "state_snapshot", nullable = false, columnDefinition = "TEXT")
    private String stateSnapshot;

    @Column(name = "selected_action", nullable = false, length = 50)
    private String selectedAction;

    @Column(name = "reward", nullable = false)
    private Double reward;

    @Column(name = "episode", nullable = false)
    @Builder.Default
    private Integer episode = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}