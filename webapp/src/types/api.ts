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
  thd_voltage: number;        // Total Harmonic Distortion % (IEC 61000 limit: 8%)
  thd_current: number;        // Total Harmonic Distortion %
  harmonics_v: number[];      // 8 voltage harmonics [H1, H2, ..., H8]
  harmonics_i: number[];      // 8 current harmonics
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
  date: string;              // YYYY-MM-DD
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  avgCurrent: number;
  maxCurrent: number;
  totalEnergyKwh: number;
  voltageSagCount: number;   // Count of voltage < 207V events
  voltageSwellCount: number; // Count of voltage > 253V events
  thdViolationsCount: number; // Count of THD > 8% violations
  dataCompleteness: number;  // 0.0-1.0 (1.0 = 100%)
  measurementCount: number;
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
