package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO for main dashboard API response - combines real-time data, waveforms, and recent history.
 * <p>
 * WHY: Frontend dashboard needs multiple pieces of data in a single API call:
 * - Latest measurement (voltage, current, power, THD, etc.)
 * - Waveforms reconstructed from harmonics (for voltage/current graphs)
 * - Recent measurement history (for trend visualization)
 * <p>
 * This unified response reduces API calls from 3 to 1.
 */
@Data
@Builder
public class DashboardDTO {
    /**
     * Latest measurement with all electrical parameters.
     */
    private MeasurementDTO latestMeasurement;

    /**
     * Voltage and current waveforms reconstructed from harmonics (200 samples each).
     * Frontend uses this to draw sine wave graphs.
     */
    private WaveformDTO waveforms;

    /**
     * Recent measurement history (last 100 measurements, ~10 minutes at 6s interval).
     * Frontend uses this for trend visualization and mini-charts.
     */
    private List<MeasurementDTO> recentHistory;
}