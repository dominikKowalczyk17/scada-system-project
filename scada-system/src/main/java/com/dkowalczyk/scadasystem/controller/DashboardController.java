package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.DashboardDTO;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST API for main dashboard - unified endpoint for frontend.
 * <p>
 * WHY: Frontend dashboard needs multiple pieces of data:
 * - Latest measurement (voltage, current, power, THD)
 * - Waveforms reconstructed from harmonics (for graphs)
 * - Recent history (last 100 measurements for trends)
 * <p>
 * This controller provides a single endpoint that returns all data in one response,
 * reducing API calls from 3 to 1.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final MeasurementService measurementService;

    /**
     * Get complete dashboard data in a single request.
     * <p>
     * GET /api/dashboard
     *
     * @return DashboardDTO containing:
     *         - latestMeasurement: Current electrical parameters
     *         - waveforms: Voltage and current waveforms (200 samples each)
     *         - recentHistory: Last 100 measurements
     */
    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard() {
        return measurementService.getDashboardData()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}