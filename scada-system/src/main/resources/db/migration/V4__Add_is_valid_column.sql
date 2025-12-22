-- Migration V4: Add is_valid column for measurement validation
--
-- This migration adds the is_valid column to track whether measurements
-- passed validation checks (range validation, THD limits, frequency limits, etc.)

ALTER TABLE measurements ADD COLUMN is_valid BOOLEAN;

COMMENT ON COLUMN measurements.is_valid IS
'Indicates if the measurement passed validation checks.
Validation includes:
- Voltage range: 0-400V (allows overvoltage detection)
- Current range: 0-100A
- Frequency range: 45-55 Hz (±10% of 50 Hz nominal)
- Power factor: -1 to 1
- THD: 0-100%
NULL value indicates validation was not performed.
TRUE = passed all validation checks
FALSE = failed at least one validation check';
