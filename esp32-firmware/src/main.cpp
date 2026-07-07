#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <arduinoFFT.h>
#include <driver/adc.h>
#include <hal/adc_ll.h>
#include "config.h"

// --- PARAMETRY POMIAROWE ---
#define SAMPLES 1024
#define SAMPLING_FREQ 10000
#define WAVEFORM_EXPORT_PERIODS 2
#define MAX_CALC_HARMONIC 25
#define PIN_U 33
#define PIN_I 35
#define ADC_CHANNEL_U ADC1_CHANNEL_5
#define ADC_CHANNEL_I ADC1_CHANNEL_7
#define ADC_PATTERN_LEN 2
#define ADC_TOTAL_SAMPLE_FREQ (SAMPLING_FREQ * ADC_PATTERN_LEN)
#define ADC_DMA_FRAME_BYTES 1024

const float vCoeff = 0.550;
const float iCoeff = 0.0283;
const float NOISE_GATE_RMS = 0.15;  // Dostosowane do iCoeff=0.0283 (szum ADC ~0.10A wymaga wyższego progu)
const float ADC_DEAD_ZONE = 4.0;
const float THD_I_THRESHOLD = NOISE_GATE_RMS * 1.414 * 0.15;  // ~0.0106A - synchronized with NOISE_GATE (15% margin)
const bool SMOOTH_WAVEFORM_CURRENT = true;

// Zero-crossing detection parameters
const float ZERO_CROSSING_THRESHOLD = 8.0;  // LSB units (optymalna histereza ~4.4V - kompromis między czułością a odpornością na szum)
const int MAX_ZERO_CROSSINGS = 20;          // Bufor na ~10 cykli przy 50 Hz
const int MIN_ZERO_CROSSINGS = 2;           // Min 2 przejścia = 1 pełny okres (obniżone z 3)

volatile int rawBufferU[SAMPLES];
volatile int rawBufferI[SAMPLES];
volatile bool dataReady = false;
portMUX_TYPE frameMux = portMUX_INITIALIZER_UNLOCKED;

double vReal[SAMPLES], vImag[SAMPLES];
double iReal[SAMPLES], iImag[SAMPLES];
double waveformV_out[SAMPLES];
double waveformI_out[SAMPLES];
ArduinoFFT<double> FFT = ArduinoFFT<double>();

WiFiClient espClient;
PubSubClient client(espClient);
unsigned long lastPublishTime = 0;
double lastValidFreqZC = 50.0;  // Ostatnia prawidłowa częstotliwość z zero-crossing (fallback)

void setup_wifi() {
    Serial.printf("\nConnecting to %s...", WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
    Serial.println("\nWiFi Connected.");
}

void setup_adc_dma() {
    adc1_config_width(ADC_WIDTH_BIT_12);
    adc1_config_channel_atten(ADC_CHANNEL_U, ADC_ATTEN_DB_12);
    adc1_config_channel_atten(ADC_CHANNEL_I, ADC_ATTEN_DB_12);

    adc_digi_init_config_t initConfig = {
        .max_store_buf_size = ADC_DMA_FRAME_BYTES * 4,
        .conv_num_each_intr = ADC_DMA_FRAME_BYTES,
        .adc1_chan_mask = BIT(ADC_CHANNEL_U) | BIT(ADC_CHANNEL_I),
        .adc2_chan_mask = 0,
    };

    esp_err_t err = adc_digi_initialize(&initConfig);
    if (err != ESP_OK) {
        Serial.printf("[ADC-DMA] initialize failed: %d\n", err);
        while (true) delay(1000);
    }

    static adc_digi_pattern_config_t adcPattern[ADC_PATTERN_LEN] = {};
    adcPattern[0].atten = ADC_ATTEN_DB_12;
    adcPattern[0].channel = ADC_CHANNEL_U;
    adcPattern[0].unit = ADC_NUM_1;
    adcPattern[0].bit_width = SOC_ADC_DIGI_MAX_BITWIDTH;
    adcPattern[1].atten = ADC_ATTEN_DB_12;
    adcPattern[1].channel = ADC_CHANNEL_I;
    adcPattern[1].unit = ADC_NUM_1;
    adcPattern[1].bit_width = SOC_ADC_DIGI_MAX_BITWIDTH;

    adc_digi_configuration_t digConfig = {
        .conv_limit_en = true,
        .conv_limit_num = 255,
        .pattern_num = ADC_PATTERN_LEN,
        .adc_pattern = adcPattern,
        .sample_freq_hz = ADC_TOTAL_SAMPLE_FREQ,
        .conv_mode = ADC_CONV_SINGLE_UNIT_1,
        .format = ADC_DIGI_OUTPUT_FORMAT_TYPE1,
    };

    err = adc_digi_controller_configure(&digConfig);
    if (err != ESP_OK) {
        Serial.printf("[ADC-DMA] controller config failed: %d\n", err);
        while (true) delay(1000);
    }

    err = adc_digi_start();
    if (err != ESP_OK) {
        Serial.printf("[ADC-DMA] start failed: %d\n", err);
        while (true) delay(1000);
    }

    Serial.printf("[ADC-DMA] started: %d Hz per channel, %d Hz total scan rate\n",
                  SAMPLING_FREQ, ADC_TOTAL_SAMPLE_FREQ);
}

void adcSamplingTask(void * pvParameters) {
    static uint8_t dmaBuffer[ADC_DMA_FRAME_BYTES];
    static int frameU[SAMPLES];
    static int frameI[SAMPLES];
    int idxU = 0;
    int idxI = 0;
    auto resetPartialFrame = [&]() {
        idxU = 0;
        idxI = 0;
    };

    for (;;) {
        uint32_t bytesRead = 0;
        esp_err_t err = adc_digi_read_bytes(dmaBuffer, sizeof(dmaBuffer), &bytesRead, 1000);
        if (err == ESP_ERR_TIMEOUT) {
            resetPartialFrame();
            continue;
        }
        if (err == ESP_ERR_INVALID_STATE) {
            resetPartialFrame();
            Serial.println("[ADC-DMA] overflow: sampling faster than processing");
            vTaskDelay(pdMS_TO_TICKS(10));
            continue;
        }
        if (err != ESP_OK) {
            resetPartialFrame();
            Serial.printf("[ADC-DMA] read failed: %d\n", err);
            vTaskDelay(pdMS_TO_TICKS(100));
            continue;
        }

        int sampleCount = bytesRead / sizeof(adc_digi_output_data_t);
        adc_digi_output_data_t *samples = (adc_digi_output_data_t *)dmaBuffer;
        for (int i = 0; i < sampleCount; i++) {
            uint8_t channel = samples[i].type1.channel;
            uint16_t value = samples[i].type1.data;

            if (channel == ADC_CHANNEL_U && idxU < SAMPLES) {
                frameU[idxU++] = value;
            } else if (channel == ADC_CHANNEL_I && idxI < SAMPLES) {
                frameI[idxI++] = value;
            }

            if (idxU >= SAMPLES && idxI >= SAMPLES) {
                portENTER_CRITICAL(&frameMux);
                if (!dataReady) {
                    for (int j = 0; j < SAMPLES; j++) {
                        rawBufferU[j] = frameU[j];
                        rawBufferI[j] = frameI[j];
                    }
                    dataReady = true;
                }
                portEXIT_CRITICAL(&frameMux);
                idxU = 0;
                idxI = 0;
            }
        }
    }
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

    // Stateful hysteresis: at higher sample rates the signal may spend several
    // samples inside the deadband, so consecutive-sample crossing is unreliable.
    bool armedForRising = false;
    for (int i = 0; i < numSamples && crossingCount < MAX_ZERO_CROSSINGS; i++) {
        float v_curr = (rawBuffer[i] - dcOffset);  // Raw ADC units

        if (v_curr < -ZERO_CROSSING_THRESHOLD) {
            armedForRising = true;
        } else if (armedForRising && v_curr > ZERO_CROSSING_THRESHOLD) {
            zeroCrossingSamples[crossingCount++] = i;  // Zapisz tylko indeks próbki
            armedForRising = false;
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

    // Oblicz średni okres z kolejnych przejść z filtracją outlierów.

    // Krok 1: Oblicz wstępną średnią do określenia zakresu outlierów
    int totalSamples = 0;
    for (int i = 1; i < crossingCount; i++) {
        totalSamples += (zeroCrossingSamples[i] - zeroCrossingSamples[i-1]);
    }
    float preliminaryAvg = (float)totalSamples / (float)(crossingCount - 1);

    // Krok 2: Odrzuć outliery (odstępy > ±25% od średniej)
    // Dla 50 Hz: oczekiwane ~60 próbek, zakres akceptowalny: 45-75 próbek (40-66.7 Hz)
    float minAcceptable = preliminaryAvg * 0.75;  // -25%
    float maxAcceptable = preliminaryAvg * 1.25;  // +25%

    int validSamples = 0;
    int validCount = 0;
    for (int i = 1; i < crossingCount; i++) {
        int interval = zeroCrossingSamples[i] - zeroCrossingSamples[i-1];
        if (interval >= minAcceptable && interval <= maxAcceptable) {
            validSamples += interval;
            validCount++;
        }
    }

    // Jeśli zbyt mało prawidłowych przejść po filtracji, zwróć błąd
    if (validCount < MIN_ZERO_CROSSINGS - 1) {
        return 0.0;  // Za mało prawidłowych odstępów
    }

    float avgSamples = (float)validSamples / (float)validCount;
    float avgPeriodUs = avgSamples * (1000000.0 / SAMPLING_FREQ);
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
  int *processingBufferU = (int *)malloc(SAMPLES * sizeof(int));
  int *processingBufferI = (int *)malloc(SAMPLES * sizeof(int));
  if (processingBufferU == nullptr || processingBufferI == nullptr) {
    Serial.println("[ERROR] failed to allocate processing frame buffers");
    while (true) vTaskDelay(pdMS_TO_TICKS(1000));
  }

  for(;;) {
    unsigned long currentTime = millis();
    if (currentTime - lastPublishTime >= 3000) {
      bool frameReady = false;
      portENTER_CRITICAL(&frameMux);
      if (dataReady) {
        for (int i = 0; i < SAMPLES; i++) {
          processingBufferU[i] = rawBufferU[i];
          processingBufferI[i] = rawBufferI[i];
        }
        dataReady = false;
        frameReady = true;
      }
      portEXIT_CRITICAL(&frameMux);

      if (frameReady) {
        lastPublishTime = currentTime;

        // 1. DC Offset i Wygładzanie (Oversampling programowy)
        double sumU = 0, sumI = 0;
        for (int i = 0; i < SAMPLES; i++) {
            sumU += processingBufferU[i];
            sumI += processingBufferI[i];
        }
        float offsetU = sumU / SAMPLES;
        float offsetI = sumI / SAMPLES;

        // 2. Przygotowanie danych i RMS
        double sumU2 = 0, sumI2 = 0, sumP = 0;

        for (int i = 0; i < SAMPLES; i++) {
            float uScaled = (processingBufferU[i] - offsetU) * vCoeff;
            float iRaw = (float)processingBufferI[i] - offsetI;
            float iDisplayScaled = iRaw * iCoeff;
            float iCalcRaw = iRaw;
            if (abs(iCalcRaw) < ADC_DEAD_ZONE) iCalcRaw = 0;
            float iScaled = iCalcRaw * iCoeff;

            vReal[i] = (double)uScaled; vImag[i] = 0;
            iReal[i] = (double)iScaled; iImag[i] = 0;

            // Save raw samples for waveform display
            waveformV_out[i] = uScaled;
            waveformI_out[i] = iDisplayScaled;

            sumU2 += uScaled * uScaled;
            sumI2 += iScaled * iScaled;
            sumP += uScaled * iScaled;
        }

        if (SMOOTH_WAVEFORM_CURRENT && SAMPLES > 2) {
            double prev = waveformI_out[0];
            double curr = waveformI_out[1];
            for (int i = 1; i < SAMPLES - 1; i++) {
                double next = waveformI_out[i + 1];
                waveformI_out[i] = (prev + 2.0 * curr + next) / 4.0;
                prev = curr;
                curr = next;
            }
        }

        float vRMS = sqrt(sumU2 / SAMPLES);
        float iRMS = sqrt(sumI2 / SAMPLES);
        float pActive = sumP / SAMPLES;

        // 3. Pomiar częstotliwości: Zero-crossing (primary) z FFT fallback
        double freq = calculateFrequencyFromZeroCrossing(processingBufferU, SAMPLES, offsetU);
        bool freqFromZeroCrossing = (freq > 0.0);

        // Fallback na FFT jeśli zero-crossing zawiódł
        if (!freqFromZeroCrossing) {
            // Zero-crossing zawiódł - użyj ostatniej dobrej częstotliwości i skipnij pomiar
            Serial.printf("[WARN] Zero-crossing failed, skipping measurement (last valid: %.1f Hz)\n", lastValidFreqZC);
            continue;  // Pomiń ten cykl pomiaru, nie wysyłaj danych z FFT fallback
        }

        // Zero-crossing sukces - zapisz jako ostatnią dobrą częstotliwość
        lastValidFreqZC = freq;

        // Uruchom FFT dla harmonicznych
        FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
        FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
        vReal[0] = 0;

        double binWidth = SAMPLING_FREQ / (double)SAMPLES;
        auto harmonicBin = [&](int h) {
            int bin = round((freq * h) / binWidth);
            return (bin < 1) ? 1 : bin;
        };
        int baseBin = harmonicBin(1);

        // Phase of fundamental H1 for voltage (before magnitude conversion)
        double phaseV_H1 = atan2(vImag[baseBin], vReal[baseBin]);

        // Now convert to magnitude
        FFT.complexToMagnitude(vReal, vImag, SAMPLES);
        double hV_base = (vReal[baseBin] / SAMPLES) * 2.0;
        double sumSqHarmonicsV = 0;
        double harmonicsV_out[MAX_CALC_HARMONIC + 1] = {0};

        for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
            int bin = harmonicBin(h);
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
            int bin = harmonicBin(h);
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
        bool powerFactorDefined = sApparent > 0.05;
        float powerFactor = powerFactorDefined ? abs(pActive) / sApparent : 0.0;
        if (powerFactor > 1.0) powerFactor = 1.0;

        // Noise gate - zero out power readings for very low currents
        if (iRMS < NOISE_GATE_RMS) {
            iRMS = 0; pActive = 0; sApparent = 0;
            qReactive_H1 = 0; powerDistortion = 0; powerFactor = 0.0; powerFactorDefined = false;
            // NOTE: hI_base and harmonics are NOT zeroed here - they're needed for THD calculation
            // THD threshold check will determine if THD should be calculated
            for(int i=1; i<=MAX_CALC_HARMONIC; i++) harmonicsI_out[i] = 0;
            for(int i=0; i<SAMPLES; i++) waveformI_out[i] = 0;
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
        doc["power_factor"] = powerFactor;                            // λ = P/S (NOT cos(φ)!)
        if (!powerFactorDefined) {
            doc["power_factor"] = nullptr;  // Undefined when S = 0
        }
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

        // Add raw waveform data at the full sampling rate. Export only two periods
        // to keep MQTT payload bounded while improving chart detail.
        JsonArray waveV_arr = doc["waveform_v"].to<JsonArray>();
        JsonArray waveI_arr = doc["waveform_i"].to<JsonArray>();
        int samplesPerCycle = round(SAMPLING_FREQ / freq);  // Use detected frequency, not hardcoded 50 Hz
        int samplesToSend = WAVEFORM_EXPORT_PERIODS * samplesPerCycle + 1;
        int maxSamplesToSend = SAMPLES;
        if (samplesToSend > maxSamplesToSend) samplesToSend = maxSamplesToSend;

        for (int i = 0; i < samplesToSend; i++) {
            waveV_arr.add(round(waveformV_out[i] * 100) / 100.0);  // 2 decimals for voltage
            waveI_arr.add(round(waveformI_out[i] * 1000) / 1000.0);  // 3 decimals for current
        }

        static char buffer[8192];  // Static (BSS) to avoid stack overflow with waveform arrays.
        size_t len = serializeJson(doc, buffer, sizeof(buffer));
        if (len >= sizeof(buffer)) {
            Serial.printf("[ERROR] JSON buffer overflow! Size: %d, Capacity: %d\n", len, sizeof(buffer));
        } else {
            if (client.connected()) client.publish(MQTT_TOPIC, buffer);
            // Serial.println(buffer);  // Commented to reduce serial clutter - JSON sent via MQTT
            Serial.printf("[DATA] v=%.1fV i=%.3fA p=%.1fW f=%.1fHz%s (samples: %d, json: %d bytes)\n",
                          round(vRMS * 10) / 10.0,
                          round(iRMS * 1000) / 1000.0,
                          round(abs(pActive) * 10) / 10.0,
                          roundedFreq,
                          freqFromZeroCrossing ? " [ZC]" : " [FFT]",
                          samplesToSend,
                          len);
        }
      }
    }
    client.loop();
    vTaskDelay(pdMS_TO_TICKS(10)); 
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(MQTT_SERVER, 1883);
  if (!client.setBufferSize(8192)) {  // Increased to handle waveform arrays.
    Serial.println("[MQTT] failed to allocate 8192-byte packet buffer");
    while (true) delay(1000);
  }

  setup_adc_dma();

  xTaskCreatePinnedToCore(adcSamplingTask, "ADCSampling", 4096, NULL, 2, NULL, 0);
  xTaskCreatePinnedToCore(processingTask, "Proc", 15000, NULL, 1, NULL, 1);
}

void loop() {
  if (!client.connected()) {
    if (client.connect("ESP32_SCADA_Node1")) Serial.println("MQTT Connected");
    else delay(5000);
  }
  delay(1000);
}
