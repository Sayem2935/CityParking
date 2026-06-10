# Sprint 11: Parking Occupancy Prediction & Intelligent Analytics

## Overview

Sprint 11 upgrades the CityParking system from reactive monitoring to **predictive smart parking management**. It introduces AI-powered occupancy forecasting, trend analysis, peak-hour detection, and intelligent recommendations—all integrated with the existing Parking Slot Detection & Smart Slot Management module from Sprint 10.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                       │
│  ParkingPredictionDashboard.tsx                             │
│  - Forecast cards (current + 15/30/60/120 min)             │
│  - Trend indicators (increasing/stable/decreasing)         │
│  - Peak hour analysis with hourly breakdown                │
│  - Weekly pattern visualization                            │
│  - Analytics overview & weekly trend table                 │
│  - Intelligent recommendations display                     │
│  - Auto-refresh every 60 seconds                          │
├─────────────────────────────────────────────────────────────┤
│                  REST API (Spring Boot)                      │
│  ParkingPredictionController                                │
│  GET  /api/parking/predictions                              │
│  GET  /api/parking/predictions/current                      │
│  GET  /api/parking/predictions/trends                       │
│  GET  /api/parking/predictions/peak-hours                   │
│  GET  /api/parking/predictions/analytics                    │
│  POST /api/parking/predictions/generate                     │
├─────────────────────────────────────────────────────────────┤
│                  Service Layer                               │
│  ParkingPredictionService                                   │
│  - Historical collection (5-min snapshots)                  │
│  - Prediction generation (moving avg, exp smoothing, trend) │
│  - Trend analysis (growth/decline, velocity, variance)      │
│  - Peak hour analysis                                       │
│  - Analytics engine                                         │
│  - Intelligent recommendations                              │
├─────────────────────────────────────────────────────────────┤
│                  Data Layer                                  │
│  ParkingOccupancyHistory (entity + repository)              │
│  ParkingPrediction (entity + repository)                    │
│  Flyway V8 migration with 30-day seed data                  │
├─────────────────────────────────────────────────────────────┤
│                  AI Service (Python)                         │
│  parking_prediction.py                                      │
│  - Moving Average Forecast                                  │
│  - Exponential Smoothing                                    │
│  - Historical Trend Analysis                                │
│  - Simulation fallback for insufficient history             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deliverables

### Part A — Database (Flyway Migration)

**File:** `backend/src/main/resources/db/migration/V8__create_parking_prediction_tables.sql`

#### Tables Created

| Table | Purpose |
|-------|---------|
| `parking_occupancy_history` | Stores 5-minute occupancy snapshots with zone/floor context |
| `parking_predictions` | Stores generated predictions with confidence scores |

#### Indexes

- `idx_occupancy_history_timestamp` — on `parking_occupancy_history(timestamp)`
- `idx_occupancy_history_zone` — on `parking_occupancy_history(zone)`
- `idx_predictions_forecast_for` — on `parking_predictions(forecast_for)`

#### Seed Data

30 days of realistic historical parking data seeded with time-of-day patterns:
- Night (0-5): 5-15% occupancy
- Morning rush (6-9): ramps up to 50-80%
- Midday (10-15): 60-85%
- Evening rush (16-18): 70-90%
- Evening decline (19-23): drops back to 10-30%

---

### Part B — AI Prediction Service (Python)

**File:** `ai-service/parking_prediction.py`

#### Prediction Algorithms

| Algorithm | Description |
|-----------|-------------|
| **Moving Average** | Weighted window of recent observations |
| **Exponential Smoothing** | α-weighted smoothing (α=0.3 default) |
| **Historical Trend** | Same time-of-day from previous days |

#### Forecast Horizons

- 15 minutes ahead
- 30 minutes ahead
- 1 hour ahead
- 2 hours ahead

#### Key Features

- **Simulation fallback** when insufficient history (< 10 data points)
- **Confidence decay** — longer predictions have lower confidence
- **Recommendations engine** — generates actionable insights

---

### Part C — Spring Boot Entities & Repositories

#### Entities

| Entity | Key Fields |
|--------|-----------|
| `ParkingOccupancyHistory` | id, timestamp, totalSlots, occupiedSlots, freeSlots, occupancyPercentage, zone, floor |
| `ParkingPrediction` | id, predictionTimestamp, forecastFor, predictedOccupancy, confidenceScore, predictionModel, createdAt |

#### Repositories

| Repository | Custom Queries |
|-----------|---------------|
| `ParkingOccupancyHistoryRepository` | findByZoneOrderByTimestampDesc, findHourlyUtilization, findDailyUtilization, findWeeklyUtilization, findAverageOccupancy, findPeakOccupancy, findWeeklyAverageOccupancy |
| `ParkingPredictionRepository` | findTopByZoneOrderByCreatedAtDesc, findByForecastForBetween |

---

### Part D — Prediction Service

**File:** `backend/.../service/ParkingPredictionService.java`

#### Responsibilities

1. **Historical Collection** — `@Scheduled(fixedRate=300000)` collects occupancy snapshots every 5 minutes
2. **Prediction Generation** — Moving average + exponential smoothing + trend analysis
3. **Trend Analysis** — Growth/decline trend, occupancy velocity, utilization variance
4. **Peak Hour Analysis** — Busiest hour, busiest day, average utilization
5. **Analytics Engine** — Average/peak occupancy, efficiency, growth rate, weekly trends
6. **Intelligent Recommendations** — Context-aware suggestions based on predictions

---

### Part E — REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parking/predictions` | GET | Full prediction with recommendations |
| `/api/parking/predictions/current` | GET | Current/latest predictions |
| `/api/parking/predictions/trends` | GET | Trend analysis (hourly/daily/weekly) |
| `/api/parking/predictions/peak-hours` | GET | Peak hour analysis with breakdown |
| `/api/parking/predictions/analytics` | GET | Analytics overview & weekly trends |
| `/api/parking/predictions/generate` | POST | Force generate new predictions |

All endpoints support optional `?zone=` query parameter.

---

### Part F — Frontend Dashboard

**File:** `src/pages/ParkingPredictionDashboard.tsx`

#### Components

- **Forecast Cards** — Current + 15/30/60/120 min predictions with confidence badges
- **Trend Badge** — Visual indicator (📈 Increasing / ➡️ Stable / 📉 Decreasing)
- **Capacity Bar** — Occupied vs free slots visualization
- **Recommendations Panel** — AI-generated actionable suggestions
- **Peak Hour Analysis** — Busiest hour/day cards + hourly breakdown bars
- **Trend Analysis** — Growth/decline/velocity/variance metrics + weekly pattern grid
- **Analytics Overview** — Summary metrics + weekly trend table

#### Auto-Refresh

Dashboard refreshes all data every 60 seconds via `setInterval`.

---

### Part G — Analytics Engine

#### DTOs

| DTO | Fields |
|-----|--------|
| `PredictionPointResponse` | minutesAhead, predictedOccupancy, confidence |
| `PredictionResponse` | currentOccupancy, totalSlots, occupiedSlots, freeSlots, trend, predictions[], recommendations[] |
| `TrendResponse` | growthTrend, declineTrend, occupancyVelocity, utilizationVariance, hourlyTrend[], dailyTrend[], weeklyTrend[] |
| `PeakHourResponse` | busiestHour, busiestDay, averageUtilization, peakOccupancy, hourlyBreakdown[] |
| `AnalyticsResponse` | averageOccupancy, peakOccupancy, utilizationEfficiency, occupancyGrowthRate, totalSlots, averageOccupiedSlots, weeklyTrendAnalysis[] |

---

### Part H — Tests

**File:** `backend/.../service/ParkingPredictionServiceTest.java`

#### Test Coverage (11 tests)

| Test | Coverage Area |
|------|--------------|
| `generatePredictions_WithSufficientHistory_ReturnsPredictions` | Core prediction flow |
| `generatePredictions_WithInsufficientHistory_UsesSimulationFallback` | Fallback handling |
| `generatePredictions_NullZone_UsesGlobalData` | Global predictions |
| `calculateConfidence_WithMoreDataPoints_ReturnsHigherConfidence` | Confidence calculation |
| `collectOccupancySnapshot_StoresHistoryRecord` | Snapshot collection |
| `getTrendAnalysis_ReturnsValidTrends` | Trend analysis |
| `getPeakHourAnalysis_ReturnsPeakData` | Peak hour analysis |
| `getAnalytics_ReturnsCompleteAnalytics` | Analytics engine |
| `generatePredictions_PredictedOccupancyWithinBounds` | Output validation |
| `getCurrentPredictions_WhenNoPredictionsExist_GeneratesNew` | Auto-generation |
| `trendCalculation_DetectsIncreasingTrend` | Trend detection |

---

### Part I — Intelligent Recommendations

Generated by `ParkingPredictionService.generateRecommendations()`:

- **High occupancy warnings**: "Parking is expected to reach X% capacity in Y minutes."
- **Zone redirections**: "Recommend directing incoming vehicles to Zone D."
- **Demand forecasts**: "Parking demand expected to increase by X%."
- **Near-capacity alerts**: "Zone A is nearly full. Consider alternate zones."
- **Positive feedback**: "Parking occupancy is stable. All zones operating normally."

---

## File Inventory

### New Files Created

| Layer | File |
|-------|------|
| **Database** | `backend/src/main/resources/db/migration/V8__create_parking_prediction_tables.sql` |
| **AI Service** | `ai-service/parking_prediction.py` |
| **Entity** | `backend/.../entity/ParkingOccupancyHistory.java` |
| **Entity** | `backend/.../entity/ParkingPrediction.java` |
| **Repository** | `backend/.../repository/ParkingOccupancyHistoryRepository.java` |
| **Repository** | `backend/.../repository/ParkingPredictionRepository.java` |
| **DTO** | `backend/.../dto/prediction/PredictionPointResponse.java` |
| **DTO** | `backend/.../dto/prediction/PredictionResponse.java` |
| **DTO** | `backend/.../dto/prediction/TrendResponse.java` |
| **DTO** | `backend/.../dto/prediction/PeakHourResponse.java` |
| **DTO** | `backend/.../dto/prediction/AnalyticsResponse.java` |
| **Service** | `backend/.../service/ParkingPredictionService.java` |
| **Controller** | `backend/.../controller/ParkingPredictionController.java` |
| **Test** | `backend/.../service/ParkingPredictionServiceTest.java` |
| **Frontend Types** | `src/types/prediction.types.ts` |
| **Frontend Page** | `src/pages/ParkingPredictionDashboard.tsx` |
| **Documentation** | `docs/sprint11-parking-occupancy-prediction.md` |

### Modified Files

| File | Change |
|------|--------|
| `src/services/parking.service.ts` | Added prediction API methods |
| `src/App.tsx` | Added `/parking/predictions` route |

---

## Integration Points

- Integrates with **ParkingSlot** entity for real-time slot counts
- Integrates with **ParkingSlotService** for current occupancy data
- Scheduled task runs alongside existing `ScheduledCleanupConfig`
- Frontend uses existing `parkingService` for API calls
- Route accessible at `/parking/predictions` (protected, requires authentication)