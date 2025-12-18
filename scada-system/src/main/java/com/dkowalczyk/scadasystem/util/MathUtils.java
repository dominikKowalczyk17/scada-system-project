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
     * Reconstructs time-domain waveform from harmonic amplitudes using inverse
     * Fourier synthesis.
     * <p>
     * Mathematical formula: V(t) = Σ[Hₙ · sin(ωₙ · t)] where ωₙ = 2π · f · n
     * <p>
     * WHY: ESP32 sends harmonic amplitudes (8 numbers) to save bandwidth.
     * This function reconstructs the full waveform (200 samples) for visualization.
     *
     * @param harmonics       Array of harmonic amplitudes [H1, H2, ..., H8]
     *                        H1 = fundamental frequency, H2 = 2nd harmonic, etc.
     * @param frequency       Fundamental frequency in Hz (50Hz for EU, 60Hz for
     *                        USA)
     * @param samplesPerCycle Number of samples to generate per complete cycle
     * @return Array of waveform samples representing one complete cycle, or zeros
     *         if harmonics is null/empty
     *         <p>
     *         EXAMPLE:
     *         harmonics = [230.0, 4.8, 2.3, 1.1, 0.8, 0.5, 0.3, 0.2]
     *         frequency = 50.0
     *         samplesPerCycle = 200
     *         → returns 200-element array representing voltage waveform over 20ms
     *         (one 50Hz cycle)
     */
    public static double[] reconstructWaveform(Double[] harmonics, double frequency, int samplesPerCycle,
            double phaseShift) {
        if (harmonics == null || harmonics.length == 0) {
            return new double[samplesPerCycle];
        }

        double[] waveform = new double[samplesPerCycle];

        // t_step = 1.0 / (frequency * samplesPerCycle);

        for (int i = 0; i < samplesPerCycle; i++) {
            double t = (double) i / samplesPerCycle;
            double sum = 0;

            for (int h = 0; h < harmonics.length; h++) {
                if (harmonics[h] == null)
                    continue;

                int harmonicOrder = h + 1;
                double amplitude = harmonics[h] * Math.sqrt(2);

                // Fourier Synthesis:
                double angle = 2.0 * Math.PI * harmonicOrder * t - (harmonicOrder == 1 ? phaseShift : 0);
                sum += amplitude * Math.sin(angle);
            }
            waveform[i] = sum;
        }

        return waveform;
    }
}
