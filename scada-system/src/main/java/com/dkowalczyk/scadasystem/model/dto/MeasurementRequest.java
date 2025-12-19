package com.dkowalczyk.scadasystem.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * MQTT Payload received from ESP32 measurement nodes.
 * 
 * <p>Topic pattern: {@code scada/measurements/#}</p>
 * <p>QoS: 1 (at-least-once delivery)</p>
 * 
 * <h3>Example JSON Payload:</h3>
 * <pre>{@code
 * {
 *   "timestamp": 1702901234,
 *   "voltage_rms": 232.5,
 *   "current_rms": 2.15,
 *   "power_active": 450.2,
 *   "power_apparent": 499.8,
 *   "power_reactive": 215.4,
 *   "cos_phi": 0.90,
 *   "frequency": 50.02,
 *   "thd_voltage": 1.5,
 *   "thd_current": 4.2,
 *   "harmonics_v": [230.0, 0.5, 1.2, 0.1, 0.8],
 *   "harmonics_i": [2.1, 0.05, 0.12, 0.01, 0.08]
 * }
 * }</pre>
 */
@Data
public class MeasurementRequest {

    @NotNull(message = "timestamp is required")
    private Long timestamp;

    @NotNull(message = "voltageRms is required")
    @DecimalMin(value = "0.0", message = "voltageRms must be non-negative")
    @DecimalMax(value = "500.0", message = "voltageRms must not exceed 500V")
    @JsonProperty("voltage_rms")
    private Double voltageRms;

    @NotNull(message = "currentRms is required")
    @DecimalMin(value = "0.0", message = "currentRms must be non-negative")
    @DecimalMax(value = "100.0", message = "currentRms must not exceed 100A")
    @JsonProperty("current_rms")
    private Double currentRms;

    @DecimalMin(value = "0.0", message = "powerActive must be non-negative")
    @JsonProperty("power_active")
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
    private Double frequency;

    @DecimalMin(value = "0.0", message = "thdVoltage must be non-negative")
    @DecimalMax(value = "100.0", message = "thdVoltage must not exceed 100%")
    @JsonProperty("thd_voltage")
    private Double thdVoltage;

    @DecimalMin(value = "0.0", message = "thdCurrent must be non-negative")
    @DecimalMax(value = "100.0", message = "thdCurrent must not exceed 100%")
    @JsonProperty("thd_current")
    private Double thdCurrent;

    @JsonProperty("harmonics_v")
    private Double[] harmonicsV;

    @JsonProperty("harmonics_i")
    private Double[] harmonicsI;
}