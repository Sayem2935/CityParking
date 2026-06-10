package com.cityparking.backend.service;

import com.cityparking.backend.entity.AccessDecision;
import com.cityparking.backend.entity.AccessLog;
import com.cityparking.backend.entity.SecurityEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessDecisionResult {

    private AccessDecision decision;
    private AccessLog accessLog;
    private List<SecurityEvent> securityEvents;
    private Double processingTimeMs;
}