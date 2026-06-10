import { apiClient } from './api';
import type {
  SimulationState,
  CongestionHeatmap,
  CongestionMetrics,
  CongestionSummary,
  ScenarioInfo,
  ScenarioResult,
  BenchmarkResult,
  RLTrainingResult,
  ResearchEvaluation,
  RLEnvState,
  FloorMap,
  DayType,
  SimulationMode,
  EmergencyResult,
} from '../types/digital-twin.types';

const BASE_URL = '/digital-twin';

export const digitalTwinService = {
  /**
   * Get the full synchronized digital twin state from Spring Boot backend.
   */
  async syncState(): Promise<SimulationState> {
    const response = await apiClient.get<SimulationState>(`${BASE_URL}/state`);
    return response.data;
  },

  /**
   * Get the simulation state (alias for syncState used by store).
   */
  async getState(): Promise<SimulationState> {
    const response = await apiClient.get<SimulationState>(`${BASE_URL}/simulation/state`);
    return response.data;
  },

  /**
   * Get floor map data.
   */
  async getFloorMap(floorId: number): Promise<FloorMap> {
    const response = await apiClient.get<FloorMap>(`${BASE_URL}/floor-map/${floorId}`);
    return response.data;
  },

  /**
   * Get congestion heatmap data.
   */
  async getCongestionHeatmap(): Promise<CongestionHeatmap> {
    const response = await apiClient.get<CongestionHeatmap>(`${BASE_URL}/congestion/heatmap`);
    return response.data;
  },

  /**
   * Get congestion metrics.
   */
  async getCongestion(): Promise<CongestionMetrics> {
    const response = await apiClient.get<CongestionMetrics>(`${BASE_URL}/congestion`);
    return response.data;
  },

  /**
   * Get congestion summary.
   */
  async getCongestionSummary(): Promise<CongestionSummary> {
    const response = await apiClient.get<CongestionSummary>(`${BASE_URL}/congestion/summary`);
    return response.data;
  },

  /**
   * Get available scenarios.
   */
  async getScenarios(): Promise<ScenarioInfo[]> {
    const response = await apiClient.get<ScenarioInfo[]>(`${BASE_URL}/scenarios`);
    return response.data;
  },

  /**
   * Get RL environment state.
   */
  async getRLEnvState(): Promise<RLEnvState> {
    const response = await apiClient.get<RLEnvState>(`${BASE_URL}/rl-env-state`);
    return response.data;
  },

  /**
   * Run optimization on the digital twin.
   */
  async runOptimization(config?: {
    speedFactor?: number;
    vehicleSpawnRate?: number;
  }): Promise<SimulationState> {
    const response = await apiClient.post<SimulationState>(`${BASE_URL}/optimize`, {
      speed_factor: config?.speedFactor,
      vehicle_spawn_rate: config?.vehicleSpawnRate,
    });
    return response.data;
  },

  /**
   * Get current parking lot status.
   */
  async getParkingLotStatus(): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`${BASE_URL}/parking-lot/status`);
    return response.data;
  },

  /**
   * Get predictions from the digital twin.
   */
  async getPredictions(): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(`${BASE_URL}/predictions`);
    return response.data;
  },

  /**
   * Train the RL model.
   */
  async trainModel(config?: { epochs?: number; learningRate?: number }): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/train-model`, {
      epochs: config?.epochs,
      learning_rate: config?.learningRate,
    });
    return response.data;
  },

  /**
   * Start the digital twin simulation.
   */
  async startSimulation(mode: SimulationMode = 'real_time', speedFactor = 1.0): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/simulation/start`, {
      mode,
      speed_factor: speedFactor,
    });
    return response.data;
  },

  /**
   * Pause the simulation.
   */
  async pauseSimulation(): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/simulation/pause`);
    return response.data;
  },

  /**
   * Resume the simulation.
   */
  async resumeSimulation(): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/simulation/resume`);
    return response.data;
  },

  /**
   * Reset the simulation.
   */
  async resetSimulation(): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/simulation/reset`);
    return response.data;
  },

  /**
   * Step the simulation by dt seconds.
   */
  async stepSimulation(dt: number): Promise<SimulationState> {
    const response = await apiClient.post<SimulationState>(`${BASE_URL}/simulation/step`, { dt });
    return response.data;
  },

  /**
   * Stop the simulation.
   */
  async stopSimulation(): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/simulation/stop`);
    return response.data;
  },

  /**
   * Inject a vehicle into the simulation.
   */
  async injectVehicle(vehicleType = 'car', zone?: string): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/vehicle/inject`, {
      vehicle_type: vehicleType,
      zone,
    });
    return response.data;
  },

  /**
   * Inject a traffic spike.
   */
  async injectTrafficSpike(count = 20, duration = 60): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/traffic-spike`, {
      count,
      duration,
    });
    return response.data;
  },

  /**
   * Trigger an emergency event.
   */
  async triggerEmergency(type = 'evacuation'): Promise<EmergencyResult> {
    const response = await apiClient.post<EmergencyResult>(`${BASE_URL}/emergency`, {
      type,
    });
    return response.data;
  },

  /**
   * Run a specific scenario.
   */
  async runScenario(scenarioId: string): Promise<ScenarioResult> {
    const response = await apiClient.post<ScenarioResult>(`${BASE_URL}/scenarios/${scenarioId}/run`);
    return response.data;
  },

  /**
   * Generate vehicles for simulation.
   */
  async generateVehicles(count = 100, dayType: DayType = 'normal_day'): Promise<Record<string, unknown>> {
    const response = await apiClient.post<Record<string, unknown>>(`${BASE_URL}/vehicles/generate`, {
      count,
      day_type: dayType,
    });
    return response.data;
  },

  /**
   * Train RL agent.
   */
  async trainRL(episodes = 500, batchSize = 32): Promise<RLTrainingResult> {
    const response = await apiClient.post<RLTrainingResult>(`${BASE_URL}/rl/train`, {
      episodes,
      batch_size: batchSize,
    });
    return response.data;
  },

  /**
   * Run benchmark evaluation.
   */
  async runBenchmark(episodes = 50): Promise<BenchmarkResult> {
    const response = await apiClient.post<BenchmarkResult>(`${BASE_URL}/benchmark`, {
      episodes,
    });
    return response.data;
  },

  /**
   * Run research evaluation.
   */
  async runEvaluation(params?: { episodes?: number; rlEpisodes?: number }): Promise<ResearchEvaluation> {
    const response = await apiClient.post<ResearchEvaluation>(`${BASE_URL}/evaluation`, {
      episodes: params?.episodes,
      rl_episodes: params?.rlEpisodes,
    });
    return response.data;
  },
};