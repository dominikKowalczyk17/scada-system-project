package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

/**
 * DTO for reconstructed voltage and current waveforms (200 samples each).
 *
 * <p>ESP32 sends 8 harmonic amplitudes; backend reconstructs full waveforms for frontend graphs.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Data
@Builder
public class WaveformDTO {
    private double[] voltage;
    private double[] current;
}
