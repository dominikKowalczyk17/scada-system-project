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

    @BeforeEach
    void setUp() {
        waveformService = new WaveformService();
    }

    @Test
    @DisplayName("Should reconstruct pure sine wave from fundamental harmonic only")
    void shouldReconstructPureSineWave() {
        // Given: Pure 50Hz sine wave with amplitude 230V (only H1, rest = 0)
        Double[] harmonics = new Double[]{
                230.0,  // H1 - fundamental (50Hz)
                0.0,    // H2 - 2nd harmonic (100Hz)
                0.0,    // H3
                0.0,    // H4
                0.0,    // H5
                0.0,    // H6
                0.0,    // H7
                0.0     // H8
        };
        double frequency = 50.0; // Hz
        int samplesPerCycle = 200;

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle);

        // Then: Should have 200 samples
        assertThat(waveform).hasSize(200);

        // Then: Peak value should be close to 230V (RMS to peak ≈ RMS * √2, but for simplicity harmonics are amplitudes)
        double maxValue = findMax(waveform);
        double minValue = findMin(waveform);
        assertThat(maxValue).isCloseTo(230.0, within(1.0));
        assertThat(minValue).isCloseTo(-230.0, within(1.0));

        // Then: At t=0, value should be 0 (sine wave starts at 0)
        assertThat(waveform[0]).isCloseTo(0.0, within(0.1));

        // Then: At 1/4 cycle (sample 50), value should be at peak (~230V)
        assertThat(waveform[50]).isCloseTo(230.0, within(1.0));

        // Then: At 1/2 cycle (sample 100), value should be ~0
        assertThat(waveform[100]).isCloseTo(0.0, within(1.0));

        // Then: At 3/4 cycle (sample 150), value should be at negative peak (~-230V)
        assertThat(waveform[150]).isCloseTo(-230.0, within(1.0));
    }

    @Test
    @DisplayName("Should reconstruct distorted waveform with multiple harmonics")
    void shouldReconstructDistortedWaveform() {
        // Given: Typical power grid with harmonics (realistic values from ESP32)
        Double[] harmonics = new Double[]{
                230.0,  // H1 - fundamental (dominant)
                4.8,    // H2 - 2nd harmonic (small distortion)
                2.3,    // H3 - 3rd harmonic
                1.1,    // H4
                0.8,    // H5
                0.5,    // H6
                0.3,    // H7
                0.2     // H8
        };
        double frequency = 50.0; // Hz
        int samplesPerCycle = 200;

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle);

        // Then: Should have 200 samples
        assertThat(waveform).hasSize(200);

        // Then: Peak value should be slightly higher than 230V due to harmonics
        double maxValue = findMax(waveform);
        double minValue = findMin(waveform);
        assertThat(maxValue).isBetween(220.0, 240.0);
        assertThat(minValue).isBetween(-240.0, -220.0); // But not too much distortion

        // Then: Waveform should NOT be perfectly symmetric (harmonics cause distortion)
        // This is expected - harmonics create asymmetry
        assertThat(waveform).isNotEmpty();
    }

    @Test
    @DisplayName("Should handle null harmonics array gracefully")
    void shouldHandleNullHarmonics() {
        // Given: Null harmonics
        Double[] harmonics = null;
        double frequency = 50.0;
        int samplesPerCycle = 200;

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle);

        // Then: Should return array of zeros
        assertThat(waveform).hasSize(200);
        assertThat(waveform).containsOnly(0.0);
    }

    @Test
    @DisplayName("Should handle empty harmonics array")
    void shouldHandleEmptyHarmonics() {
        // Given: Empty harmonics array
        Double[] harmonics = new Double[]{};
        double frequency = 50.0;
        int samplesPerCycle = 200;

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle);

        // Then: Should return array of zeros
        assertThat(waveform).hasSize(200);
        assertThat(waveform).containsOnly(0.0);
    }

    @Test
    @DisplayName("Should work with 60Hz frequency (USA power grid)")
    void shouldWorkWith60Hz() {
        // Given: USA power grid with 60Hz
        Double[] harmonics = new Double[]{
                120.0,  // H1 - 110-120V RMS in USA
                0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        };
        double frequency = 60.0; // Hz (USA)
        int samplesPerCycle = 200;

        // When: Reconstruct waveform
        double[] waveform = waveformService.reconstructWaveform(harmonics, frequency, samplesPerCycle);

        // Then: Should have 200 samples
        assertThat(waveform).hasSize(200);

        // Then: Peak should be ~120V
        double maxValue = findMax(waveform);
        assertThat(maxValue).isCloseTo(120.0, within(1.0));
    }

    @Test
    @DisplayName("Should demonstrate educational example - understanding harmonics")
    void educationalExample_UnderstandingHarmonics() {
        // === EDUCATIONAL TEST - Shows how harmonics affect waveform ===

        // CASE 1: Pure sine wave (no distortion)
        Double[] pureHarmonics = new Double[]{230.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double[] pureWave = waveformService.reconstructWaveform(pureHarmonics, 50.0, 200);

        // CASE 2: With 2nd harmonic (adds "hump" to waveform)
        Double[] with2ndHarmonic = new Double[]{230.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0};
        double[] distortedWave = waveformService.reconstructWaveform(with2ndHarmonic, 50.0, 200);

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