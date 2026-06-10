import { apiClient } from './api';
import type {
  ZoneRecommendation,
  CongestionData,
  LoadBalanceData,
  PerformanceData,
  SmartRecommendationsData,
} from '../types/optimization.types';

const BASE = '/parking/optimization';

// ─── Mapping helpers: backend camelCase → frontend snake_case ────

/** Backend returns zones as a Map<string, {level, score, occupancy}>.
 *  Frontend expects an array of CongestionZone objects. */
function normalizeCongestionData(raw: any): CongestionData {
  if (!raw) return { overall_congestion: 'low', overall_score: 0, zones: [], bottlenecks: [], mitigation_strategies: [] };

  // Map backend zone entries → frontend CongestionZone[]
  let zones: CongestionData['zones'] = [];
  if (raw.zones && typeof raw.zones === 'object') {
    zones = Object.entries(raw.zones).map(([zoneName, z]: [string, any]) => ({
      zone: zoneName,
      congestion_level: (z?.level ?? z?.congestion_level ?? 'low') as string,
      congestion_score: (z?.score ?? z?.congestion_score ?? 0) as number,
      occupancy: (z?.occupancy ?? 0) as number,
      trend: (z?.trend ?? 'stable') as string,
    }));
  }

  return {
    overall_congestion: raw.overall_congestion ?? raw.overallLevel ?? 'low',
    overall_score: raw.overall_score ?? raw.overallScore ?? 0,
    zones,
    bottlenecks: raw.bottlenecks ?? (raw.bottleneckZone ? [raw.bottleneckZone] : []),
    mitigation_strategies: raw.mitigation_strategies ?? [],
  };
}

/** Backend returns zoneOccupancies as Map<string, number> and flat scalars.
 *  Frontend expects zones as an array of LoadBalanceZone objects. */
function normalizeLoadBalanceData(raw: any): LoadBalanceData {
  if (!raw) return { balance_score: 0, average_utilization: 0, efficiency_gain: '', zones: [], recommendations: [] };

  // Build zones array from the Map or from an existing array
  let zones: LoadBalanceData['zones'] = [];
  if (Array.isArray(raw.zones)) {
    zones = raw.zones;
  } else if (raw.zoneOccupancies && typeof raw.zoneOccupancies === 'object') {
    zones = Object.entries(raw.zoneOccupancies).map(
      ([zoneName, occ]: [string, any]) => ({
        zone: zoneName,
        occupancy: occ ?? 0,
        vehicle_count: 0,        // backend doesn't provide per-zone vehicle count
        deviation: raw.standardDeviation ?? 0,
      }),
    );
  }

  return {
    balance_score: raw.balance_score ?? raw.balanceScore ?? 0,
    average_utilization: raw.average_utilization ?? raw.meanOccupancy ?? 0,
    efficiency_gain: raw.efficiency_gain ?? raw.potentialImprovement ?? '',
    zones,
    recommendations: raw.recommendations ?? [],
  };
}

export const optimizationService = {
  async getRecommendation(): Promise<ZoneRecommendation> {
    const response = await apiClient.get<ZoneRecommendation>(`${BASE}/recommendation`);
    return response.data;
  },

  async getCongestion(): Promise<CongestionData> {
    const response = await apiClient.get(`${BASE}/congestion`);
    return normalizeCongestionData(response.data);
  },

  async getLoadBalance(): Promise<LoadBalanceData> {
    const response = await apiClient.get(`${BASE}/load-balance`);
    return normalizeLoadBalanceData(response.data);
  },

  async trainModel(params?: { episodes?: number; algorithm?: string }): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE}/train`, params ?? {});
    return response.data;
  },

  async getPerformance(): Promise<PerformanceData> {
    const response = await apiClient.get<PerformanceData>(`${BASE}/performance`);
    return response.data;
  },

  async getSmartRecommendations(): Promise<SmartRecommendationsData> {
    const response = await apiClient.get<SmartRecommendationsData>(`${BASE}/smart-recommendations`);
    return response.data;
  },
};
