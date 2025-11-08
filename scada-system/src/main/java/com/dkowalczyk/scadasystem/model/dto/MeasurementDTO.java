package com.dkowalczyk.scadasystem.model.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
public class MeasurementDTO {
    private Long id;
    private Instant time;
    private Float voltageRms;
    private Float currentRms;
    private Float powerActive;
    private Float powerApparent;
    private Float powerReactive;
    private Float cosPhi;
    private Float frequency;
    private Float thdVoltage;
    private Float thdCurrent;
    private Float[] harmonicsV;
    private Float[] harmonicsI;
}