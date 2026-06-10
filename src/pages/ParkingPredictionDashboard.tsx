import { useState, useEffect, useCallback } from "react"; // eslint-disable-line @typescript-eslint/no-unused-vars
import { parkingService } from "@/services/parking.service";
import type {
  PredictionResponse,
  TrendResponse,
  PeakHourResponse,
  AnalyticsResponse,
} from "@/types/prediction.types";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";

const REFRESH_INTERVAL = 60_000; // 60 seconds

function TrendBadge({ trend }: { trend: string }) {
  const config: Record<string, { color: string; icon: string; label: string }> = {
    INCREASING: { color: "bg-red-100 text-red-700", icon: "📈", label: "Increasing" },
    STABLE: { color: "bg-green-100 text-green-700", icon: "➡️", label: "Stable" },
    DECREASING: { color: "bg-blue-100 text-blue-700", icon: "📉", label: "Decreasing" },
  };
  const c = config[trend] || config.STABLE;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

function ForecastCard({
  label,
  value,
  confidence,
  accent,
}: {
  label: string;
  value: number;
  confidence?: number;
  accent: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent}`}>
      <p className="text-sm text-zinc-500 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}%</p>
      {confidence !== undefined && (
        <p className="text-xs text-gray-400 mt-1">
          Confidence: {(confidence * 100).toFixed(0)}%
        </p>
      )}
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-zinc-700 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ParkingPredictionDashboard() {
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [trends, setTrends] = useState<TrendResponse | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHourResponse | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [pred, trend, peak, anal] = await Promise.all([
        parkingService.getCurrentPredictions(),
        parkingService.getTrends(),
        parkingService.getPeakHours(),
        parkingService.getAnalytics(),
      ]);
      setPredictions(pred);
      setTrends(trend);
      setPeakHours(peak);
      setAnalytics(anal);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load predictions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const timer = setInterval(fetchAll, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAll]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Parking Predictions</h1>
          <p className="text-sm text-zinc-500">AI-powered occupancy forecasting & analytics</p>
        </div>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
        >
          Refresh
        </button>
      </div>

      {/* Forecast Cards */}
      {predictions && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">Occupancy Forecast</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <ForecastCard
              label="Current"
              value={predictions.currentOccupancy}
              accent="bg-indigo-50 border-indigo-200"
            />
            {predictions.predictions.map((p) => (
              <ForecastCard
                key={p.minutesAhead}
                label={`+${p.minutesAhead} min`}
                value={p.predictedOccupancy}
                confidence={p.confidence}
                accent="bg-zinc-900/80 backdrop-blur-md border-white/10"
              />
            ))}
          </div>

          {/* Trend Indicator */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-zinc-500">Trend:</span>
            <TrendBadge trend={predictions.trend} />
          </div>

          {/* Capacity Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>Occupied: {predictions.occupiedSlots}</span>
              <span>Free: {predictions.freeSlots}</span>
              <span>Total: {predictions.totalSlots}</span>
            </div>
            <MiniBar
              value={predictions.occupiedSlots}
              max={predictions.totalSlots}
              color="bg-indigo-500"
            />
          </div>

          {/* Recommendations */}
          {predictions.recommendations.length > 0 && (
            <div className="mt-4 bg-amber-900/30 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">💡 Recommendations</h3>
              <ul className="space-y-1">
                {predictions.recommendations.map((rec, i) => (
                  <li key={i} className="text-sm text-amber-700">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Peak Hour Analysis */}
      {peakHours && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">Peak Hour Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Busiest Hour</p>
              <p className="text-xl font-bold text-zinc-100">{peakHours.busiestHourLabel}</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Busiest Day</p>
              <p className="text-xl font-bold text-zinc-100">{peakHours.busiestDayLabel}</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Avg Utilization</p>
              <p className="text-xl font-bold text-zinc-100">{peakHours.averageUtilization.toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Peak Occupancy</p>
              <p className="text-xl font-bold text-zinc-100">{peakHours.peakOccupancy}%</p>
            </div>
          </div>

          {/* Hourly Breakdown Chart */}
          <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Hourly Breakdown</h3>
            <div className="space-y-2">
              {peakHours.hourlyBreakdown.map((h) => (
                <div key={h.hour} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-zinc-500 text-right">{h.label}</span>
                  <div className="flex-1">
                    <MiniBar value={h.averageOccupancy} max={100} color="bg-indigo-400" />
                  </div>
                  <span className="w-14 text-xs text-zinc-400 text-right">
                    {h.averageOccupancy.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trend Analysis */}
      {trends && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">Trend Analysis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Growth Trend</p>
              <p className="text-lg font-bold text-zinc-100">{trends.growthTrend}</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Decline Trend</p>
              <p className="text-lg font-bold text-zinc-100">{trends.declineTrend}</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Occupancy Velocity</p>
              <p className="text-lg font-bold text-zinc-100">{trends.occupancyVelocity.toFixed(2)}%/hr</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Utilization Variance</p>
              <p className="text-lg font-bold text-zinc-100">{trends.utilizationVariance.toFixed(1)}%</p>
            </div>
          </div>

          {/* Weekly Trend */}
          {trends.weeklyTrend.length > 0 && (
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Weekly Pattern</h3>
              <div className="grid grid-cols-7 gap-2">
                {trends.weeklyTrend.map((d) => (
                  <div key={d.dayOfWeek} className="text-center">
                    <p className="text-xs text-zinc-500 mb-1">{d.dayName.slice(0, 3)}</p>
                    <div className="bg-indigo-100 rounded-lg p-2">
                      <p className="text-lg font-bold text-indigo-700">
                        {d.averageOccupancy.toFixed(0)}%
                      </p>
                      <p className="text-[10px] text-gray-400">peak {d.peakOccupancy}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Analytics */}
      {analytics && (
        <section>
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">Analytics Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Average Occupancy</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.averageOccupancy.toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Peak Occupancy</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.peakOccupancy}%</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Utilization Efficiency</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.utilizationEfficiency.toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Growth Rate</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.occupancyGrowthRate.toFixed(2)}%</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Total Slots</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.totalSlots}</p>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <p className="text-sm text-zinc-500">Avg Occupied Slots</p>
              <p className="text-2xl font-bold text-zinc-100">{analytics.averageOccupiedSlots}</p>
            </div>
          </div>

          {/* Weekly Trend Analysis */}
          {analytics.weeklyTrendAnalysis.length > 0 && (
            <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">Weekly Trend Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="pb-2">Week</th>
                      <th className="pb-2">Avg Occupancy</th>
                      <th className="pb-2">Peak</th>
                      <th className="pb-2">Growth Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.weeklyTrendAnalysis.map((w) => (
                      <tr key={w.weekLabel} className="border-b last:border-0">
                        <td className="py-2 font-medium">{w.weekLabel}</td>
                        <td className="py-2">{w.averageOccupancy.toFixed(1)}%</td>
                        <td className="py-2">{w.peakOccupancy}%</td>
                        <td className="py-2">
                          <span
                            className={
                              w.growthRate >= 0 ? "text-red-400" : "text-green-400"
                            }
                          >
                            {w.growthRate >= 0 ? "+" : ""}
                            {w.growthRate.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}