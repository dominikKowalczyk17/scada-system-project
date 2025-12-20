#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <arduinoFFT.h>

// --- KONFIGURACJA ---
const char* ssid = "FunBox2-8CE3-2.4GHz";
const char* password = "74CF7AA6AAA1D7E75776436F36";
const char* mqtt_server = "192.168.1.11";
const char* mqtt_topic = "scada/measurements/node1";

#define SAMPLES 512
#define SAMPLING_FREQ 6000 // 6kHz wg timera (166us)
#define PIN_U 33
#define PIN_I 35
#define PIN_REF 32

// Współczynniki kalibracyjne
float vCoeff = 0.550;     
float iCoeff = 0.096;

// Bufory i flagi
volatile int rawBufferU[SAMPLES];
volatile int rawBufferI[SAMPLES];
volatile int rawBufferRef[SAMPLES];
volatile bool dataReady = false;
volatile int sampleIdx = 0;

// Tablice do FFT
double vReal[SAMPLES], vImag[SAMPLES];
double iReal[SAMPLES], iImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>();

WiFiClient espClient;
PubSubClient client(espClient);
hw_timer_t * timer = NULL;
unsigned long lastPublishTime = 0;

void IRAM_ATTR onTimer() {
  if (!dataReady) {
    rawBufferU[sampleIdx] = analogRead(PIN_U);
    rawBufferI[sampleIdx] = analogRead(PIN_I);
    rawBufferRef[sampleIdx] = analogRead(PIN_REF);
    sampleIdx++;
    if (sampleIdx >= SAMPLES) {
      sampleIdx = 0;
      dataReady = true;
    }
  }
}

void setup_wifi() {
    Serial.print("\nConnecting to WiFi");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected. IP: " + WiFi.localIP().toString());
}

void processingTask(void * pvParameters) {
  for(;;) {
    if (dataReady) {
      unsigned long currentTime = millis();
      
      if (currentTime - lastPublishTime >= 3000) {
        lastPublishTime = currentTime;

        double sumU2 = 0, sumI2 = 0, pSum = 0;

        // 1. Kopiowanie danych i obliczenia RMS/P
        for (int i = 0; i < SAMPLES; i++) {
          float uScaled = (rawBufferU[i] - rawBufferRef[i]) * vCoeff;
          float iScaled = (rawBufferI[i] - rawBufferRef[i]) * iCoeff;
          
          vReal[i] = (double)uScaled;
          vImag[i] = 0;
          iReal[i] = (double)iScaled;
          iImag[i] = 0;
          
          sumU2 += uScaled * uScaled;
          sumI2 += iScaled * iScaled;
          pSum += uScaled * iScaled;
        }

        float vRMS = sqrt(sumU2 / SAMPLES);
        float iRMS = sqrt(sumI2 / SAMPLES);
        float pActive = pSum / SAMPLES;
        float sApparent = vRMS * iRMS;
        float qReactive = (sApparent > abs(pActive)) ? sqrt(pow(sApparent, 2) - pow(pActive, 2)) : 0;
        float cosPhi = (sApparent > 0.1) ? abs(pActive) / sApparent : 1.0;

        // 2. FFT Napięcia
        FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
        FFT.complexToMagnitude(vReal, vImag, SAMPLES);
        
        double freq = FFT.majorPeak(vReal, SAMPLES, SAMPLING_FREQ);
        // Obliczamy bin składowej podstawowej (zwykle ok. 4 dla 50Hz)
        int baseBin = round(freq / (SAMPLING_FREQ / (double)SAMPLES));
        if (baseBin < 2) baseBin = 4; // Zabezpieczenie przed błędnym odczytem

        // Amplitudy harmonicznych napięcia (normalizacja FFT: / SAMPLES * 2)
        // Musimy zapamiętać je przed wykonaniem drugiego FFT na tym samym buforze
        double hV_vals[6];
        double sumSqHarmonicsV = 0;
        for (int h = 1; h <= 5; h++) {
            hV_vals[h] = (vReal[baseBin * h] / SAMPLES) * 2.0; 
            if (h > 1) sumSqHarmonicsV += pow(hV_vals[h], 2);
        }

        // 3. FFT Prądu
        FFT.windowing(iReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(iReal, iImag, SAMPLES, FFT_FORWARD);
        FFT.complexToMagnitude(iReal, iImag, SAMPLES);

        double hI_vals[6];
        double sumSqHarmonicsI = 0;
        for (int h = 1; h <= 5; h++) {
            hI_vals[h] = (iReal[baseBin * h] / SAMPLES) * 2.0;
            if (h > 1) sumSqHarmonicsI += pow(hI_vals[h], 2);
        }

        // 4. Budowanie JSON (ArduinoJson v7)
        JsonDocument doc;
        doc["voltage_rms"] = vRMS;
        doc["current_rms"] = (iRMS < 0.01) ? 0 : iRMS;
        doc["power_active"] = abs(pActive);
        doc["power_apparent"] = sApparent;
        doc["power_reactive"] = qReactive;
        doc["cos_phi"] = (cosPhi > 1.0) ? 1.0 : cosPhi;
        doc["frequency"] = (freq > 40 && freq < 60) ? freq : 50.0;
        
        // THD obliczane z poprawnie wyłuskanych harmonicznych
        doc["thd_voltage"] = (hV_vals[1] > 5.0) ? (sqrt(sumSqHarmonicsV) / hV_vals[1]) * 100.0 : 0;
        doc["thd_current"] = (hI_vals[1] > 0.05) ? (sqrt(sumSqHarmonicsI) / hI_vals[1]) * 100.0 : 0;

        JsonArray hV = doc["harmonics_v"].to<JsonArray>();
        JsonArray hI = doc["harmonics_i"].to<JsonArray>();
        for (int h = 1; h <= 5; h++) {
            hV.add(hV_vals[h]);
            hI.add(hI_vals[h]);
        }

        char buffer[1024];
        serializeJson(doc, buffer);

        if (client.connected()) {
          client.publish(mqtt_topic, buffer);
          Serial.println("[MQTT] Data sent successfully");
        }
        Serial.println(buffer);
      }
      dataReady = false; 
    }
    client.loop();
    vTaskDelay(pdMS_TO_TICKS(10)); 
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, 1883);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  timer = timerBegin(0, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 166, true); // 6024 Hz approx
  timerAlarmEnable(timer);

  xTaskCreatePinnedToCore(processingTask, "Proc", 15000, NULL, 1, NULL, 1);
}

void loop() {
  if (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect("ESP32_SCADA_Node1")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
  delay(1000);
}