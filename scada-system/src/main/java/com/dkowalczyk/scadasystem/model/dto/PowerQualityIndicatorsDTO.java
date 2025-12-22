package com.dkowalczyk.scadasystem.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

/**
 * Data Transfer Object for PN-EN 50160 power quality indicators.
 * <p>
 * This DTO separates standardized power quality indicators from general measurements,
 * allowing frontend to display PN-EN 50160 compliance data in a dedicated section.
 * <p>
 * Contains only measurable indicators for this system:
 * - Group 1: Supply voltage magnitude (voltage deviation)
 * - Group 2: Supply frequency (frequency deviation)
 * - Group 4: Voltage waveform distortions (THD and harmonics, partial - H1-H8 only)
 * <p>
 * NOT included (cannot be measured with current hardware):
 * - Group 3: Voltage fluctuations and flicker (requires IEC 61000-4-15 equipment)
 * - Group 5: Supply interruptions (implemented separately as events)
 */
@Data
@Builder
public class PowerQualityIndicatorsDTO {

    /**
     * Measurement timestamp.
     */
    private Instant timestamp;

    // === PN-EN 50160 Group 1: Supply Voltage Magnitude ===

    /**
     * RMS voltage in volts.
     */
    private Double voltageRms;

    /**
     * Voltage deviation from declared value (230V) in percent.
     * Formula: (U_measured - 230) / 230 * 100%
     * PN-EN 50160 limit: ±10% for 95% of week.
     */
    private Double voltageDeviationPercent;

    /**
     * Flag indicating if voltage is within PN-EN 50160 limits (±10%).
     */
    private Boolean voltageWithinLimits;

    // === PN-EN 50160 Group 2: Supply Frequency ===

    /**
     * Frequency in Hz.
     */
    private Double frequency;

    /**
     * Frequency deviation from nominal (50 Hz) in Hz.
     * Formula: f_measured - 50
     * PN-EN 50160 limit: ±0.5 Hz for 99.5% of year.
     */
    private Double frequencyDeviationHz;

    /**
     * Flag indicating if frequency is within PN-EN 50160 limits (49.5-50.5 Hz).
     */
    private Boolean frequencyWithinLimits;

    // === PN-EN 50160 Group 4: Voltage Waveform Distortions (Partial) ===

    /**
     * Total Harmonic Distortion of voltage in percent.
     * <p>
     * IMPORTANT: Calculated from harmonics 2-8 only (partial measurement).
     * IEC 61000-4-7 requires harmonics 2-40 for full compliance.
     * This value represents a LOWER BOUND of actual THD.
     * <p>
     * PN-EN 50160 limit: THD < 8% (for full spectrum 2-40).
     */
    private Double thdVoltage;

    /**
     * Flag indicating if THD is within PN-EN 50160 limit (<8%).
     * Note: Based on partial THD (harmonics 2-8 only).
     */
    private Boolean thdWithinLimits;

    /**
     * Voltage harmonics array [H1, H2, H3, H4, H5, H6, H7, H8].
     * <p>
     * Limited to 8 harmonics due to Nyquist constraint at 800-1000 Hz sampling.
     * IEC 61000-4-7 specifies measurement up to H40 for full compliance.
     */
    private Double[] harmonicsVoltage;

    // === Additional Context ===

    /**
     * Overall power quality status indicator.
     * True if all measured indicators are within PN-EN 50160 limits.
     * <p>
     * Checks:
     * - Voltage deviation within ±10%
     * - Frequency deviation within ±0.5 Hz
     * - THD within 8% (partial measurement)
     */
    private Boolean overallCompliant;

    /**
     * Human-readable status message for display purposes.
     * Examples:
     * - "All indicators within PN-EN 50160 limits"
     * - "Voltage deviation exceeded (+12.3%)"
     * - "THD exceeded (9.2%, partial measurement)"
     */
    private String statusMessage;
}
