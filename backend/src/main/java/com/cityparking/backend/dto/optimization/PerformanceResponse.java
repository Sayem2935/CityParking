package com.cityparking.backend.dto.optimization;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceResponse {
    private Double averageSearchTime;
    private Double averageReward;
    private Double averageOccupancy;
    private Integer totalDecisions;
    private Integer currentEpisode;
    private Double utilizationEfficiency;
    private Double congestionReduction;
    private List<EpisodePerformance> episodeHistory;
    private Map<String, Double> benchmarkComparison;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EpisodePerformance {
        private Integer episode;
        private Double averageReward;
        private Double averageSearchTime;
    }
}