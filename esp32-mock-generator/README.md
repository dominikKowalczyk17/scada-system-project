# ESP32 Mock Data Generator

Mock data generator for testing the SCADA backend without physical electrical sensors.

Generates realistic electrical measurement data following IEC 61000 power quality standards and publishes via MQTT.

## Features

- ✅ Realistic voltage, current, power measurements
- ✅ IEC 61000 compliant power quality events (voltage sags, swells, THD violations)
- ✅ Harmonic analysis (8 harmonics)
- ✅ Configurable for development and presentation scenarios
- ✅ Serial monitoring with status indicators

## Hardware Requirements

- ESP32 development board (ESP32-WROOM-32 or compatible)
- USB cable for programming and power
- WiFi network access

## Software Requirements

- [PlatformIO](https://platformio.org/) (recommended) or Arduino IDE
- Running MQTT broker (Mosquitto)

## Configuration

**IMPORTANT:** WiFi credentials are stored in `include/config.h` which is gitignored to protect your credentials.

### 1. Create config.h

Copy the example configuration:

```bash
cd esp32-mock-generator
cp include/config.h.example include/config.h
```

### 2. Edit config.h

Edit `include/config.h` with your credentials:

```cpp
// WiFi Configuration (IMPORTANT: ESP32 only supports 2.4GHz WiFi!)
const char* WIFI_SSID = "YourWiFi_2.4G";      // Your WiFi SSID
const char* WIFI_PASSWORD = "YourPassword";    // WiFi password

// MQTT Broker Configuration
const char* MQTT_BROKER_IP = "192.168.1.XX";  // Your PC or RPI IP
const int MQTT_PORT = 1883;
```

**For Development (Arch Linux PC):**

Find your PC's IP address:
```bash
ip addr | grep "inet " | grep -v 127.0.0.1
```

Use that IP in `MQTT_BROKER_IP` (e.g., `192.168.1.44`)

**For Presentation (Laptop Hotspot → RPI):**

Use RPI static IP: `192.168.137.100`

## Installation & Upload

### Using PlatformIO (Recommended)

```bash
# Navigate to project directory
cd esp32-mock-generator

# Build project
pio run

# Upload to ESP32
pio run --target upload

# Monitor serial output
pio device monitor
```

### Using Arduino IDE

1. Install ESP32 board support: https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html
2. Install libraries:
   - PubSubClient (by Nick O'Leary)
   - ArduinoJson (v7.x by Benoit Blanchon)
3. Open `src/main.cpp` in Arduino IDE
4. Select board: **ESP32 Dev Module**
5. Select port and upload

## Usage

### 1. Start Infrastructure

On your Arch Linux PC, start PostgreSQL and Mosquitto:

```bash
cd /path/to/scada-system-project
docker-compose up -d
```

Verify Mosquitto is running:
```bash
docker ps | grep mosquitto
```

### 2. Start Backend

```bash
cd scada-system
./mvnw spring-boot:run
```

### 3. Upload ESP32 Code

```bash
cd esp32-mock-generator
pio run --target upload
pio device monitor
```

### 4. Verify Data Flow

**Serial Monitor Output:**
```
╔════════════════════════════════════════════════╗
║  ESP32 Mock Data Generator for SCADA System   ║
╚════════════════════════════════════════════════╝

Configuration:
  WiFi SSID: MyHomeWiFi
  MQTT Broker: 192.168.1.50:1883
  MQTT Topic: scada/measurements/node1
  Interval: 3000 ms

→ Connecting to WiFi: MyHomeWiFi ....... ✓
  IP Address: 192.168.1.123
  Signal: -45 dBm
→ Connecting to MQTT broker 192.168.1.50:1883 ✓
  Publishing to: scada/measurements/node1

✓ Setup complete! Starting measurement generation...

─────────────────────────────────────────────────────
    [   1] ✓ 231.2V  5.45A 1258.0W THD: 1.8% (312 bytes)
    [   2] ✓ 228.7V  6.12A 1398.5W THD: 2.1% (312 bytes)
    ⚠️  VOLTAGE SAG [   3] ✓ 198.3V  5.01A  993.2W THD: 2.3% (312 bytes)
    [   4] ✓ 232.1V  7.23A 1676.8W THD: 1.5% (312 bytes)
```

**Backend Logs:**
```bash
# Check if measurements are being received
docker logs -f scada-backend

# Should see:
# 📥 Received MQTT message on topic: scada/measurements/node1
# ✅ Measurement saved: ...
```

**Database Verification:**
```bash
# Connect to PostgreSQL
docker exec -it scada-postgres psql -U energyuser -d energy_monitor

# Check measurements
SELECT COUNT(*) FROM measurements;
SELECT * FROM measurements ORDER BY time DESC LIMIT 5;
```

## Data Specification

### JSON Payload

```json
{
  "timestamp": 1699453200,
  "voltage_rms": 230.5,      // 207-253V (IEC 61000 ±10%)
  "current_rms": 5.2,         // 0-50A
  "power_active": 1196.0,     // Watts
  "power_apparent": 1205.0,   // VA
  "power_reactive": 150.0,    // VAR
  "cos_phi": 0.99,            // 0.85-1.0
  "frequency": 50.1,          // 49.5-50.5 Hz
  "thd_voltage": 2.3,         // 0-8% (IEC 61000 limit)
  "thd_current": 5.1,         // 0-10%
  "harmonics_v": [230.5, 4.8, 2.3, 1.1, 0.8, 0.5, 0.3, 0.2],
  "harmonics_i": [2.15, 0.11, 0.06, 0.03, 0.02, 0.01, 0.01, 0.01]
}
```

### Power Quality Events

The generator simulates realistic power quality events:

| Event | Probability | Description |
|-------|-------------|-------------|
| **Voltage Sag** | 2% | Voltage drops below 207V (90%) |
| **Voltage Swell** | 1% | Voltage exceeds 253V (110%) |
| **High THD** | 5% | THD exceeds 8% (IEC 61000 limit) |
| **High Load** | 10% | Current 10-20A (above typical 3-8A) |
| **Low Power Factor** | 5% | cos φ < 0.85 |

## Troubleshooting

### ESP32 Can't Connect to WiFi

```
✗ FAILED!
⚠️  WiFi connection failed!
   Please check WIFI_SSID and WIFI_PASSWORD in code
```

**Solution:**
- Double-check WIFI_SSID and WIFI_PASSWORD in `include/config.h`
- Ensure WiFi network is 2.4GHz (ESP32 doesn't support 5GHz)
- Try moving ESP32 closer to router

### MQTT Connection Failed

```
✗ MQTT connection failed after 5 attempts
   Check if MQTT broker is running:
   docker-compose ps | grep mosquitto
   ping 192.168.1.50
```

**Solution:**
```bash
# Check Mosquitto is running
docker-compose ps

# Check MQTT broker IP is correct
ip addr | grep inet

# Test MQTT manually
mosquitto_sub -h localhost -t "scada/measurements/#" -v

# Check firewall
sudo ufw allow 1883/tcp
```

### Backend Not Receiving Data

**Check backend logs:**
```bash
# If using Docker
docker logs -f scada-backend

# If running with mvnw
# Check terminal where ./mvnw spring-boot:run is running
```

**Verify MQTT config in `application.properties`:**
```properties
mqtt.enabled=true
mqtt.broker.url=tcp://localhost:1883
mqtt.topics=scada/measurements/#
```

### No Serial Output

**In PlatformIO:**
```bash
pio device monitor --baud 115200
```

**In Arduino IDE:**
- Tools → Serial Monitor
- Set baud rate to **115200**

## Integration Testing

### Full System Test

1. **Start infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Start backend:**
   ```bash
   cd scada-system
   ./mvnw spring-boot:run
   ```

3. **Upload ESP32 code and monitor:**
   ```bash
   cd esp32-mock-generator
   pio run --target upload && pio device monitor
   ```

4. **Check measurements in database:**
   ```bash
   docker exec -it scada-postgres psql -U energyuser -d energy_monitor \
     -c "SELECT COUNT(*) FROM measurements;"
   ```

   Should increment every 3 seconds.

5. **Test WebSocket (optional):**
   - Open browser console at `http://localhost:8080`
   - Connect to WebSocket: `/ws/measurements`
   - Subscribe to `/topic/measurements`
   - Should see real-time updates

## Next Steps

Once mock generator is working:

1. **Frontend Integration:** Start React dashboard and verify real-time display
2. **Statistics Testing:** Wait 24 hours and verify `daily_stats` aggregation
3. **Physical Sensors:** Replace mock data with real SCT013 + TV16 readings
4. **Deployment:** Deploy to Raspberry Pi for presentation setup

## Related Documentation

- [BACKEND-IMPLEMENTATION.md](../BACKEND-IMPLEMENTATION.md) - Backend architecture
- [DEV-SETUP.md](../DEV-SETUP.md) - Development environment setup
- [PRESENTATION-SETUP.md](../PRESENTATION-SETUP.md) - Laptop hotspot demo setup

## License

Part of SCADA System bachelor's thesis project.
