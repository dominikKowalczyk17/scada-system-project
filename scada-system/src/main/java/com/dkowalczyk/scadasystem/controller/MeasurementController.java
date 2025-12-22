package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/measurements")
@RequiredArgsConstructor
@Validated
public class MeasurementController {

    private final MeasurementService measurementService;

    /**
     * Accepts measurement via REST API (optional, mainly for testing).
     * <p>
     * NOTE: ESP32 sends data via MQTT, not HTTP POST. This endpoint is provided
     * for manual testing and development purposes.
     * <p>
     * POST /api/measurements
     */
    @PostMapping
    public ResponseEntity<MeasurementDTO> createMeasurement(
            @RequestBody @Valid MeasurementRequest request) {
        MeasurementDTO saved = measurementService.saveMeasurement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Returns the latest valid measurement.
     * <p>
     * GET /api/measurements/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<MeasurementDTO> getLatest() {
        return measurementService.getLatestMeasurement()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Returns measurement history within specified time range.
     * <p>
     * GET /api/measurements/history?from=timestamp&amp;to=timestamp&amp;limit=100
     *
     * @param from  start timestamp (epoch seconds), defaults to 1 hour ago
     * @param to    end timestamp (epoch seconds), defaults to now
     * @param limit maximum number of measurements to return (max 1000)
     */
    @GetMapping("/history")
    public ResponseEntity<List<MeasurementDTO>> getHistory(
            @RequestParam(required = false) Long from,
            @RequestParam(required = false) Long to,
            @RequestParam(defaultValue = "100") @Positive @Max(1000) int limit) {

        Instant fromTime = from != null ? Instant.ofEpochSecond(from) : Instant.now().minusSeconds(3600);
        Instant toTime = to != null ? Instant.ofEpochSecond(to) : Instant.now();

        List<MeasurementDTO> history = measurementService.getHistory(fromTime, toTime, limit);
        return ResponseEntity.ok(history);
    }
}