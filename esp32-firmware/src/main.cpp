#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <arduinoFFT.h>
#include "config.h"

// --- PARAMETRY POMIAROWE ---
#define SAMPLES 512
#define SAMPLING_FREQ 3000 
#define MAX_CALC_HARMONIC 25
#define PIN_U 33
#define PIN_I 35

const float vCoeff = 0.550;
const float iCoeff = 0.0096;
const float NOISE_GATE_RMS = 0.01;
const float ADC_DEAD_ZONE = 4.0;
const float THD_I_THRESHOLD = NOISE_GATE_RMS * 1.414 * 0.15;  // ~0.0021A - synchronized with NOISE_GATE (15% margin)

// Zero-crossing detection parameters
const float ZERO_CROSSING_THRESHOLD = 5.0;  // LSB units (histereza ~2.75V po skalowaniu)
const int MAX_ZERO_CROSSINGS = 20;          // Bufor na ~10 cykli przy 50 Hz
const int MIN_ZERO_CROSSINGS = 2;           // Min 2 przejścia = 1 pełny okres (obniżone z 3)

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
    // Szybki, pojedynczy odczyt dla zachowania precyzji bazy czasu
    rawBufferU[sampleIdx] = analogRead(PIN_U);
    rawBufferI[sampleIdx] = analogRead(PIN_I);
    
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

/**
 * Oblicz częstotliwość AC używając prostej zero-crossing detection
 * BRAK interpolacji - bezpośredni pomiar między próbkami
 *
 * @param rawBuffer Surowe próbki ADC (przed skalowaniem)
 * @param numSamples Liczba próbek w buforze
 * @param dcOffset DC offset do usunięcia
 * @return Częstotliwość w Hz (lub 0.0 jeśli detekcja zawiodła)
 */
float calculateFrequencyFromZeroCrossing(volatile int* rawBuffer, int numSamples, float dcOffset) {
    int zeroCrossingSamples[MAX_ZERO_CROSSINGS];  // Indeksy próbek, nie czasy
    int crossingCount = 0;

    // Debug: znajdź min/max wartości sygnału po usunięciu DC
    // float minVal = 9999, maxVal = -9999;
    // for (int i = 0; i < numSamples; i++) {
    //     float v = (rawBuffer[i] - dcOffset);
    //     if (v < minVal) minVal = v;
    //     if (v > maxVal) maxVal = v;
    // }

    // Wykryj rising edge zero-crossings (bez interpolacji)
    for (int i = 1; i < numSamples && crossingCount < MAX_ZERO_CROSSINGS; i++) {
        float v_prev = (rawBuffer[i-1] - dcOffset);  // Raw ADC units
        float v_curr = (rawBuffer[i] - dcOffset);

        // Rising edge: negative → positive (z histerezą)
        if (v_prev < -ZERO_CROSSING_THRESHOLD && v_curr > ZERO_CROSSING_THRESHOLD) {
            zeroCrossingSamples[crossingCount++] = i;  // Zapisz tylko indeks próbki
        }
    }

    // Debug output
    // Serial.printf("[ZC-DEBUG] DC offset=%.1f, min=%.1f, max=%.1f, crossings=%d\n",
    //               dcOffset, minVal, maxVal, crossingCount);

    // Potrzeba min 2 przejścia dla wiarygodnej średniej (1 pełny okres)
    if (crossingCount < MIN_ZERO_CROSSINGS) {
        // Serial.printf("[ZC-DEBUG] Insufficient crossings (%d < %d)\n", crossingCount, MIN_ZERO_CROSSINGS);
        return 0.0;
    }

    // Oblicz średni okres z kolejnych przejść
    // Okres = różnica indeksów × 333 μs na próbkę
    int totalSamples = 0;
    for (int i = 1; i < crossingCount; i++) {
        totalSamples += (zeroCrossingSamples[i] - zeroCrossingSamples[i-1]);
    }

    float avgSamples = (float)totalSamples / (float)(crossingCount - 1);
    float avgPeriodUs = avgSamples * 333.0;  // 333 μs = okres próbkowania
    float frequency = 1000000.0 / avgPeriodUs;  // Konwersja μs na Hz

    // Serial.printf("[ZC-DEBUG] avgSamples=%.1f, frequency=%.2f Hz\n", avgSamples, frequency);

    // Sanity check: odrzuć częstotliwości poza zakresem
    if (frequency < 45.0 || frequency > 55.0) {
        // Serial.printf("[ZC-DEBUG] Frequency out of range (%.2f Hz)\n", frequency);
        return 0.0;
    }

    return frequency;
}

void processingTask(void * pvParameters) {
  for(;;) {
    if (dataReady) {
      unsigned long currentTime = millis();
      if (currentTime - lastPublishTime >= 3000) {
        lastPublishTime = currentTime;

        // 1. DC Offset i Wygładzanie (Oversampling programowy)
        double sumU = 0, sumI = 0;
        for (int i = 0; i < SAMPLES; i++) { 
            sumU += rawBufferU[i]; 
            sumI += rawBufferI[i]; 
        }
        float offsetU = sumU / SAMPLES;
        float offsetI = sumI / SAMPLES;

        // 2. Przygotowanie danych i RMS
        double sumU2 = 0, sumI2 = 0, sumP = 0;

        // Store raw waveform samples for frontend (BEFORE FFT modifies vReal/iReal arrays)
        double waveformV_out[SAMPLES];
        double waveformI_out[SAMPLES];

        for (int i = 0; i < SAMPLES; i++) {
            float uScaled = (rawBufferU[i] - offsetU) * vCoeff;
            float iRaw = (float)rawBufferI[i] - offsetI;
            if (abs(iRaw) < ADC_DEAD_ZONE) iRaw = 0;
            float iScaled = iRaw * iCoeff;

            vReal[i] = (double)uScaled; vImag[i] = 0;
            iReal[i] = (double)iScaled; iImag[i] = 0;

            // Save raw samples for waveform display
            waveformV_out[i] = uScaled;
            waveformI_out[i] = iScaled;

            sumU2 += uScaled * uScaled;
            sumI2 += iScaled * iScaled;
            sumP += uScaled * iScaled;
        }

        float vRMS = sqrt(sumU2 / SAMPLES);
        float iRMS = sqrt(sumI2 / SAMPLES);
        float pActive = sumP / SAMPLES;

        // 3. Pomiar częstotliwości: Zero-crossing (primary) z FFT fallback
        double freq = calculateFrequencyFromZeroCrossing((volatile int*)rawBufferU, SAMPLES, offsetU);
        bool freqFromZeroCrossing = (freq > 0.0);

        // Fallback na FFT jeśli zero-crossing zawiódł
        if (!freqFromZeroCrossing) {
            FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
            FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
            vReal[0] = 0;
            freq = FFT.majorPeak(vReal, SAMPLES, SAMPLING_FREQ);
            Serial.println("[WARN] Zero-crossing failed, using FFT frequency");
        } else {
            // Zero-crossing sukces, ale nadal uruchom FFT dla harmonicznych
            FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
            FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
            vReal[0] = 0;
        }

        int baseBin = round(freq / (SAMPLING_FREQ / (double)SAMPLES));
        if (baseBin < 1) baseBin = 1;

        // Phase of fundamental H1 for voltage (before magnitude conversion)
        double phaseV_H1 = atan2(vImag[baseBin], vReal[baseBin]);

        // Now convert to magnitude
        FFT.complexToMagnitude(vReal, vImag, SAMPLES);
        double hV_base = (vReal[baseBin] / SAMPLES) * 2.0;
        double sumSqHarmonicsV = 0;
        double harmonicsV_out[MAX_CALC_HARMONIC + 1] = {0};

        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            int bin = baseBin * h;
            double amp = (bin < SAMPLES/2) ? (vReal[bin] / SAMPLES) * 2.0 : 0;
            harmonicsV_out[h] = amp;
            if (h > 1) sumSqHarmonicsV += pow(amp, 2);
        }

        // 4. FFT Prądu
        FFT.windowing(iReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(iReal, iImag, SAMPLES, FFT_FORWARD);

        // Phase of fundamental H1 for current (before magnitude conversion)
        double phaseI_H1 = atan2(iImag[baseBin], iReal[baseBin]);

        // Now convert to magnitude
        FFT.complexToMagnitude(iReal, iImag, SAMPLES);
        iReal[0] = 0; // DC removal dla prądu
        double hI_base = (iReal[baseBin] / SAMPLES) * 2.0;
        double sumSqHarmonicsI = 0;
        double harmonicsI_out[MAX_CALC_HARMONIC + 1] = {0};

        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            int bin = baseBin * h;
            double amp = (bin < SAMPLES/2) ? (iReal[bin] / SAMPLES) * 2.0 : 0;
            harmonicsI_out[h] = amp;
            if (h > 1) sumSqHarmonicsI += pow(amp, 2);
        }

        // 5. Power Calculations (Budeanu Theory)
        // For distorted waveforms we must distinguish between:
        // - Q1: Reactive power of fundamental (H1) - from phase shift
        // - D: Distortion power - from harmonics
        // Reference: IEEE Std 1459-2010, Budeanu power theory

        float sApparent = vRMS * iRMS;  // S = U_rms * I_rms (always valid)

        // Phase shift of fundamental (H1 only)
        double phaseShift_H1 = phaseI_H1 - phaseV_H1;

        // Reactive power of fundamental Q1 = U1 * I1 * sin(φ1)
        // U1 = hV_base (peak), I1 = hI_base (peak)
        // Convert peak to RMS: U1_rms = hV_base / sqrt(2), I1_rms = hI_base / sqrt(2)
        float u1_rms = hV_base / 1.41421356;
        float i1_rms = hI_base / 1.41421356;
        float qReactive_H1 = u1_rms * i1_rms * sin(phaseShift_H1);

        // Distortion power D = sqrt(S^2 - P^2 - Q1^2)
        float s2 = pow(sApparent, 2);
        float p2 = pow(pActive, 2);
        float q12 = pow(qReactive_H1, 2);
        float d2 = s2 - p2 - q12;
        float powerDistortion = (d2 > 0) ? sqrt(d2) : 0;

        // Power factor λ = P/S (NOT cos(φ)!)
        // cos(φ) is only valid for sinusoidal waveforms
        float powerFactor = (sApparent > 0.05) ? abs(pActive) / sApparent : 1.0;
        if (powerFactor > 1.0) powerFactor = 1.0;

        // Noise gate - zero out power readings for very low currents
        if (iRMS < NOISE_GATE_RMS) {
            iRMS = 0; pActive = 0; sApparent = 0;
            qReactive_H1 = 0; powerDistortion = 0; powerFactor = 1.0;
            // NOTE: hI_base and harmonics are NOT zeroed here - they're needed for THD calculation
            // THD threshold check will determine if THD should be calculated
            for(int i=1; i<=MAX_CALC_HARMONIC; i++) harmonicsI_out[i] = 0;
        }

        float roundedFreq = round(freq * 10) / 10.0;
        bool isFreqValid = (freq >= 45.0 && freq <= 55.0);
        if (!isFreqValid) {
            Serial.printf("[WARNING] Invalid Frequency: %.2f Hz (source: %s)\n",
                          freq, freqFromZeroCrossing ? "zero-crossing" : "FFT");
        }

        // 6. JSON (zgodny z adnotacjami @JsonProperty w Twoim DTO)
        JsonDocument doc;
        doc["v_rms"] = round(vRMS * 10) / 10.0;
        doc["i_rms"] = round(iRMS * 1000) / 1000.0;
        doc["p_act"] = round(abs(pActive) * 10) / 10.0;
        doc["power_apparent"] = round(sApparent * 10) / 10.0;
        doc["power_reactive"] = round(abs(qReactive_H1) * 10) / 10.0;  // Q1 - reactive power of fundamental only
        doc["power_distortion"] = round(powerDistortion * 10) / 10.0;  // D - distortion power from harmonics
        doc["power_factor"] = round(powerFactor * 100) / 100.0;        // λ = P/S (NOT cos(φ)!)
        doc["freq"] = roundedFreq;
        doc["freq_valid"] = isFreqValid; // Dodatkowa flaga dla backendu

        doc["thd_v"] = (hV_base > 10) ? (sqrt(sumSqHarmonicsV) / hV_base) * 100.0 : 0;
        doc["thd_i"] = (hI_base > THD_I_THRESHOLD) ? (sqrt(sumSqHarmonicsI) / hI_base) * 100.0 : 0;

        JsonArray hV_arr = doc["harm_v"].to<JsonArray>();
        JsonArray hI_arr = doc["harm_i"].to<JsonArray>();
        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            hV_arr.add(round(harmonicsV_out[h] * 100) / 100.0);
            hI_arr.add(round(harmonicsI_out[h] * 1000) / 1000.0);
        }

        // Add raw waveform data (2 cycles ~120 samples for good visualization)
        JsonArray waveV_arr = doc["waveform_v"].to<JsonArray>();
        JsonArray waveI_arr = doc["waveform_i"].to<JsonArray>();
        int samplesPerCycle = round(SAMPLING_FREQ / freq);  // Use detected frequency, not hardcoded 50Hz
        int samplesToSend = samplesPerCycle * 2;
        if (samplesToSend > SAMPLES) samplesToSend = SAMPLES;

        for (int i = 0; i < samplesToSend; i++) {
            waveV_arr.add(round(waveformV_out[i] * 100) / 100.0);  // 2 decimals for voltage
            waveI_arr.add(round(waveformI_out[i] * 1000) / 1000.0);  // 3 decimals for current
        }

        char buffer[2048];
        serializeJson(doc, buffer);
        if (client.connected()) client.publish(MQTT_TOPIC, buffer);
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
  client.setBufferSize(2048);  // Increased to handle waveform arrays

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  timer = timerBegin(0, 80, true);
  timerAttachInterrupt(timer, &onTimer, true);
  timerAlarmWrite(timer, 333, true);
  timerAlarmEnable(timer);

  xTaskCreatePinnedToCore(processingTask, "Proc", 15000, NULL, 1, NULL, 1);
}

void loop() {
  if (!client.connected()) {
    if (client.connect("ESP32_SCADA_Node1")) Serial.println("MQTT Connected");
    else delay(5000);
  }
  delay(1000);
}
