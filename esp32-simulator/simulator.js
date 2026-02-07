/**
 * ESP32 SCADA Simulator
 *
 * Simulates real physical electrical loads with fixed characteristics.
 * Load type is determined at startup and remains constant — just like
 * a real resistor, motor, or rectifier doesn't change its nature.
 *
 * Usage:
 *   npm start -- resistive    - Pure resistive load (heater, kettle)
 *   npm start -- inductive    - Inductive load (motor, transformer)
 *   npm start -- capacitive   - Capacitive load (PFC bank)
 *   npm start -- nonlinear    - Non-linear load (rectifier, SMPS)
 *   npm start -- rectifier    - Bridge rectifier with RC filter
 *
 * Features:
 * - Fixed load characteristics throughout the session
 * - Realistic harmonic profiles matching real-world loads
 * - Natural measurement variation (noise, grid frequency drift)
 * - Publishes data via MQTT matching ESP32 format exactly
 */

const mqtt = require('mqtt');

// Configuration
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'scada/measurements/node1';
const PUBLISH_INTERVAL = 3000; // 3 seconds, matching ESP32

// Load types — each represents a real physical load with fixed electrical characteristics
const LOAD_TYPES = {
  resistive: {
    name: 'Resistive Load (heater / kettle)',
    description: 'Pure resistive — voltage and current in phase, minimal harmonics',
    nominalVoltage: 230,
    // Resistive loads draw near-perfect sinusoidal current
    voltageHarmonics: [1.0, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001],
    currentHarmonics: [1.0, 0.008, 0.004, 0.002, 0.001, 0.001, 0.001, 0.001],
    noise: 0.3,
    cosPhi: 0.99,
    currentRange: [0.8, 1.2] // Amps — typical 200-280W heater element
  },
  inductive: {
    name: 'Inductive Load (motor / transformer)',
    description: 'Current lags voltage, moderate harmonics from magnetic saturation',
    nominalVoltage: 230,
    // Induction motors produce odd harmonics due to magnetic saturation
    voltageHarmonics: [1.0, 0.015, 0.008, 0.005, 0.003, 0.002, 0.001, 0.001],
    currentHarmonics: [1.0, 0.03, 0.05, 0.02, 0.04, 0.015, 0.01, 0.008],
    noise: 0.8,
    cosPhi: 0.70,
    currentRange: [0.5, 0.9] // Amps — small motor
  },
  capacitive: {
    name: 'Capacitive Load (PFC bank)',
    description: 'Current leads voltage, very clean waveform',
    nominalVoltage: 230,
    // Capacitor banks draw very clean current
    voltageHarmonics: [1.0, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001],
    currentHarmonics: [1.0, 0.01, 0.006, 0.003, 0.002, 0.001, 0.001, 0.001],
    noise: 0.4,
    cosPhi: 0.92,
    leadingPowerFactor: true, // Current leads voltage (negative phase shift)
    currentRange: [0.3, 0.6] // Amps
  },
  nonlinear: {
    name: 'Non-linear Load (SMPS / LED driver)',
    description: 'Heavy current harmonics from switching power supply, poor power factor',
    nominalVoltage: 230,
    // SMPS draws current in narrow pulses — rich in odd harmonics
    voltageHarmonics: [1.0, 0.02, 0.04, 0.02, 0.03, 0.015, 0.01, 0.008],
    currentHarmonics: [1.0, 0.05, 0.15, 0.08, 0.12, 0.06, 0.04, 0.03],
    noise: 1.0,
    cosPhi: 0.62,
    currentRange: [0.08, 0.15] // Amps — typical ~20-35W SMPS
  },
  rectifier: {
    name: 'Bridge Rectifier with RC Filter',
    description: 'Diode bridge with smoothing cap — sharp current peaks, high THD',
    nominalVoltage: 230,
    // Bridge rectifier creates strong odd harmonics, especially 3rd and 5th
    voltageHarmonics: [1.0, 0.03, 0.06, 0.03, 0.04, 0.02, 0.015, 0.01],
    currentHarmonics: [1.0, 0.08, 0.20, 0.12, 0.15, 0.08, 0.06, 0.04],
    noise: 1.5,
    cosPhi: 0.72,
    currentRange: [0.3, 0.6] // Amps — medium rectifier load
  }
};

/**
 * Parse command-line argument to select load type
 */
function parseLoadType() {
  const args = process.argv.slice(2);
  const loadArg = args[0]?.toLowerCase();

  if (!loadArg) {
    console.error('Error: Load type is required.\n');
    printUsage();
    process.exit(1);
  }

  if (!LOAD_TYPES[loadArg]) {
    console.error(`Error: Unknown load type "${loadArg}".\n`);
    printUsage();
    process.exit(1);
  }

  return LOAD_TYPES[loadArg];
}

function printUsage() {
  console.log('Usage: npm start -- <load_type>\n');
  console.log('Available load types:');
  for (const [key, load] of Object.entries(LOAD_TYPES)) {
    console.log(`  ${key.padEnd(12)} - ${load.description}`);
  }
  console.log('\nExamples:');
  console.log('  npm start -- resistive');
  console.log('  npm start -- inductive');
  console.log('  node simulator.js nonlinear');
}

/**
 * Generate realistic waveform with harmonics and distortions
 */
function generateWaveform(fundamental, harmonics, samples, frequency, phaseShift = 0, options = {}) {
  const waveform = [];
  const omega = 2 * Math.PI * frequency;
  const samplingFreq = 3000; // Hz - matching ESP32
  const dt = 1 / samplingFreq; // Time step between samples

  for (let i = 0; i < samples; i++) {
    const t = i * dt;
    let value = 0;

    // Sum of harmonics (H1 to H25)
    for (let h = 0; h < harmonics.length; h++) {
      const harmonicOrder = h + 1;
      const amplitude = fundamental * harmonics[h];
      value += amplitude * Math.sin(harmonicOrder * omega * t + phaseShift);
    }

    // Add DC offset if specified
    if (options.dcOffset) {
      value += options.dcOffset;
    }

    // Add noise
    if (options.noise) {
      value += (Math.random() - 0.5) * options.noise;
    }

    // Apply clipping if specified
    if (options.clipVoltage) {
      if (value > options.clipVoltage) value = options.clipVoltage;
      if (value < -options.clipVoltage) value = -options.clipVoltage;
    }

    // Round to realistic precision (matching ESP32)
    waveform.push(Math.round(value * 100) / 100);
  }

  return waveform;
}

/**
 * Calculate RMS from waveform samples
 */
function calculateRMS(waveform) {
  const sumSquares = waveform.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSquares / waveform.length);
}

/**
 * Calculate THD from harmonics with proper thresholding
 * Returns 0 if fundamental is too small to prevent noise-dominated results
 */
function calculateTHD(harmonics, minFundamental) {
  const fundamental = harmonics[0];

  // Don't calculate THD if fundamental is too small
  if (fundamental < minFundamental) {
    return 0;
  }

  let sumHarmonicSquares = 0;
  for (let i = 1; i < harmonics.length; i++) {
    sumHarmonicSquares += harmonics[i] * harmonics[i];
  }

  const thd = (Math.sqrt(sumHarmonicSquares) / fundamental) * 100;

  // Cap at 100% to indicate measurement error
  return thd > 100 ? 0 : thd;
}

/**
 * Generate complete measurement data matching ESP32 format
 */
function generateMeasurement(load) {
  const frequency = 50.0 + (Math.random() - 0.5) * 0.4; // 49.8 - 50.2 Hz
  const samplingFreq = 3000; // 3000 Hz sampling rate (matching ESP32 SAMPLING_FREQ)
  const samplesPerCycle = Math.round(samplingFreq / frequency); // ~60 samples per cycle at 50Hz
  const samples = samplesPerCycle + 1; // 1 full cycle + 1 sample to complete the period visually

  // Calculate fundamental amplitudes from RMS
  const vRMS = load.nominalVoltage + (Math.random() - 0.5) * 4;
  const vFundamental = vRMS * Math.sqrt(2);

  // Current from load's fixed range with small natural variation
  const [iMin, iMax] = load.currentRange;
  const iRMS = iMin + Math.random() * (iMax - iMin);
  const iFundamental = iRMS * Math.sqrt(2);

  // Phase shift based on cos(phi)
  // Capacitive loads: current leads voltage (negative phase)
  // Inductive loads: current lags voltage (positive phase)
  const phaseShift = load.leadingPowerFactor
    ? -Math.acos(load.cosPhi)
    : Math.acos(load.cosPhi);

  // Generate waveforms
  const waveformV = generateWaveform(
    vFundamental,
    load.voltageHarmonics,
    samples,
    frequency,
    0,
    {
      noise: load.noise,
      clipVoltage: load.clipVoltage,
      dcOffset: load.dcOffset
    }
  );

  const waveformI = generateWaveform(
    iFundamental,
    load.currentHarmonics,
    samples,
    frequency,
    phaseShift,
    { noise: load.noise * 0.001 }
  );

  // Calculate actual RMS from generated waveforms
  const actualVRMS = calculateRMS(waveformV);
  const actualIRMS = calculateRMS(waveformI);

  // Generate harmonic amplitudes (H1-H25 to match ESP32)
  const harmonicsV = load.voltageHarmonics.map((h) => {
    const amp = vFundamental * h;
    return Math.round(amp * 100) / 100;
  });

  // Pad to 25 harmonics
  while (harmonicsV.length < 25) {
    harmonicsV.push(Math.round(Math.random() * 0.3 * 100) / 100);
  }

  const harmonicsI = load.currentHarmonics.map((h) => {
    const amp = iFundamental * h;
    return Math.round(amp * 1000) / 1000;
  });

  while (harmonicsI.length < 25) {
    harmonicsI.push(Math.round(Math.random() * 0.003 * 1000) / 1000);
  }

  // Calculate power values (Budeanu Theory)
  const pActive = actualVRMS * actualIRMS * load.cosPhi;
  const sApparent = actualVRMS * actualIRMS;

  // Reactive power of fundamental Q₁ = U₁ * I₁ * sin(φ₁)
  const u1_rms = vFundamental / Math.sqrt(2);
  const i1_rms = iFundamental / Math.sqrt(2);
  const qReactive_H1 = u1_rms * i1_rms * Math.sin(phaseShift);

  // Distortion power D = sqrt(S² - P² - Q₁²)
  const s2 = sApparent * sApparent;
  const p2 = pActive * pActive;
  const q12 = qReactive_H1 * qReactive_H1;
  const d2 = Math.max(0, s2 - p2 - q12);
  const powerDistortion = Math.sqrt(d2);

  // Power factor λ = P/S (NOT cos(φ)!)
  const powerFactor = sApparent > 0.05 ? pActive / sApparent : 1.0;

  // Calculate THD with thresholds matching ESP32 firmware
  // THD_V_MIN_FUNDAMENTAL = 10.0V, THD_I_MIN_FUNDAMENTAL = 0.15A
  const vHarmonicAmplitudes = load.voltageHarmonics.map(h => vFundamental * h);
  const iHarmonicAmplitudes = load.currentHarmonics.map(h => iFundamental * h);

  const thdV = calculateTHD(vHarmonicAmplitudes, 10.0);
  const thdI = calculateTHD(iHarmonicAmplitudes, 0.15);

  return {
    v_rms: Math.round(actualVRMS * 10) / 10,
    i_rms: Math.round(actualIRMS * 1000) / 1000,
    p_act: Math.round(pActive * 10) / 10,
    power_apparent: Math.round(sApparent * 10) / 10,
    power_reactive: Math.round(Math.abs(qReactive_H1) * 10) / 10,    // Q₁ - fundamental only
    power_distortion: Math.round(powerDistortion * 10) / 10,         // D - from harmonics
    power_factor: Math.round(powerFactor * 100) / 100,               // λ = P/S
    freq: Math.round(frequency * 10) / 10,
    freq_valid: true,
    thd_v: Math.round(thdV * 100) / 100,
    thd_i: Math.round(thdI * 100) / 100,
    harm_v: harmonicsV,
    harm_i: harmonicsI,
    waveform_v: waveformV,
    waveform_i: waveformI
  };
}

/**
 * Main simulator loop
 */
function startSimulator() {
  const load = parseLoadType();

  console.log('ESP32 SCADA Simulator');
  console.log('─'.repeat(60));
  console.log(`  Load type:  ${load.name}`);
  console.log(`  cos(phi):   ${load.cosPhi}${load.leadingPowerFactor ? ' (leading)' : ''}`);
  console.log(`  Current:    ${load.currentRange[0]} - ${load.currentRange[1]} A`);
  console.log(`  MQTT:       ${MQTT_BROKER}`);
  console.log(`  Topic:      ${MQTT_TOPIC}`);
  console.log(`  Interval:   ${PUBLISH_INTERVAL}ms`);
  console.log('─'.repeat(60));

  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    console.log('Connected to MQTT broker');
    console.log(`Simulating: ${load.name}\n`);

    let messageCount = 0;

    // Publish measurements
    const publishInterval = setInterval(() => {
      const measurement = generateMeasurement(load);
      const payload = JSON.stringify(measurement);

      client.publish(MQTT_TOPIC, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error('Publish error:', err);
        } else {
          messageCount++;
          console.log(`[${messageCount}] V=${measurement.v_rms}V, I=${measurement.i_rms}A, ` +
                     `P=${measurement.p_act}W, PF=${measurement.power_factor}, ` +
                     `THD_V=${measurement.thd_v.toFixed(2)}%, THD_I=${measurement.thd_i.toFixed(2)}%`);
        }
      });
    }, PUBLISH_INTERVAL);

    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\nStopping simulator...');
      clearInterval(publishInterval);
      client.end(() => {
        console.log('Disconnected from MQTT broker');
        console.log(`Total messages published: ${messageCount}`);
        process.exit(0);
      });
    });
  });

  client.on('error', (err) => {
    console.error('MQTT Error:', err);
    process.exit(1);
  });
}

// Run simulator
if (require.main === module) {
  startSimulator();
}

module.exports = { generateMeasurement, LOAD_TYPES };
