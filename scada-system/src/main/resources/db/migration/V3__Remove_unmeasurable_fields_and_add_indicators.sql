-- Migration V3: Remove unmeasurable fields and add PN-EN 50160 power quality indicators
--
-- This migration:
-- 1. Removes pst_flicker field - cannot be measured with ESP32 hardware
--    (requires IEC 61000-4-15 compliant flicker meter with 20 kHz sampling)
-- 2. Removes capacitor_uf field - not implemented
--    (was originally planned for automatic power factor compensation measurement)
-- 3. Adds voltage_deviation_percent - PN-EN 50160 Group 1 indicator
-- 4. Adds frequency_deviation_hz - PN-EN 50160 Group 2 indicator
-- 5. Updates table and column comments to reflect actual measurement capabilities

-- Remove fields that cannot be measured with current ESP32 hardware
ALTER TABLE measurements DROP COLUMN IF EXISTS pst_flicker;
ALTER TABLE measurements DROP COLUMN IF EXISTS capacitor_uf;

-- Add PN-EN 50160 power quality indicators
ALTER TABLE measurements ADD COLUMN voltage_deviation_percent DOUBLE PRECISION;
ALTER TABLE measurements ADD COLUMN frequency_deviation_hz DOUBLE PRECISION;

-- Update table comment to reflect actual capabilities
COMMENT ON TABLE measurements IS
'Electrical measurements with PN-EN 50160 power quality indicators.
Harmonics limited to H1-H8 (50-400 Hz) due to 800-1000 Hz sampling rate and Nyquist constraint.
System capable of measuring:
- Group 1: Supply voltage magnitude (voltage deviation)
- Group 2: Supply frequency (frequency deviation)
- Group 4: Voltage waveform distortions (THD and harmonics 2-8, partial)
- Group 5: Supply interruptions (detectable as events, separate implementation)
System NOT capable of measuring:
- Group 3: Voltage fluctuations & flicker (requires IEC 61000-4-15 filter and 20 kHz sampling)';

-- Add column comments for power quality indicators
COMMENT ON COLUMN measurements.voltage_deviation_percent IS
'PN-EN 50160 Group 1 indicator: Voltage deviation from declared value.
Formula: (U_measured - U_nominal) / U_nominal * 100%
where U_nominal = 230V for single-phase EU grid.
Limit: ±10% for 95% of week per PN-EN 50160.
Calculated by backend from voltage_rms.';

COMMENT ON COLUMN measurements.frequency_deviation_hz IS
'PN-EN 50160 Group 2 indicator: Frequency deviation from nominal.
Formula: f_measured - f_nominal
where f_nominal = 50 Hz for EU grid.
Limit: ±1% (49.5-50.5 Hz) for 99.5% of year per PN-EN 50160.
Calculated by backend from frequency.';

COMMENT ON COLUMN measurements.thd_voltage IS
'PN-EN 50160 Group 4 indicator: Total Harmonic Distortion of voltage.
Formula: THD = sqrt(sum(U_h^2 for h=2..8)) / U_1 * 100%
Note: Partial calculation - IEC 61000-4-7 requires harmonics 2-40 for full compliance.
Our system measures only harmonics 2-8 due to Nyquist limitation at 800-1000 Hz sampling.
This represents a lower bound of actual THD (real THD may be higher).
Limit: THD < 8% per PN-EN 50160 (for full spectrum 2-40).
Calculated by ESP32 from FFT/DFT.';

COMMENT ON COLUMN measurements.harmonics_v IS
'PN-EN 50160 Group 4 indicator: Voltage harmonics array.
Array structure: [H1, H2, H3, H4, H5, H6, H7, H8]
Index 0 = H1 (50 Hz fundamental)
Index 1 = H2 (100 Hz)
Index 2 = H3 (150 Hz)
...
Index 7 = H8 (400 Hz)
Note: Limited to 8 harmonics due to Nyquist constraint at 800-1000 Hz sampling.
IEC 61000-4-7 requires harmonics up to H40 (2000 Hz) for full compliance.
Calculated by ESP32 from FFT/DFT.';

COMMENT ON COLUMN measurements.thd_current IS
'Total Harmonic Distortion of current (diagnostic parameter, not PN-EN 50160 indicator).
Formula: THD = sqrt(sum(I_h^2 for h=2..8)) / I_1 * 100%
Note: Partial calculation, harmonics 2-8 only.
Related to IEC 61000-3-2 (emission limits for equipment).
Used for diagnostics of non-linear loads.
Calculated by ESP32 from FFT/DFT.';

COMMENT ON COLUMN measurements.harmonics_i IS
'Current harmonics array (diagnostic parameter, not PN-EN 50160 indicator).
Array structure: [H1, H2, H3, H4, H5, H6, H7, H8]
Related to IEC 61000-3-2 (emission limits).
Used for diagnostics of non-linear loads (switch-mode power supplies, inverters, LED drivers).
Calculated by ESP32 from FFT/DFT.';

COMMENT ON COLUMN measurements.voltage_rms IS
'RMS voltage measured in 10-20 cycle window (200-400 ms at 50 Hz).
Used to calculate voltage_deviation_percent indicator.
Accuracy: ±1-3% after ADC calibration.';

COMMENT ON COLUMN measurements.frequency IS
'Frequency measured via zero-crossing detection.
Averaged over 10-20 cycles for noise reduction.
Used to calculate frequency_deviation_hz indicator.
Accuracy: ±0.01-0.02 Hz.';

COMMENT ON COLUMN measurements.cos_phi IS
'Power factor (not a PN-EN 50160 indicator).
Formula: cos φ = P / S
Calculated from phase shift between voltage and current fundamental components.
Used for load diagnostics and energy billing.';

COMMENT ON COLUMN measurements.power_active IS
'Active power in watts (not a PN-EN 50160 indicator).
Formula: P = U_rms × I_rms × cos φ
Used for energy billing and load analysis.';

COMMENT ON COLUMN measurements.power_reactive IS
'Reactive power in var (not a PN-EN 50160 indicator).
Formula: Q = U_rms × I_rms × sin φ
Used for power factor compensation and load diagnostics.';

COMMENT ON COLUMN measurements.power_apparent IS
'Apparent power in VA (not a PN-EN 50160 indicator).
Formula: S = U_rms × I_rms
Used for load analysis.';
