/**
 * TypeScript interfaces for SCADA Backend API
 *
 * These types match the JSON response format from Spring Boot backend
 * Note: Backend uses snake_case naming convention
 */

export interface MeasurementDTO {
  id?: number;
  time?: string;              // ISO 8601 timestamp
  voltage_rms: number;        // Volts (220-240V nominal)
  current_rms: number;        // Amperes
  power_active: number;       // Watts
  power_reactive: number;     // VAR (Volt-Ampere Reactive)
  power_apparent: number;     // VA (Volt-Ampere)
  cos_phi: number;            // Power factor (0-1)
  frequency: number;          // Hertz (49.5-50.5Hz nominal)
  thd_voltage: number;        // Total Harmonic Distortion % (partial: H2-H8 only, lower bound)
  thd_current: number;        // Total Harmonic Distortion %
  harmonics_v: number[];      // 8 voltage harmonics [H1, H2, ..., H8] - Nyquist limited at 800Hz
  harmonics_i: number[];      // 8 current harmonics [H1, H2, ..., H8]
  voltage_deviation_percent?: number;  // PN-EN 50160 Group 1: (U - 230V) / 230V * 100%
  frequency_deviation_hz?: number;     // PN-EN 50160 Group 2: f - 50Hz
}

export interface WaveformDTO {
  voltage: number[];  // 200 samples (one 50Hz cycle = 20ms)
  current: number[];  // 200 samples
}

export interface RealtimeDashboardDTO {
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

/**
 * PN-EN 50160 Power Quality Indicators DTO
 *
 * Separate endpoint for standardized power quality monitoring.
 * Contains indicators from Groups 1, 2, and 4 (partial) of PN-EN 50160.
 *
 * Endpoint: GET /api/dashboard/power-quality-indicators
 */
export interface PowerQualityIndicatorsDTO {
  timestamp: string;  // ISO 8601

  // PN-EN 50160 Group 1: Supply Voltage Magnitude
  voltage_rms: number;
  voltage_deviation_percent: number | null;  // (U - 230V) / 230V * 100%
  voltage_within_limits: boolean | null;     // Within ±10% limit (null if deviation not calculated)

  // PN-EN 50160 Group 2: Supply Frequency
  frequency: number;
  frequency_deviation_hz: number | null;     // f - 50Hz
  frequency_within_limits: boolean | null;   // Within ±0.5Hz limit (null if deviation not calculated)

  // PN-EN 50160 Group 4: Voltage Waveform Distortions (Partial)
  thd_voltage: number;                // THD % (partial: H2-H8 only)
  thd_within_limits: boolean | null;         // <8% limit
  harmonics_voltage: number[];        // [H1, H2, ..., H8]

  // Overall compliance status
  overall_compliant: boolean | null;  // All indicators within limits (null if any indicator missing)
  status_message: string;             // Human-readable status
}
