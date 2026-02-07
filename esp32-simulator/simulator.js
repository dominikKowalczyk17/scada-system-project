/**
 * ESP32 SCADA Simulator
 *
 * Generates realistic electrical measurement data with harmonics and waveform distortions
 * to test the SCADA system's waveform visualization capabilities.
 *
 * Features:
 * - Generates voltage and current waveforms with configurable harmonics
 * - Simulates real-world distortions (clipping, noise, asymmetry)
 * - Publishes data via MQTT matching ESP32 format exactly
 * - Multiple test scenarios (clean power, distorted, clipped, etc.)
 */

const mqtt = require('mqtt');

// Configuration
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'scada/measurements/node1';
const PUBLISH_INTERVAL = 3000; // 3 seconds, matching ESP32

// Scenarios for testing different waveform conditions
const SCENARIOS = {
  CLEAN: {
    name: 'Clean Power',
    nominalVoltage: 230,
    voltageHarmonics: [1.0, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001], // Mostly fundamental
    currentHarmonics: [1.0, 0.01, 0.005, 0.003, 0.002, 0.001, 0.001, 0.001],
    noise: 0.5,
    cosPhi: 0.95
  },
  DISTORTED: {
    name: 'Distorted Power (Non-linear Load)',
    nominalVoltage: 230,
    voltageHarmonics: [1.0, 0.02, 0.08, 0.04, 0.06, 0.03, 0.02, 0.015], // Significant harmonics
    currentHarmonics: [1.0, 0.05, 0.15, 0.08, 0.12, 0.06, 0.04, 0.03], // Heavy harmonic distortion
    noise: 1.0,
    cosPhi: 0.75
  },
  CLIPPED: {
    name: 'Voltage Clipping (Overload)',
    nominalVoltage: 248,
    voltageHarmonics: [1.0, 0.03, 0.12, 0.06, 0.08, 0.04, 0.03, 0.02],
    currentHarmonics: [1.0, 0.04, 0.10, 0.05, 0.08, 0.04, 0.03, 0.02],
    noise: 2.0,
    cosPhi: 0.85,
    clipVoltage: 340 // Simulate ADC saturation
  },
  ASYMMETRIC: {
    name: 'Asymmetric Waveform',
    nominalVoltage: 225,
    voltageHarmonics: [1.0, 0.04, 0.06, 0.08, 0.05, 0.04, 0.02, 0.015],
    currentHarmonics: [1.0, 0.05, 0.08, 0.06, 0.07, 0.04, 0.03, 0.02],
    noise: 1.5,
    cosPhi: 0.68,
    dcOffset: 5 // Simulate DC component
  },
  LOW_CURRENT: {
    name: 'Very Low Current (Phone Charger)',
    nominalVoltage: 230,
    voltageHarmonics: [1.0, 0.015, 0.008, 0.005, 0.003, 0.002, 0.001, 0.001],
    currentHarmonics: [1.0, 0.08, 0.12, 0.06, 0.04, 0.02, 0.01, 0.008], // High harmonics but low absolute values
    noise: 0.8,
    cosPhi: 0.65,
    lowCurrentMode: true // Flag to generate ~0.02-0.05A current
  }
};

let currentScenario = SCENARIOS.CLEAN;
let scenarioIndex = 0;
const scenarioKeys = Object.keys(SCENARIOS);

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
function generateMeasurement(scenario) {
  const frequency = 50.0 + (Math.random() - 0.5) * 0.4; // 49.8 - 50.2 Hz
  const samplingFreq = 3000; // 3000 Hz sampling rate (matching ESP32 SAMPLING_FREQ)
  const samplesPerCycle = Math.round(samplingFreq / frequency); // ~60 samples per cycle at 50Hz
  const samples = samplesPerCycle + 1; // 1 full cycle + 1 sample to complete the period visually

  // Calculate fundamental amplitudes from RMS
  const vRMS = scenario.nominalVoltage + (Math.random() - 0.5) * 4;
  const vFundamental = vRMS * Math.sqrt(2);

  // For low current scenario, generate 0.02-0.05A (phone charger level)
  // For normal scenarios, generate typical load currents
  let iRMS;
  if (scenario.lowCurrentMode) {
    iRMS = 0.02 + Math.random() * 0.03; // 0.02-0.05A (5-12W @ 230V)
  } else {
    iRMS = (vRMS * (0.01 + Math.random() * 0.05)) / scenario.cosPhi; // Random load 0.01-0.05A
  }
  const iFundamental = iRMS * Math.sqrt(2);

  // Phase shift based on cos(phi)
  const phaseShift = Math.acos(scenario.cosPhi);

  // Generate waveforms
  const waveformV = generateWaveform(
    vFundamental,
    scenario.voltageHarmonics,
    samples,
    frequency,
    0,
    {
      noise: scenario.noise,
      clipVoltage: scenario.clipVoltage,
      dcOffset: scenario.dcOffset
    }
  );

  const waveformI = generateWaveform(
    iFundamental,
    scenario.currentHarmonics,
    samples,
    frequency,
    phaseShift,
    { noise: scenario.noise * 0.001 }
  );

  // Calculate actual RMS from generated waveforms
  const actualVRMS = calculateRMS(waveformV);
  const actualIRMS = calculateRMS(waveformI);

  // Generate harmonic amplitudes (H1-H25 to match ESP32)
  const harmonicsV = scenario.voltageHarmonics.map((h, i) => {
    const amp = vFundamental * h;
    return Math.round(amp * 100) / 100;
  });

  // Pad to 25 harmonics
  while (harmonicsV.length < 25) {
    harmonicsV.push(Math.round(Math.random() * 0.3 * 100) / 100);
  }

  const harmonicsI = scenario.currentHarmonics.map((h, i) => {
    const amp = iFundamental * h;
    return Math.round(amp * 1000) / 1000;
  });

  while (harmonicsI.length < 25) {
    harmonicsI.push(Math.round(Math.random() * 0.003 * 1000) / 1000);
  }

  // Calculate power values (Budeanu Theory)
  const pActive = actualVRMS * actualIRMS * scenario.cosPhi;
  const sApparent = actualVRMS * actualIRMS;

  // Reactive power of fundamental Q₁ = U₁ * I₁ * sin(φ₁)
  const u1_rms = vFundamental / Math.sqrt(2);
  const i1_rms = iFundamental / Math.sqrt(2);
  const phaseShift = Math.acos(scenario.cosPhi);
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
  // Pass actual harmonic amplitudes, not normalized coefficients
  // THD_V_MIN_FUNDAMENTAL = 10.0V, THD_I_MIN_FUNDAMENTAL = 0.15A
  const vHarmonicAmplitudes = scenario.voltageHarmonics.map(h => vFundamental * h);
  const iHarmonicAmplitudes = scenario.currentHarmonics.map(h => iFundamental * h);

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
 * Cycle through scenarios
 */
function nextScenario() {
  scenarioIndex = (scenarioIndex + 1) % scenarioKeys.length;
  currentScenario = SCENARIOS[scenarioKeys[scenarioIndex]];
  console.log(`\n📊 Switched to scenario: ${currentScenario.name}`);
}

/**
 * Main simulator loop
 */
function startSimulator() {
  console.log('🚀 ESP32 SCADA Simulator Starting...');
  console.log(`📡 MQTT Broker: ${MQTT_BROKER}`);
  console.log(`📢 Topic: ${MQTT_TOPIC}`);
  console.log(`⏱️  Publish Interval: ${PUBLISH_INTERVAL}ms\n`);

  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    console.log(`📊 Starting with scenario: ${currentScenario.name}\n`);
    console.log('💡 Press Ctrl+C to stop\n');
    console.log('Available scenarios:');
    Object.values(SCENARIOS).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name}`);
    });
    console.log('\nScenario will auto-rotate every 30 seconds\n');
    console.log('─'.repeat(80));

    let messageCount = 0;

    // Publish measurements
    const publishInterval = setInterval(() => {
      const measurement = generateMeasurement(currentScenario);
      const payload = JSON.stringify(measurement);

      client.publish(MQTT_TOPIC, payload, { qos: 0 }, (err) => {
        if (err) {
          console.error('❌ Publish error:', err);
        } else {
          messageCount++;
          console.log(`📤 [${messageCount}] Published: V=${measurement.v_rms}V, I=${measurement.i_rms}A, ` +
                     `THD_V=${measurement.thd_v.toFixed(2)}%, waveform samples: ${measurement.waveform_v.length}`);
        }
      });
    }, PUBLISH_INTERVAL);

    // Auto-rotate scenarios every 30 seconds
    const scenarioInterval = setInterval(() => {
      nextScenario();
    }, 30000);

    // Cleanup on exit
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Stopping simulator...');
      clearInterval(publishInterval);
      clearInterval(scenarioInterval);
      client.end(() => {
        console.log('✅ Disconnected from MQTT broker');
        console.log(`📊 Total messages published: ${messageCount}`);
        process.exit(0);
      });
    });
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err);
    process.exit(1);
  });
}

// Run simulator
if (require.main === module) {
  startSimulator();
}

module.exports = { generateMeasurement, SCENARIOS };
