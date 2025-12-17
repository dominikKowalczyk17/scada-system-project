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
    cos_phi: 0.97,
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
    recent_history: [
      createMockMeasurement({ time: new Date(Date.now() - 9000).toISOString() }),
      createMockMeasurement({ time: new Date(Date.now() - 6000).toISOString() }),
      createMockMeasurement({ time: new Date(Date.now() - 3000).toISOString() }),
      createMockMeasurement(),
    ],
    ...overrides,
  };
}

/**
 * Create a mock StatsDTO with optional overrides
 */
export function createMockStats(overrides?: Partial<StatsDTO>): StatsDTO {
  return {
    date: new Date().toISOString().split('T')[0],
    avg_voltage: 230.5,
    min_voltage: 225.0,
    max_voltage: 235.0,
    avg_current: 5.2,
    max_current: 8.5,
    total_energy_kwh: 27.6,
    voltage_sag_count: 0,
    voltage_swell_count: 0,
    thd_violations_count: 0,
    data_completeness: 1.0,
    measurement_count: 28800,
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
