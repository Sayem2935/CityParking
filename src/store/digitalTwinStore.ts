import { create } from 'zustand';
import { digitalTwinService } from '../services/digital-twin.service';
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

interface DigitalTwinState {
  // Simulation
  simulationState: SimulationState | null;
  isPolling: boolean;
  pollingInterval: ReturnType<typeof setInterval> | null;
  error: string | null;

  // Maps & Visualization
  congestionHeatmap: CongestionHeatmap | null;
  floorMaps: Record<number, FloorMap>;
  selectedFloor: number;

  // Congestion
  congestionMetrics: CongestionMetrics | null;
  congestionSummary: CongestionSummary | null;

  // Scenarios
  scenarios: ScenarioInfo[];
  activeScenarioResult: ScenarioResult | null;
  scenarioRunning: boolean;

  // RL & Benchmark
  rlTrainingResult: RLTrainingResult | null;
  rlTraining: boolean;
  benchmarkResult: BenchmarkResult | null;
  benchmarkRunning: boolean;

  // Research
  evaluation: ResearchEvaluation | null;
  evaluationRunning: boolean;

  // RL Environment
  rlEnvState: RLEnvState | null;

  // Actions
  fetchState: () => Promise<void>;
  fetchFloorMap: (floorId: number) => Promise<void>;
  fetchCongestionHeatmap: () => Promise<void>;
  fetchCongestion: () => Promise<void>;
  fetchCongestionSummary: () => Promise<void>;
  fetchScenarios: () => Promise<void>;
  fetchRLEnvState: () => Promise<void>;
  setSelectedFloor: (floor: number) => void;

  // Simulation Control
  startSimulation: (mode?: SimulationMode, speedFactor?: number) => Promise<void>;
  pauseSimulation: () => Promise<void>;
  resumeSimulation: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  stepSimulation: (dt: number) => Promise<void>;

  // Vehicle Injection
  injectVehicle: (vehicleType?: string, zone?: string) => Promise<void>;
  injectSpike: (count?: number, duration?: number) => Promise<void>;
  triggerEmergency: (type?: string) => Promise<EmergencyResult>;

  // Scenarios
  runScenario: (scenarioId: string) => Promise<void>;

  // Vehicle Generation
  generateVehicles: (count?: number, dayType?: DayType) => Promise<void>;

  // RL & Benchmark
  trainRL: (episodes?: number, batchSize?: number) => Promise<void>;
  runBenchmark: (episodes?: number) => Promise<void>;
  runEvaluation: (params?: { episodes?: number; rlEpisodes?: number }) => Promise<void>;

  // Polling
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;

  // Error
  clearError: () => void;
}

export const useDigitalTwinStore = create<DigitalTwinState>((set, get) => ({
  simulationState: null,
  isPolling: false,
  pollingInterval: null,
  error: null,
  congestionHeatmap: null,
  floorMaps: {},
  selectedFloor: 1,
  congestionMetrics: null,
  congestionSummary: null,
  scenarios: [],
  activeScenarioResult: null,
  scenarioRunning: false,
  rlTrainingResult: null,
  rlTraining: false,
  benchmarkResult: null,
  benchmarkRunning: false,
  evaluation: null,
  evaluationRunning: false,
  rlEnvState: null,

  fetchState: async () => {
    try {
      const state = await digitalTwinService.getState();
      set({ simulationState: state, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchFloorMap: async (floorId: number) => {
    try {
      const map = await digitalTwinService.getFloorMap(floorId);
      set((s) => ({ floorMaps: { ...s.floorMaps, [floorId]: map }, error: null }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchCongestionHeatmap: async () => {
    try {
      const heatmap = await digitalTwinService.getCongestionHeatmap();
      set({ congestionHeatmap: heatmap, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchCongestion: async () => {
    try {
      const metrics = await digitalTwinService.getCongestion();
      set({ congestionMetrics: metrics, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchCongestionSummary: async () => {
    try {
      const summary = await digitalTwinService.getCongestionSummary();
      set({ congestionSummary: summary, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchScenarios: async () => {
    try {
      const scenarios = await digitalTwinService.getScenarios();
      set({ scenarios, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchRLEnvState: async () => {
    try {
      const envState = await digitalTwinService.getRLEnvState();
      set({ rlEnvState: envState, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setSelectedFloor: (floor: number) => set({ selectedFloor: floor }),

  startSimulation: async (mode = 'real_time', speedFactor = 1.0) => {
    try {
      await digitalTwinService.startSimulation(mode, speedFactor);
      get().startPolling();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  pauseSimulation: async () => {
    try {
      await digitalTwinService.pauseSimulation();
      get().stopPolling();
      await get().fetchState();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  resumeSimulation: async () => {
    try {
      await digitalTwinService.resumeSimulation();
      get().startPolling();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  resetSimulation: async () => {
    try {
      get().stopPolling();
      await digitalTwinService.resetSimulation();
      await get().fetchState();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  stepSimulation: async (dt: number) => {
    try {
      const state = await digitalTwinService.stepSimulation(dt);
      set({ simulationState: state, error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  injectVehicle: async (vehicleType = 'car', zone) => {
    try {
      await digitalTwinService.injectVehicle(vehicleType, zone);
      await get().fetchState();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  injectSpike: async (count = 20, duration = 60) => {
    try {
      await digitalTwinService.injectTrafficSpike(count, duration);
      await get().fetchState();
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  triggerEmergency: async (type = 'evacuation') => {
    try {
      const result = await digitalTwinService.triggerEmergency(type);
      await get().fetchState();
      set({ error: null });
      return result;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  runScenario: async (scenarioId: string) => {
    set({ scenarioRunning: true });
    try {
      const result = await digitalTwinService.runScenario(scenarioId);
      set({ activeScenarioResult: result, scenarioRunning: false, error: null });
    } catch (e: any) {
      set({ scenarioRunning: false, error: e.message });
    }
  },

  generateVehicles: async (count = 100, dayType: DayType = 'normal_day') => {
    try {
      await digitalTwinService.generateVehicles(count, dayType);
      set({ error: null });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  trainRL: async (episodes = 500, batchSize = 32) => {
    set({ rlTraining: true });
    try {
      const result = await digitalTwinService.trainRL(episodes, batchSize);
      set({ rlTrainingResult: result, rlTraining: false, error: null });
    } catch (e: any) {
      set({ rlTraining: false, error: e.message });
    }
  },

  runBenchmark: async (episodes = 50) => {
    set({ benchmarkRunning: true });
    try {
      const result = await digitalTwinService.runBenchmark(episodes);
      set({ benchmarkResult: result, benchmarkRunning: false, error: null });
    } catch (e: any) {
      set({ benchmarkRunning: false, error: e.message });
    }
  },

  runEvaluation: async (params = {}) => {
    set({ evaluationRunning: true });
    try {
      const result = await digitalTwinService.runEvaluation(params);
      set({ evaluation: result, evaluationRunning: false, error: null });
    } catch (e: any) {
      set({ evaluationRunning: false, error: e.message });
    }
  },

  startPolling: (intervalMs = 2000) => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    const id = setInterval(() => {
      get().fetchState();
      get().fetchCongestionHeatmap();
    }, intervalMs);
    set({ pollingInterval: id, isPolling: true });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) clearInterval(pollingInterval);
    set({ pollingInterval: null, isPolling: false });
  },

  clearError: () => set({ error: null }),
}));

export default useDigitalTwinStore;