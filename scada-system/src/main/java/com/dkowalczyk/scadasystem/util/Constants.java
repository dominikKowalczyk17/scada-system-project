package com.dkowalczyk.scadasystem.util;

/**
 * Centralized utility class defining electrical measurement constants
 * based on IEC standards.
 *
 * Includes:
 *  - Voltage standards (IEC 61000-2-2)
 *  - Harmonic limits (IEC 61000-3-2)
 *  - Frequency standards (IEC 61000-4-30)
 *  - Power factor thresholds
 */
public final class Constants {

    private Constants() {
        throw new AssertionError("Utility class cannot be instantiated");
    }

    // === Voltage Standards (IEC 61000-2-2) ===

    public static final double NOMINAL_VOLTAGE = 230.00;
    public static final double VOLTAGE_TOLERANCE = 0.10;
    public static final double VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;
    public static final double VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10;
    public static final double VOLTAGE_INTERRUPTION_THRESHOLD = NOMINAL_VOLTAGE * 0.10;

    public static final long   SAG_MIN_DURATION_MS = 10;
    public static final long   SAG_MAX_DURATION_MS = 60000;

    /**
     * Minimum duration for voltage interruption classification (IEC 61000-4-30).
     * Interruption = voltage < 10% of nominal for duration > 10 ms (0.01 s).
     */
    public static final double VOLTAGE_INTERRUPTION_MIN_DURATION_SECONDS = 0.01;

    // === Harmonic Limits (IEC 61000-3-2) ===

    public static final double VOLTAGE_THD_LIMIT = 8.0;
    public static final double CURRENT_THD_LIMIT = 5.0;

    // === Frequency Standards (IEC 61000-4-30) ===

    public static final double NOMINAL_FREQUENCY = 50.0;
    public static final double FREQUENCY_TOLERANCE_CLASS_A = 0.01;
    public static final double FREQUENCY_MIN = 49.5;
    public static final double FREQUENCY_MAX = 50.5;

    // === Power Factor Threshold ===

    public static final double MIN_POWER_FACTOR = 0.85;

}
