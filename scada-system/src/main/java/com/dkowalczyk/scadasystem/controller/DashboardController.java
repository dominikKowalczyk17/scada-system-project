package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.DashboardDTO;
import com.dkowalczyk.scadasystem.model.dto.PowerQualityIndicatorsDTO;
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
 * - PN-EN 50160 power quality indicators (separate section)
 * <p>
 * This controller provides unified endpoints that reduce API calls.
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
     * <p>
     * This endpoint provides general measurement data (voltage, current, power, etc.)
     * for the main dashboard section. For PN-EN 50160 power quality indicators,
     * use /api/dashboard/power-quality-indicators endpoint.
     *
     * @return DashboardDTO containing:
     * - latestMeasurement: Current electrical parameters
     * - waveforms: Voltage and current waveforms (200 samples each)
     * - recentHistory: Last 100 measurements
     */
    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard() {
        return measurementService.getDashboardData()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get PN-EN 50160 power quality indicators.
     * <p>
     * GET /api/dashboard/power-quality-indicators
     * <p>
     * This endpoint provides data for a separate "Power Quality" section on frontend,
     * displaying standardized indicators according to PN-EN 50160:
     * - Group 1: Supply voltage magnitude (voltage deviation)
     * - Group 2: Supply frequency (frequency deviation)
     * - Group 4: Voltage waveform distortions (THD and harmonics, partial H1-H8)
     * <p>
     * Each indicator includes compliance flags and limits per PN-EN 50160.
     *
     * @return PowerQualityIndicatorsDTO with PN-EN 50160 indicators and compliance status
     */
    @GetMapping("/power-quality-indicators")
    public ResponseEntity<PowerQualityIndicatorsDTO> getPowerQualityIndicators() {
        return measurementService.getPowerQualityIndicators()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}