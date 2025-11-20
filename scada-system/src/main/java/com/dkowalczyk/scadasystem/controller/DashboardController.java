package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.DashboardDTO;
import com.dkowalczyk.scadasystem.model.dto.PowerQualityIndicatorsDTO;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import com.dkowalczyk.scadasystem.util.Constants;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

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
        Optional<Measurement> latestMeasurement = measurementService.getLatestMeasurementEntity();

        if (latestMeasurement.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Measurement measurement = latestMeasurement.get();

        // Check compliance with PN-EN 50160 limits
        Boolean voltageWithinLimits = checkVoltageCompliance(measurement.getVoltageDeviationPercent());
        Boolean frequencyWithinLimits = checkFrequencyCompliance(measurement.getFrequencyDeviationHz());
        Boolean thdWithinLimits = checkThdCompliance(measurement.getThdVoltage());

        Boolean overallCompliant = allTrueOrNull(voltageWithinLimits, frequencyWithinLimits, thdWithinLimits);
        String statusMessage = buildStatusMessage(voltageWithinLimits, frequencyWithinLimits, thdWithinLimits,
                measurement.getVoltageDeviationPercent(), measurement.getThdVoltage());

        PowerQualityIndicatorsDTO dto = PowerQualityIndicatorsDTO.builder()
                .timestamp(measurement.getTime())
                // Group 1: Supply voltage magnitude
                .voltageRms(measurement.getVoltageRms())
                .voltageDeviationPercent(measurement.getVoltageDeviationPercent())
                .voltageWithinLimits(voltageWithinLimits)
                // Group 2: Supply frequency
                .frequency(measurement.getFrequency())
                .frequencyDeviationHz(measurement.getFrequencyDeviationHz())
                .frequencyWithinLimits(frequencyWithinLimits)
                // Group 4: Voltage waveform distortions
                .thdVoltage(measurement.getThdVoltage())
                .thdWithinLimits(thdWithinLimits)
                .harmonicsVoltage(measurement.getHarmonicsV())
                // Overall status
                .overallCompliant(overallCompliant)
                .statusMessage(statusMessage)
                .build();

        return ResponseEntity.ok(dto);
    }

    private Boolean allTrueOrNull(Boolean... values) {
        for (Boolean v : values) {
            if (v == null) return null;
            if (!v) return false;
        }
        return true;
    }

    /**
     * Check if voltage deviation is within PN-EN 50160 limits (±10%).
     */
    private Boolean checkVoltageCompliance(Double voltageDeviationPercent) {
        if (voltageDeviationPercent == null) {
            return null;
        }
        return voltageDeviationPercent >= Constants.VOLTAGE_DEVIATION_LOWER_LIMIT_PERCENT
                && voltageDeviationPercent <= Constants.VOLTAGE_DEVIATION_UPPER_LIMIT_PERCENT;
    }

    /**
     * Check if frequency deviation is within PN-EN 50160 limits (±0.5 Hz).
     */
    private Boolean checkFrequencyCompliance(Double frequencyDeviationHz) {
        if (frequencyDeviationHz == null) {
            return null;
        }
        return Math.abs(frequencyDeviationHz) <= Constants.FREQUENCY_DEVIATION_UPPER_LIMIT_HZ;
    }

    /**
     * Check if THD is within PN-EN 50160 limit (<8%).
     * Note: Our THD is partial (harmonics 2-8 only), representing lower bound.
     */
    private Boolean checkThdCompliance(Double thdVoltage) {
        if (thdVoltage == null) {
            return null;
        }
        return thdVoltage < Constants.VOLTAGE_THD_LIMIT;
    }

    /**
     * Build human-readable status message for power quality compliance.
     */
    private String buildStatusMessage(Boolean voltageOk, Boolean frequencyOk, Boolean thdOk,
                                      Double voltageDeviation, Double thd) {
        if (Boolean.TRUE.equals(voltageOk) && Boolean.TRUE.equals(frequencyOk) && Boolean.TRUE.equals(thdOk)) {
            return "All indicators within PN-EN 50160 limits";
        }

        StringBuilder message = new StringBuilder("Non-compliant: ");
        boolean first = true;

        if (Boolean.FALSE.equals(voltageOk) && voltageDeviation != null) {
            message.append(String.format("Voltage deviation %.1f%%", voltageDeviation));
            first = false;
        }

        if (Boolean.FALSE.equals(frequencyOk)) {
            if (!first) message.append(", ");
            message.append("Frequency out of range");
            first = false;
        }

        if (Boolean.FALSE.equals(thdOk) && thd != null) {
            if (!first) message.append(", ");
            message.append(String.format("THD %.1f%% (partial measurement)", thd));
        }

        return message.toString();
    }
}