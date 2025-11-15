/**
 * ESP32 Mock Data Generator for SCADA System
 *
 * Generates realistic electrical measurement data and publishes via MQTT
 * for testing the SCADA backend without physical sensors.
 *
 * Usage scenarios:
 * 1. Development (Arch PC): ESP32 → WiFi → MQTT broker on PC (192.168.x.x)
 * 2. Presentation (Laptop hotspot): ESP32 → Hotspot → MQTT on RPI (192.168.137.100)
 *
 * Data follows IEC 61000 power quality standards:
 * - Voltage: 230V ±10% (207-253V)
 * - Frequency: 50Hz ±1% (49.5-50.5Hz)
 * - THD: <8% (normal), occasional violations
 * - Power quality events: sags, swells, harmonics
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "config.h"  // WiFi and MQTT credentials (gitignored)

// ============================================================================
// CONFIGURATION
// ============================================================================
// WiFi and MQTT broker settings are in include/config.h (gitignored)
// Copy include/config.h.example to include/config.h and fill in your credentials

const char* MQTT_TOPIC = "scada/measurements/node1";
const char* MQTT_CLIENT_ID = "esp32-mock-node1";

// Measurement interval
const unsigned long MEASUREMENT_INTERVAL = 3000;  // 3 seconds

// NTP Configuration (for real timestamps instead of millis())
const char* NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 3600;       // GMT+1 (Poland winter time)
const int DAYLIGHT_OFFSET_SEC = 3600;   // +1 hour for daylight saving time

// ============================================================================
// IEC 61000 Standard Values
// ============================================================================
const float NOMINAL_VOLTAGE = 230.0;      // V (European standard)
const float NOMINAL_FREQUENCY = 50.0;     // Hz
const float VOLTAGE_TOLERANCE = 0.10;     // ±10%
const float VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;   // 207V
const float VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10; // 253V

// Power Quality Event Probabilities
const float PROBABILITY_VOLTAGE_SAG = 0.02;    // 2% chance
const float PROBABILITY_VOLTAGE_SWELL = 0.01;  // 1% chance
const float PROBABILITY_HIGH_THD = 0.05;       // 5% chance

// ============================================================================
// Global Objects
// ============================================================================
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
unsigned long lastMeasurement = 0;
unsigned long measurementCount = 0;

// ============================================================================
// Function Prototypes
// ============================================================================
void connectWiFi();
void connectMQTT();
void generateAndPublishMeasurement();
float randomFloat(float min, float max);
void generateHarmonics(float* harmonics, int count, float fundamental, bool highTHD);

// ============================================================================
// Setup
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n╔════════════════════════════════════════════════╗");
  Serial.println("║  ESP32 Mock Data Generator for SCADA System   ║");
  Serial.println("╚════════════════════════════════════════════════╝\n");

  Serial.println("Configuration:");
  Serial.printf("  WiFi SSID: %s\n", WIFI_SSID);
  Serial.printf("  MQTT Broker: %s:%d\n", MQTT_BROKER_IP, MQTT_PORT);
  Serial.printf("  MQTT Topic: %s\n", MQTT_TOPIC);
  Serial.printf("  Interval: %lu ms\n\n", MEASUREMENT_INTERVAL);

  // Connect to WiFi
  connectWiFi();

  // Configure MQTT
  mqttClient.setServer(MQTT_BROKER_IP, MQTT_PORT);
  mqttClient.setBufferSize(512);  // Increase buffer for JSON payload

  // Connect to MQTT
  connectMQTT();

  Serial.println("\n✓ Setup complete! Starting measurement generation...\n");
  Serial.println("─────────────────────────────────────────────────────");
}

// ============================================================================
// Main Loop
// ============================================================================
void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // Generate measurement every MEASUREMENT_INTERVAL ms
  unsigned long now = millis();
  if (now - lastMeasurement >= MEASUREMENT_INTERVAL) {
    lastMeasurement = now;
    generateAndPublishMeasurement();
  }
}

// ============================================================================
// WiFi Connection
// ============================================================================
void connectWiFi() {
  Serial.printf("→ Connecting to WiFi: %s ", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✓");
    Serial.printf("  IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("  Signal: %d dBm\n", WiFi.RSSI());

    // Synchronize time with NTP server
    Serial.printf("→ Synchronizing time with NTP server... ");
    configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER);

    // Wait for time to be set (max 10 seconds)
    int ntpAttempts = 0;
    while (time(nullptr) < 1000000000 && ntpAttempts < 20) {
      delay(500);
      Serial.print(".");
      ntpAttempts++;
    }

    if (time(nullptr) >= 1000000000) {
      Serial.println(" ✓");
      time_t now = time(nullptr);
      Serial.printf("  Current time: %s", ctime(&now));
    } else {
      Serial.println(" ✗ FAILED!");
      Serial.println("   ⚠️  NTP sync failed - timestamps may be incorrect");
    }
  } else {
    Serial.println(" ✗ FAILED!");
    Serial.println("\n⚠️  WiFi connection failed!");
    Serial.println("   Please check WIFI_SSID and WIFI_PASSWORD in include/config.h");
    while (1) { delay(1000); }  // Halt
  }
}

// ============================================================================
// MQTT Connection
// ============================================================================
void connectMQTT() {
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    Serial.printf("→ Connecting to MQTT broker %s:%d ", MQTT_BROKER_IP, MQTT_PORT);

    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("✓");
      Serial.printf("  Publishing to: %s\n", MQTT_TOPIC);
      return;
    } else {
      Serial.printf("✗ (rc=%d)\n", mqttClient.state());
      attempts++;
      if (attempts < 5) {
        Serial.println("  Retrying in 3 seconds...");
        delay(3000);
      }
    }
  }

  if (!mqttClient.connected()) {
    Serial.println("\n⚠️  MQTT connection failed after 5 attempts");
    Serial.println("   Check if MQTT broker is running:");
    Serial.printf("   docker-compose ps | grep mosquitto\n");
    Serial.printf("   ping %s\n\n", MQTT_BROKER_IP);
    Serial.println("   Continuing anyway - will retry automatically...\n");
  }
}

// ============================================================================
// Generate and Publish Measurement
// ============================================================================
void generateAndPublishMeasurement() {
  measurementCount++;

  // -------------------------------------------------------------------------
  // 1. Generate Base Electrical Parameters
  // -------------------------------------------------------------------------

  // Voltage: normally around 230V ±5V, with occasional sags/swells
  float voltage = NOMINAL_VOLTAGE + randomFloat(-5.0, 5.0);
  bool eventOccurred = false;

  // Power quality events
  float rnd = randomFloat(0, 1);
  if (rnd < PROBABILITY_VOLTAGE_SAG) {
    voltage = randomFloat(190.0, 206.0);  // Voltage sag (< 207V)
    Serial.print("    ⚠️  VOLTAGE SAG ");
    eventOccurred = true;
  } else if (rnd < PROBABILITY_VOLTAGE_SAG + PROBABILITY_VOLTAGE_SWELL) {
    voltage = randomFloat(254.0, 270.0);  // Voltage swell (> 253V)
    Serial.print("    ⚠️  VOLTAGE SWELL ");
    eventOccurred = true;
  }

  // Current: typical home load 3-8A, occasionally higher
  float current = randomFloat(3.0, 8.0);
  if (random(0, 100) < 10) {  // 10% chance of high load
    current = randomFloat(10.0, 20.0);
  }

  // Power factor: typically 0.90-0.99, occasionally poor
  float cosPhi = randomFloat(0.92, 0.99);
  if (random(0, 100) < 5) {  // 5% chance of poor power factor
    cosPhi = randomFloat(0.70, 0.85);
  }

  // Frequency: typically stable at 50Hz ±0.2Hz
  float frequency = NOMINAL_FREQUENCY + randomFloat(-0.2, 0.2);

  // -------------------------------------------------------------------------
  // 2. Calculate Power Values (maintain physical relationships)
  // -------------------------------------------------------------------------
  float powerApparent = voltage * current;                    // S = V × I
  float powerActive = powerApparent * cosPhi;                 // P = S × cos φ
  float powerReactive = sqrt(powerApparent * powerApparent    // Q = √(S² - P²)
                           - powerActive * powerActive);

  // -------------------------------------------------------------------------
  // 3. Generate Harmonics
  // -------------------------------------------------------------------------
  bool highTHD = (randomFloat(0, 1) < PROBABILITY_HIGH_THD);
  if (highTHD && !eventOccurred) {
    Serial.print("    ⚠️  HIGH THD ");
    eventOccurred = true;
  }

  float harmonicsV[8];  // Voltage harmonics (H1 to H8)
  float harmonicsI[8];  // Current harmonics (H1 to H8)

  generateHarmonics(harmonicsV, 8, voltage, highTHD);
  generateHarmonics(harmonicsI, 8, current, highTHD);

  // Calculate THD (Total Harmonic Distortion)
  float thdVoltage = 0.0;
  float thdCurrent = 0.0;

  for (int i = 1; i < 8; i++) {  // Start from H2 (skip fundamental H1)
    thdVoltage += harmonicsV[i] * harmonicsV[i];
    thdCurrent += harmonicsI[i] * harmonicsI[i];
  }
  thdVoltage = sqrt(thdVoltage) / harmonicsV[0] * 100.0;  // Percentage
  thdCurrent = sqrt(thdCurrent) / harmonicsI[0] * 100.0;

  // -------------------------------------------------------------------------
  // 4. Build JSON Payload
  // -------------------------------------------------------------------------
  JsonDocument doc;

  doc["timestamp"] = (unsigned long)time(nullptr);  // Unix timestamp (seconds) from NTP
  doc["voltage_rms"] = round(voltage * 10) / 10.0;
  doc["current_rms"] = round(current * 100) / 100.0;
  doc["power_active"] = round(powerActive * 10) / 10.0;
  doc["power_apparent"] = round(powerApparent * 10) / 10.0;
  doc["power_reactive"] = round(powerReactive * 10) / 10.0;
  doc["cos_phi"] = round(cosPhi * 100) / 100.0;
  doc["frequency"] = round(frequency * 10) / 10.0;
  doc["thd_voltage"] = round(thdVoltage * 10) / 10.0;
  doc["thd_current"] = round(thdCurrent * 10) / 10.0;

  // Add harmonics arrays
  JsonArray harmonicsVArray = doc["harmonics_v"].to<JsonArray>();
  JsonArray harmonicsIArray = doc["harmonics_i"].to<JsonArray>();

  for (int i = 0; i < 8; i++) {
    harmonicsVArray.add(round(harmonicsV[i] * 100) / 100.0);
    harmonicsIArray.add(round(harmonicsI[i] * 100) / 100.0);
  }

  // -------------------------------------------------------------------------
  // 5. Publish to MQTT
  // -------------------------------------------------------------------------
  char buffer[512];
  size_t jsonSize = serializeJson(doc, buffer);

  bool published = mqttClient.publish(MQTT_TOPIC, buffer);

  // Print status
  if (!eventOccurred) {
    Serial.print("    ");
  }

  if (published) {
    Serial.printf("[%4lu] ✓ %5.1fV %5.2fA %6.1fW THD:%4.1f%% (%3d bytes)\n",
                  measurementCount, voltage, current, powerActive, thdVoltage, jsonSize);
  } else {
    Serial.printf("[%4lu] ✗ MQTT publish failed! (disconnected)\n", measurementCount);
  }
}

// ============================================================================
// Generate Harmonics Array
// ============================================================================
void generateHarmonics(float* harmonics, int count, float fundamental, bool highTHD) {
  harmonics[0] = fundamental;  // H1: Fundamental frequency (50Hz)

  // Generate harmonics with decreasing magnitude
  // Normal: H2 = 1-2% of H1, H3 = 0.5-1% of H1, etc.
  // High THD: H2 = 5-8%, H3 = 3-5%, etc.

  float baseMultiplier = highTHD ? 0.05 : 0.015;  // 5% vs 1.5%

  for (int i = 1; i < count; i++) {
    float factor = baseMultiplier / i;  // Decreasing with harmonic order
    harmonics[i] = fundamental * factor * randomFloat(0.8, 1.2);
  }
}

// ============================================================================
// Random Float Helper
// ============================================================================
float randomFloat(float min, float max) {
  return min + (random(0, 10000) / 10000.0) * (max - min);
}
