package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.service.DataAggregationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
@Tag(name = "Health", description = "Service health check endpoints")
public class HealthController {

    private final DataAggregationService dataAggregationService;

    @Operation(summary = "Basic health check", description = "Returns service status and uptime")
    @GetMapping
    public Map<String, Object> health() {
        return Map.of(
                "status", "UP",
                "timestamp", Instant.now(),
                "service", "Energy Monitor Backend"
        );
    }

    @Operation(summary = "Scheduled jobs health check",
               description = "Returns status of automated daily statistics aggregation job")
    @GetMapping("/scheduled-jobs")
    public Map<String, Object> scheduledJobsHealth() {
        Map<String, Object> health = new HashMap<>();

        // Overall health status
        boolean isHealthy = dataAggregationService.isHealthy();
        health.put("status", isHealthy ? "UP" : "DOWN");

        // Aggregation job details
        Map<String, Object> aggregationJob = new HashMap<>();
        aggregationJob.put("name", "DailyStatsAggregation");
        aggregationJob.put("schedule", "0 5 0 * * * (every day at 00:05)");
        aggregationJob.put("lastRunTime", dataAggregationService.getLastRunTime());
        aggregationJob.put("lastProcessedDate", dataAggregationService.getLastProcessedDate());
        aggregationJob.put("lastRunSuccess", dataAggregationService.isLastRunSuccess());
        aggregationJob.put("lastError", dataAggregationService.getLastError());

        health.put("aggregationJob", aggregationJob);
        health.put("timestamp", Instant.now().toString());

        return health;
    }
}