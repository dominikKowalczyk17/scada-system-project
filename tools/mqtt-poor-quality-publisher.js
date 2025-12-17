#!/usr/bin/env node

/**
 * MQTT Power Quality Simulator - Dynamic Household Scenario
 * Symuluje zmianę amplitudy i PRZESUNIĘCIA FAZOWEGO (cos_phi)
 */

const mqtt = require('mqtt');

// Konfiguracja argumentów
let BROKER_URL = process.argv[2] || 'mqtt://localhost:1883';
let SCENARIO = process.argv[3] || 'household';

if (process.argv[2] && !process.argv[2].includes(':')) {
  SCENARIO = process.argv[2];
  BROKER_URL = 'mqtt://localhost:1883';
}

const PUBLISH_INTERVAL = 2000;
const TOPIC = 'scada/measurements/node1';
const START_TIME = Date.now();

const scenarios = {
  'led-bulb': {
    name: 'Żarówka LED',
    voltage_range: [229, 231],
    cos_phi_range: [0.5, 0.6],
    base_current: 0.08,
    device_type: 'led',
    phase_type: 'leading'
  },
  'brushed-motor': {
    name: 'Silnik szczotkowy',
    voltage_range: [225, 232],
    cos_phi_range: [0.70, 0.80],
    base_current: 4.5,
    device_type: 'motor',
    phase_type: 'lagging'
  },
  'household': {
    name: 'Gospodarstwo domowe',
    voltage_range: [227, 233],
    cos_phi_range: [0.92, 0.96],
    base_current: 1.5,
    device_type: 'household',
    phase_type: 'lagging'
  }
};

const currentScenario = scenarios[SCENARIO] || scenarios['household'];
let washingMachineOn = false;

console.log(`\n[MQTT Simulator] URUCHOMIONO`);
console.log(`Broker: ${BROKER_URL}`);
console.log(`Scenariusz: ${currentScenario.name}`);
console.log(`-----------------------------------------`);

const client = mqtt.connect(BROKER_URL);

client.on('connect', () => {
  console.log('[OK] Połączono z brokerem MQTT.');
  if (SCENARIO === 'household') {
    console.log('STATUS: Startujemy z cos_phi = 1.0 (brak przesunięcia).');
    console.log('STATUS: Za 60 sekund włączy się pralka i faza "ucieknie".');
  }
  setInterval(publishMeasurement, PUBLISH_INTERVAL);
});

function publishMeasurement() {
  const elapsedSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const voltage = random(currentScenario.voltage_range[0], currentScenario.voltage_range[1]);
  
  let currentBase, cosPhi, type;

  // LOGIKA DYNAMICZNA DLA HOUSEHOLD
  if (SCENARIO === 'household' && elapsedSeconds < 60) {
    // Przed upływem minuty: obciążenie czysto rezystancyjne (idealna faza)
    currentBase = 1.2; 
    cosPhi = 1.0; 
    type = 'household';
  } 
  else if (SCENARIO === 'household' && elapsedSeconds >= 60) {
    // Po minucie: startuje pralka (indukcyjność)
    if (!washingMachineOn) {
        console.log('\n>>> [EVENT] WŁĄCZAM PRALKĘ: SKOK PRĄDU I ZMIANA FAZY <<<\n');
        washingMachineOn = true;
    }
    currentBase = 9.5; 
    cosPhi = 0.72; // Wyraźne opóźnienie fazy (lagging)
    type = 'motor';
  } else {
    // Pozostałe scenariusze (statyczne)
    currentBase = currentScenario.base_current;
    cosPhi = random(currentScenario.cos_phi_range[0], currentScenario.cos_phi_range[1]);
    type = currentScenario.device_type;
  }

  const current = currentBase * random(0.98, 1.02);
  
  // Ustalenie znaku cos_phi (ujemny dla leading/pojemność)
  const isLeading = currentScenario.phase_type === 'leading';
  const signed_cos_phi = isLeading ? -Math.abs(cosPhi) : Math.abs(cosPhi);

  const power_apparent = voltage * current;
  const power_active = power_apparent * Math.abs(signed_cos_phi);
  const power_reactive = Math.sqrt(Math.pow(power_apparent, 2) - Math.pow(power_active, 2));

  const harmonics = generateDeviceHarmonics(voltage, current, type);

  const measurement = {
    timestamp: Math.floor(Date.now() / 1000),
    voltage_rms: round(voltage, 2),
    current_rms: round(current, 2),
    power_active: round(power_active, 2),
    power_apparent: round(power_apparent, 2),
    power_reactive: round(power_reactive, 2),
    cos_phi: round(signed_cos_phi, 3),
    frequency: 50.0,
    thd_voltage: round(calculateTHD(harmonics.voltage), 1),
    thd_current: round(calculateTHD(harmonics.current), 1),
    harmonics_v: harmonics.voltage.map(h => round(h, 2)),
    harmonics_i: harmonics.current.map(h => round(h, 3))
  };

  client.publish(TOPIC, JSON.stringify(measurement));
  
  const phaseAngle = (Math.acos(Math.abs(signed_cos_phi)) * 180 / Math.PI).toFixed(1);
  const timeLabel = washingMachineOn ? '[PRALKA ON]' : `[T-${60 - elapsedSeconds}s]`;
  
  console.log(`${timeLabel} V: ${voltage.toFixed(1)}V | I: ${current.toFixed(2)}A | cos_phi: ${signed_cos_phi.toFixed(2)} | Kąt: ${phaseAngle}°`);
}

function generateDeviceHarmonics(v_rms, i_rms, type) {
  const v_fund = v_rms;
  const i_fund = i_rms;
  let i_levels; 
  let v_levels = [0.01, 0.005, 0.002, 0.001, 0.001, 0.001, 0.001];

  switch (type) {
    case 'led': i_levels = [0.05, 0.80, 0.04, 0.60, 0.03, 0.40, 0.02]; break;
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