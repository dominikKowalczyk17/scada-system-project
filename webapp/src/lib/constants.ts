/**
 * Power quality limits based on PN-EN 50160 and IEC 61000 standards.
 * Must match backend Constants.java for consistency.
 */
export const POWER_QUALITY_LIMITS = Object.freeze({
  // Voltage limits (PN-EN 50160: 230V ±10%)
  NOMINAL_VOLTAGE: 230.0,
  VOLTAGE_MIN: 207.0,  // 230V - 10%
  VOLTAGE_MAX: 253.0,  // 230V + 10%

  // Frequency limits (PN-EN 50160: 50Hz ±1%)
  NOMINAL_FREQUENCY: 50.0,
  FREQUENCY_MIN: 49.5,  // 50Hz - 1%
  FREQUENCY_MAX: 50.5,  // 50Hz + 1%

  // Current limits (typical household 16A circuit)
  CURRENT_WARNING: 13.0,   // 80% of 16A rated
  CURRENT_CRITICAL: 16.0,  // Circuit breaker rating

  // THD limits (IEC 61000-4-7 and IEC 61000-3-2)
  VOLTAGE_THD_LIMIT: 8.0,  // PN-EN 50160 max THD for voltage
  CURRENT_THD_LIMIT: 5.0,  // IEC 61000-3-2 emission limit

  // Power factor (typical contractual requirement)
  MIN_POWER_FACTOR: 0.85,  // Minimum acceptable cos φ
});