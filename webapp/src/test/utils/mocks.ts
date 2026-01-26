/**
 * Mock factories and utilities for testing
 *
 * Provides factory functions to create test data objects:
 * - MeasurementDTO
 * - WaveformDTO
 * - RealtimeDashboardDTO
 * - StatsDTO
 * - PowerQualityIndicatorsDTO
 */

import type {
  MeasurementDTO,
  WaveformDTO,
  RealtimeDashboardDTO,
  StatsDTO,
  PowerQualityIndicatorsDTO,
} from '@/types/api';

/**
 * Create a mock MeasurementDTO with optional overrides
 */
export function createMockMeasurement(
  overrides?: Partial<MeasurementDTO>
): MeasurementDTO {
  return {
    voltage_rms: 230.0,
    current_rms: 5.5,
    power_active: 1200.0,
    power_reactive: 300.0,
    power_apparent: 1237.0,
    power_factor: 0.97,
    frequency: 50.0,
    thd_voltage: 2.5,
    thd_current: 5.0,
    harmonics_v: [230.0, 5.75, 2.3, 1.15, 0.92, 0.69, 0.46, 0.23],
    harmonics_i: [5.5, 0.275, 0.165, 0.11, 0.055, 0.044, 0.033, 0.022],
    time: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock WaveformDTO with optional overrides
 */
export function createMockWaveform(
  overrides?: Partial<WaveformDTO>
): WaveformDTO {
  // Generate 200 samples of sinusoidal waveform
  const samples = 200;
  const voltage: number[] = [];
  const current: number[] = [];

  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * 2 * Math.PI;
    voltage.push(325 * Math.sin(angle)); // Peak voltage ~325V
    current.push(7.8 * Math.sin(angle)); // Peak current ~7.8A
  }

  return {
    voltage,
    current,
    ...overrides,
  };
}

/**
 * Create a mock RealtimeDashboardDTO with optional overrides
 */
export function createMockRealtimeDashboard(
  overrides?: Partial<RealtimeDashboardDTO>
): RealtimeDashboardDTO {
  return {
    latest_measurement: createMockMeasurement(),
    waveforms: createMockWaveform(),
    ...overrides,
  };
}

/**
 * Create a mock StatsDTO with optional overrides
 */
export function createMockStats(overrides?: Partial<StatsDTO>): StatsDTO {
  return {
    date: new Date().toISOString().split('T')[0],
    // Voltage
    avg_voltage: 230.5,
    min_voltage: 225.0,
    max_voltage: 235.0,
    std_dev_voltage: 2.5,

    // Power
    avg_power_active: 1250.0,
    peak_power: 1800.0,
    min_power: 800.0,
    total_energy_kwh: 27.6,

    // Power Factor
    avg_power_factor: 0.95,
    min_power_factor: 0.88,

    // Frequency
    avg_frequency: 50.0,
    min_frequency: 49.8,
    max_frequency: 50.2,

    // Events
    voltage_sag_count: 2,
    voltage_swell_count: 0,
    interruption_count: 1,
    thd_violations_count: 0,
    frequency_dev_count: 3,
    power_factor_penalty_count: 0,
    
    // Meta
    measurement_count: 100,
    data_completeness: 98.5,
    ...overrides,
  };
}

/**
 * Create a mock PowerQualityIndicatorsDTO with optional overrides
 */
export function createMockPowerQualityIndicators(
  overrides?: Partial<PowerQualityIndicatorsDTO>
): PowerQualityIndicatorsDTO {
  return {
    timestamp: new Date().toISOString(),
    voltage_rms: 230.0,
    voltage_deviation_percent: 0.0,
    voltage_within_limits: true,
    frequency: 50.0,
    frequency_deviation_hz: 0.0,
    frequency_within_limits: true,
    thd_voltage: 2.1,
    thd_within_limits: true,
    harmonics_voltage: [230.0, 1.2, 0.5],
    overall_compliant: true,
    status_message: 'System operating within PN-EN 50160 limits',
    ...overrides,
  };
}

/**
 * Create multiple mock measurements with sequential timestamps
 */
export function createMockMeasurementSequence(
  count: number,
  interval_seconds = 3
): MeasurementDTO[] {
  const measurements: MeasurementDTO[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i - 1) * interval_seconds * 1000);
    measurements.push(
      createMockMeasurement({
        time: timestamp.toISOString(),
        voltage_rms: 230 + Math.sin(i / 10) * 5, // Vary voltage slightly
        current_rms: 5.0 + Math.sin(i / 5) * 2, // Vary current
      })
    );
  }

  return measurements;
}
