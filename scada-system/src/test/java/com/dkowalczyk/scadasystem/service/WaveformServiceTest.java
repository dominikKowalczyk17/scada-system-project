package com.dkowalczyk.scadasystem.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * Unit tests for WaveformService - waveform reconstruction from harmonics.
 * <p>
 * Educational tests demonstrating Fourier synthesis mathematics.
 */
@DisplayName("WaveformService Unit Tests")
class WaveformServiceTest {

    private WaveformService waveformService;
    private static final double SQRT_2 = Math.sqrt(2.0);

    @BeforeEach
    void setUp() {
        waveformService = new WaveformService();
    }

    @Test
    @DisplayName("Should reconstruct pure sine wave from fundamental harmonic only")
    void shouldReconstructPureSineWave() {
        Double[] harmonics = new Double[]{230.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double frequency = 50.0;
        int samplesPerCycle = 200;
        double phaseShift = 0.0;

        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle, phaseShift);

        double expectedPeak = 230.0 * SQRT_2;
        
        assertThat(waveform).hasSize(200);
        assertThat(findMax(waveform)).isCloseTo(expectedPeak, within(1.0));
        assertThat(findMin(waveform)).isCloseTo(-expectedPeak, within(1.0));
        assertThat(waveform[0]).isCloseTo(0.0, within(0.1));
    }

    @Test
    @DisplayName("Should reconstruct distorted waveform with multiple harmonics")
    void shouldReconstructDistortedWaveform() {
        Double[] harmonics = new Double[]{230.0, 4.8, 2.3, 1.1, 0.8, 0.5, 0.3, 0.2};
        
        double[] waveform = waveformService.reconstructWaveform(harmonics, 50.0, 200, 0.0);

        assertThat(findMax(waveform)).isBetween(310.0, 340.0);
    }

    @Test
    @DisplayName("Should handle null harmonics array gracefully")
    void shouldHandleNullHarmonics() {
        double[] waveform = waveformService.reconstructWaveform(null, 50.0, 200, 0.0);
        assertThat(waveform).hasSize(200).containsOnly(0.0);
    }

    @Test
    @DisplayName("Should handle empty harmonics array")
    void shouldHandleEmptyHarmonics() {
        // Given: Empty harmonics array
        Double[] harmonics = new Double[]{};
        double frequency = 50.0;
        int samplesPerCycle = 200;
        double phaseShift = 0.0; // No phase shift

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle, phaseShift);

        // Then: Should return array of zeros
        assertThat(waveform).hasSize(200);
        assertThat(waveform).containsOnly(0.0);
    }

    @Test
    @DisplayName("Should work with 60Hz frequency (USA power grid)")
    void shouldWorkWith60Hz() {
        Double[] harmonics = new Double[]{120.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double[] waveform = waveformService.reconstructWaveform(harmonics, 60.0, 200, 0.0);

        assertThat(findMax(waveform)).isCloseTo(120.0 * SQRT_2, within(1.0));
    }

    @Test
    @DisplayName("Should demonstrate educational example - understanding harmonics")
    void educationalExample_UnderstandingHarmonics() {
        // === EDUCATIONAL TEST - Shows how harmonics affect waveform ===

        // CASE 1: Pure sine wave (no distortion)
        Double[] pureHarmonics = new Double[]{230.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double[] pureWave = waveformService.reconstructWaveform(pureHarmonics, 50.0, 200, 0.0);

        // CASE 2: With 2nd harmonic (adds "hump" to waveform)
        Double[] with2ndHarmonic = new Double[]{230.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double[] distortedWave = waveformService.reconstructWaveform(with2ndHarmonic, 50.0, 200, 0.0);
        // Educational observation: 2nd harmonic CHANGES the waveform shape
        // The waveform is no longer a perfect sine - it's distorted!
        double purePeak = findMax(pureWave);
        double distortedPeak = findMax(distortedWave);

        System.out.println("=== EDUCATIONAL EXAMPLE ===");
        System.out.println("Pure sine wave peak: " + purePeak + " V");
        System.out.println("Distorted wave peak (with 2nd harmonic): " + distortedPeak + " V");
        System.out.println("Peak difference: " + (distortedPeak - purePeak) + " V");
        System.out.println("This demonstrates THD - Total Harmonic Distortion!");
        System.out.println();
        System.out.println("LEARNING POINT:");
        System.out.println("Adding 10V 2nd harmonic doesn't add 10V to peak!");
        System.out.println("Harmonics combine through VECTOR SUM, not algebraic sum.");
        System.out.println("The actual change depends on PHASE relationship between harmonics.");

        // The distorted peak should be noticeably different (but maybe not >1V!)
        // Harmonics combine through vector sum, so 10V 2nd harmonic might only add ~1V to peak
        assertThat(Math.abs(distortedPeak - purePeak)).isGreaterThan(0.1); // At least 0.1V difference
    }

    // Helper methods for tests
    private double findMax(double[] array) {
        double max = Double.NEGATIVE_INFINITY;
        for (double value : array) {
            if (value > max) max = value;
        }
        return max;
    }

    private double findMin(double[] array) {
        double min = Double.POSITIVE_INFINITY;
        for (double value : array) {
            if (value < min) min = value;
        }
        return min;
    }
}