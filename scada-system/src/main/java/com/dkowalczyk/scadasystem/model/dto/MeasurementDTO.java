package com.dkowalczyk.scadasystem.model.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
public class MeasurementDTO {
    private Long id;
    private Instant time;
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
}