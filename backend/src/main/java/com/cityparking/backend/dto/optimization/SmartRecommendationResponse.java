package com.cityparking.backend.dto.optimization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmartRecommendationResponse {
    private List<String> alerts;
    private List<String> recommendations;
    private String smartAssistantMessage;
    private String urgencyLevel;
}