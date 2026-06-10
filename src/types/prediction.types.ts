export interface PredictionPoint {
  minutesAhead: number;
  predictedOccupancy: number;
  confidence: number;
}

export interface PredictionResponse {
  currentOccupancy: number;
  totalSlots: number;
  occupiedSlots: number;
  freeSlots: number;
  trend: "INCREASING" | "STABLE" | "DECREASING";
  predictions: PredictionPoint[];
  recommendations: string[];
  generatedAt: string;
}

export interface HourlyTrend {
  hour: number;
  averageOccupancy: number;
  peakOccupancy: number;
}

export interface DailyTrend {
  date: string;
  averageOccupancy: number;
  peakOccupancy: number;
  minOccupancy: number;
}

export interface WeeklyTrend {
  dayOfWeek: number;
  dayName: string;
  averageOccupancy: number;
  peakOccupancy: number;
}

export interface TrendResponse {
  growthTrend: string;
  declineTrend: string;
  occupancyVelocity: number;
  utilizationVariance: number;
  hourlyTrend: HourlyTrend[];
  dailyTrend: DailyTrend[];
  weeklyTrend: WeeklyTrend[];
}

export interface HourlyPeak {
  hour: number;
  label: string;
  averageOccupancy: number;
  peakOccupancy: number;
}

export interface PeakHourResponse {
  busiestHour: number;
  busiestHourLabel: string;
  busiestDay: number;
  busiestDayLabel: string;
  averageUtilization: number;
  peakOccupancy: number;
  hourlyBreakdown: HourlyPeak[];
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  averageOccupancy: number;
  peakOccupancy: number;
  growthRate: number;
}

export interface AnalyticsResponse {
  averageOccupancy: number;
  peakOccupancy: number;
  utilizationEfficiency: number;
  occupancyGrowthRate: number;
  totalSlots: number;
  averageOccupiedSlots: number;
  weeklyTrendAnalysis: WeeklyTrendPoint[];
}