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

            long deltaTimeSeconds = Duration.between(current.getTime(), next.getTime()).getSeconds();

            // Energy for this segment (watt-seconds)
            totalEnergyWattSeconds += avgPower * deltaTimeSeconds;
        }

        // Convert watt-seconds to kWh
        // 1 kWh = 1000W × 3600s = 3,600,000 watt-seconds
        return totalEnergyWattSeconds / 3_600_000.0;
    }
}
