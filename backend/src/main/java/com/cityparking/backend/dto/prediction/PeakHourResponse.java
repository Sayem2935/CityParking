package com.cityparking.backend.dto.prediction;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeakHourResponse {

    private Integer busiestHour;
    private String busiestHourLabel;
    private Integer busiestDay;
    private String busiestDayLabel;
    private Double averageUtilization;
    private Double peakOccupancy;
    private List<HourlyPeak> hourlyBreakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyPeak {
        private Integer hour;
        private String label;
        private Double averageOccupancy;
        private Double peakOccupancy;
    }
}