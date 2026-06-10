package com.cityparking.backend.controller;

import com.cityparking.backend.dto.digitaltwin.DigitalTwinStateResponse;
import com.cityparking.backend.dto.digitaltwin.OptimizeRequest;
import com.cityparking.backend.dto.common.ApiResponse;
import com.cityparking.backend.service.DigitalTwinService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/digital-twin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Digital Twin", description = "Digital twin simulation and monitoring APIs")
public class DigitalTwinController {

    private final DigitalTwinService digitalTwinService;

    // ==================== STATE ====================

    @GetMapping("/state")
    @Operation(summary = "Get digital twin state")
    public ResponseEntity<DigitalTwinStateResponse> getState() {
        log.info("GET /api/digital-twin/state");
        return ResponseEntity.ok(digitalTwinService.getState());
    }

    @GetMapping("/overview")
    @Operation(summary = "Get digital twin overview (alias for state)")
    public ResponseEntity<Map<String, Object>> getOverview() {
        log.info("GET /api/digital-twin/overview");
        return ResponseEntity.ok(digitalTwinService.getOverview());
    }

    @PostMapping("/sync")
    @Operation(summary = "Sync digital twin state")
    public ResponseEntity<Map<String, Object>> syncState() {
        log.info("POST /api/digital-twin/sync");
        return ResponseEntity.ok(digitalTwinService.syncState());
    }

    @PostMapping("/optimize")
    @Operation(summary = "Run optimization")
    public ResponseEntity<Map<String, Object>> optimize(@Valid @RequestBody OptimizeRequest request) {
        log.info("POST /api/digital-twin/optimize");
        return ResponseEntity.ok(digitalTwinService.optimize(Map.of()));
    }

    @PostMapping("/feedback")
    @Operation(summary = "Submit feedback")
    public ResponseEntity<Map<String, Object>> submitFeedback(@RequestBody Map<String, Object> feedback) {
        log.info("POST /api/digital-twin/feedback");
        return ResponseEntity.ok(digitalTwinService.submitFeedback(feedback));
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset digital twin state")
    public ResponseEntity<Map<String, Object>> resetState() {
        log.info("POST /api/digital-twin/reset");
        return ResponseEntity.ok(digitalTwinService.resetState());
    }

    @GetMapping("/metrics")
    @Operation(summary = "Get digital twin metrics")
    public ResponseEntity<Map<String, Object>> getMetrics() {
        log.info("GET /api/digital-twin/metrics");
        return ResponseEntity.ok(digitalTwinService.getMetrics());
    }

    // ==================== SIMULATION ====================

    @GetMapping("/simulation/status")
    @Operation(summary = "Get simulation status")
    public ResponseEntity<Map<String, Object>> getSimulationStatus() {
        log.info("GET /api/digital-twin/simulation/status");
        return ResponseEntity.ok(digitalTwinService.getSimulationStatus());
    }

    @GetMapping("/simulation/state")
    @Operation(summary = "Get simulation state (alias)")
    public ResponseEntity<Map<String, Object>> getSimulationState() {
        log.info("GET /api/digital-twin/simulation/state");
        return ResponseEntity.ok(digitalTwinService.getSimulationStatus());
    }

    @PostMapping("/simulation/configure")
    @Operation(summary = "Configure simulation")
    public ResponseEntity<Map<String, Object>> configureSimulation(@RequestBody Map<String, Object> config) {
        log.info("POST /api/digital-twin/simulation/configure");
        return ResponseEntity.ok(digitalTwinService.configureSimulation(config));
    }

    @PostMapping("/simulation/start")
    @Operation(summary = "Start simulation")
    public ResponseEntity<Map<String, Object>> startSimulation() {
        log.info("POST /api/digital-twin/simulation/start");
        return ResponseEntity.ok(digitalTwinService.startSimulation());
    }

    @PostMapping("/simulation/stop")
    @Operation(summary = "Stop simulation")
    public ResponseEntity<Map<String, Object>> stopSimulation() {
        log.info("POST /api/digital-twin/simulation/stop");
        return ResponseEntity.ok(digitalTwinService.stopSimulation());
    }

    @PostMapping("/simulation/pause")
    @Operation(summary = "Pause simulation")
    public ResponseEntity<Map<String, Object>> pauseSimulation() {
        log.info("POST /api/digital-twin/simulation/pause");
        return ResponseEntity.ok(digitalTwinService.pauseSimulation());
    }

    // ==================== CONGESTION ====================

    @GetMapping("/congestion")
    @Operation(summary = "Get congestion metrics (alias)")
    public ResponseEntity<Map<String, Object>> getCongestion() {
        log.info("GET /api/digital-twin/congestion");
        return ResponseEntity.ok(digitalTwinService.getCongestionZones());
    }

    @GetMapping("/congestion/zones")
    @Operation(summary = "Get congestion zones")
    public ResponseEntity<Map<String, Object>> getCongestionZones() {
        log.info("GET /api/digital-twin/congestion/zones");
        return ResponseEntity.ok(digitalTwinService.getCongestionZones());
    }

    @GetMapping("/congestion/traffic-flow")
    @Operation(summary = "Get traffic flow data")
    public ResponseEntity<Map<String, Object>> getTrafficFlow() {
        log.info("GET /api/digital-twin/congestion/traffic-flow");
        return ResponseEntity.ok(digitalTwinService.getTrafficFlow());
    }

    @GetMapping("/congestion/predictions")
    @Operation(summary = "Get congestion predictions")
    public ResponseEntity<Map<String, Object>> getCongestionPredictions() {
        log.info("GET /api/digital-twin/congestion/predictions");
        return ResponseEntity.ok(digitalTwinService.getCongestionPredictions());
    }

    @GetMapping("/heatmap")
    @Operation(summary = "Get heatmap (alias)")
    public ResponseEntity<Map<String, Object>> getHeatmapAlias() {
        log.info("GET /api/digital-twin/heatmap");
        return ResponseEntity.ok(digitalTwinService.getHeatmap());
    }

    @GetMapping("/congestion/heatmap")
    @Operation(summary = "Get congestion heatmap")
    public ResponseEntity<Map<String, Object>> getHeatmap() {
        log.info("GET /api/digital-twin/congestion/heatmap");
        return ResponseEntity.ok(digitalTwinService.getHeatmap());
    }

    // ==================== SCENARIOS ====================

    @GetMapping("/scenarios")
    @Operation(summary = "Get all scenarios")
    public ResponseEntity<List<Map<String, Object>>> getScenarios() {
        log.info("GET /api/digital-twin/scenarios");
        return ResponseEntity.ok(digitalTwinService.getScenarios());
    }

    @PostMapping("/scenarios")
    @Operation(summary = "Create scenario")
    public ResponseEntity<Map<String, Object>> createScenario(@RequestBody Map<String, Object> scenario) {
        log.info("POST /api/digital-twin/scenarios");
        return ResponseEntity.ok(digitalTwinService.createScenario(scenario));
    }

    @PostMapping("/scenarios/{id}/run")
    @Operation(summary = "Run scenario")
    public ResponseEntity<Map<String, Object>> runScenario(@PathVariable String id) {
        log.info("POST /api/digital-twin/scenarios/{}/run", id);
        return ResponseEntity.ok(digitalTwinService.runScenario(id));
    }

    @PostMapping("/scenarios/compare")
    @Operation(summary = "Compare scenarios")
    public ResponseEntity<Map<String, Object>> compareScenarios(@RequestBody(required = false) Map<String, Object> request) {
        log.info("POST /api/digital-twin/scenarios/compare");
        List<String> ids = List.of();
        if (request != null && request.containsKey("scenarioIds")) {
            @SuppressWarnings("unchecked")
            List<String> rawIds = (List<String>) request.get("scenarioIds");
            ids = rawIds;
        }
        return ResponseEntity.ok(digitalTwinService.compareScenarios(ids));
    }

    // ==================== RL TRAINING ====================

    @GetMapping("/rl/status")
    @Operation(summary = "Get RL training status")
    public ResponseEntity<Map<String, Object>> getRlStatus() {
        log.info("GET /api/digital-twin/rl/status");
        return ResponseEntity.ok(digitalTwinService.getRlStatus());
    }

    @PostMapping("/rl/train")
    @Operation(summary = "Start RL training")
    public ResponseEntity<Map<String, Object>> startRlTraining(@RequestBody(required = false) Map<String, Object> request) {
        log.info("POST /api/digital-twin/rl/train");
        return ResponseEntity.ok(digitalTwinService.startRlTraining(request));
    }

    @GetMapping("/rl/performance")
    @Operation(summary = "Get RL performance metrics")
    public ResponseEntity<Map<String, Object>> getRlPerformance() {
        log.info("GET /api/digital-twin/rl/performance");
        return ResponseEntity.ok(digitalTwinService.getRlPerformance());
    }

    // ==================== RL PERFORMANCE ====================

    @GetMapping("/rl-performance")
    @Operation(summary = "Get RL performance (alias)")
    public ResponseEntity<Map<String, Object>> getRlPerformanceAlias() {
        log.info("GET /api/digital-twin/rl-performance");
        return ResponseEntity.ok(digitalTwinService.getRlPerformance());
    }

    // ==================== BENCHMARK ====================

    @GetMapping("/benchmark")
    @Operation(summary = "Get benchmark data")
    public ResponseEntity<Map<String, Object>> getBenchmark() {
        log.info("GET /api/digital-twin/benchmark");
        return ResponseEntity.ok(digitalTwinService.getBenchmark());
    }

    @PostMapping("/benchmark/run")
    @Operation(summary = "Run benchmark")
    public ResponseEntity<Map<String, Object>> runBenchmark(@RequestBody(required = false) Map<String, Object> request) {
        log.info("POST /api/digital-twin/benchmark/run");
        return ResponseEntity.ok(digitalTwinService.runBenchmark(request));
    }

    // ==================== COMPETITION ====================

    @GetMapping("/competition")
    @Operation(summary = "Get competition info (alias)")
    public ResponseEntity<Map<String, Object>> getCompetition() {
        log.info("GET /api/digital-twin/competition");
        return ResponseEntity.ok(digitalTwinService.getCompetitionStatus());
    }

    @GetMapping("/competition/status")
    @Operation(summary = "Get competition status")
    public ResponseEntity<Map<String, Object>> getCompetitionStatus() {
        log.info("GET /api/digital-twin/competition/status");
        return ResponseEntity.ok(digitalTwinService.getCompetitionStatus());
    }

    @GetMapping("/competition/leaderboard")
    @Operation(summary = "Get competition leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        log.info("GET /api/digital-twin/competition/leaderboard");
        return ResponseEntity.ok(digitalTwinService.getLeaderboard());
    }

    @PostMapping("/competition/join")
    @Operation(summary = "Join competition")
    public ResponseEntity<Map<String, Object>> joinCompetition(@RequestBody(required = false) Map<String, Object> request) {
        log.info("POST /api/digital-twin/competition/join");
        return ResponseEntity.ok(digitalTwinService.joinCompetition(request));
    }

    @PostMapping("/competition/submit")
    @Operation(summary = "Submit to competition")
    public ResponseEntity<Map<String, Object>> submitToCompetition(@RequestBody(required = false) Map<String, Object> request) {
        log.info("POST /api/digital-twin/competition/submit");
        return ResponseEntity.ok(digitalTwinService.submitToCompetition(request));
    }
}