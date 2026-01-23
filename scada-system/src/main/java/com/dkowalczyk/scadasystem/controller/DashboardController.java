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
 * REST API for main dashboard with unified data endpoints.
 *
 * <p>Provides latest measurements, waveforms, history, and PN-EN 50160 power quality
 * indicators in single API calls to reduce frontend requests.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final MeasurementService measurementService;

    /**
     * Returns complete dashboard data: latest measurement, waveforms (200 samples),
     * and recent history (100 measurements).
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
     * - Group 4: Voltage waveform distortions (THD and harmonics, partial H1-H25)
     * <p>
     * Each indicator includes compliance flags and limits per PN-EN 50160.
     *
     * @return PowerQualityIndicatorsDTO with PN-EN 50160 indicators and compliance status
     */
    @GetMapping("/power-quality-indicators")
    public ResponseEntity<PowerQualityIndicatorsDTO> getPowerQualityIndicators() {
        return measurementService.getLatestPowerQualityIndicators()
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}