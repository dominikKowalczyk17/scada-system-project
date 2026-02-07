# ESP32 SCADA Simulator

Mock data generator for testing SCADA system waveform visualization with realistic harmonics and distortions.

## Features

- ✅ Generates voltage and current waveforms with configurable harmonics
- ✅ Simulates real-world distortions (clipping, noise, asymmetry, DC offset)
- ✅ Publishes data via MQTT matching ESP32 format exactly
- ✅ Multiple test scenarios that auto-rotate every 30 seconds
- ✅ Sends raw waveform samples (1 full cycle, ~61 samples at 50Hz)

## Test Scenarios

1. **CLEAN** - Clean power, minimal harmonics (THD_V < 1%)
2. **DISTORTED** - Non-linear load with significant harmonics (THD_V ~3-5%)
3. **CLIPPED** - Voltage clipping from overload/ADC saturation
4. **ASYMMETRIC** - Asymmetric waveform with DC offset
5. **LOW_CURRENT** - Phone charger scenario (0.02-0.05A) for testing THD thresholding

## Prerequisites

- Node.js (v16 or higher)
- Running MQTT broker (Mosquitto) on `localhost:1883`
- Running SCADA backend

## Installation

```bash
cd esp32-simulator
npm install
```

## Usage

Start the simulator:

```bash
npm start
```

The simulator will:
1. Connect to MQTT broker at `mqtt://localhost:1883`
2. Publish to topic `scada/measurements/node1`
3. Send measurements every 3 seconds (matching ESP32)
4. Auto-rotate through scenarios every 30 seconds
5. Display progress in console

Press `Ctrl+C` to stop.

## Output Format

Matches ESP32 firmware exactly:

```json
{
  "v_rms": 230.4,
  "i_rms": 0.042,
  "p_act": 7.8,
  "power_apparent": 9.7,
  "power_reactive": 5.8,
  "cos_phi": 0.75,
  "freq": 50.1,
  "freq_valid": true,
  "thd_v": 3.45,
  "thd_i": 12.8,
  "harm_v": [155.2, 1.15, 0.89, ...],
  "harm_i": [0.021, 0.003, 0.002, ...],
  "waveform_v": [324.5, 318.2, 306.8, ...],
  "waveform_i": [0.058, 0.055, 0.048, ...]
}
```

## Configuration

Edit `simulator.js` to modify:

- `MQTT_BROKER` - MQTT broker URL (default: `mqtt://localhost:1883`)
- `MQTT_TOPIC` - Topic to publish to (default: `scada/measurements/node1`)
- `PUBLISH_INTERVAL` - Publish interval in ms (default: 3000)
- `SCENARIOS` - Add/modify test scenarios

## Troubleshooting

**Cannot connect to MQTT broker:**
```bash
# Check if Mosquitto is running
sudo systemctl status mosquitto

# Start Mosquitto
sudo systemctl start mosquitto
```

**No data in frontend:**
- Verify backend is running and processing MQTT messages
- Check backend logs for measurement reception
- Verify MQTT topic matches backend configuration (`scada.mqtt.topic` in `application.yml`)

## Testing Specific Scenarios

To test a specific scenario, modify `currentScenario` in `simulator.js`:

```javascript
let currentScenario = SCENARIOS.LOW_CURRENT; // Test phone charger scenario
```

Then restart the simulator.
