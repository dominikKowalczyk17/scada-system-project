package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/measurements")
@RequiredArgsConstructor
public class MeasurementController {

    private final MeasurementService measurementService;

    /**
     * Przyjmuje pomiar (REST API - opcjonalne, głównie dla testów)
     * ESP32 wysyła dane przez MQTT, nie przez HTTP POST
     * POST /api/measurements
     */
    @PostMapping
    public ResponseEntity<MeasurementDTO> createMeasurement(
            @RequestBody MeasurementRequest request) {
        MeasurementDTO saved = measurementService.saveMeasurement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Pobiera ostatni pomiar
     * GET /api/measurements/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<MeasurementDTO> getLatest() {
        return measurementService.getLatestMeasurement()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Pobiera historię pomiarów
     * GET /api/measurements/history?from=timestamp&to=timestamp&limit=100
     */
    @GetMapping("/history")
    public ResponseEntity<List<MeasurementDTO>> getHistory(
            @RequestParam(required = false) Long from,
            @RequestParam(required = false) Long to,
            @RequestParam(defaultValue = "100") int limit) {

        Instant fromTime = from != null ? Instant.ofEpochSecond(from) : Instant.now().minusSeconds(3600);
        Instant toTime = to != null ? Instant.ofEpochSecond(to) : Instant.now();

        List<MeasurementDTO> history = measurementService.getHistory(fromTime, toTime, limit);
        return ResponseEntity.ok(history);
    }
}