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
public class TrendResponse {

    private String growthTrend;
    private String declineTrend;
    private Double occupancyVelocity;
    private Double utilizationVariance;
    private List<HourlyTrend> hourlyTrend;
    private List<DailyTrend> dailyTrend;
    private List<WeeklyTrend> weeklyTrend;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HourlyTrend {
        private Integer hour;
        private Double averageOccupancy;
        private Double peakOccupancy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyTrend {
        private String date;
        private Double averageOccupancy;
        private Double peakOccupancy;
        private Double minOccupancy;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyTrend {
        private Integer dayOfWeek;
        private String dayName;
        private Double averageOccupancy;
        private Double peakOccupancy;
    }
}