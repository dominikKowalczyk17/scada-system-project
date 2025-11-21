#!/usr/bin/env node

/**
 * MQTT Mock Data Publisher
 *
 * Simulates ESP32 sending electrical measurements to SCADA backend via MQTT.
 * Generates realistic power quality data with harmonics.
 */

const mqtt = require('mqtt');

// MQTT Configuration
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'scada/measurements/mock';
const PUBLISH_INTERVAL = parseInt(process.env.PUBLISH_INTERVAL) || 3000; // 3 seconds

// Base electrical parameters (230V / 50Hz EU grid)
const BASE_VOLTAGE = 230.0;
const BASE_FREQUENCY = 50.0;

// Connect to MQTT broker
console.log(`Connecting to MQTT broker: ${MQTT_BROKER}`);
const client = mqtt.connect(MQTT_BROKER);

client.on('connect', () => {
  console.log('✓ Connected to MQTT broker');
  console.log(`Publishing to topic: ${MQTT_TOPIC}`);
  console.log(`Interval: ${PUBLISH_INTERVAL}ms\n`);

  // Start publishing measurements
  setInterval(publishMeasurement, PUBLISH_INTERVAL);
});

client.on('error', (err) => {
  console.error('✗ MQTT connection error:', err.message);
  process.exit(1);
});

/**
 * Generate realistic electrical measurement with harmonics
 */
function generateMeasurement() {
  const now = Math.floor(Date.now() / 1000);

  // Add some realistic variation
  const voltageVariation = (Math.random() - 0.5) * 10; // ±5V
  const currentVariation = Math.random() * 2 + 2; // 2-4A
  const frequencyVariation = (Math.random() - 0.5) * 0.2; // ±0.1Hz

  const voltage = BASE_VOLTAGE + voltageVariation;
  const current = currentVariation;
  const frequency = BASE_FREQUENCY + frequencyVariation;

  // Power calculations
  const cosPhi = 0.92 + Math.random() * 0.06; // 0.92-0.98 (typical residential)
  const powerActive = voltage * current * cosPhi;
  const powerApparent = voltage * current;
  const powerReactive = Math.sqrt(Math.pow(powerApparent, 2) - Math.pow(powerActive, 2));

  // Generate harmonics (fundamental + 7 harmonics)
  // H1 = fundamental (largest), H2-H8 = harmonics (decreasing)
  const harmonicsV = [
    voltage * 0.99, // H1 - fundamental (almost full voltage)
    voltage * 0.02, // H2 - 2nd harmonic
    voltage * 0.01, // H3 - 3rd harmonic
    voltage * 0.005, // H4
    voltage * 0.003, // H5
    voltage * 0.002, // H6
    voltage * 0.001, // H7
    voltage * 0.001  // H8
  ];

  const harmonicsI = [
    current * 0.98, // H1 - fundamental
    current * 0.03, // H2
    current * 0.015, // H3
    current * 0.008, // H4
    current * 0.005, // H5
    current * 0.003, // H6
    current * 0.002, // H7
    current * 0.001  // H8
  ];

  // Calculate THD (Total Harmonic Distortion)
  const thdVoltage = Math.sqrt(
    harmonicsV.slice(1).reduce((sum, h) => sum + h * h, 0)
  ) / harmonicsV[0] * 100;

  const thdCurrent = Math.sqrt(
    harmonicsI.slice(1).reduce((sum, h) => sum + h * h, 0)
  ) / harmonicsI[0] * 100;

  return {
    timestamp: now,
    voltage_rms: parseFloat(voltage.toFixed(2)),
    current_rms: parseFloat(current.toFixed(3)),
    power_active: parseFloat(powerActive.toFixed(2)),
    power_apparent: parseFloat(powerApparent.toFixed(2)),
    power_reactive: parseFloat(powerReactive.toFixed(2)),
    cos_phi: parseFloat(cosPhi.toFixed(3)),
    frequency: parseFloat(frequency.toFixed(2)),
    thd_voltage: parseFloat(thdVoltage.toFixed(2)),
    thd_current: parseFloat(thdCurrent.toFixed(2)),
    harmonics_v: harmonicsV.map(h => parseFloat(h.toFixed(2))),
    harmonics_i: harmonicsI.map(h => parseFloat(h.toFixed(3)))
  };
}

/**
 * Publish measurement to MQTT broker
 */
function publishMeasurement() {
  const measurement = generateMeasurement();
  const payload = JSON.stringify(measurement);

  client.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error('✗ Publish failed:', err.message);
    } else {
      console.log(`✓ Published: V=${measurement.voltage_rms}V, I=${measurement.current_rms}A, P=${measurement.power_active.toFixed(0)}W, f=${measurement.frequency}Hz`);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  client.end();
  process.exit(0);
});
