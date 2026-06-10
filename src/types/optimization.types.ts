export interface ZoneRecommendation {
  recommended_zone: string;
  recommended_floor: string;
  confidence: number;
  algorithm: string;
  all_options: ZoneOption[];
  timestamp: string;
}

export interface ZoneOption {
  zone: string;
  score: number;
  occupancy: number;
  congestion: number;
}

export interface CongestionZone {
  zone: string;
  congestion_level: string;
  congestion_score: number;
  occupancy: number;
  trend: string;
}

export interface CongestionData {
  overall_congestion: string;
  overall_score: number;
  zones: CongestionZone[];
  bottlenecks: string[];
  mitigation_strategies: string[];
}

export interface LoadBalanceZone {
  zone: string;
  occupancy: number;
  vehicle_count: number;
  deviation: number;
}

export interface LoadBalanceData {
  balance_score: number;
  average_utilization: number;
  zones: LoadBalanceZone[];
  recommendations: string[];
  efficiency_gain: string;
}

export interface BenchmarkMetrics {
  avg_search_time: number;
  avg_congestion: number;
  avg_walking_distance: number;
  utilization_efficiency: number;
  vehicle_throughput: number;
}

export interface PerformanceData {
  rl: BenchmarkMetrics;
  traditional: BenchmarkMetrics;
  improvement: {
    search_time_reduction: string;
    congestion_reduction: string;
    walking_distance_reduction: string;
  };
  total_decisions: number;
  avg_reward: number;
}

export interface SmartRecommendation {
  type: string;
  message: string;
  priority: string;
}

export interface SmartRecommendationsData {
  recommendations: SmartRecommendation[];
  parking_assistant: SmartRecommendation[];
  timestamp: string;
}

export interface OptimizationMetrics {
  congestionScore: number;
  loadBalanceScore: number;
  avgSearchTime: number;
  utilizationEfficiency: number;
}