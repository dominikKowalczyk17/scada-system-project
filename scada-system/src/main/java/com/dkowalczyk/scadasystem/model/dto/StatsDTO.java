package com.dkowalczyk.scadasystem.model.dto;

import java.time.LocalDate;

import com.dkowalczyk.scadasystem.model.entity.DailyStats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for daily statistics API responses.
 *
 * Excludes internal fields (id, createdAt, updatedAt) and provides
 * a clean JSON structure for the frontend dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsDTO {

    private LocalDate date;

    private double avgVoltage;
    private double minVoltage;
    private double maxVoltage;
    private double stdDevVoltage;

    private double avgPowerActive;
    private double peakPower;
    private double minPower;
    private double totalEnergyKwh;

    private double avgPowerFactor;
    private double minPowerFactor;

    private double avgFrequency;
    private double minFrequency;
    private double maxFrequency;

    private int voltageSagCount;
    private int voltageSwellCount;
    private int interruptionCount;
    private int thdViolationsCount;
    private int frequencyDevCount;
    private int powerFactorPenaltyCount;

    private int measurementCount;
    private double dataCompleteness;

    /**
     * Constructor that converts DailyStats entity to DTO.
     * This is the manual mapping approach.
     */
    public StatsDTO(DailyStats entity) {
        this.date = entity.getDate();
        this.avgVoltage = entity.getAvgVoltage();
        this.minVoltage = entity.getMinVoltage();
        this.maxVoltage = entity.getMaxVoltage();
        this.stdDevVoltage = entity.getStdDevVoltage();
        this.avgPowerActive = entity.getAvgPowerActive();
        this.peakPower = entity.getPeakPower();
        this.minPower = entity.getMinPower();
        this.totalEnergyKwh = entity.getTotalEnergyKwh();
        this.avgPowerFactor = entity.getAvgPowerFactor();
        this.minPowerFactor = entity.getMinPowerFactor();
        this.avgFrequency = entity.getAvgFrequency();
        this.minFrequency = entity.getMinFrequency();
        this.maxFrequency = entity.getMaxFrequency();
        this.voltageSagCount = entity.getVoltageSagCount();
        this.voltageSwellCount = entity.getVoltageSwellCount();
        this.interruptionCount = entity.getInterruptionCount();
        this.thdViolationsCount = entity.getThdViolationsCount();
        this.frequencyDevCount = entity.getFrequencyDevCount();
        this.powerFactorPenaltyCount = entity.getPowerFactorPenaltyCount();
        this.measurementCount = entity.getMeasurementCount();
        this.dataCompleteness = entity.getDataCompleteness();
    }
}
