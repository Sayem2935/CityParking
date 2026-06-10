import { useState, useEffect, useCallback } from 'react';
import { optimizationService } from '../services/optimization.service';
import type {
  ZoneRecommendation,
  CongestionData,
  LoadBalanceData,
  PerformanceData,
  SmartRecommendationsData,
} from '../types/optimization.types';

// ─── Utility: generic hook for async data ──────────────────────
function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, ...deps]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => setRetryCount((c) => c + 1);

  return { data, loading, error, retry, refresh: load };
}

// ─── Sub-components ────────────────────────────────────────────

function LoadingCard({ title }: { title: string }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">{title}</h3>
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-zinc-700 rounded w-3/4" />
        <div className="h-4 bg-zinc-700 rounded w-1/2" />
        <div className="h-4 bg-zinc-700 rounded w-5/6" />
      </div>
    </div>
  );
}

function ErrorCard({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-red-200 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">{title}</h3>
      <p className="text-red-400 text-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-900/30 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyCard({ title }: { title: string }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm">No data available yet.</p>
    </div>
  );
}

// ─── Recommendation Card ───────────────────────────────────────

function RecommendationCard({ data }: { data: ZoneRecommendation }) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">
        🎯 RL Zone Recommendation
      </h3>
      <div className="mb-4">
        <p className="text-sm text-zinc-500">Recommended Zone</p>
        <p className="text-2xl font-bold text-indigo-700">
          {data.recommended_zone}
        </p>
        <p className="text-sm text-zinc-500 mt-1">
          Floor: <span className="font-medium">{data.recommended_floor}</span>
        </p>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500">Confidence</p>
          <p className="text-lg font-semibold text-green-400">
            {(data.confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Algorithm</p>
          <p className="text-sm font-medium text-zinc-300">{data.algorithm}</p>
        </div>
      </div>
      {data.all_options && data.all_options.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">All Zone Options</p>
          <div className="space-y-2">
            {data.all_options.map((opt, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-zinc-900/80 backdrop-blur-md rounded-lg px-3 py-2"
              >
                <span className="text-sm font-medium">{opt.zone}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    Score: {opt.score.toFixed(2)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Occ: {(opt.occupancy * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-zinc-500">
                    Cong: {(opt.congestion * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Congestion Card ───────────────────────────────────────────

function CongestionCard({ data }: { data: CongestionData }) {
  const colorFor = (level?: string | null) => {
    const normalized = (level ?? 'low').toLowerCase();
    if (normalized.includes('low')) return 'text-green-400 bg-green-900/30';
    if (normalized.includes('moderate') || normalized.includes('medium'))
      return 'text-yellow-600 bg-yellow-50';
    return 'text-red-400 bg-red-900/30';
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">
        🚦 Congestion Analysis
      </h3>
      <div className="flex items-center gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500">Overall</p>
          <p
            className={`text-lg font-bold px-3 py-1 rounded-lg ${colorFor(
              data.overall_congestion
            )}`}
          >
            {data.overall_congestion}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Score</p>
          <p className="text-lg font-semibold">
            {(data.overall_score * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      {data.zones && data.zones.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.zones.map((z, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2"
            >
              <span className="text-sm font-medium">{z.zone}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${colorFor(
                    z.congestion_level
                  )}`}
                >
                  {z.congestion_level}
                </span>
                <span className="text-xs text-zinc-500">
                  {(z.congestion_score * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-gray-400">{z.trend}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.bottlenecks && data.bottlenecks.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-zinc-500 mb-1">Bottlenecks</p>
          {data.bottlenecks.map((b, i) => (
            <p key={i} className="text-sm text-red-500">
              ⚠ {b}
            </p>
          ))}
        </div>
      )}
      {data.mitigation_strategies && data.mitigation_strategies.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Mitigation</p>
          {data.mitigation_strategies.map((s, i) => (
            <p key={i} className="text-sm text-zinc-400">
              ✓ {s}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Load Balance Card ─────────────────────────────────────────

function LoadBalanceCard({ data }: { data: LoadBalanceData }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">
        ⚖️ Load Balancing
      </h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-zinc-500">Balance Score</p>
          <p className="text-xl font-bold text-blue-400">
            {(data.balance_score * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Avg Utilization</p>
          <p className="text-xl font-bold">
            {(data.average_utilization * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Efficiency Gain</p>
          <p className="text-xl font-bold text-green-400">
            {data.efficiency_gain}
          </p>
        </div>
      </div>
      {data.zones && data.zones.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.zones.map((z, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2"
            >
              <span className="text-sm font-medium">{z.zone}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  Occ: {(z.occupancy * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-zinc-500">
                  Vehicles: {z.vehicle_count}
                </span>
                <span className="text-xs text-zinc-500">
                  Dev: {(z.deviation * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.recommendations && data.recommendations.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Recommendations</p>
          {data.recommendations.map((r, i) => (
            <p key={i} className="text-sm text-zinc-400">
              💡 {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Performance Card ──────────────────────────────────────────

function PerformanceCard({ data }: { data: PerformanceData }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">
        📊 RL Performance
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-900/30 rounded-lg p-3">
          <p className="text-xs text-zinc-500">Avg Reward</p>
          <p className="text-xl font-bold text-green-700">
            {data.avg_reward?.toFixed(2) ?? '—'}
          </p>
        </div>
        <div className="bg-blue-900/30 rounded-lg p-3">
          <p className="text-xs text-zinc-500">Total Decisions</p>
          <p className="text-xl font-bold text-blue-700">
            {data.total_decisions ?? 0}
          </p>
        </div>
      </div>
      {data.improvement && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-xs text-zinc-500">Search Time ↓</p>
            <p className="text-sm font-semibold text-green-400">
              {data.improvement.search_time_reduction}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Congestion ↓</p>
            <p className="text-sm font-semibold text-green-400">
              {data.improvement.congestion_reduction}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Walking ↓</p>
            <p className="text-sm font-semibold text-green-400">
              {data.improvement.walking_distance_reduction}
            </p>
          </div>
        </div>
      )}
      {data.rl && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">RL Metrics</p>
            <p className="text-xs">
              Search: {data.rl.avg_search_time?.toFixed(2)}s
            </p>
            <p className="text-xs">
              Congestion: {(data.rl.avg_congestion * 100)?.toFixed(1)}%
            </p>
            <p className="text-xs">
              Throughput: {data.rl.vehicle_throughput?.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Traditional</p>
            <p className="text-xs">
              Search: {data.traditional?.avg_search_time?.toFixed(2)}s
            </p>
            <p className="text-xs">
              Congestion:{' '}
              {(data.traditional?.avg_congestion * 100)?.toFixed(1)}%
            </p>
            <p className="text-xs">
              Throughput: {data.traditional?.vehicle_throughput?.toFixed(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Smart Recommendations Card ────────────────────────────────

function SmartRecommendationsCard({ data }: { data: SmartRecommendationsData }) {
  const priorityColor = (p?: string | null) => {
    const normalized = (p ?? 'low').toLowerCase();
    if (normalized === 'high') return 'border-red-300 bg-red-900/30';
    if (normalized === 'medium') return 'border-yellow-300 bg-yellow-50';
    return 'border-green-300 bg-green-900/30';
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">
        🤖 Smart Recommendations
      </h3>
      {data.recommendations && data.recommendations.length > 0 ? (
        <div className="space-y-3 mb-4">
          {data.recommendations.map((rec, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 ${priorityColor(rec.priority)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-zinc-400">
                  {rec.type}
                </span>
                <span className="text-xs font-medium text-zinc-500">
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{rec.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 mb-4">No recommendations.</p>
      )}
      {data.parking_assistant && data.parking_assistant.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Parking Assistant</p>
          {data.parking_assistant.map((pa, i) => (
            <div
              key={i}
              className="border border-blue-200 bg-blue-900/30 rounded-lg p-3 mb-2"
            >
              <p className="text-sm text-zinc-300">{pa.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────

export default function ParkingOptimizationDashboard() {
  const recommendation = useAsyncData<ZoneRecommendation>(
    optimizationService.getRecommendation
  );
  const congestion = useAsyncData<CongestionData>(
    optimizationService.getCongestion
  );
  const loadBalance = useAsyncData<LoadBalanceData>(
    optimizationService.getLoadBalance
  );
  const performance = useAsyncData<PerformanceData>(
    optimizationService.getPerformance
  );
  const smartRecs = useAsyncData<SmartRecommendationsData>(
    optimizationService.getSmartRecommendations
  );

  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [trainResult, setTrainResult] = useState<Record<string, unknown> | null>(
    null
  );

  const handleTrain = async () => {
    setTraining(true);
    setTrainError(null);
    setTrainResult(null);
    try {
      const result = await optimizationService.trainModel({
        episodes: 100,
        algorithm: 'dqn',
      });
      setTrainResult(result);
      // Refresh performance data after training
      performance.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Training failed';
      setTrainError(message);
    } finally {
      setTraining(false);
    }
  };

  const refreshAll = () => {
    recommendation.refresh();
    congestion.refresh();
    loadBalance.refresh();
    performance.refresh();
    smartRecs.refresh();
  };

  return (
    <div className="min-h-screen bg-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            Parking Optimization Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            RL-based dynamic parking optimization with real-time analytics
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={refreshAll}
            className="px-4 py-2 bg-zinc-900/80 backdrop-blur-md border border-white/20 rounded-lg hover:bg-zinc-800/50 text-sm font-medium"
          >
            🔄 Refresh All
          </button>
          <button
            onClick={handleTrain}
            disabled={training}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
              training
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {training ? '⏳ Training...' : '🧠 Train RL Model'}
          </button>
        </div>
      </div>

      {/* Train result / error */}
      {trainError && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">Training Error: {trainError}</p>
        </div>
      )}
      {trainResult && (
        <div className="mb-4 p-4 bg-green-900/30 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">
            ✅ Training completed successfully
          </p>
          <pre className="text-xs text-green-400 mt-1 overflow-auto">
            {JSON.stringify(trainResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendation */}
        {recommendation.loading ? (
          <LoadingCard title="RL Zone Recommendation" />
        ) : recommendation.error ? (
          <ErrorCard
            title="RL Zone Recommendation"
            message={recommendation.error}
            onRetry={recommendation.retry}
          />
        ) : recommendation.data ? (
          <RecommendationCard data={recommendation.data} />
        ) : (
          <EmptyCard title="RL Zone Recommendation" />
        )}

        {/* Congestion */}
        {congestion.loading ? (
          <LoadingCard title="Congestion Analysis" />
        ) : congestion.error ? (
          <ErrorCard
            title="Congestion Analysis"
            message={congestion.error}
            onRetry={congestion.retry}
          />
        ) : congestion.data ? (
          <CongestionCard data={congestion.data} />
        ) : (
          <EmptyCard title="Congestion Analysis" />
        )}

        {/* Load Balance */}
        {loadBalance.loading ? (
          <LoadingCard title="Load Balancing" />
        ) : loadBalance.error ? (
          <ErrorCard
            title="Load Balancing"
            message={loadBalance.error}
            onRetry={loadBalance.retry}
          />
        ) : loadBalance.data ? (
          <LoadBalanceCard data={loadBalance.data} />
        ) : (
          <EmptyCard title="Load Balancing" />
        )}

        {/* Performance */}
        {performance.loading ? (
          <LoadingCard title="RL Performance" />
        ) : performance.error ? (
          <ErrorCard
            title="RL Performance"
            message={performance.error}
            onRetry={performance.retry}
          />
        ) : performance.data ? (
          <PerformanceCard data={performance.data} />
        ) : (
          <EmptyCard title="RL Performance" />
        )}

        {/* Smart Recommendations - full width */}
        <div className="lg:col-span-2">
          {smartRecs.loading ? (
            <LoadingCard title="Smart Recommendations" />
          ) : smartRecs.error ? (
            <ErrorCard
              title="Smart Recommendations"
              message={smartRecs.error}
              onRetry={smartRecs.retry}
            />
          ) : smartRecs.data ? (
            <SmartRecommendationsCard data={smartRecs.data} />
          ) : (
            <EmptyCard title="Smart Recommendations" />
          )}
        </div>
      </div>
    </div>
  );
}