# SCADA System Testing Tools

This directory contains MQTT publishers for testing the SCADA system with various power quality scenarios.

## Prerequisites

```bash
npm install mqtt
```

## Available Tools

### 1. mqtt-mock-publisher.js

**Purpose:** Publishes **ideal** electrical measurements with good power quality.

**Use case:** Testing normal operation, UI components, and baseline functionality.

**Characteristics:**
- Voltage: 220-240V (within PN-EN 50160 ±10% limits)
- Frequency: 49.9-50.1Hz (within ±0.5Hz limits)
- THD: 2-4% (well below 8% limit)
- Low harmonic distortion
- Stable waveforms

**Usage:**
```bash
node mqtt-mock-publisher.js [broker_url] [interval_ms]

# Examples:
node mqtt-mock-publisher.js                          # localhost:1883, 2s interval
node mqtt-mock-publisher.js mqtt://192.168.1.53:1883 # Remote broker
node mqtt-mock-publisher.js mqtt://localhost:1883 1000 # 1s interval
```

---

### 2. mqtt-poor-quality-publisher.js ⚠️

**Purpose:** Simulates **power quality problems** for testing PN-EN 50160 compliance indicators.

**Use case:** Testing alarm systems, compliance detection, and educational demonstrations of power quality issues.

**Available Scenarios:**

#### `overvoltage`
- Voltage: 253-265V (+10% to +15% above nominal)
- **Status:** ❌ Non-compliant with PN-EN 50160
- **Tests:** Over-voltage detection and protection

#### `undervoltage`
- Voltage: 195-207V (-10% to -15% below nominal)
- **Status:** ❌ Non-compliant with PN-EN 50160
- **Tests:** Under-voltage detection and brown-out scenarios

#### `high-thd`
- THD: 9-15% (above 8% limit)
- Harmonic distortion levels: High
- **Status:** ❌ Non-compliant with PN-EN 50160 Group 4
- **Tests:** Harmonic distortion detection and waveform analysis

#### `freq-drift`
- Frequency: 50.6-51.2Hz (outside 49.5-50.5Hz range)
- **Status:** ❌ Non-compliant with PN-EN 50160 Group 2
- **Tests:** Frequency deviation detection

#### `voltage-sag`
- Periodic voltage drops to 80% nominal (184V)
- Simulates voltage sags every 10 measurements
- **Status:** ❌ Periodic non-compliance
- **Tests:** Voltage sag detection and event logging

#### `all-bad`
- Multiple simultaneous quality issues:
  - Wide voltage range: 195-260V
  - Frequency drift: 49.3-50.8Hz
  - Very high THD: 8-18%
- **Status:** ❌ Severely non-compliant
- **Tests:** Multi-fault handling and worst-case scenarios

#### `random`
- Randomly varying power quality problems
- Unpredictable voltage, frequency, and THD variations
- **Status:** ❌ Intermittently non-compliant
- **Tests:** Dynamic response and edge cases

**Usage:**
```bash
node mqtt-poor-quality-publisher.js [broker_url] [scenario]

# Examples:
node mqtt-poor-quality-publisher.js                          # Default: high-thd
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 overvoltage
node mqtt-poor-quality-publisher.js mqtt://192.168.1.53:1883 all-bad
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 voltage-sag

# Show available scenarios:
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 invalid-scenario
```

---

## PN-EN 50160 Compliance Limits

| Parameter | Group | Limit | Description |
|-----------|-------|-------|-------------|
| **Voltage** | 1 | 230V ±10% | 207V - 253V acceptable range |
| **Frequency** | 2 | 50Hz ±0.5Hz | 49.5Hz - 50.5Hz acceptable range |
| **THD Voltage** | 4 | <8% | Total Harmonic Distortion (partial H2-H8) |

**Note:** THD measurements in this system are calculated from harmonics H2-H8 only (due to 800Hz sampling rate / Nyquist constraint), representing a **lower bound** of actual THD.

---

## Testing Workflow

### 1. Test Normal Operation
```bash
# Terminal 1: Start backend
cd scada-system
./mvnw spring-boot:run

# Terminal 2: Publish good quality data
cd tools
node mqtt-mock-publisher.js
```

Expected result: ✅ All PN-EN 50160 indicators show "W normie" (compliant)

---

### 2. Test Compliance Detection
```bash
# Test over-voltage scenario
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 overvoltage
```

Expected result: ❌ Voltage indicator shows "Poza normą" (non-compliant), red badge

---

### 3. Test High THD Detection
```bash
# Test harmonic distortion
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 high-thd
```

Expected result: ❌ THD indicator shows >8%, "Poza normą" badge

---

### 4. Test Multiple Faults
```bash
# Test worst-case scenario
node mqtt-poor-quality-publisher.js mqtt://localhost:1883 all-bad
```

Expected result: ❌ Multiple indicators non-compliant, "Wykryto odchylenia" status

---

## Output Format

Both publishers generate measurements in the following JSON format:

```json
{
  "node_id": "node1",
  "timestamp": "2025-11-21T12:34:56.789Z",
  "voltage_rms": 234.5,
  "current_rms": 12.34,
  "power_active": 2890.3,
  "power_reactive": 450.2,
  "power_apparent": 2925.1,
  "cos_phi": 0.988,
  "frequency": 50.02,
  "thd_voltage": 3.2,
  "thd_current": 5.1,
  "harmonics_v": [330.2, 6.6, 3.3, 1.7, 1.0, 0.7, 0.3, 0.3],
  "harmonics_i": [17.4, 0.87, 0.52, 0.35, 0.17, 0.09, 0.07, 0.05],
  "waveform_v": [0, 10.4, 20.6, ...],
  "waveform_i": [0, 0.52, 1.03, ...]
}
```

---

## Educational Use

These tools are designed for **educational purposes** to demonstrate:
- Power quality standards (PN-EN 50160 / IEC 61000)
- Effects of harmonic distortion on electrical systems
- Voltage regulation challenges in power grids
- Frequency stability in AC power systems
- Real-time monitoring and compliance detection

**Not for production use** - these are mock data generators for testing and learning.

---

## Troubleshooting

### Connection Failed
```bash
[ERROR] MQTT error: connect ECONNREFUSED 127.0.0.1:1883
```

**Solution:** Ensure Mosquitto MQTT broker is running:
```bash
docker-compose up -d mosquitto
```

### Backend Not Receiving Data

1. Check MQTT topic subscription in backend logs:
```
Subscribed to MQTT topic: scada/measurements/#
```

2. Verify broker URL matches in both publisher and backend `application.properties`:
```properties
mqtt.broker.url=tcp://localhost:1883
```

3. Test manual publish:
```bash
mosquitto_pub -h localhost -t scada/measurements/test -m '{"test": "data"}'
```

---

## License

Educational use only - Part of Bachelor's Thesis SCADA System Project.
