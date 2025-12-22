package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO for main dashboard combining latest measurement, waveforms, and recent history.
 *
 * <p>Unified response reduces frontend API calls from 3 to 1.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
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