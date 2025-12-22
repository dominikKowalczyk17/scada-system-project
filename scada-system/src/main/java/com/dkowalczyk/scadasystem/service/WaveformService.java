package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.util.MathUtils;
import org.springframework.stereotype.Service;

/**
 * Service for reconstructing voltage/current waveforms from harmonic amplitudes.
 *
 * <p>ESP32 sends 8 harmonic amplitudes to save bandwidth. This service reconstructs
 * full waveform (200 samples) using inverse Fourier synthesis for frontend graph display.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Service
public class WaveformService {

    /**
     * Reconstructs waveform from harmonic amplitudes using formula:
     * V(t) = H₁·sin(ω₁·t) + H₂·sin(ω₂·t) + ... + H₈·sin(ω₈·t)
     *
     * @param harmonics       harmonic amplitudes [H1=fundamental, H2=2nd, ..., H8=8th]
     * @param frequency       fundamental frequency in Hz (50Hz for EU)
     * @param samplesPerCycle number of samples per cycle (200 for smooth graph)
     * @param phaseShift      phase shift in radians (arccos(cosPhi) for current)
     * @return waveform samples for one complete cycle
     */
    public double[] reconstructWaveform(Double[] harmonics, double frequency, int samplesPerCycle, double phaseShift) {
        // Delegate to MathUtils for the actual mathematical computation
        return MathUtils.reconstructWaveform(harmonics, frequency, samplesPerCycle, phaseShift);
    }
}