-- Migration V5: Refactor power parameters for distorted waveforms
-- Author: Bachelor Thesis - SCADA System Project
-- Date: 2026-01-10
--
-- Purpose: Replace cos_phi and power_reactive with correct parameters for non-sinusoidal waveforms
--
-- Background:
-- Professor Gmyrek identified that using cos(phi) and total reactive power Q
-- is only valid for sinusoidal waveforms. For distorted waveforms (with harmonics),
-- we must separate:
-- - Q1 (reactive power of fundamental frequency) - calculated from phase shift
-- - D (distortion power) - power from harmonics
-- - λ (power factor) - general P/S ratio, valid for all waveforms
--
-- Theory:
-- S² = P² + Q1² + D²
-- where:
-- - S = apparent power (V_rms × I_rms)
-- - P = active power (average of U×I)
-- - Q1 = V_rms × I_rms × sin(φ) for fundamental frequency
-- - D = sqrt(S² - P² - Q1²) distortion power from harmonics
-- - λ = P/S (general power factor, NOT cos φ for distorted waveforms)

-- Drop old columns (cos_phi, power_reactive)
ALTER TABLE measurements DROP COLUMN IF EXISTS cos_phi;
ALTER TABLE measurements DROP COLUMN IF EXISTS power_reactive;

-- Add new columns for correct power analysis
ALTER TABLE measurements ADD COLUMN power_reactive_fund DOUBLE PRECISION;
ALTER TABLE measurements ADD COLUMN power_distortion DOUBLE PRECISION;
ALTER TABLE measurements ADD COLUMN power_factor DOUBLE PRECISION;
ALTER TABLE measurements ADD COLUMN phase_shift DOUBLE PRECISION;

-- Add comments for documentation
COMMENT ON COLUMN measurements.power_reactive_fund IS 'Reactive power Q1 of fundamental frequency (50 Hz) in var. Calculated from FFT phase shift: Q1 = V_rms × I_rms × sin(φ). Valid ONLY for fundamental harmonic.';
COMMENT ON COLUMN measurements.power_distortion IS 'Distortion power D in var from non-sinusoidal components. Formula: D = sqrt(S² - P² - Q1²). Non-zero indicates non-linear loads.';
COMMENT ON COLUMN measurements.power_factor IS 'General power factor λ = P/S. Valid for both sinusoidal and distorted waveforms. NOT cos(φ) for distorted waveforms.';
COMMENT ON COLUMN measurements.phase_shift IS 'Phase shift φ between fundamental voltage and current in degrees. Calculated from FFT: φ = phase_I - phase_U. Note: ~0.3° error from sequential ADC reading.';
