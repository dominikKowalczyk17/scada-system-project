package com.dkowalczyk.scadasystem.util;

import com.dkowalczyk.scadasystem.model.entity.Measurement;

import java.time.Duration;
import java.util.List;

public class MathUtils {

    private MathUtils() {
        throw new AssertionError("Utility class cannot be instantiated");
    }

    /**
     * Calculate average (mean) of a list of values.
     */
    public static double average(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    /**
     * Calculate standard deviation.
     * Formula: √( Σ(xi - μ)² / n )
     */
    public static double standardDeviation(List<Double> values, double mean) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }

        double sumSquaredDiffs = values.stream()
                .mapToDouble(d -> {
                    return Math.pow(d - mean, 2);
                })
                .sum();
        return Math.sqrt(sumSquaredDiffs / values.size());
    }

    /**
     * Find minimum value in list.
     */
    public static double min(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .min()
                .orElse(0.0);
    }

    /**
     * Find maximum value in list.
     */
    public static double max(List<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream()
                .mapToDouble(Double::doubleValue)
                .max()
                .orElse(0.0);
    }

    /**
     * Calculate total energy using trapezoidal integration
     * Formula E = Σ [(P[i] + P[i + 1]) / 2 × Δt]
     *
     * @param measurements List of measurements (must be sorted by time!)
     * @return Total energy in kWh
     */
    public static double calculateEnergy(List<Measurement> measurements) {
        if (measurements == null || measurements.size() < 2) {
            return 0.0;
        }

        double totalEnergyWattSeconds = 0.0;

        for (int i = 0; i < measurements.size() - 1; i++) {
            Measurement current = measurements.get(i);
            Measurement next = measurements.get(i + 1);

            double avgPower = (current.getPowerActive() + next.getPowerActive()) / 2.0;

            Duration interval = Duration.between(current.getTime(), next.getTime());
            double deltaTimeSeconds = interval.toMillis() / 1000.0;

            // Energy for this segment (watt-seconds)
            totalEnergyWattSeconds += avgPower * deltaTimeSeconds;
        }

        // Convert watt-seconds to kWh
        // 1 kWh = 1000W × 3600s = 3,600,000 watt-seconds
        return totalEnergyWattSeconds / 3_600_000.0;
    }

    /**
     * Reconstructs time-domain waveform from harmonic amplitudes using inverse Fourier synthesis.
     * <p>
     * Mathematical formula: V(t) = Σ[Hₙ · sin(ωₙ · t)] where ωₙ = 2π · f · n
     * <p>
     * WHY: ESP32 sends harmonic amplitudes (8 numbers) to save bandwidth.
     * This function reconstructs the full waveform (200 samples) for visualization.
     *
     * @param harmonics       Array of harmonic amplitudes [H1, H2, ..., H8]
     *                        H1 = fundamental frequency, H2 = 2nd harmonic, etc.
     * @param frequency       Fundamental frequency in Hz (50Hz for EU, 60Hz for USA)
     * @param samplesPerCycle Number of samples to generate per complete cycle
     * @return Array of waveform samples representing one complete cycle, or zeros if harmonics is null/empty
     * <p>
     * EXAMPLE:
     * harmonics = [230.0, 4.8, 2.3, 1.1, 0.8, 0.5, 0.3, 0.2]
     * frequency = 50.0
     * samplesPerCycle = 200
     * → returns 200-element array representing voltage waveform over 20ms (one 50Hz cycle)
     */
    public static double[] reconstructWaveform(Double[] harmonics, double frequency, int samplesPerCycle) {
        // Validation: return zeros if harmonics is null or empty
        if (harmonics == null || harmonics.length == 0) {
            return new double[samplesPerCycle];
        }

        // Calculate time step between samples
        // Period T = 1/f, so Δt = T / samplesPerCycle
        double period = 1.0 / frequency;
        double deltaT = period / samplesPerCycle;

        // Initialize result array
        double[] waveform = new double[samplesPerCycle];

        // Reconstruct waveform by summing all harmonics at each time point
        for (int i = 0; i < samplesPerCycle; i++) {
            double t = i * deltaT;  // Time for this sample
            double sum = getSum(harmonics, frequency, t);

            // Store reconstructed value for this time point
            waveform[i] = sum;
        }

        return waveform;
    }

    private static double getSum(Double[] harmonics, double frequency, double t) {
        double sum = 0.0;       // Sum of all harmonic contributions

        // Add contribution from each harmonic
        for (int n = 0; n < harmonics.length; n++) {
            if (harmonics[n] != null) {
                // Angular frequency: ω = 2π · f · (n+1)
                // n+1 because n=0 is 1st harmonic (fundamental), n=1 is 2nd harmonic, etc.
                double omega = 2 * Math.PI * frequency * (n + 1);

                // Add harmonic contribution: Hₙ · sin(ωₙ · t)
                sum += harmonics[n] * Math.sin(omega * t);
            }
        }
        return sum;
    }
}
