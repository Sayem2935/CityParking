import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDigitalTwinStore } from '@/store/digitalTwinStore';
import type { ZoneState, CongestionLevel } from '@/types/digital-twin.types';

// ── Color Helpers ───────────────────────────────────────────

const congestionColor = (level: CongestionLevel): string => {
  const colors: Record<CongestionLevel, string> = {
    empty: 'bg-green-100 text-green-800 border-green-300',
    low: 'bg-green-200 text-green-900 border-green-400',
    moderate: 'bg-yellow-200 text-yellow-900 border-yellow-400',
    high: 'bg-orange-300 text-orange-900 border-orange-500',
    critical: 'bg-red-400 text-white border-red-600',
  };
  return colors[level] || colors.moderate;
};

const congestionDotColor = (level: CongestionLevel): string => {
  const colors: Record<CongestionLevel, string> = {
    empty: '#22c55e', low: '#4ade80', moderate: '#facc15', high: '#fb923c', critical: '#ef4444',
  };
  return colors[level] || '#facc15';
};

const occupancyBarColor = (rate: number): string => {
  if (rate < 0.5) return 'bg-green-500';
  if (rate < 0.75) return 'bg-yellow-500';
  if (rate < 0.9) return 'bg-orange-500';
  return 'bg-red-500';
};

const statusColor = (status: string): string => {
  const colors: Record<string, string> = {
    idle: 'bg-gray-400',
    running: 'bg-green-500 animate-pulse',
    paused: 'bg-yellow-500',
    completed: 'bg-blue-500',
  };
  return colors[status] || 'bg-gray-400';
};

// ── Sub-Components ──────────────────────────────────────────

const MetricCard: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({
  label, value, sub, color = 'text-zinc-100',
}) => (
  <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-4 shadow-sm">
    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const ProgressBar: React.FC<{ value: number; max?: number; label?: string }> = ({ value, max = 1, label }) => (
  <div className="w-full">
    {label && <div className="flex justify-between text-xs text-zinc-500 mb-1"><span>{label}</span><span>{(value / max * 100).toFixed(1)}%</span></div>}
    <div className="w-full bg-zinc-700 rounded-full h-2.5">
      <div className={`h-2.5 rounded-full transition-all duration-500 ${occupancyBarColor(value / max)}`} style={{ width: `${Math.min(100, value / max * 100)}%` }} />
    </div>
  </div>
);

// ── Main Dashboard ──────────────────────────────────────────

const ParkingDigitalTwinDashboard: React.FC = () => {
  const {
    simulationState, isPolling, error,
    floorMaps, selectedFloor,
    congestionMetrics, congestionSummary,
    scenarios, activeScenarioResult, scenarioRunning,
    rlTrainingResult, rlTraining,
    benchmarkResult, benchmarkRunning,
    evaluation, evaluationRunning,
    rlEnvState,
    fetchState, fetchFloorMap, fetchCongestionHeatmap, fetchCongestion, fetchCongestionSummary,
    fetchScenarios, setSelectedFloor,
    startSimulation, pauseSimulation, resumeSimulation, resetSimulation,
    injectVehicle, injectSpike, triggerEmergency,
    runScenario, generateVehicles, trainRL, runBenchmark, runEvaluation,
    clearError,
  } = useDigitalTwinStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'simulation' | 'congestion' | 'scenarios' | 'rl' | 'benchmark' | 'competition'>('overview');
  const [injectType, setInjectType] = useState('car');
  const [spikeCount, setSpikeCount] = useState(20);
  const [trainEpisodes, setTrainEpisodes] = useState(200);
  const [benchmarkEpisodes, setBenchmarkEpisodes] = useState(30);

  useEffect(() => {
    fetchState();
    fetchScenarios();
    fetchCongestion();
    return () => { useDigitalTwinStore.getState().stopPolling(); };
  }, []);

  useEffect(() => {
    if (simulationState && selectedFloor) {
      fetchFloorMap(selectedFloor);
    }
  }, [selectedFloor, simulationState?.simulationTime]);

  const handleStartSim = useCallback(() => startSimulation('real_time', 1), []);
  const handleStepSim = useCallback(() => {
    for (let i = 0; i < 10; i++) useDigitalTwinStore.getState().stepSimulation(60);
    fetchCongestion();
  }, []);

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'simulation', label: '🎮 Simulation', icon: '🎮' },
    { id: 'congestion', label: '🔥 Congestion', icon: '🔥' },
    { id: 'scenarios', label: '🎬 Scenarios', icon: '🎬' },
    { id: 'rl', label: '🤖 RL Training', icon: '🤖' },
    { id: 'benchmark', label: '🏁 Benchmark', icon: '🏁' },
    { id: 'competition', label: '🏆 Competition', icon: '🏆' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <div className="bg-zinc-900/80 backdrop-blur-md border-b border-white/10 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">🏙️ Parking Digital Twin</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Sprint 14 — Simulation Environment & RL Training</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusColor(simulationState?.status || 'idle')}`} />
                <span className="text-sm font-medium text-zinc-300 capitalize">{simulationState?.status || 'idle'}</span>
              </div>
              {isPolling && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Live</span>
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-4 mt-4">
          <div className="bg-red-900/30 border border-red-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-red-700 text-sm">⚠️ {error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700 text-sm">Dismiss</button>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && simulationState && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              <MetricCard label="Total Slots" value={simulationState.totalSlots} />
              <MetricCard label="Occupied" value={simulationState.occupiedSlots} color="text-orange-400" />
              <MetricCard label="Available" value={simulationState.availableSlots} color="text-green-400" />
              <MetricCard label="Occupancy" value={`${(simulationState.overallOccupancy * 100).toFixed(1)}%`} color={simulationState.overallOccupancy > 0.85 ? 'text-red-400' : 'text-blue-400'} />
              <MetricCard label="Active Vehicles" value={simulationState.activeVehicles} />
              <MetricCard label="Total Arrivals" value={simulationState.totalArrivals} color="text-emerald-600" />
              <MetricCard label="Total Departures" value={simulationState.totalDepartures} color="text-purple-400" />
              <MetricCard label="Rejected" value={simulationState.totalRejected} color="text-red-400" />
            </div>

            {/* Occupancy Bar */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Overall Occupancy</h3>
              <ProgressBar value={simulationState.occupiedSlots} max={simulationState.totalSlots} />
            </div>

            {/* Zone Grid */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Zone Occupancy Map</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(simulationState.zones ?? {}).map(([name, zone]) => {
                  const z = zone as ZoneState;
                  const occ = z.occupancyRate;
                  const level: CongestionLevel = occ < 0.3 ? 'empty' : occ < 0.6 ? 'low' : occ < 0.8 ? 'moderate' : occ < 0.95 ? 'high' : 'critical';
                  return (
                    <div key={name} className={`rounded-lg border-2 p-3 transition-all ${congestionColor(level)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase">{name}</span>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: congestionDotColor(level) }} />
                      </div>
                      <div className="text-lg font-bold">{z.occupiedSlots}/{z.totalSlots}</div>
                      <ProgressBar value={z.occupiedSlots} max={z.totalSlots} />
                      <div className="text-xs mt-1 opacity-75">Floor {z.floor} • {(occ * 100).toFixed(0)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-2">
                {simulationState.status === 'idle' || simulationState.status === 'completed' ? (
                  <button onClick={handleStartSim} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">▶ Start Simulation</button>
                ) : simulationState.status === 'running' ? (
                  <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">⏸ Pause</button>
                ) : (
                  <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">▶ Resume</button>
                )}
                <button onClick={handleStepSim} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">⏭ Step ×10</button>
                <button onClick={resetSimulation} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">🔄 Reset</button>
                <button onClick={() => generateVehicles(100, 'normal_day')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">🚗 Generate 100 Vehicles</button>
              </div>
            </div>

            {/* Vehicle Queues */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Vehicle Queues</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-blue-400">{simulationState.vehicleQueues?.waiting ?? 0}</div>
                  <div className="text-sm text-blue-500">Waiting</div>
                </div>
                <div className="text-center p-4 bg-amber-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-amber-400">{simulationState.vehicleQueues?.parking ?? 0}</div>
                  <div className="text-sm text-amber-500">Parking</div>
                </div>
                <div className="text-center p-4 bg-purple-900/30 rounded-lg">
                  <div className="text-3xl font-bold text-purple-400">{simulationState.vehicleQueues?.departing ?? 0}</div>
                  <div className="text-sm text-purple-500">Departing</div>
                </div>
              </div>
            </div>

            {/* Entrances & Exits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">🚪 Entrances</h3>
                {(simulationState.entrances ?? []).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-sm">{e.name}</span>
                      <span className="text-xs text-gray-400 ml-2">Floor {e.floor}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${e.currentQueue > e.queueCapacity * 0.7 ? 'text-red-400' : 'text-green-400'}`}>
                        {e.currentQueue}/{e.queueCapacity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">queued</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">🚪 Exits</h3>
                {(simulationState.exits ?? []).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="font-medium text-sm">{e.name}</span>
                      <span className="text-xs text-gray-400 ml-2">Floor {e.floor}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${e.currentQueue > e.queueCapacity * 0.7 ? 'text-red-400' : 'text-green-400'}`}>
                        {e.currentQueue}/{e.queueCapacity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">queued</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation Time */}
            <div className="text-center text-sm text-zinc-500">
              Simulation Time: {(() => {
                const ts = simulationState.simulationTime;
                if (ts == null || !isFinite(ts)) return 'N/A';
                const d = new Date(ts * 1000);
                return isNaN(d.getTime()) ? 'N/A' : d.toISOString().substr(11, 8);
              })()} 
              {' '} | {' '}
              Speed: {simulationState.speedFactor ?? 1}×
            </div>
          </motion.div>
        )}

        {/* ═══ SIMULATION TAB ═══ */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">🎮 Simulation Controls</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                {simulationState?.status === 'running' ? (
                  <button onClick={pauseSimulation} className="px-5 py-2.5 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700">⏸ Pause</button>
                ) : (
                  <button onClick={handleStartSim} className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">▶ Start Real-Time</button>
                )}
                <button onClick={() => startSimulation('accelerated', 10)} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">⏩ Accelerated (10×)</button>
                <button onClick={handleStepSim} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">⏭ Step 10 min</button>
                <button onClick={resetSimulation} className="px-5 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700">🔄 Reset</button>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => generateVehicles(50, 'normal_day')} className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">🚗 50 Normal Day</button>
                <button onClick={() => generateVehicles(100, 'weekend')} className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-200">🏖️ 100 Weekend</button>
                <button onClick={() => generateVehicles(200, 'special_event')} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200">🏟️ 200 Special Event</button>
                <button onClick={() => generateVehicles(50, 'holiday')} className="px-4 py-2 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-200">🎄 50 Holiday</button>
              </div>
            </div>

            {/* Inject Vehicles */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">🔧 Inject Single Vehicle</h3>
              <div className="flex gap-3 items-center">
                <select value={injectType} onChange={(e) => setInjectType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="car">🚗 Car</option>
                  <option value="motorcycle">🏍️ Motorcycle</option>
                  <option value="truck">🚛 Truck</option>
                  <option value="vip">⭐ VIP</option>
                </select>
                <button onClick={() => injectVehicle(injectType)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Inject Vehicle
                </button>
              </div>
            </div>

            {/* Floor Map */}
            {floorMaps[selectedFloor] && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-zinc-200">🗺️ Floor Map — {floorMaps[selectedFloor].name}</h3>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((f) => (
                      <button key={f} onClick={() => setSelectedFloor(f)} className={`px-3 py-1 rounded-lg text-sm font-medium ${selectedFloor === f ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                        Floor {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {floorMaps[selectedFloor].slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`w-full aspect-square rounded-sm border transition-all cursor-default ${
                        slot.occupied
                          ? 'bg-red-400 border-red-500'
                          : 'bg-green-300 border-green-400'
                      }`}
                      title={`${slot.id} (${slot.zone}) — ${slot.occupied ? 'Occupied' : 'Available'}`}
                    />
                  ))}
                </div>
                <div className="flex gap-4 mt-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-300 rounded-sm" /> Available</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm" /> Occupied</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ CONGESTION TAB ═══ */}
        {activeTab === 'congestion' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={() => { fetchCongestion(); fetchCongestionSummary(); fetchCongestionHeatmap(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                🔄 Refresh Metrics
              </button>
            </div>

            {congestionMetrics && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Congestion Index" value={congestionMetrics.congestionIndex.toFixed(2)} color={congestionMetrics.congestionIndex > 0.7 ? 'text-red-400' : 'text-green-400'} />
                  <MetricCard label="Avg Search Time" value={`${congestionMetrics.averageSearchTime.toFixed(1)}s`} />
                  <MetricCard label="Avg Wait Time" value={`${congestionMetrics.averageWaitTime.toFixed(1)}s`} />
                  <MetricCard label="Bottlenecks" value={congestionMetrics.bottleneckCount} color={congestionMetrics.bottleneckCount > 0 ? 'text-red-400' : 'text-green-400'} />
                </div>

                <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">Throughput</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-green-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-green-400">{congestionMetrics.throughput.arrivalsPerMinute.toFixed(1)}</div>
                      <div className="text-xs text-zinc-500">Arrivals/min</div>
                    </div>
                    <div className="text-center p-3 bg-blue-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-blue-400">{congestionMetrics.throughput.departuresPerMinute.toFixed(1)}</div>
                      <div className="text-xs text-zinc-500">Departures/min</div>
                    </div>
                    <div className="text-center p-3 bg-red-900/30 rounded-lg">
                      <div className="text-2xl font-bold text-red-400">{(congestionMetrics.throughput.rejectionRate * 100).toFixed(1)}%</div>
                      <div className="text-xs text-zinc-500">Rejection Rate</div>
                    </div>
                  </div>
                </div>

                {/* Congestion Heatmap */}
                <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">🔥 Congestion Heatmap</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(congestionMetrics.zoneCongestion ?? {}).map(([zone, data]) => (
                      <div key={zone} className={`rounded-lg border-2 p-3 ${congestionColor(data.level)}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold uppercase">{zone}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-900/80 backdrop-blur-md/50 font-medium">{data.level}</span>
                        </div>
                        <div className="text-lg font-bold">{(data.occupancy * 100).toFixed(0)}%</div>
                        <div className="text-xs opacity-75">Search: {data.searchDifficulty.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Entrance Congestion */}
                <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-3">🚪 Entrance Congestion</h3>
                  <div className="space-y-2">
                    {(congestionMetrics.entranceCongestion ?? []).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <span className="font-medium text-sm">{e.name}</span>
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${congestionColor(e.level)}`}>{e.level}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold">Queue: {(e.queueRatio * 100).toFixed(0)}%</span>
                          <span className="text-xs text-gray-400 ml-2">~{e.waitEstimate.toFixed(0)}s wait</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {congestionSummary && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">📈 Congestion Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricCard label="Avg Index" value={congestionSummary.averageCongestionIndex.toFixed(3)} />
                  <MetricCard label="Peak Index" value={congestionSummary.peakCongestionIndex.toFixed(3)} color="text-red-400" />
                  <MetricCard label="Min Index" value={congestionSummary.minCongestionIndex.toFixed(3)} color="text-green-400" />
                  <MetricCard label="Bottleneck Events" value={congestionSummary.bottleneckEvents} color="text-orange-400" />
                  <MetricCard label="Data Points" value={congestionSummary.totalDataPoints} />
                </div>
                <div className="mt-3 text-sm text-zinc-500">Trend: <span className="font-medium text-zinc-300">{congestionSummary.congestionTrend}</span></div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SCENARIOS TAB ═══ */}
        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">🎬 Pre-Built Scenarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((s) => (
                  <div key={s.id} className="border border-white/10 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                    <h4 className="font-bold text-zinc-200">{s.name}</h4>
                    <p className="text-sm text-zinc-500 mt-1 mb-3">{s.description}</p>
                    <button
                      onClick={() => runScenario(s.id)}
                      disabled={scenarioRunning}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {scenarioRunning ? '⏳ Running...' : '▶ Run Scenario'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {activeScenarioResult && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-200 mb-4">📋 Scenario Result: {activeScenarioResult.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Vehicles Injected" value={activeScenarioResult.vehiclesInjected} />
                  <MetricCard label="Final Occupancy" value={`${(activeScenarioResult.finalOccupancy * 100).toFixed(1)}%`} />
                  <MetricCard label="Arrivals" value={activeScenarioResult.totalArrivals} color="text-green-400" />
                  <MetricCard label="Rejected" value={activeScenarioResult.totalRejected} color="text-red-400" />
                </div>
                {activeScenarioResult.evacuationResult && (
                  <div className="mt-4 p-3 bg-amber-900/30 rounded-lg">
                    <span className="font-medium text-amber-800">Evacuation: </span>
                    <span className="text-amber-700">{activeScenarioResult.evacuationResult.evacuated} evacuated, {activeScenarioResult.evacuationResult.remainingInQueue} remaining</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ RL TRAINING TAB ═══ */}
        {activeTab === 'rl' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">🤖 Reinforcement Learning Training</h3>
              <p className="text-sm text-zinc-500 mb-4">Train a DQN agent to optimize parking slot assignment using the Digital Twin simulation environment.</p>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <label className="text-xs text-zinc-500">Episodes</label>
                  <input type="number" value={trainEpisodes} onChange={(e) => setTrainEpisodes(Number(e.target.value))} className="block border rounded-lg px-3 py-2 text-sm w-32" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => trainRL(trainEpisodes)} disabled={rlTraining} className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
                    {rlTraining ? '⏳ Training...' : '🚀 Train RL Agent'}
                  </button>
                </div>
              </div>
            </div>

            {rlTrainingResult && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-200 mb-4">📊 Training Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricCard label="Episodes" value={rlTrainingResult.episodes} />
                  <MetricCard label="Avg Reward" value={rlTrainingResult.averageReward.toFixed(2)} color="text-purple-400" />
                  <MetricCard label="Best Reward" value={rlTrainingResult.bestReward.toFixed(2)} color="text-green-400" />
                  <MetricCard label="Final Epsilon" value={rlTrainingResult.finalEpsilon.toFixed(4)} />
                  <MetricCard label="Avg Utilization" value={`${(rlTrainingResult.averageUtilization * 100).toFixed(1)}%`} />
                </div>
                {/* Reward Curve */}
                {(rlTrainingResult.rewardHistory ?? []).length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-300 mb-2">Reward Curve</h4>
                    <div className="h-48 flex items-end gap-0.5 bg-zinc-800/50 rounded-lg p-2">
                      {(rlTrainingResult.rewardHistory ?? []).map((r, i) => {
                        const maxR = Math.max(...(rlTrainingResult.rewardHistory ?? [0]));
                        const minR = Math.min(...(rlTrainingResult.rewardHistory ?? [0]));
                        const range = maxR - minR || 1;
                        const h = ((r - minR) / range) * 100;
                        return (
                          <div key={i} className="flex-1 bg-purple-500 rounded-t-sm min-w-[1px]" style={{ height: `${Math.max(2, h)}%` }} title={`Ep ${i + 1}: ${r.toFixed(2)}`} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {rlEnvState && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">🎯 RL Environment State</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricCard label="Step" value={rlEnvState.step} />
                  <MetricCard label="Hour" value={rlEnvState.hour} />
                  <MetricCard label="Vehicles" value={rlEnvState.totalVehicles} />
                  <MetricCard label="Total Reward" value={rlEnvState.totalReward.toFixed(2)} />
                  <MetricCard label="Avg Occupancy" value={`${(rlEnvState.avgOccupancy * 100).toFixed(1)}%`} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ BENCHMARK TAB ═══ */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">🏁 Algorithm Benchmark Comparison</h3>
              <p className="text-sm text-zinc-500 mb-4">Compare Nearest Slot, Rule-Based, LSTM-Guided, and RL assignment algorithms.</p>
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <label className="text-xs text-zinc-500">Episodes</label>
                  <input type="number" value={benchmarkEpisodes} onChange={(e) => setBenchmarkEpisodes(Number(e.target.value))} className="block border rounded-lg px-3 py-2 text-sm w-32" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => runBenchmark(benchmarkEpisodes)} disabled={benchmarkRunning} className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50">
                    {benchmarkRunning ? '⏳ Running...' : '🏁 Run Benchmark'}
                  </button>
                </div>
              </div>
            </div>

            {benchmarkResult && (
              <>
                <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-200 mb-2">🏆 Best Algorithm: <span className="text-green-400">{benchmarkResult.bestAlgorithm}</span></h3>
                  <p className="text-sm text-zinc-500">Based on {benchmarkResult.episodes} episodes per algorithm</p>
                </div>

                <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm overflow-x-auto">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Algorithm Metrics Comparison</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-semibold text-zinc-400">Algorithm</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Avg Reward</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Search Time</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Congestion</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Utilization</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Throughput</th>
                        <th className="text-right py-2 px-3 font-semibold text-zinc-400">Wait Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(benchmarkResult.algorithms ?? {}).map(([name, m]) => (
                        <tr key={name} className={`border-b hover:bg-zinc-800/50 ${name === benchmarkResult.bestAlgorithm ? 'bg-green-900/30' : ''}`}>
                          <td className="py-2 px-3 font-medium">{name} {name === benchmarkResult.bestAlgorithm && '🏆'}</td>
                          <td className="text-right py-2 px-3">{m.avgReward.toFixed(2)}</td>
                          <td className="text-right py-2 px-3">{m.avgSearchTime.toFixed(1)}s</td>
                          <td className="text-right py-2 px-3">{m.avgCongestion.toFixed(3)}</td>
                          <td className="text-right py-2 px-3">{(m.avgUtilization * 100).toFixed(1)}%</td>
                          <td className="text-right py-2 px-3">{m.avgThroughput.toFixed(1)}</td>
                          <td className="text-right py-2 px-3">{m.avgWaitingTime.toFixed(1)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {Object.keys(benchmarkResult.comparisons ?? {}).length > 0 && (
                  <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">📈 RL vs Other Algorithms</h3>
                    <div className="space-y-2">
                      {Object.entries(benchmarkResult.comparisons ?? {}).map(([algo, comp]) => (
                        <div key={algo} className="p-3 bg-blue-900/30 rounded-lg">
                          <span className="font-medium text-blue-800">vs {algo}:</span>
                          <span className="text-sm text-blue-700 ml-2">
                            Search {comp.searchTimeImprovement} | Throughput {comp.throughputImprovement} | Congestion {comp.congestionReduction} | Utilization {comp.utilizationImprovement}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Research Evaluation */}
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-4">📚 Research Evaluation</h3>
              <p className="text-sm text-zinc-500 mb-4">Generate comprehensive evaluation metrics for publication (MAE, RMSE, Avg Reward, Utilization, Congestion, Throughput).</p>
              <button onClick={() => runEvaluation({ episodes: 30, rlEpisodes: 300 })} disabled={evaluationRunning} className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
                {evaluationRunning ? '⏳ Evaluating...' : '📊 Run Research Evaluation'}
              </button>
            </div>

            {evaluation && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-zinc-200 mb-4">📋 Evaluation Results</h3>
                {evaluation.researchSummary && (
                  <div className="mb-4 p-4 bg-blue-900/30 rounded-lg">
                    <h4 className="font-bold text-blue-800">{evaluation.researchSummary.title}</h4>
                    <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
                      {evaluation.researchSummary.keyFindings.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {evaluation.predictionAccuracy && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <MetricCard label="MAE" value={evaluation.predictionAccuracy.MAE.toFixed(4)} />
                    <MetricCard label="RMSE" value={evaluation.predictionAccuracy.RMSE.toFixed(4)} />
                  </div>
                )}
                {evaluation.performanceImprovement && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Congestion Reduction" value={`${evaluation.performanceImprovement.congestionReduction.toFixed(1)}%`} color="text-green-400" />
                    <MetricCard label="Search Time Reduction" value={`${evaluation.performanceImprovement.searchTimeReduction.toFixed(1)}%`} color="text-blue-400" />
                    <MetricCard label="Utilization Improvement" value={`${evaluation.performanceImprovement.utilizationImprovement.toFixed(1)}%`} color="text-purple-400" />
                    <MetricCard label="Throughput Improvement" value={`${evaluation.performanceImprovement.throughputImprovement.toFixed(1)}%`} color="text-orange-400" />
                  </div>
                )}
                {evaluation.exportedTo && (
                  <div className="mt-4 text-sm text-zinc-500">📁 Exported to: <code className="bg-zinc-800 px-2 py-0.5 rounded">{evaluation.exportedTo}</code></div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ COMPETITION TAB ═══ */}
        {activeTab === 'competition' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-200 mb-2">🏆 Interactive Competition Mode</h3>
              <p className="text-sm text-zinc-500 mb-6">Allow judges and evaluators to interact with the Digital Twin in real-time. Inject vehicles, create traffic spikes, and simulate emergencies.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Inject Single */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h4 className="font-bold text-zinc-300 mb-2">🔧 Inject Vehicle</h4>
                  <select value={injectType} onChange={(e) => setInjectType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-3">
                    <option value="car">🚗 Car</option>
                    <option value="motorcycle">🏍️ Motorcycle</option>
                    <option value="truck">🚛 Truck</option>
                    <option value="vip">⭐ VIP</option>
                  </select>
                  <button onClick={() => injectVehicle(injectType)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Inject Now
                  </button>
                </div>

                {/* Traffic Spike */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h4 className="font-bold text-zinc-300 mb-2">📈 Traffic Spike</h4>
                  <label className="text-xs text-zinc-500">Vehicles</label>
                  <input type="number" value={spikeCount} onChange={(e) => setSpikeCount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm mb-3" />
                  <button onClick={() => injectSpike(spikeCount, 60)} className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
                    🔥 Create Spike
                  </button>
                </div>

                {/* Emergency Evacuation */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-900/30">
                  <h4 className="font-bold text-red-700 mb-2">🚨 Emergency</h4>
                  <p className="text-xs text-red-500 mb-3">Triggers immediate evacuation of all vehicles.</p>
                  <button onClick={() => triggerEmergency('evacuation')} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                    🚨 Evacuate Now
                  </button>
                </div>

                {/* Algorithm Comparison */}
                <div className="border border-white/10 rounded-lg p-4">
                  <h4 className="font-bold text-zinc-300 mb-2">🏁 Compare Algorithms</h4>
                  <p className="text-xs text-zinc-500 mb-3">Run benchmark to compare all 4 algorithms side-by-side.</p>
                  <button onClick={() => { setActiveTab('benchmark'); runBenchmark(20); }} className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                    🏁 Quick Benchmark
                  </button>
                </div>
              </div>
            </div>

            {/* Current State Overview */}
            {simulationState && (
              <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-300 mb-4">📊 Current Simulation State</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  <MetricCard label="Occupancy" value={`${(simulationState.overallOccupancy * 100).toFixed(0)}%`} color={simulationState.overallOccupancy > 0.85 ? 'text-red-400' : 'text-green-400'} />
                  <MetricCard label="Active" value={simulationState.activeVehicles} />
                  <MetricCard label="Arrivals" value={simulationState.totalArrivals} />
                  <MetricCard label="Departures" value={simulationState.totalDepartures} />
                  <MetricCard label="Rejected" value={simulationState.totalRejected} color="text-red-400" />
                  <MetricCard label="Waiting" value={simulationState.vehicleQueues?.waiting ?? 0} />
                  <MetricCard label="Parking" value={simulationState.vehicleQueues?.parking ?? 0} />
                  <MetricCard label="Departing" value={simulationState.vehicleQueues?.departing ?? 0} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParkingDigitalTwinDashboard;