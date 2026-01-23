# Analiza Modułu: ESP32 Firmware

**Plik:** `esp32-firmware/src/main.cpp`
**Linie kodu:** 264
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Architektury

### 1.1 Schemat Przepływu Danych

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ADC (12-bit)  │────▶│   ISR Timer     │────▶│  Raw Buffers   │
│   PIN_U (33)    │     │   (3000 Hz)     │     │  [512 samples]  │
│   PIN_I (35)    │     └─────────────────┘     └────────┬────────┘
└─────────────────┘                                      │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MQTT Broker   │◀────│  JSON Builder   │◀────│  Processing     │
│   (QoS 0)       │     │  (ArduinoJson)  │     │  Task (Core 1)  │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                          ┌──────────────┼──────────────┐
                                          ▼              ▼              ▼
                                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                                    │   RMS    │  │   FFT    │  │  Budeanu │
                                    │  Calc    │  │ Hamming  │  │  Power   │
                                    └──────────┘  └──────────┘  └──────────┘
```

### 1.2 Podział na Rdzenie (Dual-Core ESP32)

| Rdzeń | Funkcja | Priorytet |
|-------|---------|-----------|
| Core 0 | WiFi stack, MQTT reconnect (`loop()`) | System |
| Core 1 | Przetwarzanie sygnału (`processingTask`) | 1 |
| ISR | Próbkowanie ADC (`onTimer`) | Najwyższy |

---

## 2. Konfiguracja Próbkowania

### 2.1 Parametry ADC

```cpp
#define SAMPLES 512           // Rozmiar bufora
#define SAMPLING_FREQ 3000    // Hz
#define PIN_U 33              // ADC1_CH5
#define PIN_I 35              // ADC1_CH7

analogReadResolution(12);     // 0-4095 (12-bit)
analogSetAttenuation(ADC_11db); // Zakres 0-3.3V
```

### 2.2 Analiza Czasowa

| Parametr | Wartość | Obliczenie |
|----------|---------|------------|
| Okres próbkowania | 333 μs | 1/3000 Hz |
| Czas akwizycji bufora | ~170 ms | 512 × 333 μs |
| Rozdzielczość FFT | 5.86 Hz | 3000 / 512 |
| Częstotliwość Nyquista | 1500 Hz | 3000 / 2 |
| Max harmoniczna (teoretyczna) | H30 | 1500 / 50 |
| Max harmoniczna (praktyczna) | H25 | Ograniczenie kodu |

### 2.3 Konfiguracja Timera

```cpp
timer = timerBegin(0, 80, true);        // Timer 0, prescaler 80 (1 MHz)
timerAttachInterrupt(timer, &onTimer, true);
timerAlarmWrite(timer, 333, true);      // 333 ticks = 333 μs @ 1 MHz
timerAlarmEnable(timer);
```

**Obliczenie:** 80 MHz / 80 prescaler = 1 MHz → 1 tick = 1 μs → 333 ticks = 333 μs = 3003 Hz

⚠️ **Uwaga:** Rzeczywista częstotliwość to ~3003 Hz, nie dokładnie 3000 Hz (błąd 0.1%)

---

## 3. Procedura Przerwania (ISR)

### 3.1 Kod ISR

```cpp
void IRAM_ATTR onTimer() {
  if (!dataReady) {
    rawBufferU[sampleIdx] = analogRead(PIN_U);  // ~10 μs
    rawBufferI[sampleIdx] = analogRead(PIN_I);  // ~10 μs

    sampleIdx++;
    if (sampleIdx >= SAMPLES) {
      sampleIdx = 0;
      dataReady = true;  // Sygnał dla processingTask
    }
  }
}
```

### 3.2 Analiza Czasowa ISR

| Operacja | Czas |
|----------|------|
| `analogRead()` × 2 | ~20 μs |
| Inkrementacja + porównanie | ~1 μs |
| **Razem** | ~21 μs |
| **Dostępny czas** | 333 μs |
| **Margines** | 94% ✅ |

### 3.3 Potencjalne Problemy

1. **Brak synchronizacji z zerem sieci** - próbkowanie nie jest zsynchronizowane z przejściem przez zero napięcia
2. **Jitter** - `analogRead()` ma zmienną latencję (8-12 μs)
3. **Kolejność odczytu** - prąd jest próbkowany ~10 μs po napięciu (przesunięcie fazowe ~0.18° przy 50 Hz)

---

## 4. Przetwarzanie Sygnału

### 4.1 Usunięcie Składowej DC

```cpp
double sumU = 0, sumI = 0;
for (int i = 0; i < SAMPLES; i++) {
    sumU += rawBufferU[i];
    sumI += rawBufferI[i];
}
float offsetU = sumU / SAMPLES;  // Średnia = DC offset
float offsetI = sumI / SAMPLES;
```

**Metoda:** Średnia arytmetyczna z całego okna (512 próbek ≈ 8.5 cykli przy 50 Hz)

### 4.2 Skalowanie i Kalibracja

```cpp
const float vCoeff = 0.550;   // Współczynnik napięcia
const float iCoeff = 0.0096;  // Współczynnik prądu
const float ADC_DEAD_ZONE = 4.0;  // Strefa martwa ADC

float uScaled = (rawBufferU[i] - offsetU) * vCoeff;
float iRaw = (float)rawBufferI[i] - offsetI;
if (abs(iRaw) < ADC_DEAD_ZONE) iRaw = 0;  // Bramka szumów ADC
float iScaled = iRaw * iCoeff;
```

**Kalibracja napięcia:**
- ADC: 0-4095 → 0-3.3V
- Z dzielnikiem/transformatorem: wartość_ADC × 0.550 = napięcie_RMS
- Przy 230V RMS: peak = 325V → ADC ≈ 590 jednostek → 590 × 0.55 ≈ 325V ✅

**Kalibracja prądu (SCT013-030):**
- Zakres: 0-30A → 0-1V (wyjście)
- iCoeff = 0.0096 sugeruje przetwornik ~10A/1V z rezystorem obciążenia

### 4.3 Obliczanie RMS

```cpp
double sumU2 = 0, sumI2 = 0, sumP = 0;

for (int i = 0; i < SAMPLES; i++) {
    // ... skalowanie ...
    sumU2 += uScaled * uScaled;
    sumI2 += iScaled * iScaled;
    sumP += uScaled * iScaled;  // Moc chwilowa
}

float vRMS = sqrt(sumU2 / SAMPLES);
float iRMS = sqrt(sumI2 / SAMPLES);
float pActive = sumP / SAMPLES;  // Moc czynna (średnia mocy chwilowej)
```

**Wzory:**
- $V_{RMS} = \sqrt{\frac{1}{N}\sum_{i=1}^{N} v_i^2}$
- $P = \frac{1}{N}\sum_{i=1}^{N} v_i \cdot i_i$

---

## 5. Analiza FFT

### 5.1 Konfiguracja FFT

```cpp
ArduinoFFT<double> FFT = ArduinoFFT<double>();

// Okno Hamminga dla redukcji spectral leakage
FFT.windowing(vReal, SAMPLES, FFT_WIN_TYP_HAMMING, FFT_FORWARD);
FFT.compute(vReal, vImag, SAMPLES, FFT_FORWARD);
```

### 5.2 Ekstrakcja Fazy (przed konwersją do amplitudy!)

```cpp
// KRYTYCZNE: Faza musi być wyekstrahowana PRZED complexToMagnitude()!
double phaseV_H1 = atan2(vImag[baseBin], vReal[baseBin]);
// ... analogicznie dla prądu ...
double phaseI_H1 = atan2(iImag[baseBin], iReal[baseBin]);

// Dopiero teraz konwersja do amplitudy (niszczy dane fazowe)
FFT.complexToMagnitude(vReal, vImag, SAMPLES);
```

**Dlaczego to ważne:** `complexToMagnitude()` nadpisuje `vReal[]` wartościami modułu, tracąc informację o fazie. Obliczenie `atan2()` musi nastąpić wcześniej.

### 5.3 Wykrywanie Częstotliwości Fundamentalnej

```cpp
double freq = FFT.majorPeak(vReal, SAMPLES, SAMPLING_FREQ);
int baseBin = round(freq / (SAMPLING_FREQ / (double)SAMPLES));
if (baseBin < 1) baseBin = 1;
```

**Rozdzielczość binów:**
- Δf = 3000 / 512 = 5.86 Hz
- Bin dla 50 Hz: 50 / 5.86 ≈ 8.5 → bin 8 lub 9

⚠️ **Problem:** Przy rozdzielczości 5.86 Hz, wykrycie 49.5 Hz vs 50.5 Hz jest na granicy możliwości

### 5.4 Ekstrakcja Harmonicznych

```cpp
#define MAX_CALC_HARMONIC 25

for (int h = 1; h <= MAX_CALC_HARMONIC; h++) {
    int bin = baseBin * h;
    double amp = (bin < SAMPLES/2) ? (vReal[bin] / SAMPLES) * 2.0 : 0;
    harmonicsV_out[h] = amp;
    if (h > 1) sumSqHarmonicsV += pow(amp, 2);
}
```

**Ograniczenia:**
- H25 × 50 Hz = 1250 Hz < 1500 Hz (Nyquist) ✅
- H30 × 50 Hz = 1500 Hz = Nyquist (aliasing!) ❌
- Norma IEC 61000-4-7 wymaga H40 (2000 Hz) - **nieosiągalne przy 3 kHz próbkowania**

### 5.5 Obliczanie THD

```cpp
doc["thd_v"] = (hV_base > 10) ? (sqrt(sumSqHarmonicsV) / hV_base) * 100.0 : 0;
doc["thd_i"] = (hI_base > THD_I_THRESHOLD) ? (sqrt(sumSqHarmonicsI) / hI_base) * 100.0 : 0;
```

**Wzór THD:**
$$THD = \frac{\sqrt{\sum_{h=2}^{N} H_h^2}}{H_1} \times 100\%$$

**Progi:**
- Napięcie: H1 > 10V (zapobiega dzieleniu przez małe wartości)
- Prąd: H1 > THD_I_THRESHOLD (~0.0021A)

---

## 6. Teoria Mocy Budeanu

### 6.1 Implementacja

```cpp
// 1. Moc pozorna (zawsze poprawna)
float sApparent = vRMS * iRMS;  // S = U_rms × I_rms

// 2. Przesunięcie fazowe fundamentalnej
double phaseShift_H1 = phaseI_H1 - phaseV_H1;

// 3. Moc bierna fundamentalnej
float u1_rms = hV_base / 1.41421356;  // Peak → RMS
float i1_rms = hI_base / 1.41421356;
float qReactive_H1 = u1_rms * i1_rms * sin(phaseShift_H1);

// 4. Moc odkształcenia
float d2 = s2 - p2 - q12;  // D² = S² - P² - Q₁²
float powerDistortion = (d2 > 0) ? sqrt(d2) : 0;

// 5. Współczynnik mocy (NIE cos φ!)
float powerFactor = (sApparent > 0.05) ? abs(pActive) / sApparent : 1.0;
```

### 6.2 Diagram Mocy Budeanu

```
              S (Apparent)
             /│
            / │
           /  │
          /   │ Q₁ (Reactive H1)
         /    │
        /     │
       /──────┼─────── P (Active)
      D (Distortion)

S² = P² + Q₁² + D²
```

### 6.3 Dlaczego λ = P/S, a nie cos(φ)?

| Parametr | Wzór | Kiedy poprawny |
|----------|------|----------------|
| cos(φ) | cos(φ₁) | Tylko sinusoidy |
| λ (PF) | P / S | Zawsze |
| DPF | cos(φ₁) = P₁/S₁ | Displacement PF |

**Dla przebiegów odkształconych:** λ < cos(φ₁), ponieważ harmoniczne zwiększają S bez zwiększania P.

---

## 7. Bramka Szumów (Noise Gate)

### 7.1 Parametry

```cpp
const float NOISE_GATE_RMS = 0.01;  // 10 mA
const float ADC_DEAD_ZONE = 4.0;    // 4 LSB (0.003V przy 12-bit)
const float THD_I_THRESHOLD = NOISE_GATE_RMS * 1.414 * 0.15;  // ~0.0021A
```

### 7.2 Logika Bramki

```cpp
// Poziom próbki - strefa martwa ADC
if (abs(iRaw) < ADC_DEAD_ZONE) iRaw = 0;

// Poziom pomiaru - noise gate dla mocy
if (iRMS < NOISE_GATE_RMS) {
    iRMS = 0; pActive = 0; sApparent = 0;
    qReactive_H1 = 0; powerDistortion = 0; powerFactor = 1.0;
    for(int i=1; i<=MAX_CALC_HARMONIC; i++) harmonicsI_out[i] = 0;
}

// Poziom THD - osobny próg
doc["thd_i"] = (hI_base > THD_I_THRESHOLD) ? ... : 0;
```

### 7.3 Uzasadnienie Progów

| Próg | Wartość | Uzasadnienie |
|------|---------|--------------|
| ADC_DEAD_ZONE | 4 LSB | Szum kwantyzacji 12-bit ADC (~2 LSB RMS) |
| NOISE_GATE_RMS | 10 mA | Typowy prąd jałowy transformatora pom. |
| THD_I_THRESHOLD | 2.1 mA | 15% marginesu powyżej noise gate |

---

## 8. Komunikacja MQTT

### 8.1 Struktura JSON

```json
{
  "v_rms": 230.5,
  "i_rms": 1.234,
  "p_act": 284.2,
  "power_apparent": 284.4,
  "power_reactive": 0.5,
  "power_distortion": 1.2,
  "power_factor": 0.99,
  "freq": 50.0,
  "freq_valid": true,
  "thd_v": 2.5,
  "thd_i": 4.2,
  "harm_v": [230.5, 1.2, 0.3, ...],
  "harm_i": [1.234, 0.02, 0.01, ...],
  "waveform_v": [325.0, 312.1, ...],
  "waveform_i": [1.74, 1.68, ...]
}
```

### 8.2 Rozmiar Payloadu

| Pole | Typ | Rozmiar (szacowany) |
|------|-----|---------------------|
| Skalary (10 pól) | number | ~150 B |
| harm_v[25] | array | ~200 B |
| harm_i[25] | array | ~200 B |
| waveform_v[~120] | array | ~600 B |
| waveform_i[~120] | array | ~700 B |
| **Razem** | | **~1850 B** |

**Buffer size:** 2048 B ✅

### 8.3 Interwał Publikacji

```cpp
if (currentTime - lastPublishTime >= 3000) {  // 3 sekundy
```

⚠️ **Uwaga:** Dokumentacja wspomina 6 sekund, ale kod ma 3000 ms (3 sekundy)

---

## 9. Zidentyfikowane Problemy

### 9.1 Krytyczne

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 1 | Brak synchronizacji z zerem sieci | Jitter fazowy, błędy THD | Użyć zero-crossing detector |
| 2 | Rozdzielczość FFT 5.86 Hz | Niedokładne wykrywanie freq | Zwiększyć SAMPLES lub użyć interpolacji parabolicznej |

### 9.2 Średnie

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 3 | Opóźnienie I vs U (~10 μs) | Błąd fazowy 0.18° przy 50 Hz | Akceptowalne, ale udokumentować |
| 4 | Brak walidacji WiFi/MQTT przed publikacją | Utrata danych przy rozłączeniu | Bufor ring dla offline data |
| 5 | Hardcoded interwał 3s (nie 6s jak w docs) | Niespójność dokumentacji | Zsynchronizować docs |

### 9.3 Niskie

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 6 | `config.h` brak w repo | Trudność w setupie | Dodać `config.h.example` |
| 7 | Brak watchdog timer | Potencjalny hang | Dodać esp_task_wdt |
| 8 | README.md ma stary format JSON (cos_phi) | Niespójność | Zaktualizować docs |

---

## 10. Ocena Jakości Kodu

### 10.1 Pozytywne Aspekty

✅ **Poprawna teoria mocy Budeanu** - rozróżnienie Q₁ vs D
✅ **Ekstrakcja fazy przed magnitude** - prawidłowa kolejność operacji FFT
✅ **Dual-core separation** - ISR i processing na osobnych rdzeniach
✅ **Noise gate na wielu poziomach** - ADC, RMS, THD
✅ **Surowe przebiegi** - transmisja raw waveform dla wizualizacji
✅ **Dynamiczne cykle** - ilość próbek przebiegu zależy od wykrytej freq

### 10.2 Obszary do Poprawy

⚠️ **Brak komentarzy przy stałych kalibracyjnych** - skąd vCoeff = 0.550?
⚠️ **Magic numbers** - 1.41421356 zamiast `sqrt(2)` lub `M_SQRT2`
⚠️ **Brak error handling** - co jeśli FFT zwróci NaN?
⚠️ **Globalne volatile bufory** - lepiej użyć FreeRTOS queue

### 10.3 Metryki

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| Linie kodu | 264 | Kompaktowy |
| Cyclomatic complexity | ~15 | Średnia |
| Komentarze | ~20% | Wystarczające |
| Użycie RAM | ~12 KB (bufory) | OK dla ESP32 |

---

## 11. Zgodność z Dokumentacją

| Aspekt | Dokumentacja | Implementacja | Zgodność |
|--------|--------------|---------------|----------|
| Próbkowanie | 3000 Hz, 512 samples | ✅ Zgodne | ✅ |
| FFT | Hamming window | ✅ Zgodne | ✅ |
| Noise Gate | 0.01A | ✅ Zgodne | ✅ |
| Teoria mocy | Budeanu | ✅ Zgodne | ✅ |
| Interwał MQTT | 6 sekund | ❌ 3 sekundy | ⚠️ |
| JSON field `cos_phi` | W README | ❌ `power_factor` w kodzie | ⚠️ |
| Harmoniczne | H1-H25 | ✅ Zgodne | ✅ |
| Raw waveform | 2 cykle | ✅ Zgodne | ✅ |

---

## 12. Podsumowanie

**Ocena ogólna: 8/10**

Firmware jest solidnie zaimplementowany z poprawną teorią elektrotechniczną (Budeanu). Główne ograniczenia wynikają z hardware'u (12-bit ADC, 3 kHz sampling) a nie z błędów implementacyjnych.

### Kluczowe Wnioski

1. **THD jest częściowy** (H2-H25) - nie spełnia IEC 61000-4-7 (H2-H40)
2. **Moc bierna Q₁** to tylko fundamentalna - zgodne z Budeanu, ale różni się od klasycznego Q
3. **Power Factor λ** poprawnie jako P/S, nie cos(φ)
4. **Noise gate** skutecznie eliminuje artefakty przy niskich prądach

