package com.dkowalczyk.scadasystem.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * MQTT payload from ESP32 measurement nodes (topic: scada/measurements/#, QoS: 1).
 *
 * @author Bachelor Thesis - SCADA System Project
 * @since 1.0
 */
@Data
public class MeasurementRequest {

    /**
     * Optional Unix timestamp (seconds since epoch).
     * If not provided by ESP32, backend will assign current server time.
     */
    private Long timestamp;

    @NotNull(message = "voltageRms is required")
    @DecimalMin(value = "0.0", message = "voltageRms must be non-negative")
    @DecimalMax(value = "500.0", message = "voltageRms must not exceed 500V")
    @JsonProperty("v_rms")
    private Double voltageRms;

    @NotNull(message = "currentRms is required")
    @DecimalMin(value = "0.0", message = "currentRms must be non-negative")
    @DecimalMax(value = "100.0", message = "currentRms must not exceed 100A")
    @JsonProperty("i_rms")
    private Double currentRms;

    @DecimalMin(value = "0.0", message = "powerActive must be non-negative")
    @JsonProperty("p_act")
    private Double powerActive;

    @DecimalMin(value = "0.0", message = "powerApparent must be non-negative")
    @JsonProperty("power_apparent")
    private Double powerApparent;

    @JsonProperty("power_reactive")
    private Double powerReactive;

    @DecimalMin(value = "-1.0", message = "cosPhi must be between -1 and 1")
    @DecimalMax(value = "1.0", message = "cosPhi must be between -1 and 1")
    @JsonProperty("cos_phi")
    private Double cosPhi;

    @NotNull(message = "frequency is required")
    @DecimalMin(value = "45.0", message = "frequency must be at least 45Hz")
    @DecimalMax(value = "65.0", message = "frequency must not exceed 65Hz")
    @JsonProperty("freq")
    private Double frequency;

    @DecimalMin(value = "0.0", message = "thdVoltage must be non-negative")
    @DecimalMax(value = "100.0", message = "thdVoltage must not exceed 100%")
    @JsonProperty("thd_v")
    private Double thdVoltage;

    @DecimalMin(value = "0.0", message = "thdCurrent must be non-negative")
    @DecimalMax(value = "100.0", message = "thdCurrent must not exceed 100%")
    @JsonProperty("thd_i")
    private Double thdCurrent;

    @JsonProperty("harm_v")
    private Double[] harmonicsV;

    @JsonProperty("harm_i")
    private Double[] harmonicsI;
}