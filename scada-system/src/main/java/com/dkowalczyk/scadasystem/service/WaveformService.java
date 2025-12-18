package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.util.MathUtils;
import org.springframework.stereotype.Service;

/**
 * Service for reconstructing voltage/current waveforms from harmonic amplitudes.
 * <p>
 * Uses inverse Fourier synthesis to recreate time-domain signal from frequency-domain harmonics.
 * <p>
 * WHY: ESP32 sends only harmonic amplitudes (8 numbers) to save bandwidth.
 * Frontend needs full waveform (200 samples) to display voltage/current graph.
 * <p>
 * MATH: V(t) = H₁·sin(ω₁·t) + H₂·sin(ω₂·t) + ... + H₈·sin(ω₈·t)
 * where ωₙ = 2π · f · n (f = fundamental frequency, typically 50Hz)
 */
@Service
public class WaveformService {

    /**
     * Reconstructs time-domain waveform from harmonic amplitudes.
     *
     * @param harmonics       Array of harmonic amplitudes [H1, H2, H3, ..., H8]
     *                        H1 = fundamental (50Hz), H2 = 2nd harmonic (100Hz), etc.
     * @param frequency       Fundamental frequency in Hz (50Hz for EU, 60Hz for USA)
     * @param samplesPerCycle Number of samples to generate per cycle (e.g., 200 for smooth graph)
     * @param phaseShift      Phase shift in radians to fundamental harmonic (typically arccos(cosPhi) for current waveform)
     * @return Array of waveform samples representing one complete cycle
     * <p>
     * EXAMPLE:
     * Input:  harmonics = [230.0, 4.8, 2.3, 1.1, 0.8, 0.5, 0.3, 0.2]
     * frequency = 50.0
     * samplesPerCycle = 200
     * Output: [0.0, 7.2, 14.4, ..., -7.2] (200 values representing sine wave)
     */
    public double[] reconstructWaveform(Double[] harmonics, double frequency, int samplesPerCycle, double phaseShift) {
        // Delegate to MathUtils for the actual mathematical computation
        return MathUtils.reconstructWaveform(harmonics, frequency, samplesPerCycle, phaseShift);
    }
}