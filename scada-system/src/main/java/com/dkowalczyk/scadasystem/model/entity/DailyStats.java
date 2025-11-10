package com.dkowalczyk.scadasystem.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Entity representing aggregated daily statistics of power quality measurements.
 * 
 * Includes voltage, frequency, power, THD, and event counters
 * for a given date according to IEC 61000 standards.
 */
@Entity
@Table(name = "daily_stats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyStats {

    // === Identity & Date ===

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique date for which daily statistics are recorded. */
    @Column(unique = true, nullable = false)
    private LocalDate date;

    // === Voltage Statistics ===

    @Column(name = "avg_voltage")
    private double avgVoltage;

    @Column(name = "min_voltage")
    private double minVoltage;

    @Column(name = "max_voltage")
    private double maxVoltage;

    /** Standard deviation of voltage (stability metric). */
    @Column(name = "std_dev_voltage")
    private double stdDevVoltage;

    // === Power & Energy Statistics ===

    @Column(name = "avg_power_active")
    private double avgPowerActive;

    @Column(name = "peak_power")
    private double peakPower;

    @Column(name = "min_power")
    private double minPower;

    @Column(name = "total_energy_kwh")
    private double totalEnergyKwh;

    // === Power Factor Statistics ===

    @Column(name = "avg_power_factor")
    private double avgPowerFactor;

    @Column(name = "min_power_factor")
    private double minPowerFactor;

    // === Frequency Statistics ===

    @Column(name = "avg_frequency")
    private double avgFrequency;

    @Column(name = "min_frequency")
    private double minFrequency;

    @Column(name = "max_frequency")
    private double maxFrequency;

    // === Event Counters ===

    @Column(name = "voltage_sag_count")
    private int voltageSagCount;

    @Column(name = "voltage_swell_count")
    private int voltageSwellCount;

    @Column(name = "interruption_count")
    private int interruptionCount;

    @Column(name = "thd_violations_count")
    private int thdViolationsCount;

    @Column(name = "frequency_deviation_count")
    private int frequencyDevCount;

    @Column(name = "power_factor_penalty_count")
    private int powerFactorPenaltyCount;

    // === Data Quality Metrics ===

    @Column(name = "measurement_count")
    private int measurementCount;

    /** Ratio of received vs. expected measurements (0–1). */
    @Column(name = "data_completeness")
    private double dataCompleteness;

    // === Audit Fields ===

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
