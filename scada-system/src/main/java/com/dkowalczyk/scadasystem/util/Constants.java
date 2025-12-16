package com.dkowalczyk.scadasystem.util;

/**
 * Centralized utility class defining electrical measurement constants
 * based on PN-EN 50160 and IEC standards.
 *
 * Includes:
 *  - PN-EN 50160 power quality indicators
 *  - Voltage standards (PN-EN 50160, IEC 61000-2-2)
 *  - Harmonic limits (IEC 61000-4-7, IEC 61000-3-2)
 *  - Frequency standards (PN-EN 50160, IEC 61000-4-30)
 *  - Power factor thresholds
 *
 * Note: Some limits reference full harmonic spectrum (2-40) per IEC standards,
 * but our system measures only harmonics 2-8 due to hardware sampling constraints.
 */
public final class Constants {

    private Constants() {
        throw new AssertionError("Utility class cannot be instantiated");
    }

    // === PN-EN 50160 Group 1: Supply Voltage Magnitude ===

    /**
     * Nominal voltage for single-phase EU grid (PN-EN 50160).
     * Used as reference for voltage deviation calculation.
     */
    public static final double NOMINAL_VOLTAGE = 230.0;

    /**
     * Voltage tolerance (±10%) per PN-EN 50160.
     * Acceptable range: 207-253 V for 95% of week.
     */
    public static final double VOLTAGE_TOLERANCE = 0.10;

    /**
     * Voltage deviation upper limit (+10%) per PN-EN 50160.
     */
    public static final double VOLTAGE_DEVIATION_UPPER_LIMIT_PERCENT = 10.0;

    /**
     * Voltage deviation lower limit (-10%) per PN-EN 50160.
     */
    public static final double VOLTAGE_DEVIATION_LOWER_LIMIT_PERCENT = -10.0;

    // === PN-EN 50160 Group 2: Supply Frequency ===

    /**
     * Nominal frequency for EU grid (PN-EN 50160).
     * Used as reference for frequency deviation calculation.
     */
    public static final double NOMINAL_FREQUENCY = 50.0;

    /**
     * Frequency deviation upper limit (+0.5 Hz, +1%) per PN-EN 50160.
     * Acceptable range: 49.5-50.5 Hz for 99.5% of year.
     */
    public static final double FREQUENCY_DEVIATION_UPPER_LIMIT_HZ = 0.5;

    /**
     * Frequency deviation lower limit (-0.5 Hz, -1%) per PN-EN 50160.
     */
    public static final double FREQUENCY_DEVIATION_LOWER_LIMIT_HZ = -0.5;

    /**
     * Minimum frequency per PN-EN 50160 (50 Hz - 1%).
     */
    public static final double FREQUENCY_MIN = 49.5;

    /**
     * Maximum frequency per PN-EN 50160 (50 Hz + 1%).
     */
    public static final double FREQUENCY_MAX = 50.5;

    /**
     * Frequency tolerance for IEC 61000-4-30 Class A measurements.
     * Note: Our system achieves approximately ±0.01-0.02 Hz (Class S level).
     */
    public static final double FREQUENCY_TOLERANCE_CLASS_A = 0.01;

    // === PN-EN 50160 Group 4: Voltage Waveform Distortions ===

    /**
     * THD voltage limit per PN-EN 50160 and IEC 61000-4-7.
     * Applies to full harmonic spectrum (harmonics 2-40).
     *
     * IMPORTANT: Our system measures only harmonics 2-8 due to Nyquist limitation
     * at 800-1000 Hz sampling rate. Calculated THD represents a LOWER BOUND of
     * actual distortion (real THD may be higher due to unmeasured harmonics 9-40).
     */
    public static final double VOLTAGE_THD_LIMIT = 8.0;

    /**
     * THD current limit per IEC 61000-3-2 (emission limits for equipment).
     *
     * Note: This is a diagnostic parameter, not a PN-EN 50160 indicator.
     * PN-EN 50160 focuses on voltage quality, not current.
     * Our system measures only harmonics 2-8 (partial THD).
     */
    public static final double CURRENT_THD_LIMIT = 5.0;

    // === PN-EN 50160 Group 5: Supply Interruptions (Event Detection) ===

    /**
     * Voltage dip (sag) threshold: 90% of nominal voltage per PN-EN 50160.
     * Dip defined as: voltage drops to 10-90% of nominal for 10ms to 1 min.
     */
    public static final double VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;

    /**
     * Temporary overvoltage (swell) threshold: 110% of nominal per PN-EN 50160.
     * Swell defined as: voltage rises above 110% of nominal.
     */
    public static final double VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10;

    /**
     * Interruption threshold: 10% of nominal voltage per PN-EN 50160.
     * Interruption defined as: voltage drops below 10% of nominal.
     */
    public static final double VOLTAGE_INTERRUPTION_THRESHOLD = NOMINAL_VOLTAGE * 0.10;

    /**
     * Minimum duration for voltage dip/swell classification (10 ms).
     * Events shorter than this may not be reliably detected.
     */
    public static final long SAG_MIN_DURATION_MS = 10;

    /**
     * Maximum duration for voltage dip classification (1 minute = 60000 ms).
     * Beyond this duration, event is classified differently.
     */
    public static final long SAG_MAX_DURATION_MS = 60000;

    /**
     * Minimum duration for voltage interruption classification (10 ms = 0.01 s).
     * Per IEC 61000-4-30.
     */
    public static final double VOLTAGE_INTERRUPTION_MIN_DURATION_SECONDS = 0.01;

    /**
     * Short interruption duration threshold: 3 minutes = 180 seconds.
     * Short interruption: voltage < 10% for 10 ms to 3 min.
     * Long interruption: voltage < 10% for > 3 min.
     */
    public static final long SHORT_INTERRUPTION_MAX_DURATION_SECONDS = 180;

    // === Power Factor (Not a PN-EN 50160 indicator) ===

    /**
     * Minimum acceptable power factor for industrial/commercial installations.
     * Not defined by PN-EN 50160 (focuses on voltage quality, not load characteristics).
     * Typical contractual requirement with energy suppliers.
     */
    public static final double MIN_POWER_FACTOR = 0.85;

    // === Measurement System Specifications ===

    /**
     * Number of harmonics measured by the system.
     * Limited by Nyquist constraint at 800-1000 Hz sampling rate.
     * Includes fundamental (H1) + harmonics 2-8.
     */
    public static final int HARMONICS_COUNT = 8;

    /**
     * Sampling rate of ESP32 ADC (Hz).
     * Conservative value with WiFi enabled.
     */
    public static final int SAMPLING_RATE_HZ = 800;

    /**
     * Nyquist frequency: maximum measurable frequency (Hz).
     * Nyquist = sampling_rate / 2.
     */
    public static final int NYQUIST_FREQUENCY_HZ = SAMPLING_RATE_HZ / 2;

    /**
     * Maximum measurable harmonic order at current sampling rate.
     * 400 Hz / 50 Hz = 8th harmonic.
     */
    public static final int MAX_HARMONIC_ORDER = NYQUIST_FREQUENCY_HZ / (int) NOMINAL_FREQUENCY;

}
