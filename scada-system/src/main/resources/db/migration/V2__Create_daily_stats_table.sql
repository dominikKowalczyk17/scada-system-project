-- V2: Create daily_stats table for pre-aggregated statistics
-- This table stores daily aggregations of measurements for fast dashboard queries
--
-- Why pre-aggregation?
-- Problem: Calculating daily stats from raw data requires scanning 86,400 rows (1/second for 24h)
-- Solution: Calculate once per day, store result, query 1 row instead of 86,400
-- Trade-off: Extra storage (~365 rows/year) for 1000x faster queries
--
-- Business justification:
-- - Dashboard loads in milliseconds instead of seconds
-- - Reduces database CPU load by 99% for historical analysis
-- - Enables year-over-year comparisons without performance degradation

CREATE TABLE daily_stats (
    -- Primary key
    id BIGSERIAL PRIMARY KEY,

    -- Date for which these statistics apply
    -- UNIQUE constraint ensures only one stats row per day
    date DATE NOT NULL UNIQUE,

    -- Voltage statistics (from IEC 61000-4-30 measurements)
    -- These detect power quality issues:
    -- - Low avg_voltage: Brownout condition or overloaded transformer
    -- - High min-max spread: Unstable power supply
    -- - High std_dev: Voltage fluctuations (flicker source)
    avg_voltage DOUBLE PRECISION,       -- Mean voltage over 24 hours
    min_voltage DOUBLE PRECISION,       -- Lowest voltage (detect sags)
    max_voltage DOUBLE PRECISION,       -- Highest voltage (detect swells)
    std_dev_voltage DOUBLE PRECISION,   -- Standard deviation (stability metric)

    -- Power statistics
    avg_power_active DOUBLE PRECISION,      -- Average real power consumption (W)
    peak_power DOUBLE PRECISION,            -- Maximum instantaneous power (W)
    min_power DOUBLE PRECISION,             -- Minimum power (baseline load)

    -- Energy consumption (billing metric)
    -- Calculated by integrating power over time: E = ∫ P dt
    -- Units: kilowatt-hours (kWh) - standard billing unit
    total_energy_kwh DOUBLE PRECISION,

    -- Power factor statistics
    -- Low power factor → wasted energy → utility penalties
    avg_power_factor DOUBLE PRECISION,      -- Average cos φ
    min_power_factor DOUBLE PRECISION,      -- Worst power factor

    -- Frequency statistics (grid stability indicator)
    -- Normal: 50Hz ± 0.2Hz (IEC 61000-4-30)
    -- Deviations indicate grid instability or generator issues
    avg_frequency DOUBLE PRECISION,
    min_frequency DOUBLE PRECISION,
    max_frequency DOUBLE PRECISION,

    -- Power quality event counters (IEC 61000 compliance)
    -- These events indicate potential equipment damage or malfunction

    -- Voltage sag: RMS voltage drops below 90% of nominal for 10ms to 1 minute
    -- Causes: Motor starts, short circuits, transformer switching
    -- Effects: Equipment malfunction, computer resets, light dimming
    voltage_sag_count INTEGER DEFAULT 0,

    -- Voltage swell: RMS voltage exceeds 110% of nominal for 10ms to 1 minute
    -- Causes: Load disconnection, capacitor switching, single-phase faults
    -- Effects: Equipment damage, insulation stress, bulb failure
    voltage_swell_count INTEGER DEFAULT 0,

    -- Voltage interruption: RMS voltage below 10% of nominal for > 10ms
    -- Causes: Circuit breaker trips, fuse blows, equipment faults
    -- Effects: Production stops, data loss, equipment damage
    interruption_count INTEGER DEFAULT 0,

    -- THD violations: Total Harmonic Distortion exceeds limits
    -- IEC 61000-3-2: Voltage THD < 8%, Current THD < 5%
    -- Causes: Non-linear loads (computers, LEDs, VFDs)
    -- Effects: Transformer heating, neutral overload, meter errors
    thd_violations_count INTEGER DEFAULT 0,

    -- Frequency deviation count: Frequency outside 49-51 Hz range
    -- Indicates generator or grid synchronization issues
    frequency_deviation_count INTEGER DEFAULT 0,

    -- Power factor penalty events: cos φ < 0.85
    -- Many utilities charge penalties for poor power factor
    power_factor_penalty_count INTEGER DEFAULT 0,

    -- Metadata for data quality tracking
    measurement_count INTEGER,              -- How many raw measurements were aggregated
    data_completeness DOUBLE PRECISION,     -- Percentage of expected measurements received
                                           -- 100% = all 86,400 measurements present
                                           -- < 95% = potential sensor or network issues

    -- Timestamp when aggregation was calculated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Timestamp when this row was last updated (for re-calculations)
    updated_at TIMESTAMP
);

-- Index for fast date-range queries
-- Example: "Show me stats for last 30 days"
CREATE INDEX idx_daily_stats_date ON daily_stats (date DESC);

-- Add table comment for documentation
COMMENT ON TABLE daily_stats IS 'Pre-aggregated daily statistics for fast dashboard queries. Calculated once per day from measurements table to provide O(1) query performance for historical analysis.';

-- Add comments to key columns
COMMENT ON COLUMN daily_stats.total_energy_kwh IS 'Total energy consumption for the day in kilowatt-hours, calculated by integrating power_active over time using trapezoidal rule';
COMMENT ON COLUMN daily_stats.voltage_sag_count IS 'Count of voltage sag events per IEC 61000-4-30 (voltage < 90% for > 10ms)';
COMMENT ON COLUMN daily_stats.data_completeness IS 'Percentage of expected measurements received (100% = 86400 measurements at 1/second). Values < 95% indicate sensor or network issues.';
