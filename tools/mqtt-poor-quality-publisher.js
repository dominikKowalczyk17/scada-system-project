#!/usr/bin/env node

/**
 * MQTT Power Quality Publisher - Phase Shift & Device Scenarios
 */

const mqtt = require('mqtt');

// Obsługa argumentów
let BROKER_URL = process.argv[2] || 'mqtt://localhost:1883';
let SCENARIO = process.argv[3] || 'household';

if (process.argv[2] && !process.argv[2].includes(':')) {
  SCENARIO = process.argv[2];
  BROKER_URL = 'mqtt://localhost:1883';
}

const PUBLISH_INTERVAL = 2000;
const TOPIC = 'scada/measurements/node1';

const scenarios = {
  'led-bulb': {
    name: 'Żarówka LED (Pojemnościowe/Nieliniowe)',
    voltage_range: [229, 231],
    cos_phi_range: [0.5, 0.6],
    base_current: 0.08,
    device_type: 'led',
    phase_type: 'leading' // Prąd wyprzedza napięcie (pojemność)
  },
  'brushed-motor': {
    name: 'Silnik szczotkowy (Indukcyjne)',
    voltage_range: [225, 232],
    cos_phi_range: [0.70, 0.80],
    base_current: 4.5,
    device_type: 'motor',
    phase_type: 'lagging' // Prąd spóźnia się (indukcyjność)
  },
  'phone-charger': {
    name: 'Ładowarka (SMPS/Pojemnościowe)',
    voltage_range: [230, 231],
    cos_phi_range: [0.45, 0.55],
    base_current: 0.12,
    device_type: 'charger',
    phase_type: 'leading'
  },
  'household': {
    name: 'Gospodarstwo domowe (Miks)',
    voltage_range: [227, 233],
    cos_phi_range: [0.90, 0.95],
    base_current: 8.0,
    device_type: 'household',
    phase_type: 'lagging'
  }
};

const currentScenario = scenarios[SCENARIO] || scenarios['household'];

console.log(`\n[MQTT Device Simulator + Phase Shift]`);
console.log(`Scenariusz: ${currentScenario.name} (${currentScenario.phase_type})`);

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('[OK] Połączono. Testowanie przesunięcia fazowego...');
  setInterval(publishMeasurement, PUBLISH_INTERVAL);
});

function publishMeasurement() {
  const voltage = random(currentScenario.voltage_range[0], currentScenario.voltage_range[1]);
  const current = currentScenario.base_current * random(0.98, 1.02);
  
  // Obliczanie cos_phi z uwzględnieniem znaku dla charakteru obciążenia
  let cos_phi = random(currentScenario.cos_phi_range[0], currentScenario.cos_phi_range[1]);
  
  // W wielu systemach ujemny cos_phi oznacza charakter pojemnościowy (leading)
  // lub generowanie mocy do sieci. Tutaj użyjemy go do testu logiki backendu.
  const signed_cos_phi = currentScenario.phase_type === 'leading' ? -Math.abs(cos_phi) : Math.abs(cos_phi);

  const power_apparent = voltage * current;
  const power_active = power_apparent * Math.abs(cos_phi);
  const power_reactive = Math.sqrt(Math.pow(power_apparent, 2) - Math.pow(power_active, 2));

  const harmonics = generateDeviceHarmonics(voltage, current, currentScenario.device_type);

  const measurement = {
    timestamp: Math.floor(Date.now() / 1000),
    voltage_rms: round(voltage, 2),
    current_rms: round(current, 2),
    power_active: round(power_active, 2),
    power_apparent: round(power_apparent, 2),
    power_reactive: round(power_reactive, 2),
    cos_phi: round(signed_cos_phi, 3), // Przesyłamy z znakiem do backendu
    frequency: 50.0,
    thd_voltage: round(calculateTHD(harmonics.voltage), 1),
    thd_current: round(calculateTHD(harmonics.current), 1),
    harmonics_v: harmonics.voltage.map(h => round(h, 2)),
    harmonics_i: harmonics.current.map(h => round(h, 3))
  };

  client.publish(TOPIC, JSON.stringify(measurement));
  
  const phaseAngle = (Math.acos(Math.abs(cos_phi)) * 180 / Math.PI).toFixed(1);
  console.log(`[SEND] cos_phi: ${signed_cos_phi.toFixed(2)} | Kąt: ${phaseAngle}° (${currentScenario.phase_type})`);
}

// ... funkcje pomocnicze generateDeviceHarmonics, calculateTHD, random, round pozostają bez zmian jak w Twoim kodzie ...
function generateDeviceHarmonics(v_rms, i_rms, type) {
  const v_fund = v_rms; // Przesyłamy RMS, backend zrobi * sqrt(2)
  const i_fund = i_rms;
  let i_levels; 
  let v_levels = [0.01, 0.005, 0.002, 0.001, 0.001, 0.001, 0.001];

  switch (type) {
    case 'led': i_levels = [0.05, 0.80, 0.04, 0.60, 0.03, 0.40, 0.02]; break;
    case 'charger': i_levels = [0.10, 0.90, 0.08, 0.70, 0.06, 0.50, 0.04]; break;
    case 'motor': i_levels = [0.15, 0.10, 0.08, 0.05, 0.04, 0.03, 0.02]; break;
    default: i_levels = [0.02, 0.10, 0.02, 0.05, 0.01, 0.02, 0.01]; break;
  }

  const v_harmonics = [v_fund, ...v_levels.map(l => v_fund * l)];
  const i_harmonics = [i_fund, ...i_levels.map(l => i_fund * l)];
  return { voltage: v_harmonics, current: i_harmonics };
}

function calculateTHD(h) {
  const sq_sum = h.slice(1).reduce((sum, val) => sum + val * val, 0);
  return (Math.sqrt(sq_sum) / h[0]) * 100;
}

function random(min, max) { return Math.random() * (max - min) + min; }
function round(value, decimals) { return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals); }

process.on('SIGINT', () => { client.end(); process.exit(0); });