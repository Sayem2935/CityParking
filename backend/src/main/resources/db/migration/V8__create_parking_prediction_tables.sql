-- Sprint 11: Parking Occupancy Prediction & Intelligent Analytics
-- Creates tables for occupancy history and predictions

-- Parking occupancy history: stores periodic snapshots of parking state
CREATE TABLE parking_occupancy_history (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_slots INTEGER NOT NULL,
    occupied_slots INTEGER NOT NULL,
    free_slots INTEGER NOT NULL,
    occupancy_percentage DOUBLE PRECISION NOT NULL,
    zone VARCHAR(10),
    floor INTEGER
);

CREATE INDEX idx_occupancy_history_timestamp ON parking_occupancy_history(timestamp);
CREATE INDEX idx_occupancy_history_zone ON parking_occupancy_history(zone);
CREATE INDEX idx_occupancy_history_floor ON parking_occupancy_history(floor);

COMMENT ON TABLE parking_occupancy_history IS 'Periodic snapshots of parking occupancy for trend analysis and predictions';
COMMENT ON COLUMN parking_occupancy_history.occupancy_percentage IS 'Occupancy as percentage (0-100)';
COMMENT ON COLUMN parking_occupancy_history.zone IS 'Specific zone or NULL for whole-lot snapshot';
COMMENT ON COLUMN parking_occupancy_history.floor IS 'Specific floor or NULL for whole-lot snapshot';

-- Parking predictions: stores generated forecasts
CREATE TABLE parking_predictions (
    id BIGSERIAL PRIMARY KEY,
    prediction_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    forecast_for TIMESTAMP NOT NULL,
    predicted_occupancy DOUBLE PRECISION NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    prediction_model VARCHAR(50) NOT NULL,
    zone VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_forecast_for ON parking_predictions(forecast_for);
CREATE INDEX idx_predictions_timestamp ON parking_predictions(prediction_timestamp);

COMMENT ON TABLE parking_predictions IS 'AI-generated parking occupancy predictions';
COMMENT ON COLUMN parking_predictions.predicted_occupancy IS 'Predicted occupancy percentage (0-100)';
COMMENT ON COLUMN parking_predictions.confidence_score IS 'Prediction confidence (0.0-1.0)';
COMMENT ON COLUMN parking_predictions.prediction_model IS 'Model used: MOVING_AVERAGE, EXPONENTIAL_SMOOTHING, TREND_ANALYSIS';

-- Seed realistic historical parking data for 30 days
-- Pattern: higher occupancy during business hours (8am-6pm), lower at night/weekends
-- Zones: A, B, C across floors 1-3

DO $$
DECLARE
    day_offset INTEGER;
    hour_val INTEGER;
    base_ts TIMESTAMP;
    occupancy_pct DOUBLE PRECISION;
    total_slots_val INTEGER := 85; -- total slots in parking lot
    occupied_val INTEGER;
    free_val INTEGER;
    zone_record RECORD;
    -- Zone definitions matching V7 seed data
    zones TEXT[][] := ARRAY[
        ARRAY['A', '27'], -- Zone A: 27 slots
        ARRAY['B', '27'], -- Zone B: 27 slots
        ARRAY['C', '9']   -- Zone C: 9 slots (floor 1 only for simplicity in zone-level seeding)
    ];
    zone_occupied INTEGER;
    zone_total INTEGER;
BEGIN
    -- Generate 30 days of data with 15-minute intervals
    FOR day_offset IN 0..29 LOOP
        base_ts := CURRENT_TIMESTAMP - INTERVAL '30 days' + (day_offset * INTERVAL '1 day');

        FOR hour_val IN 0..23 LOOP
            -- Only seed data every 15 minutes (0, 15, 30, 45)
            -- For simplicity, seed hourly data with slight variations
            DECLARE
                actual_ts TIMESTAMP;
                day_of_week INTEGER;
                is_weekend BOOLEAN;
                noise DOUBLE PRECISION;
            BEGIN
                actual_ts := base_ts + (hour_val * INTERVAL '1 hour');
                day_of_week := EXTRACT(DOW FROM actual_ts);
                is_weekend := (day_of_week = 0 OR day_of_week = 6);
                noise := (random() * 10 - 5); -- -5 to +5 random noise

                -- Business hour pattern
                IF is_weekend THEN
                    -- Weekend: lower occupancy, peak around noon-4pm
                    IF hour_val BETWEEN 10 AND 16 THEN
                        occupancy_pct := 40 + noise + (hour_val - 10) * 3;
                    ELSIF hour_val BETWEEN 7 AND 9 THEN
                        occupancy_pct := 20 + noise + (hour_val - 7) * 5;
                    ELSIF hour_val BETWEEN 17 AND 20 THEN
                        occupancy_pct := 45 + noise - (hour_val - 17) * 8;
                    ELSE
                        occupancy_pct := 10 + noise;
                    END IF;
                ELSE
                    -- Weekday: higher occupancy, peaks at 9-11am and 2-4pm
                    IF hour_val BETWEEN 8 AND 11 THEN
                        occupancy_pct := 55 + noise + (hour_val - 8) * 8;
                    ELSIF hour_val BETWEEN 12 AND 13 THEN
                        occupancy_pct := 75 + noise;
                    ELSIF hour_val BETWEEN 14 AND 16 THEN
                        occupancy_pct := 80 + noise;
                    ELSIF hour_val BETWEEN 17 AND 19 THEN
                        occupancy_pct := 70 + noise - (hour_val - 17) * 12;
                    ELSIF hour_val BETWEEN 6 AND 7 THEN
                        occupancy_pct := 25 + noise + (hour_val - 6) * 10;
                    ELSIF hour_val BETWEEN 20 AND 22 THEN
                        occupancy_pct := 35 + noise - (hour_val - 20) * 10;
                    ELSE
                        occupancy_pct := 10 + noise;
                    END IF;
                END IF;

                -- Clamp to valid range
                occupancy_pct := GREATEST(5, LEAST(98, occupancy_pct));
                occupied_val := ROUND(total_slots_val * occupancy_pct / 100.0);
                free_val := total_slots_val - occupied_val;

                -- Insert whole-lot snapshot
                INSERT INTO parking_occupancy_history (timestamp, total_slots, occupied_slots, free_slots, occupancy_percentage, zone, floor)
                VALUES (actual_ts, total_slots_val, occupied_val, free_val, occupancy_pct, NULL, NULL);

                -- Insert per-zone snapshots
                zone_total := 27;
                zone_occupied := ROUND(27 * occupancy_pct / 100.0);
                INSERT INTO parking_occupancy_history (timestamp, total_slots, occupied_slots, free_slots, occupancy_percentage, zone, floor)
                VALUES (actual_ts, 27, zone_occupied, 27 - zone_occupied, (zone_occupied::DOUBLE PRECISION / 27) * 100, 'A', 1);

                -- Zone B slightly different pattern
                zone_occupied := ROUND(27 * (occupancy_pct + (random() * 6 - 3)) / 100.0);
                zone_occupied := GREATEST(0, LEAST(27, zone_occupied));
                INSERT INTO parking_occupancy_history (timestamp, total_slots, occupied_slots, free_slots, occupancy_percentage, zone, floor)
                VALUES (actual_ts, 27, zone_occupied, 27 - zone_occupied, (zone_occupied::DOUBLE PRECISION / 27) * 100, 'B', 1);

                -- Zone C smaller
                zone_occupied := ROUND(9 * (occupancy_pct + (random() * 8 - 4)) / 100.0);
                zone_occupied := GREATEst(0, LEAST(9, zone_occupied));
                INSERT INTO parking_occupancy_history (timestamp, total_slots, occupied_slots, free_slots, occupancy_percentage, zone, floor)
                VALUES (actual_ts, 9, zone_occupied, 9 - zone_occupied, (zone_occupied::DOUBLE PRECISION / 9) * 100, 'C', 1);
            END;
        END LOOP;
    END LOOP;
END $$;