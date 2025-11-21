#!/usr/bin/env node

/**
 * MQTT Poor Quality Power Publisher
 *
 * Simulates various power quality issues for testing PN-EN 50160 indicators:
 * - Voltage deviations (over/under voltage)
 * - Frequency deviations
 * - High THD with harmonic distortions
 * - Voltage sags and swells
 * - Asymmetric waveforms
 *
 * Usage: node mqtt-poor-quality-publisher.js [broker_url] [scenario]
 *
 * Scenarios:
 *   overvoltage    - Voltage 10-15% above nominal (non-compliant)
 *   undervoltage   - Voltage 10-15% below nominal (non-compliant)
 *   high-thd       - High harmonic distortion (THD > 8%)
 *   freq-drift     - Frequency outside 49.5-50.5Hz range
 *   voltage-sag    - Periodic voltage drops (80% nominal)
 *   all-bad        - Multiple quality issues combined
 *   random         - Random power quality problems
 */

const mqtt = require('mqtt');

// Command line arguments
const BROKER_URL = process.argv[2] || 'mqtt://localhost:1883';
const SCENARIO = process.argv[3] || 'high-thd';
const PUBLISH_INTERVAL = 2000; // 2 seconds
const TOPIC = 'scada/measurements/node1';

// PN-EN 50160 nominal values
const NOMINAL_VOLTAGE = 230.0;
const NOMINAL_FREQUENCY = 50.0;

// Power quality scenarios
const scenarios = {
  'overvoltage': {
    name: 'Over-voltage (PN-EN 50160 non-compliant)',
    voltage_range: [253, 265],      // +10% to +15% (critical)
    frequency_range: [49.95, 50.05],
    thd_voltage_range: [2, 4],
    harmonics_distortion: 'low'
  },
  'undervoltage': {
    name: 'Under-voltage (PN-EN 50160 non-compliant)',
    voltage_range: [195, 207],      // -10% to -15% (critical)
    frequency_range: [49.95, 50.05],
    thd_voltage_range: [3, 5],
    harmonics_distortion: 'low'
  },
  'high-thd': {
    name: 'High THD - Harmonic distortion (THD > 8%)',
    voltage_range: [220, 240],
    frequency_range: [49.9, 50.1],
    thd_voltage_range: [9, 15],     // Non-compliant (>8%)
    harmonics_distortion: 'high'
  },
  'freq-drift': {
    name: 'Frequency drift (outside 49.5-50.5Hz)',
    voltage_range: [225, 235],
    frequency_range: [50.6, 51.2],  // Non-compliant (>50.5Hz)
    thd_voltage_range: [2, 4],
    harmonics_distortion: 'low'
  },
  'voltage-sag': {
    name: 'Voltage sags (periodic drops to 80%)',
    voltage_range: [184, 240],      // Alternating sags
    frequency_range: [49.95, 50.05],
    thd_voltage_range: [3, 6],
    harmonics_distortion: 'medium',
    periodic_sag: true
  },
  'all-bad': {
    name: 'Multiple quality issues combined',
    voltage_range: [195, 260],      // Wide range
    frequency_range: [49.3, 50.8],  // Non-compliant
    thd_voltage_range: [8, 18],     // High THD
    harmonics_distortion: 'very-high'
  },
  'random': {
    name: 'Random power quality problems',
    voltage_range: [190, 265],
    frequency_range: [49.2, 51.0],
    thd_voltage_range: [2, 20],
    harmonics_distortion: 'random'
  }
};

// Get scenario or default to high-thd
const currentScenario = scenarios[SCENARIO] || scenarios['high-thd'];

console.log(`\n[MQTT Poor Quality Publisher]`);
console.log(`Broker: ${BROKER_URL}`);
console.log(`Topic: ${TOPIC}`);
console.log(`Scenario: ${currentScenario.name}`);
console.log(`Publish interval: ${PUBLISH_INTERVAL}ms\n`);

// Connect to MQTT broker
const client = mqtt.connect(BROKER_URL, {
  clientId: 'poor-quality-publisher-' + Math.random().toString(16).substr(2, 8),
  clean: true,
  reconnectPeriod: 1000
});

client.on('connect', () => {
  console.log('[OK] Connected to MQTT broker');
  console.log('[INFO] Publishing poor quality measurements...\n');
  publishMeasurement();
  setInterval(publishMeasurement, PUBLISH_INTERVAL);
});

client.on('error', (err) => {
  console.error('[ERROR] MQTT error:', err.message);
});

client.on('close', () => {
  console.log('[INFO] Disconnected from MQTT broker');
});

// Counter for periodic effects
let measurementCounter = 0;

function publishMeasurement() {
  measurementCounter++;

  // Generate poor quality measurement based on scenario
  const voltage = generateVoltage();
  const frequency = generateFrequency();
  const current = generateCurrent(voltage);

  // Calculate power values
  const cos_phi = random(0.75, 0.95); // Lower power factor for distorted loads
  const power_apparent = voltage * current;
  const power_active = power_apparent * cos_phi;
  const power_reactive = Math.sqrt(Math.pow(power_apparent, 2) - Math.pow(power_active, 2));

  // Generate harmonics with distortions
  const harmonics = generateHarmonics(voltage, currentScenario.harmonics_distortion);

  // Calculate THD from harmonics (H2-H8)
  const thd_voltage = calculateTHD(harmonics.voltage);
  const thd_current = calculateTHD(harmonics.current);

  // ESP32 format - NO node_id, NO waveforms (those are added by backend)
  const measurement = {
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
    voltage_rms: round(voltage, 2),
    current_rms: round(current, 2),
    power_active: round(power_active, 2),
    power_apparent: round(power_apparent, 2),
    power_reactive: round(power_reactive, 2),
    cos_phi: round(cos_phi, 2),
    frequency: round(frequency, 1),
    thd_voltage: round(thd_voltage, 1),
    thd_current: round(thd_current, 1),
    harmonics_v: harmonics.voltage.map(h => round(h, 1)),
    harmonics_i: harmonics.current.map(h => round(h, 2))
  };

  // Publish to MQTT
  client.publish(TOPIC, JSON.stringify(measurement), { qos: 1 }, (err) => {
    if (err) {
      console.error('[ERROR] Publish failed:', err.message);
    } else {
      // Calculate compliance status for display
      const voltage_deviation = ((voltage - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE) * 100;
      const freq_deviation = frequency - NOMINAL_FREQUENCY;
      const voltage_compliant = Math.abs(voltage_deviation) <= 10;
      const freq_compliant = Math.abs(freq_deviation) <= 0.5;
      const thd_compliant = thd_voltage < 8;

      const status = (voltage_compliant && freq_compliant && thd_compliant) ? 'OK' : 'NON-COMPLIANT';

      console.log(`[${status}] V=${voltage.toFixed(1)}V (${voltage_deviation > 0 ? '+' : ''}${voltage_deviation.toFixed(1)}%) | ` +
                  `f=${frequency.toFixed(2)}Hz (${freq_deviation > 0 ? '+' : ''}${freq_deviation.toFixed(2)}Hz) | ` +
                  `THD=${thd_voltage.toFixed(1)}% | ` +
                  `P=${(power_active/1000).toFixed(2)}kW`);
    }
  });
}

function generateVoltage() {
  const [min, max] = currentScenario.voltage_range;

  // Periodic voltage sag scenario
  if (currentScenario.periodic_sag && measurementCounter % 10 < 3) {
    return random(184, 195); // Voltage sag to 80% nominal
  }

  return random(min, max);
}

function generateFrequency() {
  const [min, max] = currentScenario.frequency_range;
  return random(min, max);
}

function generateCurrent(voltage) {
  // Current proportional to voltage with some variation
  // Typical household: 5-15A
  const base_current = (voltage / NOMINAL_VOLTAGE) * random(8, 14);
  return base_current;
}

function generateHarmonics(voltage_rms, distortion_level) {
  // H1 = fundamental (50Hz)
  const voltage_fundamental = voltage_rms * Math.sqrt(2); // RMS to peak
  const current_fundamental = random(10, 20); // Amperes (peak)

  let harmonic_levels;

  switch (distortion_level) {
    case 'low':
      harmonic_levels = [0.02, 0.015, 0.01, 0.008, 0.005, 0.003, 0.002]; // H2-H8
      break;
    case 'medium':
      harmonic_levels = [0.05, 0.04, 0.03, 0.025, 0.02, 0.015, 0.01];
      break;
    case 'high':
      harmonic_levels = [0.08, 0.06, 0.05, 0.04, 0.03, 0.02, 0.015];
      break;
    case 'very-high':
      harmonic_levels = [0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.03];
      break;
    case 'random':
      harmonic_levels = Array(7).fill(0).map(() => random(0.01, 0.15));
      break;
    default:
      harmonic_levels = [0.02, 0.015, 0.01, 0.008, 0.005, 0.003, 0.002];
  }

  // Generate voltage harmonics [H1, H2, ..., H8]
  const voltage_harmonics = [voltage_fundamental];
  harmonic_levels.forEach(level => {
    voltage_harmonics.push(voltage_fundamental * level * random(0.8, 1.2));
  });

  // Generate current harmonics (higher distortion than voltage)
  const current_harmonics = [current_fundamental];
  harmonic_levels.forEach(level => {
    current_harmonics.push(current_fundamental * level * random(1.5, 2.5));
  });

  return {
    voltage: voltage_harmonics,
    current: current_harmonics
  };
}

function calculateTHD(harmonics) {
  // THD = sqrt(H2^2 + H3^2 + ... + H8^2) / H1 * 100%
  const H1 = harmonics[0];
  const harmonics_squared_sum = harmonics.slice(1).reduce((sum, h) => sum + h * h, 0);
  const thd = Math.sqrt(harmonics_squared_sum) / H1 * 100;
  return thd;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down...');
  client.end();
  process.exit(0);
});

// Show available scenarios on invalid scenario
if (!scenarios[SCENARIO]) {
  console.log('[WARN] Unknown scenario:', SCENARIO);
  console.log('[INFO] Available scenarios:');
  Object.keys(scenarios).forEach(key => {
    console.log(`  - ${key}: ${scenarios[key].name}`);
  });
  console.log('');
}
