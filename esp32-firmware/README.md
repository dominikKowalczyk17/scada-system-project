# ESP32 Firmware for SCADA System

This directory contains the ESP32 firmware code that was previously deleted during repository cleanup. The firmware performs electrical power measurements and publishes data via MQTT.

## Quick Start

1. **Install PlatformIO** (if not already installed):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core-installer/master/get-platformio.py | python3
   ```

2. **Configure WiFi and MQTT settings**:
   ```bash
   cp src/config.h.example src/config.h
   # Edit src/config.h with your WiFi credentials and MQTT server details
   ```

3. **Build and upload to ESP32**:
   ```bash
   cd esp32-firmware
   pio run --target upload
   ```

4. **Monitor serial output**:
   ```bash
   pio device monitor
   ```

## Hardware Connections

| Pin | Function | Description |
|-----|----------|-------------|
| 33  | PIN_U    | Voltage measurement (ADC1_CH5) |
| 35  | PIN_I    | Current measurement (ADC1_CH7) |

## Configuration Parameters

Key parameters in `main.cpp`:
- `SAMPLES = 512` - Number of samples per measurement cycle
- `SAMPLING_FREQ = 3000` - Sampling frequency in Hz
- `MAX_CALC_HARMONIC = 25` - Maximum harmonic order calculated
- `NOISE_GATE_RMS = 0.01` - Current noise gate threshold

Calibration coefficients:
- `vCoeff = 0.550` - Voltage calibration coefficient
- `iCoeff = 0.0096` - Current calibration coefficient

## Data Format

The firmware publishes JSON data to the MQTT topic configured in `config.h`. Example:

```json
{
  "v_rms": 230.5,
  "i_rms": 1.234,
  "p_act": 284.2,
  "power_apparent": 284.4,
  "power_reactive": 0.5,
  "cos_phi": 0.99,
  "freq": 50.0,
  "freq_valid": true,
  "thd_v": 2.5,
  "thd_i": 4.2,
  "harm_v": [230.5, 1.2, 0.3, ...],
  "harm_i": [1.234, 0.02, 0.01, ...]
}
```

## Dependencies

- `PubSubClient` - MQTT client library
- `ArduinoJson` - JSON serialization
- `arduinoFFT` - Fast Fourier Transform calculations

## Troubleshooting

### Permission Errors

If you get permission errors when accessing USB port:
```bash
# Install udev rules for ESP32
curl -fsSL https://raw.githubusercontent.com/platformio/platformio-core/develop/platformio/assets/system/99-platformio-udev.rules | sudo tee /etc/udev/rules.d/99-platformio-udev.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
# Unplug and reconnect ESP32
```

### Build Issues

Clean build artifacts:
```bash
pio run --target clean
pio run
```

### Serial Monitor Not Connecting

Check available ports:
```bash
pio device list
```
Then specify port explicitly:
```bash
pio device monitor -p /dev/ttyUSB0
```
