package com.dkowalczyk.scadasystem.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.model.entity.DailyStats;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.DailyStatsRepository;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import com.dkowalczyk.scadasystem.util.Constants;
import com.dkowalczyk.scadasystem.util.MathUtils;

/**
 * Service for querying and calculating daily power quality statistics.
 * Simplified for domestic/homeowner use.
 */
@Service
@RequiredArgsConstructor
public class StatsService {

    private final DailyStatsRepository repository;
    private final MeasurementRepository measurementRepository;

    /**
     * Get today's statistics (used in homeowner dashboard).
     */
    public Optional<StatsDTO> getTodayStats() {
        LocalDate today = LocalDate.now();
        return getStatsForDate(today);
    }

    /**
     * Get statistics for the last N days (for trend graphs).
     */
    public List<StatsDTO> getLastDaysStats(int days) {
        if (days < 1) {
            throw new IllegalArgumentException("days parameter must be at least 1, got: " + days);
        }

        LocalDate from = LocalDate.now().minusDays(days - 1);
        LocalDate to = LocalDate.now();

        return repository.findByDateBetweenOrderByDateAsc(from, to)
                .stream()
                .map(StatsDTO::new)
                .toList();
    }

    /**
     * Get statistics for a specific date (for historical lookup).
     */
    public Optional<StatsDTO> getStatsForDate(LocalDate date) {
        return repository.findByDate(date).map(StatsDTO::new);
    }

    /**
     * Calculate and persist daily statistics based on measurement data.
     */
    public StatsDTO calculateDailyStats(LocalDate date) {
        Instant startOfDay = date.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        List<Measurement> measurements =
                measurementRepository.findByIsValidTrueAndTimeBetween(startOfDay, endOfDay, Pageable.unpaged());

        if (measurements.isEmpty()) {
            return StatsDTO.builder().date(date).build();
        }

        // === Voltage Stats ===
        List<Double> voltages = measurements.stream().map(Measurement::getVoltageRms).toList();
        double avgVoltage = MathUtils.average(voltages);
        double minVoltage = MathUtils.min(voltages);
        double maxVoltage = MathUtils.max(voltages);
        double stdDevVoltage = MathUtils.standardDeviation(voltages, avgVoltage);

        // === Active Power Stats ===
        List<Double> powerActive = measurements.stream().map(Measurement::getPowerActive).toList();
        double avgPowerActive = MathUtils.average(powerActive);
        double minPowerActive = MathUtils.min(powerActive);
        double maxPowerActive = MathUtils.max(powerActive);

        // === Frequency Stats ===
        List<Double> frequency = measurements.stream().map(Measurement::getFrequency).toList();
        double avgFrequency = MathUtils.average(frequency);
        double minFrequency = MathUtils.min(frequency);
        double maxFrequency = MathUtils.max(frequency);

        // === Power Factor Stats ===
        List<Double> powerFactor = measurements.stream().map(Measurement::getCosPhi).toList();
        double avgPowerFactor = MathUtils.average(powerFactor);
        double minPowerFactor = MathUtils.min(powerFactor);

        // === Energy Calculation ===
        List<Measurement> sortedMeasurements = measurements.stream()
                .sorted(Comparator.comparing(Measurement::getTime))
                .toList();
        double totalEnergyKwh = MathUtils.calculateEnergy(sortedMeasurements);

        // === Event Counters (IEC 61000-4-30 compliant) ===
        // Events must have minimum duration to be counted as valid
        int voltageSagCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getVoltageRms() < Constants.VOLTAGE_SAG_THRESHOLD,
                Constants.SAG_MIN_DURATION_MS / 1000.0
        );

        int voltageSwellCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getVoltageRms() > Constants.VOLTAGE_SWELL_THRESHOLD,
                Constants.SAG_MIN_DURATION_MS / 1000.0  // Same duration threshold as sag
        );

        int interruptionCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getVoltageRms() < Constants.VOLTAGE_INTERRUPTION_THRESHOLD,
                Constants.VOLTAGE_INTERRUPTION_MIN_DURATION_SECONDS
        );

        int thdViolationsCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getThdVoltage() > Constants.VOLTAGE_THD_LIMIT,
                0.01  // 10ms minimum duration for THD violations
        );

        int frequencyDevCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getFrequency() < Constants.FREQUENCY_MIN || m.getFrequency() > Constants.FREQUENCY_MAX,
                0.01  // 10ms minimum duration
        );

        int powerFactorPenaltyCount = countEventsWithDuration(
                sortedMeasurements,
                m -> m.getCosPhi() < Constants.MIN_POWER_FACTOR,
                0.01  // 10ms minimum duration
        );

        // === Data Quality ===
        int measurementCount = measurements.size();
        int expectedMeasurements = 24 * 60 * 60 / 3; // every 3 seconds
        double dataCompleteness = (double) measurementCount / expectedMeasurements;

        // === Persist Calculated Stats ===
        DailyStats dailyStats = DailyStats.builder()
                .date(date)
                // Voltage
                .avgVoltage(avgVoltage)
                .minVoltage(minVoltage)
                .maxVoltage(maxVoltage)
                .stdDevVoltage(stdDevVoltage)
                // Power
                .avgPowerActive(avgPowerActive)
                .minPower(minPowerActive)
                .peakPower(maxPowerActive)
                .totalEnergyKwh(totalEnergyKwh)
                // Power factor
                .avgPowerFactor(avgPowerFactor)
                .minPowerFactor(minPowerFactor)
                // Frequency
                .avgFrequency(avgFrequency)
                .minFrequency(minFrequency)
                .maxFrequency(maxFrequency)
                // Event counters
                .voltageSagCount(voltageSagCount)
                .voltageSwellCount(voltageSwellCount)
                .interruptionCount(interruptionCount)
                .thdViolationsCount(thdViolationsCount)
                .frequencyDevCount(frequencyDevCount)
                .powerFactorPenaltyCount(powerFactorPenaltyCount)
                // Data quality
                .measurementCount(measurementCount)
                .dataCompleteness(dataCompleteness)
                .build();

        repository.save(dailyStats);

        // === Return DTO ===
        return StatsDTO.builder()
                .date(date)
                // Voltage
                .avgVoltage(avgVoltage)
                .minVoltage(minVoltage)
                .maxVoltage(maxVoltage)
                .stdDevVoltage(stdDevVoltage)
                // Power
                .avgPowerActive(avgPowerActive)
                .minPower(minPowerActive)
                .peakPower(maxPowerActive)
                .totalEnergyKwh(totalEnergyKwh)
                // Power factor
                .avgPowerFactor(avgPowerFactor)
                .minPowerFactor(minPowerFactor)
                // Frequency
                .avgFrequency(avgFrequency)
                .minFrequency(minFrequency)
                .maxFrequency(maxFrequency)
                // Event counters
                .voltageSagCount(voltageSagCount)
                .voltageSwellCount(voltageSwellCount)
                .interruptionCount(interruptionCount)
                .thdViolationsCount(thdViolationsCount)
                .frequencyDevCount(frequencyDevCount)
                .powerFactorPenaltyCount(powerFactorPenaltyCount)
                // Data quality
                .measurementCount(measurementCount)
                .dataCompleteness(dataCompleteness)
                .build();
    }

    /**
     * Count events that satisfy a condition for at least the minimum duration.
     *
     * Algorithm:
     * 1. Iterate through chronologically sorted measurements
     * 2. Detect event start when condition becomes true
     * 3. Continue tracking while condition remains true
     * 4. Detect event end when condition becomes false
     * 5. Calculate event duration
     * 6. If duration >= minDurationSeconds, count as 1 event
     * 7. Continue from next measurement
     *
     * Example: 10-second voltage sag with 3s sampling interval
     * - Measurements at t=0s, 3s, 6s, 9s all have V < threshold
     * - Duration = 9s - 0s = 9s
     * - If minDuration = 0.01s (10ms), this counts as 1 event
     *
     * This complies with IEC 61000-4-30 which requires minimum duration thresholds.
     *
     * @param measurements List of measurements sorted by time (ascending)
     * @param condition Predicate to test for event condition (e.g., voltage < threshold)
     * @param minDurationSeconds Minimum duration in seconds to count as valid event
     * @return Number of events meeting the duration threshold
     */
    private int countEventsWithDuration(List<Measurement> measurements,
                                         Predicate<Measurement> condition,
                                         double minDurationSeconds) {
        if (measurements.isEmpty()) {
            return 0;
        }

        int eventCount = 0;
        Instant eventStart = null;

        for (int i = 0; i < measurements.size(); i++) {
            Measurement current = measurements.get(i);
            boolean inEvent = condition.test(current);

            if (inEvent && eventStart == null) {
                // Event starts
                eventStart = current.getTime();
            } else if (!inEvent && eventStart != null) {
                // Event ends - calculate duration
                Instant eventEnd = current.getTime();
                double durationSeconds = Duration.between(eventStart, eventEnd).toMillis() / 1000.0;

                if (durationSeconds >= minDurationSeconds) {
                    eventCount++;
                }

                eventStart = null;  // Reset for next event
            }
        }

        // Handle case where event is still active at end of measurements
        if (eventStart != null) {
            Measurement lastMeasurement = measurements.get(measurements.size() - 1);
            double durationSeconds = Duration.between(eventStart, lastMeasurement.getTime()).toMillis() / 1000.0;

            if (durationSeconds >= minDurationSeconds) {
                eventCount++;
            }
        }

        return eventCount;
    }
}
