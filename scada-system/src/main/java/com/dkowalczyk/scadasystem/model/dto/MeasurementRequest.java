package com.dkowalczyk.scadasystem.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MeasurementRequest {

    @NotNull(message = "timestamp is required")
    private Long timestamp;

    @NotNull
    @JsonProperty("voltage_rms")
    private Float voltageRms;

    @NotNull
    @JsonProperty("current_rms")
    private Float currentRms;

    @JsonProperty("power_active")
    private Float powerActive;

    @JsonProperty("power_apparent")
    private Float powerApparent;

    @JsonProperty("power_reactive")
    private Float powerReactive;

    @JsonProperty("cos_phi")
    private Float cosPhi;

    @NotNull
    private Float frequency;

    @JsonProperty("thd_voltage")
    private Float thdVoltage;

    @JsonProperty("thd_current")
    private Float thdCurrent;

    @JsonProperty("harmonics_v")
    private Float[] harmonicsV;

    @JsonProperty("harmonics_i")
    private Float[] harmonicsI;
}