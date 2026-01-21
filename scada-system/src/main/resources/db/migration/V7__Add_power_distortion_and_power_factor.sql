-- Add power_distortion column (D = sqrt(S² - P² - Q₁²))
-- Represents power component from harmonics according to Budeanu theory
ALTER TABLE measurements
    ADD COLUMN power_distortion DOUBLE PRECISION NULL;

-- Rename cos_phi to power_factor (λ = P/S)
-- This is more accurate terminology as cos(φ) is only valid for sinusoidal waveforms
-- while λ = P/S is valid for all waveforms including distorted ones
ALTER TABLE measurements
    RENAME COLUMN cos_phi TO power_factor;

-- Update comments for power_reactive column
COMMENT ON COLUMN measurements.power_reactive IS 'Reactive power of fundamental Q₁ (var). Formula: Q₁ = U₁ * I₁ * sin(φ₁) where φ₁ is phase shift of H1 only. For distorted waveforms this is NOT total reactive power - see also power_distortion.';

COMMENT ON COLUMN measurements.power_distortion IS 'Distortion power D (var). Formula: D = sqrt(S² - P² - Q₁²). Represents power from harmonics (Budeanu theory). Zero for sinusoidal waveforms.';

COMMENT ON COLUMN measurements.power_factor IS 'Power factor λ = P/S. Valid for all waveforms. NOT cos(φ) which is only valid for sinusoidal waveforms. For distorted waveforms: λ < cos(φ₁).';
