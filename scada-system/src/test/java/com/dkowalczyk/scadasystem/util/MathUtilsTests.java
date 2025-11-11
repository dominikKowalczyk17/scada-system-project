package com.dkowalczyk.scadasystem.util;


import com.dkowalczyk.scadasystem.model.entity.Measurement;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class MathUtilsTests {

    private static final double DELTA = 0.001;

    // ==================== AVERAGE TESTS ====================

    @Test
    void testAverage_normalValues() {
        // Given: List of 3 values
        List<Double> values = List.of(10.0, 20.0, 30.0);

        // When: Calculate average
        double result = MathUtils.average(values);

        // Then: Should return mean (10+20+30)/3 = 20.0
        assertEquals(20.0, result, DELTA);
    }

    @Test
    void testAverage_emptyList() {
        // Given: Empty list
        List<Double> values = List.of();

        // When: Calculate average
        double result = MathUtils.average(values);

        // Then: Should return 0.0 (safe default)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testAverage_nullList() {
        // Given: Null list
        List<Double> values = null;

        // When: Calculate average
        double result = MathUtils.average(values);

        // Then: Should return 0.0 (safe default, no NPE)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testAverage_singleValue() {
        // Given: Single value
        List<Double> values = List.of(42.0);

        // When: Calculate average
        double result = MathUtils.average(values);

        // Then: Should return the single value
        assertEquals(42.0, result, DELTA);
    }

    // ==================== MIN/MAX TESTS ====================

    @Test
    void testMin_normalValues() {
        // Given: List with clear minimum
        List<Double> values = List.of(5.0, 1.0, 9.0, 3.0);

        // When: Find minimum
        double result = MathUtils.min(values);

        // Then: Should return 1.0
        assertEquals(1.0, result, DELTA);
    }

    @Test
    void testMax_normalValues() {
        // Given: List with clear maximum
        List<Double> values = List.of(5.0, 1.0, 9.0, 3.0);

        // When: Find maximum
        double result = MathUtils.max(values);

        // Then: Should return 9.0
        assertEquals(9.0, result, DELTA);
    }

    @Test
    void testMin_emptyList() {
        // Given: Empty list
        List<Double> values = List.of();

        // When: Find minimum
        double result = MathUtils.min(values);

        // Then: Should return 0.0 (safe default)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testMax_nullList() {
        // Given: Null list
        List<Double> values = null;

        // When: Find maximum
        double result = MathUtils.max(values);

        // Then: Should return 0.0 (safe default, no NPE)
        assertEquals(0.0, result, DELTA);
    }

    // ==================== STANDARD DEVIATION TESTS ====================

    @Test
    void testStandardDeviation_knownResult() {
        // Given: Known dataset from statistics textbook
        // Values: [2, 4, 4, 4, 5, 5, 7, 9]
        // Mean: 5.0
        // Variance: 4.0
        // StdDev: 2.0
        List<Double> values = List.of(2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0);
        double mean = 5.0;

        // When: Calculate standard deviation
        double result = MathUtils.standardDeviation(values, mean);

        // Then: Should return 2.0
        assertEquals(2.0, result, DELTA);
    }

    @Test
    void testStandardDeviation_identicalValues() {
        // Given: All values are the same (no variance)
        List<Double> values = List.of(230.0, 230.0, 230.0, 230.0);
        double mean = 230.0;

        // When: Calculate standard deviation
        double result = MathUtils.standardDeviation(values, mean);

        // Then: Should return 0.0 (perfect stability)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testStandardDeviation_emptyList() {
        // Given: Empty list
        List<Double> values = List.of();
        double mean = 0.0;

        // When: Calculate standard deviation
        double result = MathUtils.standardDeviation(values, mean);

        // Then: Should return 0.0 (safe default)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testStandardDeviation_voltageStability() {
        // Given: Realistic voltage measurements (unstable grid)
        List<Double> values = List.of(220.0, 240.0, 220.0, 240.0);
        double mean = 230.0;

        // When: Calculate standard deviation
        double result = MathUtils.standardDeviation(values, mean);

        // Then: Should return 10.0V (high instability)
        assertEquals(10.0, result, DELTA);
    }

    // ==================== ENERGY CALCULATION TESTS ====================

    @Test
    void testCalculateEnergy_simpleScenario() {
        // Given: Two measurements 1 hour apart, constant 1000W power
        // Expected energy: 1000W × 3600s = 3,600,000 Ws = 1.0 kWh
        Instant time1 = Instant.parse("2025-11-11T10:00:00Z");
        Instant time2 = Instant.parse("2025-11-11T11:00:00Z"); // 1 hour later

        Measurement m1 = Measurement.builder()
                .time(time1)
                .powerActive(1000.0)
                .build();

        Measurement m2 = Measurement.builder()
                .time(time2)
                .powerActive(1000.0)
                .build();

        List<Measurement> measurements = List.of(m1, m2);

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 1.0 kWh
        assertEquals(1.0, result, DELTA);
    }

    @Test
    void testCalculateEnergy_varyingPower() {
        // Given: Two measurements 1 hour apart, power changes from 1000W to 2000W
        // Average power: (1000 + 2000) / 2 = 1500W
        // Expected energy: 1500W × 3600s = 5,400,000 Ws = 1.5 kWh
        Instant time1 = Instant.parse("2025-11-11T10:00:00Z");
        Instant time2 = Instant.parse("2025-11-11T11:00:00Z");

        Measurement m1 = Measurement.builder()
                .time(time1)
                .powerActive(1000.0)
                .build();

        Measurement m2 = Measurement.builder()
                .time(time2)
                .powerActive(2000.0)
                .build();

        List<Measurement> measurements = List.of(m1, m2);

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 1.5 kWh (trapezoidal integration)
        assertEquals(1.5, result, DELTA);
    }

    @Test
    void testCalculateEnergy_multipleSegments() {
        // Given: 3 measurements over 2 hours, 1000W constant
        // Segment 1: 1 hour × 1000W = 1.0 kWh
        // Segment 2: 1 hour × 1000W = 1.0 kWh
        // Total: 2.0 kWh
        Instant time1 = Instant.parse("2025-11-11T10:00:00Z");
        Instant time2 = Instant.parse("2025-11-11T11:00:00Z");
        Instant time3 = Instant.parse("2025-11-11T12:00:00Z");

        List<Measurement> measurements = List.of(
                Measurement.builder().time(time1).powerActive(1000.0).build(),
                Measurement.builder().time(time2).powerActive(1000.0).build(),
                Measurement.builder().time(time3).powerActive(1000.0).build()
        );

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 2.0 kWh
        assertEquals(2.0, result, DELTA);
    }

    @Test
    void testCalculateEnergy_emptyList() {
        // Given: Empty measurements list
        List<Measurement> measurements = List.of();

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 0.0 (safe default)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testCalculateEnergy_singleMeasurement() {
        // Given: Only one measurement (need at least 2 for integration)
        Measurement m1 = Measurement.builder()
                .time(Instant.now())
                .powerActive(1000.0)
                .build();

        List<Measurement> measurements = List.of(m1);

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 0.0 (cannot integrate single point)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testCalculateEnergy_nullList() {
        // Given: Null measurements list
        List<Measurement> measurements = null;

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 0.0 (safe default, no NPE)
        assertEquals(0.0, result, DELTA);
    }

    @Test
    void testCalculateEnergy_threeSecondInterval() {
        // Given: Real SCADA scenario - measurements every 3 seconds
        // Power: 1200W constant
        // Expected: 1200W × 3s = 3600 Ws = 0.001 kWh
        Instant time1 = Instant.parse("2025-11-11T10:00:00Z");
        Instant time2 = Instant.parse("2025-11-11T10:00:03Z"); // 3 seconds later

        List<Measurement> measurements = List.of(
                Measurement.builder().time(time1).powerActive(1200.0).build(),
                Measurement.builder().time(time2).powerActive(1200.0).build()
        );

        // When: Calculate energy
        double result = MathUtils.calculateEnergy(measurements);

        // Then: Should return 0.001 kWh
        assertEquals(0.001, result, DELTA);
    }
}
