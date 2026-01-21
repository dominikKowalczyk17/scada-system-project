/**
 * TypeScript interfaces for SCADA Backend API
 *
 * These types match the JSON response format from Spring Boot backend.
 * Backend uses spring.jackson.property-naming-strategy=SNAKE_CASE,
 * so all JSON field names are in snake_case format.
 */

export interface MeasurementDTO {
  id?: number;
  time?: string;

  // Raw measurements (all nullable based on backend)
  voltage_rms?: number;
  current_rms?: number;
  power_active?: number;
  power_reactive?: number;
  power_apparent?: number;
  power_distortion?: number;
  power_factor?: number;
  frequency?: number;
  thd_voltage?: number;
  thd_current?: number;
  harmonics_v?: number[];
  harmonics_i?: number[];

  // PN-EN 50160 indicators
  voltage_deviation_percent?: number;
  frequency_deviation_hz?: number;
}

export interface PowerQualityIndicatorsDTO {
  timestamp: string;

  // Group 1: Voltage
  voltage_rms: number;
  voltage_deviation_percent: number | null;
  voltage_within_limits: boolean | null;

  // Group 2: Frequency
  frequency: number;
  frequency_deviation_hz: number | null;
  frequency_within_limits: boolean | null;

  // Group 4: THD
  thd_voltage: number;
  thd_within_limits: boolean | null;
  harmonics_voltage: number[];

  // Overall status
  overall_compliant: boolean | null;
  status_message: string;
}

export interface WaveformDTO {
  voltage: number[];  // 200 samples (one 50Hz cycle = 20ms)
  current: number[];  // 200 samples
}

export interface RealtimeDashboardDTO {
  latest_measurement: MeasurementDTO;
  waveforms: WaveformDTO;
}

/**
 * DTO for REST API /api/dashboard endpoint.
 * Contains latest measurement, waveforms, and recent history.
 */
export interface DashboardDTO {
  latest_measurement: MeasurementDTO;
  waveforms: WaveformDTO;
  recent_history: MeasurementDTO[];
}

export interface StatsDTO {
  date: string;
  avg_voltage: number;
  min_voltage: number;
  max_voltage: number;
  avg_current: number;
  max_current: number;
  total_energy_kwh: number;
  voltage_sag_count: number;
  voltage_swell_count: number;
  thd_violations_count: number;
  data_completeness: number;
  measurement_count: number;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

export interface HealthResponse {
  status: 'UP' | 'DOWN';
  timestamp: string;
  service: string;
}
