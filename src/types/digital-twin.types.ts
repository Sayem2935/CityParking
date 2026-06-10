/**
 * Sprint 14: Smart Parking Digital Twin & Simulation Environment
 * TypeScript type definitions for the Digital Twin API
 */

// ── Vehicle Types ───────────────────────────────────────────

export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'vip';
export type SlotSize = 'compact' | 'regular' | 'large' | 'motorcycle';
export type SimulationMode = 'real_time' | 'accelerated' | 'historical_replay';
export type SimulationStatus = 'idle' | 'running' | 'paused' | 'completed';
export type DayType = 'normal_day' | 'weekend' | 'holiday' | 'special_event';

export interface VehicleMovement {
  time: number;
  type: 'arrival' | 'departure' | 'rejection';
  vehicleId: string | null;
  vehicleType: string | null;
  zone: string | null;
  slot: string | null;
}

// ── Facility State ──────────────────────────────────────────

export interface ZoneState {
  floor: number;
  name: string;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  occupancyRate: number;
}

export interface EntranceState {
  id: string;
  name: string;
  floor: number;
  currentQueue: number;
  queueCapacity: number;
  processingRate: number;
}

export interface ExitState {
  id: string;
  name: string;
  floor: number;
  currentQueue: number;
  queueCapacity: number;
  processingRate: number;
}

export interface VehicleQueues {
  waiting: number;
  parking: number;
  departing: number;
}

export interface SimulationState {
  simulationTime: number;
  status: SimulationStatus;
  mode: SimulationMode;
  speedFactor: number;
  totalSlots: number;
  occupiedSlots: number;
  availableSlots: number;
  overallOccupancy: number;
  activeVehicles: number;
  totalArrivals: number;
  totalDepartures: number;
  totalRejected: number;
  zones: Record<string, ZoneState>;
  entrances: EntranceState[];
  exits: ExitState[];
  vehicleQueues: VehicleQueues;
}

// ── Floor Map ───────────────────────────────────────────────

export interface FloorSlot {
  id: string;
  zone: string;
  size: SlotSize;
  occupied: boolean;
  vehicleId: string | null;
  x: number;
  y: number;
}

export interface FloorMap {
  floor: number;
  name: string;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  slots: FloorSlot[];
}

// ── Congestion ──────────────────────────────────────────────

export type CongestionLevel = 'empty' | 'low' | 'moderate' | 'high' | 'critical';

export interface CongestionZone {
  occupancy: number;
  level: CongestionLevel;
  floor: number;
  availableSlots: number;
  totalSlots: number;
}

export interface CongestionHeatmap {
  [zoneId: string]: CongestionZone;
}

export interface EntranceCongestion {
  id: string;
  name: string;
  queueRatio: number;
  level: CongestionLevel;
  waitEstimate: number;
}

export interface Throughput {
  arrivalsPerMinute: number;
  departuresPerMinute: number;
  rejectionRate: number;
}

export interface CongestionMetrics {
  time: number;
  congestionIndex: number;
  overallOccupancy: number;
  entranceCongestion: EntranceCongestion[];
  exitCongestion: EntranceCongestion[];
  zoneCongestion: Record<string, { occupancy: number; level: CongestionLevel; searchDifficulty: number }>;
  averageSearchTime: number;
  averageWaitTime: number;
  throughput: Throughput;
  bottleneckCount: number;
}

export interface CongestionSummary {
  averageCongestionIndex: number;
  peakCongestionIndex: number;
  minCongestionIndex: number;
  bottleneckEvents: number;
  totalDataPoints: number;
  congestionTrend: string;
}

// ── Scenarios ───────────────────────────────────────────────

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
}

export interface ScenarioResult {
  scenario: string;
  name: string;
  durationHours: number;
  vehiclesInjected: number;
  finalOccupancy: number;
  totalArrivals: number;
  totalDepartures: number;
  totalRejected: number;
  evacuationResult: { evacuated: number; remainingInQueue: number } | null;
  stepsCollected: number;
}

// ── Vehicle Generation ──────────────────────────────────────

export interface GeneratedVehicle {
  id: string;
  vehicleType: VehicleType;
  arrivalTime: number;
  departureTime: number;
  parkingDuration: number;
  preferredZones: string[];
  assignedSlot: string | null;
  assignedZone: string | null;
  assignedFloor: number | null;
  status: string;
  waitTime: number;
  searchTime: number;
  isVip: boolean;
  licensePlate: string;
}

export interface VehicleGenerationResult {
  generated: number;
  dayType: DayType;
  vehicles: GeneratedVehicle[];
}

// ── RL Training ─────────────────────────────────────────────

export interface RLTrainingResult {
  episodes: number;
  averageReward: number;
  bestReward: number;
  finalEpsilon: number;
  averageUtilization: number;
  rewardHistory: number[];
}

export interface AlgorithmMetrics {
  avgReward: number;
  avgSearchTime: number;
  avgCongestion: number;
  avgUtilization: number;
  avgThroughput: number;
  avgWaitingTime: number;
  stdReward: number;
  bestReward: number;
}

export interface BenchmarkComparison {
  searchTimeImprovement: string;
  throughputImprovement: string;
  congestionReduction: string;
  utilizationImprovement: string;
  rewardImprovement: string;
}

export interface BenchmarkResult {
  algorithms: Record<string, AlgorithmMetrics>;
  comparisons: Record<string, BenchmarkComparison>;
  episodes: number;
  bestAlgorithm: string;
}

// ── Research Evaluation ─────────────────────────────────────

export interface PredictionAccuracy {
  MAE: number;
  RMSE: number;
}

export interface PerformanceImprovement {
  congestionReduction: number;
  searchTimeReduction: number;
  utilizationImprovement: number;
  throughputImprovement: number;
}

export interface ResearchSummary {
  title: string;
  keyFindings: string[];
  methodology: string;
  evaluationMetrics: string[];
}

export interface ScenarioAnalysis {
  scenario: string;
  name: string;
  finalOccupancy: number;
  totalArrivals: number;
  totalDepartures: number;
  rejectionRate: number;
}

export interface ResearchEvaluation {
  benchmarkSummary?: Record<string, AlgorithmMetrics>;
  rlTraining?: {
    episodes: number;
    averageReward: number;
    bestReward: number;
    finalEpsilon: number;
    averageUtilization: number;
  };
  predictionAccuracy?: PredictionAccuracy;
  performanceImprovement?: PerformanceImprovement;
  scenarioAnalysis?: ScenarioAnalysis[];
  researchSummary?: ResearchSummary;
  exportedTo?: string;
}

// ── RL Environment ──────────────────────────────────────────

export interface RLEnvState {
  step: number;
  hour: number;
  zoneOccupancies: Record<string, number>;
  totalVehicles: number;
  totalReward: number;
  avgOccupancy: number;
}

// ── Interactive Mode ────────────────────────────────────────

export interface InjectResult {
  injected: number;
  vehicles: Array<{ vehicleId: string; type: string; queuePosition: number }>;
}

export interface TrafficSpikeResult {
  injected: number;
  vehicleIds: string[];
  queueSize: number;
}

export interface EmergencyResult {
  type: string;
  evacuated?: number;
  remainingInQueue?: number;
  closedZones?: string[];
  closedFloors?: number[];
  message?: string;
}

export interface InteractiveAction {
  time: number;
  action: string;
  params: Record<string, unknown>;
  timestamp: number;
}