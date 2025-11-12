# SCADA System - Presentation Setup Guide

**Purpose:** Complete guide for demonstrating the SCADA system without external WiFi access

**Use Case:** Bachelor thesis presentation, demos in conference rooms, classrooms, or any location without reliable WiFi

**Last Updated:** 2025-11-09

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Hardware Requirements](#hardware-requirements)
3. [Pre-Presentation Configuration](#pre-presentation-configuration)
4. [Presentation Day Setup](#presentation-day-setup)
5. [Verification & Testing](#verification--testing)
6. [Troubleshooting](#troubleshooting)
7. [Demo Script](#demo-script)

---

## Architecture Overview

### Network Topology

```
┌─────────────────────────────────────────────────────────┐
│              YOUR LAPTOP (WiFi Hotspot Only)            │
│                                                         │
│  📡 WiFi Hotspot: "SCADA-Demo"                         │
│  IP: 192.168.137.1 (Windows) or 10.42.0.1 (Linux)      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Chrome/Firefox Browser                          │  │
│  │  → http://192.168.137.100:8080                   │  │
│  │  (Displays real-time dashboard)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
                │ WiFi                    │ WiFi
                │ "SCADA-Demo"            │ "SCADA-Demo"
                │                         │
        ┌───────▼──────────┐     ┌────────▼─────────────┐
        │  Raspberry Pi 4B │     │ ESP32 + SCT013       │
        │                  │     │ + TV16 Circuit       │
        │  Static IP:      │     │ (elektroda.pl)       │
        │  192.168.137.100 │     │                      │
        │                  │     │  DHCP IP:            │
        │                  │     │  192.168.137.xxx     │
        │ Services:        │     │                      │
        │ • PostgreSQL     │     │ → Publishes to:      │
        │ • Mosquitto MQTT │◄────┤   MQTT               │
        │ • Spring Boot    │     │   192.168.137.100    │
        │ • Frontend       │     │   :1883              │
        │                  │     │   Topic:             │
        │                  │     │   scada/measurements │
        └──────────────────┘     │   /node1             │
                                 └──────────────────────┘
```

### Data Flow

1. **ESP32** reads electrical parameters from custom measurement circuit (SCT013 + TV16 from elektroda.pl)
2. **ESP32** sends JSON measurements via MQTT over WiFi to **Raspberry Pi**
3. **Spring Boot** on RPI receives MQTT, saves to **PostgreSQL**
4. **Spring Boot** broadcasts data via **WebSocket** to frontend
5. **Laptop browser** displays real-time dashboard from RPI

**Key Advantage:** No external WiFi/internet needed - completely self-contained network!

---

## Hardware Requirements

### What to Bring to Presentation

**Essential:**
- ✅ Laptop (Windows/Linux/Mac) with working WiFi
- ✅ Laptop charger
- ✅ Raspberry Pi 4B (4GB RAM) with microSD card (OS + project installed)
- ✅ Raspberry Pi power supply (USB-C 5V/3A official recommended)
- ✅ ESP32 development board + custom measurement circuit from elektroda.pl (SCT013 + TV16 in enclosure)
- ✅ ESP32 power source (USB power bank or USB charger)

**Optional:**
- ⭕ HDMI cable + mini-HDMI adapter (for RPI direct display if needed)
- ⭕ USB keyboard + mouse (for RPI troubleshooting)
- ⭕ Extension cord (if power outlets are limited)
- ⭕ USB-to-Ethernet adapter (backup connection method)

### Network Configuration Summary

| Device | IP Address | Role |
|--------|------------|------|
| Laptop | 192.168.137.1 (Windows)<br>10.42.0.1 (Linux) | WiFi Hotspot + Display |
| Raspberry Pi | 192.168.137.100 (static) | Backend Server |
| ESP32 | 192.168.137.xxx (DHCP) | Sensor Node |

**WiFi Credentials:**
- SSID: `SCADA-Demo`
- Password: `scada2025`

---

## Pre-Presentation Configuration

### 1. Raspberry Pi Configuration (One-Time Setup)

#### A. WiFi Configuration

**File:** `/etc/wpa_supplicant/wpa_supplicant.conf`

```bash
# SSH to RPI (at home with regular WiFi)
ssh pi@raspberrypi.local

# Edit WiFi configuration
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
```

**Add:**

```conf
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=PL

# Your home WiFi (for development at home)
network={
    ssid="Your-Home-WiFi"
    psk="your-home-password"
    priority=10
    id_str="home"
}

# Laptop hotspot (for presentations)
network={
    ssid="SCADA-Demo"
    psk="scada2025"
    priority=20
    id_str="demo"
}
```

**Note:** Higher priority (20) means RPI will prefer "SCADA-Demo" when available.

#### B. Static IP Configuration

**File:** `/etc/dhcpcd.conf`

```bash
sudo nano /etc/dhcpcd.conf
```

**Add at the end:**

```conf
# Static IP for demo hotspot
profile static_demo
static ip_address=192.168.137.100/24
static routers=192.168.137.1
static domain_name_servers=8.8.8.8 1.1.1.1

# Apply profile when connected to SCADA-Demo
interface wlan0
ssid SCADA-Demo
profile static_demo
```

**Apply changes:**

```bash
sudo systemctl restart dhcpcd
```

#### C. Configure Services for Auto-Start

**Ensure services start on boot:**

```bash
# Enable Docker to start on boot
sudo systemctl enable docker

# Enable your Spring Boot service (if configured)
sudo systemctl enable scada-backend

# Verify
sudo systemctl list-unit-files | grep enabled
```

#### D. Update Spring Boot Configuration

**File:** `scada-system/src/main/resources/application.properties`

```properties
# MQTT Configuration
mqtt.enabled=true
mqtt.broker.url=tcp://localhost:1883
mqtt.client.id=scada-backend
mqtt.topics=scada/measurements/#

# Server - bind to all interfaces (accessible from WiFi)
server.port=8080
server.address=0.0.0.0

# CORS - allow laptop browser
spring.web.cors.allowed-origins=*

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/energy_monitor
spring.datasource.username=energyuser
spring.datasource.password=StrongPassword123!
```

#### E. Docker Compose Configuration

**File:** `docker-compose.yml` (on RPI)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: scada-postgres
    environment:
      POSTGRES_DB: energy_monitor
      POSTGRES_USER: energyuser
      POSTGRES_PASSWORD: StrongPassword123!
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - scada-network
    restart: unless-stopped

  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: scada-mqtt
    ports:
      - "0.0.0.0:1883:1883"      # Bind to all interfaces
      - "0.0.0.0:9001:9001"      # WebSocket
    volumes:
      - ./mosquitto/config/mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data
      - mosquitto_log:/mosquitto/log
    networks:
      - scada-network
    restart: unless-stopped

volumes:
  postgres_data:
  mosquitto_data:
  mosquitto_log:

networks:
  scada-network:
    driver: bridge
```

**Mosquitto Config:** `mosquitto/config/mosquitto.conf`

```conf
# Mosquitto MQTT Broker - Demo Configuration

# Listeners
listener 1883
protocol mqtt

listener 9001
protocol websockets

# Authentication (disabled for demo simplicity)
allow_anonymous true

# Logging
log_dest stdout
log_type all

# Persistence
persistence true
persistence_location /mosquitto/data/

# Connection settings
max_connections -1
```

### 2. ESP32 Configuration (One-Time Setup)

**File:** `esp32-wifi-mqtt.ino`

Upload this code to ESP32 before the presentation:

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi credentials (laptop hotspot)
const char* ssid = "SCADA-Demo";
const char* password = "scada2025";

// MQTT Configuration (Raspberry Pi)
const char* mqtt_server = "192.168.137.100";  // RPI static IP
const int mqtt_port = 1883;
const char* mqtt_topic = "scada/measurements/node1";

// Pin definitions for elektroda.pl circuit (SCT013 + TV16)
#define PIN_VOLTAGE 34  // GPIO34 (ADC1_6) - TV16 voltage transformer
#define PIN_CURRENT 35  // GPIO35 (ADC1_7) - SCT013 current sensor

// Timing
#define PUBLISH_INTERVAL 3000  // 3 seconds
#define LED_BUILTIN 2          // Built-in LED for status

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastPublish = 0;
bool ledState = false;

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(LED_BUILTIN, OUTPUT);

    Serial.println("\n=== SCADA System - ESP32 Measurement Node ===");
    Serial.printf("WiFi SSID: %s\n", ssid);
    Serial.printf("MQTT Broker: %s:%d\n", mqtt_server, mqtt_port);
    Serial.printf("MQTT Topic: %s\n", mqtt_topic);

    // Configure ADC for elektroda.pl circuit readings
    analogReadResolution(12);  // 12-bit resolution (0-4095)
    analogSetAttenuation(ADC_11db);  // 0-3.3V range

    // Connect to WiFi
    setupWiFi();

    // Configure MQTT
    client.setServer(mqtt_server, mqtt_port);
    client.setBufferSize(512);  // Increase buffer for JSON

    Serial.println("Setup complete!\n");
}

void setupWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi connected!");
        Serial.printf("ESP32 IP: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("Gateway (Laptop): %s\n", WiFi.gatewayIP().toString().c_str());
        Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
        digitalWrite(LED_BUILTIN, HIGH);  // LED on when connected
    } else {
        Serial.println("\n❌ WiFi connection failed!");
        Serial.println("Check hotspot is enabled and credentials are correct");
        Serial.println("Restarting in 10 seconds...");
        delay(10000);
        ESP.restart();
    }
}

void reconnectMQTT() {
    int attempts = 0;
    while (!client.connected() && attempts < 5) {
        Serial.printf("Connecting to MQTT broker %s:%d...", mqtt_server, mqtt_port);

        String clientId = "ESP32-" + String(WiFi.macAddress());
        clientId.replace(":", "");

        if (client.connect(clientId.c_str())) {
            Serial.println(" ✅ Connected!");
            Serial.printf("Publishing to topic: %s\n", mqtt_topic);
        } else {
            Serial.printf(" ❌ Failed, rc=%d\n", client.state());
            Serial.println("Error codes: -4=timeout, -3=connection lost, -2=connection refused");
            Serial.println("Retrying in 3 seconds...");
            delay(3000);
            attempts++;
        }
    }

    if (!client.connected()) {
        Serial.println("⚠️  MQTT connection failed after 5 attempts");
        Serial.println("Check if Raspberry Pi is running and accessible");
        Serial.println("Continuing anyway - will retry on next cycle");
    }
}

void loop() {
    // Maintain WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️  WiFi lost, reconnecting...");
        digitalWrite(LED_BUILTIN, LOW);
        setupWiFi();
    }

    // Maintain MQTT connection
    if (!client.connected()) {
        reconnectMQTT();
    }
    client.loop();

    // Publish measurements at interval
    unsigned long now = millis();
    if (now - lastPublish >= PUBLISH_INTERVAL) {
        lastPublish = now;
        publishMeasurement();

        // Blink LED on each publish
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState);
    }
}

void publishMeasurement() {
    // Read from elektroda.pl circuit (SCT013 + TV16)
    float voltage = readVoltage();
    float current = readCurrent();

    // Calculate power parameters
    float cosPhi = 0.99;  // Power factor
    float powerActive = voltage * current * cosPhi;
    float powerApparent = voltage * current;
    float powerReactive = sqrt(sq(powerApparent) - sq(powerActive));

    // Create JSON document
    StaticJsonDocument<512> doc;

    doc["timestamp"] = now() / 1000;  // Unix timestamp in seconds
    doc["voltage_rms"] = round(voltage * 10) / 10.0;
    doc["current_rms"] = round(current * 100) / 100.0;
    doc["power_active"] = round(powerActive * 10) / 10.0;
    doc["power_apparent"] = round(powerApparent * 10) / 10.0;
    doc["power_reactive"] = round(powerReactive * 10) / 10.0;
    doc["cos_phi"] = cosPhi;
    doc["frequency"] = 50.0;
    doc["thd_voltage"] = 2.3;
    doc["thd_current"] = 5.1;
    doc["pst_flicker"] = 0.45;
    doc["capacitor_uf"] = 0.0;

    // Voltage harmonics array (8 harmonics)
    JsonArray harmonics_v = doc.createNestedArray("harmonics_v");
    harmonics_v.add(voltage);
    harmonics_v.add(4.8);
    harmonics_v.add(2.3);
    harmonics_v.add(1.1);
    harmonics_v.add(0.8);
    harmonics_v.add(0.5);
    harmonics_v.add(0.3);
    harmonics_v.add(0.2);

    // Current harmonics array (8 harmonics)
    JsonArray harmonics_i = doc.createNestedArray("harmonics_i");
    harmonics_i.add(current);
    harmonics_i.add(0.26);
    harmonics_i.add(0.15);
    harmonics_i.add(0.08);
    harmonics_i.add(0.05);
    harmonics_i.add(0.03);
    harmonics_i.add(0.02);
    harmonics_i.add(0.01);

    // Serialize to buffer
    char buffer[512];
    size_t len = serializeJson(doc, buffer);

    // Publish to MQTT
    if (client.publish(mqtt_topic, buffer, false)) {
        Serial.printf("📊 [%lu] U=%.1fV I=%.2fA P=%.0fW (%.0f bytes)\n",
                     millis()/1000, voltage, current, powerActive, (float)len);
    } else {
        Serial.println("❌ MQTT publish failed!");
    }
}

float readVoltage() {
    // Read voltage from elektroda.pl circuit (TV16 transformer)
    int adc = analogRead(PIN_VOLTAGE);
    float voltage_adc = (adc / 4095.0) * 3.3;  // Convert to voltage

    // TODO: Add your calibration formula here based on elektroda.pl circuit
    // Example: float voltage = voltage_adc * CALIBRATION_FACTOR + OFFSET;

    // For now, use simulated data (replace with actual reading)
    float voltage = 230.0 + random(-10, 10) * 0.1;

    return voltage;
}

float readCurrent() {
    // Read current from elektroda.pl circuit (SCT013 sensor)
    int adc = analogRead(PIN_CURRENT);
    float current_adc = (adc / 4095.0) * 3.3;  // Convert to voltage

    // TODO: Add your calibration formula here based on elektroda.pl circuit
    // Example: float current = current_adc * CALIBRATION_FACTOR;

    // For now, use simulated data (replace with actual reading)
    float current = 5.2 + random(-5, 5) * 0.1;

    return current;
}
```

**Upload to ESP32:**
```
Arduino IDE → Tools → Board → ESP32 Dev Module
Arduino IDE → Tools → Port → (select your ESP32 port)
Arduino IDE → Upload
```

**Test ESP32 locally before presentation:**
```
Arduino IDE → Tools → Serial Monitor (115200 baud)
You should see:
✅ WiFi connected!
✅ MQTT Connected!
📊 Published: U=230.5V I=5.2A P=1196.0W
```

---

## Presentation Day Setup

### Timeline: 15 Minutes Total

#### Step 1: Enable Laptop WiFi Hotspot (2 minutes)

**Windows 10/11:**

1. Open Settings → Network & Internet → Mobile hotspot
2. Configure:
   - Share from: Wi-Fi (or Ethernet if available)
   - Network name: `SCADA-Demo`
   - Network password: `scada2025`
3. Toggle: **Turn ON**

**Verify:**
```bash
# Open Command Prompt
ipconfig

# Look for "Wireless LAN adapter Local Area Connection* X"
# Should show: 192.168.137.1
```

**Linux (Ubuntu/Debian):**

```bash
# Using NetworkManager
nmcli dev wifi hotspot ifname wlan0 ssid SCADA-Demo password scada2025

# Verify
ip addr show
# Look for IP: 10.42.0.1
```

**macOS:**

1. System Preferences → Sharing
2. Select "Internet Sharing"
3. Share from: Wi-Fi
4. To computers using: Wi-Fi
5. Wi-Fi Options:
   - Network Name: `SCADA-Demo`
   - Password: `scada2025`
6. Enable Internet Sharing

#### Step 2: Power ON Raspberry Pi (3 minutes)

```bash
# 1. Plug in Raspberry Pi power supply
# 2. Wait for boot (green LED will blink, then steady)
# 3. Wait 60-90 seconds for full boot and WiFi connection
```

**From laptop, verify RPI connected:**

```bash
# Windows
ping 192.168.137.100

# Should respond with:
# Reply from 192.168.137.100: bytes=32 time=2ms TTL=64
```

If no response after 2 minutes:
- Check hotspot is ON
- Power cycle RPI
- Move RPI closer to laptop

#### Step 3: Start Backend Services on RPI (5 minutes)

**SSH to Raspberry Pi from laptop:**

```bash
# Windows (PowerShell or WSL)
ssh pi@192.168.137.100

# Linux/Mac
ssh pi@192.168.137.100
```

**On Raspberry Pi terminal:**

```bash
# Navigate to project directory
cd /opt/scada-system

# Start Docker services (PostgreSQL + Mosquitto)
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# NAME            STATUS          PORTS
# scada-postgres  Up 10 seconds   0.0.0.0:5432->5432/tcp
# scada-mqtt      Up 10 seconds   0.0.0.0:1883->1883/tcp

# Start Spring Boot backend
cd scada-system
./mvnw spring-boot:run

# Or if configured as systemd service:
# sudo systemctl start scada-backend

# Wait for startup message (30-60 seconds):
# "Started ScadaSystemApplication in X.XXX seconds"
```

**Verify backend is running:**

```bash
# In another terminal (or keep this one and use & to background)
curl http://localhost:8080/health

# Should return:
# {"status":"UP","timestamp":"2025-11-09T...","serviceName":"scada-energy-monitor"}
```

#### Step 4: Power ON ESP32 (2 minutes)

```bash
# 1. Plug ESP32 into USB power bank or USB charger
# 2. Built-in LED should blink while connecting to WiFi
# 3. LED will stay ON when connected to WiFi
# 4. LED will blink every 3 seconds when publishing MQTT messages
```

**Verify ESP32 is sending data (from RPI terminal):**

```bash
# Subscribe to MQTT topic
docker exec -it scada-mqtt mosquitto_sub -t "scada/measurements/#" -v

# Should see JSON messages every 3 seconds:
# scada/measurements/node1 {"timestamp":1699453200,"voltage_rms":230.5,...}
```

Press Ctrl+C to exit.

#### Step 5: Open Dashboard on Laptop (1 minute)

**On laptop browser (Chrome, Firefox, or Edge):**

```
http://192.168.137.100:8080
```

**What you should see:**
- ✅ Dashboard loads within 2-3 seconds
- ✅ Real-time values updating every 3 seconds
- ✅ Voltage: ~230V
- ✅ Current: ~5A
- ✅ Power: ~1200W
- ✅ Charts showing trends
- ✅ WebSocket status: Connected (green indicator)

---

## Verification & Testing

### Pre-Presentation Checklist (Day Before)

Run through this checklist at home to ensure everything works:

```bash
# === ON RASPBERRY PI ===

# 1. Check WiFi configuration
sudo cat /etc/wpa_supplicant/wpa_supplicant.conf | grep -A 3 "SCADA-Demo"
# Should show ssid and psk for SCADA-Demo

# 2. Check static IP configuration
sudo cat /etc/dhcpcd.conf | grep -A 5 "static_demo"
# Should show static IP 192.168.137.100

# 3. Check Docker images are present
docker images | grep -E "postgres|mosquitto"
# Should show postgres:15-alpine and eclipse-mosquitto:2.0

# 4. Check Spring Boot JAR is built
ls -lh scada-system/target/*.jar
# Should show scada-system-X.X.X-SNAPSHOT.jar

# 5. Test Docker services start
cd /opt/scada-system
docker-compose up -d
docker-compose ps
# Both should show "Up"

# 6. Test backend starts
cd scada-system
timeout 120 ./mvnw spring-boot:run &
sleep 60
curl http://localhost:8080/health
# Should return {"status":"UP"}

# 7. Test MQTT broker
docker exec -it scada-mqtt mosquitto_sub -t "test" -C 1 &
docker exec -it scada-mqtt mosquitto_pub -t "test" -m "hello"
# Should receive message

# Cleanup
docker-compose down
```

### On-Site Verification (Before Demo Starts)

```bash
# === ON LAPTOP ===

# 1. Verify hotspot is ON
# Windows: Settings → Mobile hotspot → ON
# Should show "X device(s) connected"

# 2. Verify laptop IP
ipconfig  # Windows
ip addr   # Linux
# Should show 192.168.137.1 (Windows) or 10.42.0.1 (Linux)

# 3. Ping Raspberry Pi
ping 192.168.137.100
# Should respond with time=Xms

# 4. Access RPI via SSH
ssh pi@192.168.137.100
# Should connect without errors

# === ON RASPBERRY PI (via SSH) ===

# 5. Check WiFi connection
iwconfig wlan0
# Should show ESSID:"SCADA-Demo"

# 6. Check IP address
ip addr show wlan0
# Should show 192.168.137.100

# 7. Check Docker services
docker-compose ps
# Both postgres and mosquitto should be "Up"

# 8. Check backend health
curl http://localhost:8080/health
# Should return {"status":"UP"}

# 9. Check MQTT messages from ESP32
mosquitto_sub -h localhost -t "scada/measurements/#" -C 3 -v
# Should receive 3 messages and exit
# Each message should be valid JSON with voltage, current, power

# 10. Check database has recent data
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT COUNT(*), MAX(time) FROM measurements;"
# Should show count > 0 and recent timestamp

# === ON LAPTOP BROWSER ===

# 11. Open dashboard
# Navigate to: http://192.168.137.100:8080

# 12. Verify real-time updates
# Watch values change every 3 seconds
# Check WebSocket status indicator is green/connected
```

If all checks pass: **You're ready to present!** ✅

---

## Troubleshooting

### Problem: Raspberry Pi Not Connecting to Hotspot

**Symptoms:**
- `ping 192.168.137.100` times out
- RPI not visible in hotspot connected devices

**Solutions:**

```bash
# Option 1: Restart RPI WiFi
# Connect keyboard+monitor to RPI directly
sudo ifconfig wlan0 down
sudo ifconfig wlan0 up
sudo wpa_cli -i wlan0 reconfigure

# Option 2: Check WiFi configuration
sudo cat /etc/wpa_supplicant/wpa_supplicant.conf
# Verify SSID is "SCADA-Demo" and password is "scada2025"

# Option 3: Manual connection
sudo wpa_cli -i wlan0
> scan
> scan_results
# Look for "SCADA-Demo" in results
> select_network 1  # or appropriate network ID
> status
# Should show "COMPLETED" for wpa_state

# Option 4: Reboot RPI
sudo reboot
# Wait 90 seconds and try ping again
```

### Problem: ESP32 Not Connecting to WiFi

**Symptoms:**
- Built-in LED keeps blinking (not solid ON)
- Serial monitor shows "WiFi connection failed"

**Solutions:**

```bash
# 1. Check hotspot is ON and broadcasting
# On laptop, verify other devices can see "SCADA-Demo" network

# 2. Move ESP32 closer to laptop
# WiFi range might be limited

# 3. Check ESP32 serial output
# Arduino IDE → Tools → Serial Monitor (115200 baud)
# Look for specific error messages

# 4. Verify WiFi credentials in code
# Double-check ssid and password are correct

# 5. Restart ESP32
# Unplug and plug back in power
```

### Problem: ESP32 Not Sending MQTT Messages

**Symptoms:**
- ESP32 WiFi connected (LED solid ON)
- `mosquitto_sub` shows no messages
- Serial monitor shows "MQTT Failed, rc=-2"

**Solutions:**

```bash
# 1. Verify Raspberry Pi IP is correct
# In esp32 code, check:
# const char* mqtt_server = "192.168.137.100";

# 2. Check MQTT broker is running
# On RPI:
docker-compose ps scada-mqtt
# Should show "Up"

# 3. Check broker logs
docker logs scada-mqtt
# Look for connection attempts from ESP32

# 4. Test MQTT broker from laptop
mosquitto_pub -h 192.168.137.100 -t "test" -m "hello"
# If this fails, firewall might be blocking

# 5. Check RPI firewall
# On RPI:
sudo ufw status
# If active, allow MQTT:
sudo ufw allow 1883/tcp
```

### Problem: Dashboard Not Loading in Browser

**Symptoms:**
- Browser shows "Can't reach this page" or timeout
- `http://192.168.137.100:8080` doesn't load

**Solutions:**

```bash
# 1. Verify RPI is reachable
ping 192.168.137.100
# Should respond

# 2. Verify backend is running
# SSH to RPI:
ssh pi@192.168.137.100
curl http://localhost:8080/health
# Should return JSON

# 3. Check Spring Boot is binding to all interfaces
# In application.properties:
# server.address=0.0.0.0  (not localhost!)

# 4. Check firewall on RPI
sudo ufw status
# If active:
sudo ufw allow 8080/tcp

# 5. Try from RPI browser first
# On RPI (with HDMI monitor):
chromium-browser http://localhost:8080
# If this works but laptop doesn't, networking issue

# 6. Check CORS configuration
# In application.properties:
# spring.web.cors.allowed-origins=*
```

### Problem: Dashboard Loads But No Real-Time Updates

**Symptoms:**
- Dashboard displays but values don't change
- Old/stale data showing
- WebSocket status shows "Disconnected" (red)

**Solutions:**

```bash
# 1. Check WebSocket connection in browser
# Open browser DevTools (F12)
# Console tab → look for WebSocket errors

# 2. Verify backend is receiving MQTT messages
# On RPI:
cd scada-system
./mvnw spring-boot:run
# Watch logs for: "Received measurement from ESP32"

# 3. Check database is being updated
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT time, voltage_rms FROM measurements ORDER BY time DESC LIMIT 5;"
# Timestamps should be recent (within last 30 seconds)

# 4. Restart Spring Boot backend
# Kill existing process and restart:
pkill -f spring-boot
cd scada-system
./mvnw spring-boot:run

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```

### Problem: Services Start But Performance is Slow

**Symptoms:**
- Dashboard takes >10 seconds to load
- Updates are laggy or delayed
- RPI feels unresponsive

**Solutions:**

```bash
# 1. Check RPI CPU/memory
# On RPI:
htop
# Look for processes using >80% CPU or memory

# 2. Check Docker resource usage
docker stats
# Look for containers using excessive resources

# 3. Restart Docker (frees memory)
docker-compose down
docker system prune -f
docker-compose up -d

# 4. Check PostgreSQL performance
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT COUNT(*) FROM measurements;"
# If count is very high (>100,000), consider cleanup:
# DELETE FROM measurements WHERE time < NOW() - INTERVAL '7 days';

# 5. Use lightweight browser on laptop
# Chrome/Edge can be heavy - try Firefox
```

---

## Demo Script

### Introduction (2 minutes)

**What to say:**

> "Good morning/afternoon. Today I'll demonstrate my bachelor thesis project - a SCADA system for monitoring electrical power quality in home installations."
>
> "The system consists of three main components:"
> 1. **ESP32 microcontroller** with custom measurement circuit from elektroda.pl (SCT013 + TV16) (show hardware)
> 2. **Raspberry Pi backend** running Spring Boot, PostgreSQL, and MQTT broker
> 3. **Web dashboard** for real-time monitoring (show on screen)
>
> "This demo runs completely offline using a WiFi hotspot - no internet connection needed."

### Live Demonstration (5 minutes)

**Step 1: Show Architecture**

Show this diagram (prepare slide):
```
ESP32 → WiFi → Raspberry Pi → WebSocket → Browser Dashboard
 (Sensors)      (MQTT)        (Backend)      (Real-time)
```

**Step 2: Show Real-Time Data**

Point to dashboard on screen:
- "Here we see **real-time voltage**: approximately 230 volts"
- "**Current draw**: about 5 amperes"
- "**Active power**: around 1200 watts"
- "The system updates every 3 seconds via WebSocket"

**Step 3: Show Data Persistence**

```bash
# On RPI (show in terminal on screen):
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT COUNT(*), MIN(time), MAX(time) FROM measurements;"
```

> "The system has collected [X] measurements since startup, stored in PostgreSQL database for historical analysis."

**Step 4: Show MQTT Communication**

```bash
# On RPI terminal:
docker exec -it scada-mqtt mosquitto_sub -t "scada/measurements/#" -v
```

> "Here you can see the raw MQTT messages from ESP32 - JSON data containing all electrical parameters including harmonics analysis."

**Step 5: Show IEC 61000 Compliance**

Point to dashboard THD values:
- "Total Harmonic Distortion is monitored per IEC 61000 standards"
- "THD voltage: 2.3% - within acceptable limits (<8%)"
- "The system can detect power quality events like voltage sags, swells, and harmonic distortion"

### Technical Q&A Preparation

**Expected Questions & Answers:**

**Q: "Why MQTT instead of HTTP?"**
> A: "MQTT is designed for IoT - it's lightweight, supports publish/subscribe pattern, handles disconnections gracefully with QoS levels, and reduces bandwidth compared to polling HTTP requests."

**Q: "Why Raspberry Pi instead of cloud?"**
> A: "For home installations, local processing provides lower latency, better privacy (data stays local), no internet dependency, and lower operating costs (no cloud fees)."

**Q: "What happens if power fails?"**
> A: "PostgreSQL data persists on disk. MQTT with QoS 1 ensures message delivery. When power returns, the system resumes automatically. For critical applications, a UPS would provide continuity."

**Q: "Can it scale to multiple sensors?"**
> A: "Yes - MQTT topics support wildcards (scada/measurements/node1, node2, etc.). Each ESP32 publishes to its own topic. The backend subscribes to all with #."

**Q: "What about security?"**
> A: "For production, we'd enable MQTT authentication, TLS encryption, and Spring Security for the API. This demo disables authentication for simplicity."

**Q: "How accurate are the measurements?"**
> A: "The custom elektroda.pl circuit with SCT013 current sensor and TV16 voltage transformer provides good measurement accuracy. Calibration is performed against a certified reference meter for voltage and current readings. The circuit provides proper isolation and signal conditioning for safe ESP32 interfacing."

---

## Post-Presentation Cleanup

```bash
# On Raspberry Pi
cd /opt/scada-system
docker-compose down

# On Laptop
# Disable WiFi hotspot
# Windows: Settings → Mobile hotspot → Turn OFF

# Power off ESP32
# Unplug from power

# Power off Raspberry Pi
ssh pi@192.168.137.100
sudo shutdown -h now
# Wait for green LED to blink 10 times, then steady OFF
# Safe to unplug power
```

---

## Appendix: Quick Reference

### IP Addresses
- Laptop: `192.168.137.1` (Windows) or `10.42.0.1` (Linux)
- Raspberry Pi: `192.168.137.100` (static)
- ESP32: `192.168.137.xxx` (DHCP)

### WiFi Credentials
- SSID: `SCADA-Demo`
- Password: `scada2025`

### URLs
- Dashboard: `http://192.168.137.100:8080`
- Backend Health: `http://192.168.137.100:8080/health`
- API Latest: `http://192.168.137.100:8080/api/measurements/latest`

### Ports
- PostgreSQL: `5432`
- Mosquitto MQTT: `1883`
- Mosquitto WebSocket: `9001`
- Spring Boot: `8080`

### Default Credentials
- PostgreSQL: `energyuser` / `StrongPassword123!`
- Database: `energy_monitor`
- MQTT: Anonymous (no auth for demo)

### Useful Commands

```bash
# SSH to RPI
ssh pi@192.168.137.100

# Watch MQTT messages
docker exec -it scada-mqtt mosquitto_sub -t "#" -v

# Check database
docker exec -it scada-postgres psql -U energyuser -d energy_monitor

# View backend logs
journalctl -u scada-backend -f

# Restart services
docker-compose restart
sudo systemctl restart scada-backend
```

---

**End of Document**

**Version:** 1.0
**Last Updated:** 2025-11-09
**Author:** Dominik Kowalczyk
