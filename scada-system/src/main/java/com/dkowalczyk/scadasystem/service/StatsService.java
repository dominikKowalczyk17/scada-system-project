package com.dkowalczyk.scadasystem.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

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
                measurementRepository.findByTimeBetweenOrderByTimeDesc(startOfDay, endOfDay);

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

        // === Event Counters ===
        int voltageSagCount = (int) measurements.stream()
                .filter(m -> m.getVoltageRms() < Constants.VOLTAGE_SAG_THRESHOLD)
                .count();

        int voltageSwellCount = (int) measurements.stream()
                .filter(m -> m.getVoltageRms() > Constants.VOLTAGE_SWELL_THRESHOLD)
                .count();

        int interruptionCount = (int) measurements.stream()
                .filter(m -> m.getVoltageRms() < Constants.VOLTAGE_INTERRUPTION_THRESHOLD)
                .count();

        int thdViolationsCount = (int) measurements.stream()
                .filter(m -> m.getThdVoltage() > Constants.VOLTAGE_THD_LIMIT)
                .count();

        int frequencyDevCount = (int) measurements.stream()
                .filter(m -> m.getFrequency() < Constants.FREQUENCY_MIN || m.getFrequency() > Constants.FREQUENCY_MAX)
                .count();

        int powerFactorPenaltyCount = (int) measurements.stream()
                .filter(m -> m.getCosPhi() < Constants.MIN_POWER_FACTOR)
                .count();

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
}
