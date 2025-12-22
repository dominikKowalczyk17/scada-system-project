package com.dkowalczyk.scadasystem.model.dto;

import lombok.*;
import java.time.Instant;

/**
 * Data Transfer Object for electrical measurements with PN-EN 50160 indicators.
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Data
@Builder
public class MeasurementDTO {
    private Long id;
    private Instant time;

    // Raw measurements
    private Double voltageRms;
    private Double currentRms;
    private Double powerActive;
    private Double powerApparent;
    private Double powerReactive;
    private Double cosPhi;
    private Double frequency;
    private Double thdVoltage;
    private Double thdCurrent;
    private Double[] harmonicsV;
    private Double[] harmonicsI;

    // PN-EN 50160 power quality indicators (calculated by backend)
    private Double voltageDeviationPercent;  // Group 1: Supply voltage magnitude
    private Double frequencyDeviationHz;     // Group 2: Supply frequency
}