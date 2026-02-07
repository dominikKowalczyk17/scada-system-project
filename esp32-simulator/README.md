# ESP32 SCADA Simulator

Mock data generator for testing SCADA system waveform visualization with realistic harmonics and distortions.

## Features

- Simulates real physical electrical loads with fixed characteristics
- Load type determined at startup — behaves like a real device
- Realistic harmonic profiles for each load type
- Natural measurement variation (noise, grid frequency drift)
- Publishes data via MQTT matching ESP32 format exactly
- Sends raw waveform samples (1 full cycle, ~61 samples at 50Hz)

## Load Types

| Type | Description | cos(phi) | THD |
|------|------------|----------|-----|
| `resistive` | Heater, kettle — clean sinusoid | ~1.0 | Very low |
| `inductive` | Motor, transformer — lagging current | ~0.7 | Moderate |
| `capacitive` | PFC bank — leading current | ~0.9 | Very low |
| `nonlinear` | SMPS, LED driver — rich harmonics | ~0.6 | High |
| `rectifier` | Bridge rectifier with RC — current peaks | ~0.7 | Very high |

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

Start the simulator with a specific load type:

```bash
npm start -- resistive
npm start -- inductive
npm start -- capacitive
npm start -- nonlinear
npm start -- rectifier
```

Or use the shortcut scripts:

```bash
npm run start:resistive
npm run start:inductive
npm run start:capacitive
npm run start:nonlinear
npm run start:rectifier
```

Or run directly:

```bash
node simulator.js inductive
```

The simulator will:
1. Connect to MQTT broker at `mqtt://localhost:1883`
2. Publish to topic `scada/measurements/node1`
3. Send measurements every 3 seconds (matching ESP32)
4. Maintain fixed load characteristics throughout the session
5. Display progress in console

Press `Ctrl+C` to stop.

## Output Format

Matches ESP32 firmware exactly:

```json
{
  "v_rms": 230.4,
  "i_rms": 0.842,
  "p_act": 168.5,
  "power_apparent": 194.1,
  "power_reactive": 97.2,
  "power_distortion": 5.8,
  "power_factor": 0.87,
  "freq": 50.1,
  "freq_valid": true,
  "thd_v": 1.45,
  "thd_i": 7.8,
  "harm_v": [324.5, 4.87, 2.59, ...],
  "harm_i": [1.190, 0.036, 0.060, ...],
  "waveform_v": [324.5, 318.2, 306.8, ...],
  "waveform_i": [1.058, 1.003, 0.912, ...]
}
```

## Configuration

Edit `simulator.js` to modify:

- `MQTT_BROKER` - MQTT broker URL (default: `mqtt://localhost:1883`)
- `MQTT_TOPIC` - Topic to publish to (default: `scada/measurements/node1`)
- `PUBLISH_INTERVAL` - Publish interval in ms (default: 3000)
- `LOAD_TYPES` - Add/modify load type definitions

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
