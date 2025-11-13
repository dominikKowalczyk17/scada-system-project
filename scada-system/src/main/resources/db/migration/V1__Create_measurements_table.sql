-- V1: Create measurements table for storing electrical parameter data from ESP32 sensors
-- This table stores time-series data of power quality measurements according to IEC 61000 standards
--
-- Why this schema?
-- 1. Time-series optimization: INDEX on time column for fast range queries
-- 2. All electrical parameters defined by IEC 61000-4-30 measurement standards
-- 3. Array types for harmonics (2nd to 40th order) - PostgreSQL specific feature
-- 4. Nullable fields for parameters that may not be available from all sensors

CREATE TABLE measurements (
    -- Primary key: Auto-incrementing ID
    id BIGSERIAL PRIMARY KEY,

    -- Timestamp: When the measurement was taken (NOT when it was received)
    -- Critical for time-series analysis and event correlation
    time TIMESTAMP NOT NULL,

    -- Sensor identification: Which ESP32 device sent this data
    -- Useful for multi-sensor deployments and fault isolation
    sensor_id VARCHAR(50),

    -- Basic RMS measurements (IEC 61000-4-30 Section 5.1)
    -- RMS = Root Mean Square, the "effective" value of AC signals
    voltage_rms DOUBLE PRECISION NOT NULL,  -- Volts (V)
    current_rms DOUBLE PRECISION NOT NULL,  -- Amperes (A)
    frequency DOUBLE PRECISION NOT NULL,    -- Hertz (Hz) - should be 50Hz ± 1Hz

    -- Power measurements (IEC 61000-4-30 Section 5.2)
    -- Active power = real power doing useful work
    -- Reactive power = power oscillating in reactive components (inductors/capacitors)
    -- Apparent power = total power including reactive components
    power_active DOUBLE PRECISION,      -- Watts (W)
    power_reactive DOUBLE PRECISION,    -- Volt-Amperes Reactive (VAR)
    power_apparent DOUBLE PRECISION,    -- Volt-Amperes (VA)

    -- Power factor (IEC 61000-4-30 Section 5.3)
    -- cos φ (cosine phi) = ratio of active to apparent power
    -- Good: > 0.95, Poor: < 0.85 (utilities may charge penalties)
    cos_phi DOUBLE PRECISION,

    -- Total Harmonic Distortion (IEC 61000-3-2, IEC 61000-4-7)
    -- THD = measure of waveform distortion from pure sinusoid
    -- Limits: Voltage THD < 8%, Current THD < 5% (for individual loads)
    thd_voltage DOUBLE PRECISION,       -- Percent (%)
    thd_current DOUBLE PRECISION,       -- Percent (%)

    -- Harmonic spectrum (IEC 61000-4-7)
    -- Arrays store 2nd to 40th harmonics
    -- harmonics_v[0] = 2nd harmonic (100Hz), harmonics_v[1] = 3rd (150Hz), etc.
    -- PostgreSQL ARRAY type - not supported by all databases (migration consideration)
    harmonics_v DOUBLE PRECISION[],     -- Voltage harmonics in Volts
    harmonics_i DOUBLE PRECISION[],     -- Current harmonics in Amperes

    -- Metadata: When this row was inserted into database (NOT measurement time)
    -- Useful for debugging data pipeline delays
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast time-range queries
-- DESC order because most queries want recent data first
-- B-tree index provides O(log n) search instead of O(n) full table scan
--
-- Example query optimized by this index:
-- SELECT * FROM measurements WHERE time BETWEEN '2025-11-07' AND '2025-11-08' ORDER BY time DESC;
-- Without index: Scans all 86,400 rows (1 day at 1 sample/second)
-- With index: Binary search finds start/end positions, reads only relevant rows
CREATE INDEX idx_measurements_time ON measurements (time DESC);

-- Optional: Composite index for sensor-specific time queries
-- Useful for multi-sensor deployments when querying specific sensor history
CREATE INDEX idx_measurements_sensor_time ON measurements (sensor_id, time DESC);

-- Add comment to table for database documentation
COMMENT ON TABLE measurements IS 'Time-series storage of electrical power quality measurements from ESP32 sensors with custom elektroda.pl circuit (SCT013 current sensor + TV16 voltage transformer). Follows IEC 61000 standards for power quality monitoring.';

-- Add comments to critical columns
COMMENT ON COLUMN measurements.time IS 'Measurement timestamp from sensor (NOT database insertion time)';
COMMENT ON COLUMN measurements.thd_voltage IS 'Total Harmonic Distortion of voltage waveform (IEC 61000-3-2 limit: 8%)';
COMMENT ON COLUMN measurements.thd_current IS 'Total Harmonic Distortion of current waveform (IEC 61000-3-2 limit: 5% for individual loads)';
