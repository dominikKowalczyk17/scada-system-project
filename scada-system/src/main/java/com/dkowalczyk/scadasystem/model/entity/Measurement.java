package com.dkowalczyk.scadasystem.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Entity representing electrical measurement data from ESP32-based monitoring system.
 * <p>
 * This entity stores both raw measurement values and calculated PN-EN 50160 power quality indicators.
 * The system is capable of measuring a subset of power quality parameters defined in PN-EN 50160
 * due to hardware limitations (12-bit ADC, 800-1000 Hz sampling rate).
 * <p>
 * Measurement capabilities:
 * - PN-EN 50160 Group 1: Supply voltage magnitude (voltage deviation)
 * - PN-EN 50160 Group 2: Supply frequency (frequency deviation)
 * - PN-EN 50160 Group 4: Voltage waveform distortions (THD and harmonics 2-8, partial)
 * - Additional diagnostic parameters: power, power factor, current harmonics
 * <p>
 * Limitations:
 * - Harmonics limited to H1-H8 (50-400 Hz) due to Nyquist constraint at 800-1000 Hz sampling
 * - THD calculation is partial (excludes harmonics 9-40), representing lower bound of actual distortion
 * - No flicker measurement (P_st/P_lt) - requires IEC 61000-4-15 compliant equipment
 * - Event detection (voltage dips, interruptions) implemented separately
 */
@Entity
@Table(name = "measurements", indexes = {
        @Index(name = "idx_measurement_time", columnList = "time")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Measurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Measurement timestamp.
     */
    @Column(nullable = false)
    private Instant time;

    /**
     * RMS voltage measured in 10-20 cycle window (200-400 ms at 50 Hz).
     * Used to calculate voltage deviation indicator (PN-EN 50160 Group 1).
     * Accuracy: approximately 1-3% after ADC calibration.
     */
    @Column(nullable = false)
    private Double voltageRms;

    /**
     * RMS current measured in 10-20 cycle window.
     * Used for power calculations and load diagnostics.
     */
    @Column(nullable = false)
    private Double currentRms;

    /**
     * Active power in watts (not a PN-EN 50160 indicator).
     * Formula: P = U_rms * I_rms * cos(phi)
     * Used for energy billing and load analysis.
     */
    private Double powerActive;

    /**
     * Apparent power in VA (not a PN-EN 50160 indicator).
     * Formula: S = U_rms * I_rms
     * Used for load analysis.
     */
    private Double powerApparent;

    /**
     * Reactive power of fundamental Q₁ in var (Budeanu theory, not a PN-EN 50160 indicator).
     * <p>
     * Formula: Q₁ = U₁ * I₁ * sin(φ₁)
     * where φ₁ is the phase shift of fundamental (H1) only, extracted from FFT.
     * <p>
     * Note: For distorted waveforms, this is NOT the total reactive power.
     * The total "reactive" component includes both Q₁ and distortion power D.
     * <p>
     * Used for power factor compensation and load diagnostics.
     */
    private Double powerReactive;

    /**
     * Distortion power D in var (Budeanu theory, not a PN-EN 50160 indicator).
     * <p>
     * Formula: D = sqrt(S² - P² - Q₁²)
     * <p>
     * This represents the power component caused by harmonics (non-sinusoidal distortion).
     * For purely sinusoidal waveforms, D = 0.
     * <p>
     * Reference: IEEE Std 1459-2010, Budeanu power theory
     */
    @Column(name = "power_distortion")
    private Double powerDistortion;

    /**
     * Power factor λ = P/S (not a PN-EN 50160 indicator).
     * <p>
     * Formula: λ = P / S
     * <p>
     * IMPORTANT: This is NOT cos(φ)!
     * - cos(φ) is only valid for purely sinusoidal waveforms
     * - λ = P/S is valid for all waveforms (including distorted)
     * <p>
     * For sinusoidal waveforms: λ = cos(φ)
     * For distorted waveforms: λ < cos(φ₁) due to harmonics
     * <p>
     * Used for load diagnostics and energy billing.
     */
    @Column(name = "power_factor")
    private Double powerFactor;

    /**
     * Frequency measured via zero-crossing detection (PN-EN 50160 Group 2 source data).
     * Averaged over 10-20 cycles for noise reduction.
     * Used to calculate frequency deviation indicator.
     * Accuracy: approximately 0.01-0.02 Hz.
     */
    @Column(nullable = false)
    private Double frequency;

    /**
     * Total Harmonic Distortion of voltage (PN-EN 50160 Group 4 indicator, partial).
     * <p>
     * Formula: THD = sqrt(sum(U_h^2 for h=2..8)) / U_1 * 100%
     * <p>
     * IMPORTANT LIMITATIONS:
     * - IEC 61000-4-7 requires harmonics 2-40 for full compliance
     * - Our system measures only harmonics 2-8 due to Nyquist limitation at 800-1000 Hz sampling
     * - This represents a LOWER BOUND of actual THD (real THD may be higher due to unmeasured harmonics 9-40)
     * <p>
     * PN-EN 50160 limit: THD < 8% (for full spectrum 2-40)
     * <p>
     * Calculated by ESP32 from FFT/DFT.
     */
    private Double thdVoltage;

    /**
     * Total Harmonic Distortion of current (diagnostic parameter, not PN-EN 50160 indicator).
     * <p>
     * Formula: THD = sqrt(sum(I_h^2 for h=2..8)) / I_1 * 100%
     * <p>
     * Note: Partial calculation, harmonics 2-8 only (same limitation as THD voltage).
     * Related to IEC 61000-3-2 (emission limits for equipment).
     * Used for diagnostics of non-linear loads.
     * <p>
     * Calculated by ESP32 from FFT/DFT.
     */
    private Double thdCurrent;

    /**
     * Voltage harmonics array containing 8 values (PN-EN 50160 Group 4 indicator, partial).
     * <p>
     * Array structure:
     * - harmonicsV[0] = H1 (50 Hz fundamental component)
     * - harmonicsV[1] = H2 (100 Hz, 2nd harmonic)
     * - harmonicsV[2] = H3 (150 Hz, 3rd harmonic)
     * - harmonicsV[3] = H4 (200 Hz, 4th harmonic)
     * - harmonicsV[4] = H5 (250 Hz, 5th harmonic)
     * - harmonicsV[5] = H6 (300 Hz, 6th harmonic)
     * - harmonicsV[6] = H7 (350 Hz, 7th harmonic)
     * - harmonicsV[7] = H8 (400 Hz, 8th harmonic)
     * <p>
     * NYQUIST LIMITATION:
     * At 800-1000 Hz sampling rate, Nyquist frequency is 400-500 Hz.
     * Harmonics above 8th order cannot be reliably measured (aliasing).
     * <p>
     * IEC 61000-4-7 specifies measurement up to 40th harmonic (2000 Hz) for full compliance.
     * Our system measures only up to 8th harmonic due to hardware sampling constraints.
     * <p>
     * Calculated by ESP32 from FFT/DFT with Hann window and zero-crossing synchronization.
     */
    @Column(name = "harmonics_v")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Double[] harmonicsV;

    /**
     * Current harmonics array containing 8 values (diagnostic parameter, not PN-EN 50160 indicator).
     * <p>
     * Array structure: Same as harmonicsV (H1-H8).
     * <p>
     * Related to IEC 61000-3-2 (emission limits for equipment).
     * Used for diagnostics of non-linear loads (switch-mode power supplies, inverters, LED drivers).
     * <p>
     * Note: Limited to 8 harmonics due to same Nyquist constraint as voltage harmonics.
     * <p>
     * Calculated by ESP32 from FFT/DFT.
     */
    @Column(name = "harmonics_i")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Double[] harmonicsI;

    /**
     * Raw voltage waveform samples from ESP32 (2 cycles, ~120 samples at 50Hz).
     * <p>
     * Contains actual sampled voltage values BEFORE FFT processing.
     * Used for accurate waveform visualization showing real distortions, clipping, asymmetry.
     * <p>
     * Optional field - if not provided, frontend will reconstruct waveform from harmonics.
     */
    @Column(name = "waveform_v")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Double[] waveformV;

    /**
     * Raw current waveform samples from ESP32 (2 cycles, ~120 samples at 50Hz).
     * <p>
     * Contains actual sampled current values BEFORE FFT processing.
     * Used for accurate waveform visualization showing real distortions, clipping, asymmetry.
     * <p>
     * Optional field - if not provided, frontend will reconstruct waveform from harmonics.
     */
    @Column(name = "waveform_i")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Double[] waveformI;

    /**
     * PN-EN 50160 Group 1 indicator: Voltage deviation from declared value.
     * <p>
     * Formula: (U_measured - U_nominal) / U_nominal * 100%
     * where U_nominal = 230V for single-phase EU grid.
     * <p>
     * PN-EN 50160 limit: ±10% for 95% of week.
     * Acceptable range: 207-253 V for 230V nominal.
     * <p>
     * Calculated by backend from voltageRms.
     */
    @Column(name = "voltage_deviation_percent")
    private Double voltageDeviationPercent;

    /**
     * PN-EN 50160 Group 2 indicator: Frequency deviation from nominal.
     * <p>
     * Formula: f_measured - f_nominal
     * where f_nominal = 50 Hz for EU grid.
     * <p>
     * PN-EN 50160 limit: ±1% (49.5-50.5 Hz) for 99.5% of year.
     * <p>
     * Calculated by backend from frequency.
     */
    @Column(name = "frequency_deviation_hz")
    private Double frequencyDeviationHz;

    /**
     * Record creation timestamp.
     */
    @Column(updatable = false)
    @CreationTimestamp
    private Instant createdAt;

    /**
     * Indicates if the measurement passed validation checks.
     */
    @Column(name = "is_valid")
    private Boolean isValid;
}