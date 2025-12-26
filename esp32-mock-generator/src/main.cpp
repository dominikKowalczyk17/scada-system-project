#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <arduinoFFT.h>
#include "config.h"

// --- PARAMETRY POMIAROWE ---
#define SAMPLES 512
#define SAMPLING_FREQ 6000 
#define MAX_CALC_HARMONIC 25
#define PIN_U 33
#define PIN_I 35

// --- STAŁE KALIBRACJI (Zweryfikowane) ---
const float vCoeff = 0.550;     
const float iCoeff = 0.0096;
const float NOISE_GATE_RMS = 0.05;
const float ADC_DEAD_ZONE = 4.0;

// --- ZMIENNE SYSTEMOWE ---
volatile int rawBufferU[SAMPLES];
volatile int rawBufferI[SAMPLES];
volatile bool dataReady = false;
volatile int sampleIdx = 0;

double vReal[SAMPLES], vImag[SAMPLES];
double iReal[SAMPLES], iImag[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>();

WiFiClient espClient;
PubSubClient client(espClient);
hw_timer_t * timer = NULL;
unsigned long lastPublishTime = 0;

void IRAM_ATTR onTimer() {
  if (!dataReady) {
    // Oversampling: 2 odczyty = lepszy SNR
    rawBufferU[sampleIdx] = (analogRead(PIN_U) + analogRead(PIN_U)) >> 1;
    rawBufferI[sampleIdx] = (analogRead(PIN_I) + analogRead(PIN_I)) >> 1;
    
    sampleIdx++;
    if (sampleIdx >= SAMPLES) {
      sampleIdx = 0;
      dataReady = true;
    }
  }
}

void setup_wifi() {
    Serial.printf("\nConnecting to %s...", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWiFi Connected.");
}

void processingTask(void * pvParameters) {
  for(;;) {
    if (dataReady) {
      unsigned long currentTime = millis();
      if (currentTime - lastPublishTime >= 3000) {
        lastPublishTime = currentTime;

        // 1. DC Offset Removal
        double sumU = 0, sumI = 0;
        for (int i = 0; i < SAMPLES; i++) { sumU += rawBufferU[i]; sumI += rawBufferI[i]; }
        float offsetU = sumU / SAMPLES;
        float offsetI = sumI / SAMPLES;

        // 2. Przygotowanie danych i RMS
        double sumU2 = 0, sumI2 = 0, sumP = 0;
        for (int i = 0; i < SAMPLES; i++) {
            float uScaled = (rawBufferU[i] - offsetU) * vCoeff;
            float iRaw = (float)rawBufferI[i] - offsetI;
            
            if (abs(iRaw) < ADC_DEAD_ZONE) iRaw = 0; 
            float iScaled = iRaw * iCoeff;
            
            vReal[i] = (double)uScaled; vImag[i] = 0;
            iReal[i] = (double)iScaled; iImag[i] = 0;
            
            sumU2 += uScaled * uScaled;
            sumI2 += iScaled * iScaled;
            sumP += uScaled * iScaled;
        }

        float vRMS = sqrt(sumU2 / SAMPLES);
        float iRMS = sqrt(sumI2 / SAMPLES);
        float pActive = sumP / SAMPLES;

        // 3. FFT Napięcia (Częstotliwość i THD_V)
        FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
        FFT.complexToMagnitude(vReal, vImag, SAMPLES);
        
        double freq = FFT.majorPeak(vReal, SAMPLES, SAMPLING_FREQ);
        int baseBin = round(freq / (SAMPLING_FREQ / (double)SAMPLES));
        if (baseBin < 1) baseBin = 1;

        double hV_base = (vReal[baseBin] / SAMPLES) * 2.0;
        double sumSqHarmonicsV = 0;
        double harmonicsV_out[6]; // Do wysłania w JSON

        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            int bin = baseBin * h;
            double amp = (bin < SAMPLES/2) ? (vReal[bin] / SAMPLES) * 2.0 : 0;
            if (h <= 5) harmonicsV_out[h] = amp;
            if (h > 1) sumSqHarmonicsV += pow(amp, 2);
        }

        // 4. FFT Prądu (THD_I)
        FFT.windowing(iReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(iReal, iImag, SAMPLES, FFT_FORWARD);
        FFT.complexToMagnitude(iReal, iImag, SAMPLES);

        double hI_base = (iReal[baseBin] / SAMPLES) * 2.0;
        double sumSqHarmonicsI = 0;
        double harmonicsI_out[6];

        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            int bin = baseBin * h;
            double amp = (bin < SAMPLES/2) ? (iReal[bin] / SAMPLES) * 2.0 : 0;
            if (h <= 5) harmonicsI_out[h] = amp;
            if (h > 1) sumSqHarmonicsI += pow(amp, 2);
        }

        // 5. Obliczanie parametrów mocy i Noise Gate
        float sApparent = vRMS * iRMS;
        float qReactive = (sApparent > abs(pActive)) ? sqrt(pow(sApparent, 2) - pow(pActive, 2)) : 0;
        float cosPhi = (sApparent > 0.1) ? abs(pActive) / sApparent : 1.0;

        if (iRMS < NOISE_GATE_RMS) {
            iRMS = 0; pActive = 0; sApparent = 0; qReactive = 0; cosPhi = 1.0;
            sumSqHarmonicsI = 0; hI_base = 0;
            for(int i=1; i<=5; i++) harmonicsI_out[i] = 0;
        }

        // 6. Budowanie JSON (Oszczędność miejsca)
        StaticJsonDocument<1024> doc;
        doc["v_rms"] = round(vRMS * 10) / 10.0;
        doc["i_rms"] = round(iRMS * 1000) / 1000.0;
        doc["p_act"] = abs(round(pActive * 10) / 10.0);
        doc["cos_phi"] = round(cosPhi * 100) / 100.0;
        doc["freq"] = (freq > 45 && freq < 55) ? round(freq * 10) / 10.0 : 50.0;
        
        doc["thd_v"] = (hV_base > 10) ? (sqrt(sumSqHarmonicsV) / hV_base) * 100.0 : 0;
        doc["thd_i"] = (hI_base > 0.01) ? (sqrt(sumSqHarmonicsI) / hI_base) * 100.0 : 0;

        JsonArray hV_arr = doc.createNestedArray("harm_v");
        JsonArray hI_arr = doc.createNestedArray("harm_i");
        for (int h = 1; h <= 5; h++) {
            hV_arr.add(round(harmonicsV_out[h] * 100) / 100.0);
            hI_arr.add(round(harmonicsI_out[h] * 1000) / 1000.0);
        }

        char buffer[1024];
        serializeJson(doc, buffer);
        if (client.connected()) client.publish(MQTT_TOP, buffer);
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
  client.setServer(MQTT_SERVER, 1883);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  timer = timerBegin(0, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 166, true);
  timerAlarmEnable(timer);

  xTaskCreatePinnedToCore(processingTask, "Proc", 10000, NULL, 1, NULL, 1);
}

void loop() {
  if (!client.connected()) {
    if (client.connect("ESP32_SCADA_Node1")) Serial.println("MQTT Connected");
    else delay(5000);
  }
  delay(1000);
}