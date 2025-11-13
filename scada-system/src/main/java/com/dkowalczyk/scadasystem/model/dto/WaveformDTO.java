package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO for voltage and current waveforms reconstructed from harmonics.
 * <p>
 * WHY: Frontend needs full waveform data (200 samples) to draw voltage/current graphs.
 * ESP32 sends only harmonic amplitudes (8 numbers) to save bandwidth.
 * Backend reconstructs waveforms using WaveformService.
 */
@Data
@Builder
public class WaveformDTO {
    private double[] voltage;
    private double[] current;
}
