-- Sprint 13: Reinforcement Learning-Based Dynamic Parking Optimization
-- Creates tables for optimization history and RL decision tracking

-- Parking optimization history: stores each optimization decision and its outcome
CREATE TABLE parking_optimization_history (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vehicle_id BIGINT,
    assigned_slot VARCHAR(20),
    assigned_zone VARCHAR(10),
    search_time_seconds DOUBLE PRECISION,
    walking_distance DOUBLE PRECISION,
    occupancy_percentage DOUBLE PRECISION,
    congestion_level VARCHAR(20),
    reward_score DOUBLE PRECISION
);

CREATE INDEX idx_optimization_history_timestamp ON parking_optimization_history(timestamp);
CREATE INDEX idx_optimization_history_zone ON parking_optimization_history(assigned_zone);

COMMENT ON TABLE parking_optimization_history IS 'RL-based parking optimization decisions and outcomes';
COMMENT ON COLUMN parking_optimization_history.reward_score IS 'RL reward for this decision (-1.0 to 1.0)';
COMMENT ON COLUMN parking_optimization_history.congestion_level IS 'Congestion level: LOW, MODERATE, HIGH, CRITICAL';

-- Parking RL decisions: stores RL state-action-reward tuples for training
CREATE TABLE parking_rl_decisions (
    id BIGSERIAL PRIMARY KEY,
    state_snapshot TEXT NOT NULL,
    selected_action VARCHAR(50) NOT NULL,
    reward DOUBLE PRECISION NOT NULL,
    episode INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rl_decisions_episode ON parking_rl_decisions(episode);
CREATE INDEX idx_rl_decisions_created_at ON parking_rl_decisions(created_at);

COMMENT ON TABLE parking_rl_decisions IS 'Reinforcement learning state-action-reward tuples for Q-learning and DQN training';
COMMENT ON COLUMN parking_rl_decisions.state_snapshot IS 'JSON snapshot of the parking state at decision time';
COMMENT ON COLUMN parking_rl_decisions.selected_action IS 'Action taken: ASSIGN_ZONE_A, ASSIGN_ZONE_B, ASSIGN_ZONE_C, ASSIGN_ZONE_D';
COMMENT ON COLUMN parking_rl_decisions.reward IS 'Calculated reward signal for this decision';

-- Seed initial RL decision data for training bootstrap
DO $$
DECLARE
    i INTEGER;
    zones TEXT[] := ARRAY['A', 'B', 'C', 'D'];
    actions TEXT[] := ARRAY['ASSIGN_ZONE_A', 'ASSIGN_ZONE_B', 'ASSIGN_ZONE_C', 'ASSIGN_ZONE_D'];
    congestion_levels TEXT[] := ARRAY['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    zone_a_occ DOUBLE PRECISION;
    zone_b_occ DOUBLE PRECISION;
    zone_c_occ DOUBLE PRECISION;
    zone_d_occ DOUBLE PRECISION;
    selected_action TEXT;
    reward_val DOUBLE PRECISION;
    state_json TEXT;
    chosen_zone TEXT;
    congestion TEXT;
BEGIN
    FOR i IN 1..500 LOOP
        -- Simulate varying zone occupancies
        zone_a_occ := 30 + random() * 60;
        zone_b_occ := 20 + random() * 70;
        zone_c_occ := 25 + random() * 55;
        zone_d_occ := 15 + random() * 50;

        -- RL agent selects action (with some exploration noise)
        IF random() < 0.7 THEN
            -- Exploit: pick least occupied zone
            IF zone_a_occ <= zone_b_occ AND zone_a_occ <= zone_c_occ AND zone_a_occ <= zone_d_occ THEN
                selected_action := 'ASSIGN_ZONE_A';
                chosen_zone := 'A';
            ELSIF zone_b_occ <= zone_c_occ AND zone_b_occ <= zone_d_occ THEN
                selected_action := 'ASSIGN_ZONE_B';
                chosen_zone := 'B';
            ELSIF zone_c_occ <= zone_d_occ THEN
                selected_action := 'ASSIGN_ZONE_C';
                chosen_zone := 'C';
            ELSE
                selected_action := 'ASSIGN_ZONE_D';
                chosen_zone := 'D';
            END IF;
        ELSE
            -- Explore: random action
            chosen_zone := zones[1 + floor(random() * 4)::int];
            selected_action := 'ASSIGN_ZONE_' || chosen_zone;
        END IF;

        -- Calculate reward based on zone occupancy after assignment
        CASE chosen_zone
            WHEN 'A' THEN reward_val := (100 - zone_a_occ) / 100.0;
            WHEN 'B' THEN reward_val := (100 - zone_b_occ) / 100.0;
            WHEN 'C' THEN reward_val := (100 - zone_c_occ) / 100.0;
            WHEN 'D' THEN reward_val := (100 - zone_d_occ) / 100.0;
            ELSE reward_val := 0.0;
        END CASE;

        -- Penalty for overcrowding
        CASE chosen_zone
            WHEN 'A' THEN IF zone_a_occ > 85 THEN reward_val := reward_val - 0.5; END IF;
            WHEN 'B' THEN IF zone_b_occ > 85 THEN reward_val := reward_val - 0.5; END IF;
            WHEN 'C' THEN IF zone_c_occ > 85 THEN reward_val := reward_val - 0.5; END IF;
            WHEN 'D' THEN IF zone_d_occ > 85 THEN reward_val := reward_val - 0.5; END IF;
        END CASE;

        -- Bonus for load balancing
        IF ABS(zone_a_occ - zone_b_occ) < 15 AND ABS(zone_c_occ - zone_d_occ) < 15 THEN
            reward_val := reward_val + 0.2;
        END IF;

        reward_val := GREATEST(-1.0, LEAST(1.0, reward_val));

        -- Determine congestion level
        CASE chosen_zone
            WHEN 'A' THEN
                IF zone_a_occ > 90 THEN congestion := 'CRITICAL';
                ELSIF zone_a_occ > 75 THEN congestion := 'HIGH';
                ELSIF zone_a_occ > 50 THEN congestion := 'MODERATE';
                ELSE congestion := 'LOW';
                END IF;
            WHEN 'B' THEN
                IF zone_b_occ > 90 THEN congestion := 'CRITICAL';
                ELSIF zone_b_occ > 75 THEN congestion := 'HIGH';
                ELSIF zone_b_occ > 50 THEN congestion := 'MODERATE';
                ELSE congestion := 'LOW';
                END IF;
            WHEN 'C' THEN
                IF zone_c_occ > 90 THEN congestion := 'CRITICAL';
                ELSIF zone_c_occ > 75 THEN congestion := 'HIGH';
                ELSIF zone_c_occ > 50 THEN congestion := 'MODERATE';
                ELSE congestion := 'LOW';
                END IF;
            ELSE
                IF zone_d_occ > 90 THEN congestion := 'CRITICAL';
                ELSIF zone_d_occ > 75 THEN congestion := 'HIGH';
                ELSIF zone_d_occ > 50 THEN congestion := 'MODERATE';
                ELSE congestion := 'LOW';
                END IF;
        END CASE;

        state_json := json_build_object(
            'zoneA', round(zone_a_occ::numeric, 1),
            'zoneB', round(zone_b_occ::numeric, 1),
            'zoneC', round(zone_c_occ::numeric, 1),
            'zoneD', round(zone_d_occ::numeric, 1),
            'predictedOccupancy', round(((zone_a_occ + zone_b_occ + zone_c_occ + zone_d_occ) / 4 + random() * 10 - 5)::numeric, 1),
            'hour', floor(random() * 24)::int
        )::TEXT;

        -- Insert RL decision
        INSERT INTO parking_rl_decisions (state_snapshot, selected_action, reward, episode, created_at)
        VALUES (state_json, selected_action, reward_val, (i / 10) + 1,
                CURRENT_TIMESTAMP - INTERVAL '30 days' + (i * INTERVAL '864 seconds'));

        -- Insert optimization history
        INSERT INTO parking_optimization_history (timestamp, assigned_slot, assigned_zone, search_time_seconds,
            walking_distance, occupancy_percentage, congestion_level, reward_score)
        VALUES (
            CURRENT_TIMESTAMP - INTERVAL '30 days' + (i * INTERVAL '864 seconds'),
            chosen_zone || '-' || (1 + floor(random() * 20)::int),
            chosen_zone,
            5 + random() * 55,
            20 + random() * 280,
            CASE chosen_zone
                WHEN 'A' THEN zone_a_occ
                WHEN 'B' THEN zone_b_occ
                WHEN 'C' THEN zone_c_occ
                ELSE zone_d_occ
            END,
            congestion,
            reward_val
        );
    END LOOP;
END $$;