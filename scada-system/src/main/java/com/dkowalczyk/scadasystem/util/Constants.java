package com.dkowalczyk.scadasystem.util;

/**
 * Hardware and timing constants for the SCADA measurement system.
 *
 * <p>Contains only fixed, hardware-derived, or IEC-standard timing values that are
 * not deployment-configurable. Operational thresholds (voltage, frequency, THD, etc.)
 * are externalized in {@link com.dkowalczyk.scadasystem.config.MonitoringProperties}.
 *
 * <p>Standards referenced:
 * - IEC 61000-4-7: Harmonic measurement requirements
 * - IEC 61000-4-30: Power quality measurement methods
 * - PN-EN 50160: Voltage characteristics (event duration definitions)
 */
public final class Constants {

    // === PN-EN 50160 Group 5: Event Duration Timings ===
    /**
     * Minimum duration for voltage sag/swell classification (10 ms).
     * Events shorter than this may not be reliably detected at current sampling rate.
     */
    public static final long SAG_MIN_DURATION_MS = 10;

    /**
     * Maximum duration for voltage sag classification (1 minute = 60000 ms).
     * Beyond this duration, event is classified differently per PN-EN 50160.
     */
    public static final long SAG_MAX_DURATION_MS = 60000;

    /**
     * Minimum duration for voltage interruption classification (10 ms = 0.01 s).
     * Per IEC 61000-4-30.
     */
    public static final double VOLTAGE_INTERRUPTION_MIN_DURATION_SECONDS = 0.01;

    /**
     * Short interruption duration threshold: 3 minutes = 180 seconds.
     * Short interruption: voltage &lt; 10% for 10 ms to 3 min.
     * Long interruption: voltage &lt; 10% for &gt; 3 min.
     */
    public static final long SHORT_INTERRUPTION_MAX_DURATION_SECONDS = 180;

    // === Measurement System Hardware Specifications ===
    /**
     * Number of harmonics measurable by the system (H1–H25).
     * Limited by Nyquist constraint at the ESP32 sampling rate.
     */
    public static final int HARMONICS_COUNT = 25;

    /**
     * Sampling rate of ESP32 ADC in Hz (conservative value with WiFi enabled).
     */
    public static final int SAMPLING_RATE_HZ = 3000;

    /**
     * Nyquist frequency: maximum measurable frequency in Hz (sampling_rate / 2).
     */
    public static final int NYQUIST_FREQUENCY_HZ = SAMPLING_RATE_HZ / 2;

    /**
     * Maximum measurable harmonic order at current sampling rate.
     * Computed as: Nyquist / nominal_frequency = 1500 / 50 = 30.
     * Note: nominal frequency (50 Hz) is inlined here as a hardware design constant.
     */
    public static final int MAX_HARMONIC_ORDER = NYQUIST_FREQUENCY_HZ / 50;

    /**
     * Frequency measurement tolerance for IEC 61000-4-30 Class A measurements in Hz.
     * Our zero-crossing method achieves approximately ±0.01–0.02 Hz (Class S level).
     */
    public static final double FREQUENCY_TOLERANCE_CLASS_A = 0.01;

    private Constants() {
        throw new AssertionError("Utility class cannot be instantiated");
    }
}

