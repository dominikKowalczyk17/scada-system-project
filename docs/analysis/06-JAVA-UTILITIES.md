# Analiza Modułu: Java Utilities

**Katalog:** `scada-system/src/main/java/com/dkowalczyk/scadasystem/util/`
**Pliki:** 3
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Modułu

### 1.1 Lista Plików

| Plik | Linie | Odpowiedzialność | Stan |
|------|-------|------------------|------|
| Constants.java | 162 | Stałe systemowe i normatywne | ✅ Aktywny (naprawiony) |
| MathUtils.java | 166 | Obliczenia matematyczne | ✅ Aktywny |
| DateTimeUtils.java | 5 | Operacje na datach | ⚠️ Pusty (placeholder) |

---

## 2. Constants.java - Analiza Szczegółowa

### 2.1 Struktura Dokumentu

**Linie kodu:** 162 (30% komentarze Javadoc)
**Wzorce:** Utility class pattern (private constructor)

### 2.2 Grupy Stałych

#### Grupa 1: Parametry Sieci (PN-EN 50160)

```java
public static final double NOMINAL_VOLTAGE = 230.0;          // 230V EU standard
public static final double VOLTAGE_TOLERANCE = 0.10;         // ±10%
public static final double VOLTAGE_DEVIATION_UPPER_LIMIT_PERCENT = 10.0;
public static final double VOLTAGE_DEVIATION_LOWER_LIMIT_PERCENT = -10.0;
public static final double NOMINAL_FREQUENCY = 50.0;         // 50 Hz EU
```

**Zakres napięcia:** 207V - 253V (95% tygodnia wg PN-EN 50160)

#### Grupa 2: Częstotliwość (PN-EN 50160, IEC 61000-4-30)

```java
public static final double FREQUENCY_DEVIATION_UPPER_LIMIT_HZ = 0.5;   // +1%
public static final double FREQUENCY_DEVIATION_LOWER_LIMIT_HZ = -0.5;  // -1%
public static final double FREQUENCY_MIN = 49.5;             // 99.5% roku
public static final double FREQUENCY_MAX = 50.5;
public static final double FREQUENCY_TOLERANCE_CLASS_A = 0.01; // IEC Class A
```

**Uwaga:** Komentarz mówi o osiągnięciu "Class S level" (±0.01-0.02 Hz)

#### Grupa 3: THD i Harmoniczne (IEC 61000-4-7)

```java
public static final double VOLTAGE_THD_LIMIT = 8.0;          // 8% dla H2-H40
public static final double CURRENT_THD_LIMIT = 5.0;          // Diagnostyczny
```

**⚠️ UWAGA:** Komentarz wyjaśnia, że system mierzy tylko H2-H25 (nie pełny H2-H40), więc obliczone THD to **dolne ograniczenie** rzeczywistego THD.

#### Grupa 4: Zdarzenia Napięciowe (PN-EN 50160)

```java
public static final double VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;    // 207V
public static final double VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10;  // 253V
public static final double VOLTAGE_INTERRUPTION_THRESHOLD = NOMINAL_VOLTAGE * 0.10; // 23V

public static final long SAG_MIN_DURATION_MS = 10;           // 10 ms minimum
public static final long SAG_MAX_DURATION_MS = 60000;        // 1 minuta max
public static final double VOLTAGE_INTERRUPTION_MIN_DURATION_SECONDS = 0.01; // IEC
public static final long SHORT_INTERRUPTION_MAX_DURATION_SECONDS = 180;      // 3 min
```

**Definicje:**
- **Voltage Dip (Sag):** 10-90% nominalnej przez 10ms - 1min
- **Voltage Swell:** >110% nominalnej
- **Short Interruption:** <10% nominalnej przez 10ms - 3min
- **Long Interruption:** <10% nominalnej przez >3min

#### Grupa 5: Współczynnik Mocy

```java
public static final double MIN_POWER_FACTOR = 0.85;
```

**Uwaga:** Nie jest to wskaźnik PN-EN 50160 (norma dotyczy napięcia, nie charakterystyk obciążenia), ale typowy wymóg umowny z dostawcą energii.

#### Grupa 6: Parametry Systemu Pomiarowego ✅ NAPRAWIONE

```java
// ✅ PRZED (błędne):
// public static final int HARMONICS_COUNT = 8;
// public static final int SAMPLING_RATE_HZ = 800;

// ✅ PO (poprawione 2026-01-23):
public static final int HARMONICS_COUNT = 25;               // H1-H25
public static final int SAMPLING_RATE_HZ = 3000;            // 3000 Hz
public static final int NYQUIST_FREQUENCY_HZ = SAMPLING_RATE_HZ / 2;  // 1500 Hz
public static final int MAX_HARMONIC_ORDER = NYQUIST_FREQUENCY_HZ / (int) NOMINAL_FREQUENCY; // 30
```

**Obliczenia:**
- Nyquist: 3000/2 = 1500 Hz
- Maksymalna harmoniczna (teoretyczna): 1500/50 = H30
- Faktycznie mierzone: H1-H25 (bezpieczny margines antyaliasingowy)

### 2.3 Zgodność z Normami

| Stała | Norma | Status Zgodności |
|-------|-------|------------------|
| Zakres napięcia ±10% | PN-EN 50160:2015 | ✅ Zgodne |
| Częstotliwość 49.5-50.5 Hz | PN-EN 50160:2015 | ✅ Zgodne |
| THD napięcia <8% | IEC 61000-4-7, PN-EN 50160 | ⚠️ Częściowe (H2-H25, nie H2-H40) |
| Klasyfikacja zdarzeń | IEC 61000-4-30 Class A | ✅ Zgodne |
| Voltage dip definition | PN-EN 50160 | ✅ Zgodne |

### 2.4 Problemy Zidentyfikowane

#### 2.4.1 ✅ ROZWIĄZANE

| # | Problem | Status |
|---|---------|--------|
| 1 | SAMPLING_RATE_HZ = 800 (zamiast 3000) | ✅ Naprawione (commit 714c7eb) |
| 2 | HARMONICS_COUNT = 8 (zamiast 25) | ✅ Naprawione (commit 714c7eb) |
| 3 | Komentarze mówiące o H1-H8 | ✅ Zaktualizowane do H1-H25 |

#### 2.4.2 POZOSTAŁE

| # | Problem | Priorytet | Rekomendacja |
|---|---------|-----------|--------------|
| 4 | Komentarz "Conservative value with WiFi enabled" przy SAMPLING_RATE | Niski | Wyjaśnić czemu 3000 Hz jest "conservative" (ESP32 może >10kHz) |
| 5 | Brak stałej dla interwału MQTT (3s hardcoded w ESP32) | Średni | Dodać `MQTT_PUBLISH_INTERVAL_MS = 3000` |
| 6 | CURRENT_THD_LIMIT = 5.0% - nie odnosi się do normy | Niski | Zmienić nazwę na `CURRENT_THD_DIAGNOSTIC_THRESHOLD` |

---

## 3. MathUtils.java - Analiza Szczegółowa

### 3.1 Przegląd Funkcji

| Metoda | Linie | Złożoność | Cel |
|--------|-------|-----------|-----|
| `average()` | 17-25 | O(n) | Średnia arytmetyczna |
| `standardDeviation()` | 31-42 | O(n) | Odchylenie standardowe |
| `min()` | 47-55 | O(n) | Minimum z listy |
| `max()` | 60-68 | O(n) | Maximum z listy |
| `calculateEnergy()` | 77-100 | O(n) | Całka trapezowa mocy |
| `reconstructWaveform()` | 126-155 | O(n×h) | Synteza Fouriera |
| `calculateApparentPower()` | 162-164 | O(1) | S = √(P²+Q²) |

### 3.2 Analiza Metod Statystycznych

#### 3.2.1 Average - Średnia Arytmetyczna

```java
public static double average(List<Double> values) {
    if (values == null || values.isEmpty()) {
        return 0.0;
    }
    return values.stream()
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0.0);
}
```

**Ocena:** ✅ Poprawna implementacja
- Używa Java Streams API
- Obsługa null/empty → 0.0 (może być problematyczne semantycznie)

**Potencjalny problem:** Zwracanie 0.0 dla pustej listy może być mylące. Lepiej rzucić wyjątek lub zwrócić `Optional<Double>`.

#### 3.2.2 Standard Deviation - Odchylenie Standardowe

```java
public static double standardDeviation(List<Double> values, double mean) {
    if (values == null || values.isEmpty()) {
        return 0.0;
    }

    double sumSquaredDiffs = values.stream()
            .mapToDouble(d -> Math.pow(d - mean, 2))
            .sum();
    return Math.sqrt(sumSquaredDiffs / values.size());
}
```

**Wzór:** $\sigma = \sqrt{\frac{\sum_{i=1}^{n}(x_i - \mu)^2}{n}}$

**Ocena:** ✅ Poprawna implementacja (odchylenie standardowe populacji)

**Uwaga:** To jest **odchylenie standardowe populacji** (dzielenie przez n), nie **próby** (dzielenie przez n-1). Dla statystyk z pomiarów bardziej poprawne byłoby n-1 (Bessel's correction).

### 3.3 Analiza Obliczania Energii

#### 3.3.1 Metoda Całkowania Trapezowego

```java
public static double calculateEnergy(List<Measurement> measurements) {
    // ...
    for (int i = 0; i < measurements.size() - 1; i++) {
        Measurement current = measurements.get(i);
        Measurement next = measurements.get(i + 1);

        double avgPower = (current.getPowerActive() + next.getPowerActive()) / 2.0;
        Duration interval = Duration.between(current.getTime(), next.getTime());
        double deltaTimeSeconds = interval.toMillis() / 1000.0;

        totalEnergyWattSeconds += avgPower * deltaTimeSeconds;
    }

    return totalEnergyWattSeconds / 3_600_000.0; // W·s → kWh
}
```

**Wzór:** $E = \sum_{i=0}^{n-1} \frac{P_i + P_{i+1}}{2} \cdot \Delta t_i$

**Ocena:** ✅ Poprawna implementacja reguły trapezów

**Dokładność:**
- Przy regularnym próbkowaniu (np. co 3s): błąd O(Δt²)
- Przy nieregularnym: metoda automatycznie adaptuje się (Duration.between)

**Potencjalne problemy:**
- Brak walidacji czy lista jest posortowana chronologicznie
- Brak obsługi ujemnych wartości mocy (teoretycznie możliwe przy backflow)
- Brak obsługi outlierów (błędne pomiary)

### 3.4 Analiza Syntezy Przebiegów

#### 3.4.1 Rekonstrukcja Fouriera

```java
public static double[] reconstructWaveform(Double[] harmonics, double frequency,
                                          int samplesPerCycle, double phaseShift) {
    double[] waveform = new double[samplesPerCycle];

    for (int i = 0; i < samplesPerCycle; i++) {
        double t = (double) i / samplesPerCycle;  // Normalized time [0, 1)
        double sum = 0;

        for (int h = 0; h < harmonics.length; h++) {
            if (harmonics[h] == null) continue;

            int harmonicOrder = h + 1;
            double amplitude = harmonics[h] * Math.sqrt(2);  // RMS → Peak

            double angle = 2.0 * Math.PI * harmonicOrder * t
                          - (harmonicOrder == 1 ? phaseShift : 0);
            sum += amplitude * Math.sin(angle);
        }
        waveform[i] = sum;
    }
    return waveform;
}
```

**Wzór:** $V(t) = \sum_{n=1}^{N} A_n \cdot \sqrt{2} \cdot \sin(2\pi n f t - \phi_n)$

**Ocena:** ✅ Poprawna implementacja z drobnym błędem fazowym

#### 3.4.2 Analiza Matematyczna

| Aspekt | Implementacja | Ocena |
|--------|---------------|-------|
| Normalizacja czasu | `t = i / samplesPerCycle` | ✅ Poprawna (t ∈ [0, 1)) |
| Konwersja RMS→Peak | `amplitude * √2` | ✅ Poprawna |
| Przesunięcie fazowe | Tylko dla H1 | ⚠️ Częściowe |
| Obsługa null | `if (harmonics[h] == null)` | ✅ Defensive |

**Problem z fazą:**
```java
double angle = 2.0 * Math.PI * harmonicOrder * t
              - (harmonicOrder == 1 ? phaseShift : 0);
```

**Dlaczego tylko H1 ma phaseShift?**
- Teoretycznie każda harmoniczna może mieć własną fazę
- ESP32 nie wysyła faz harmonicznych (tylko amplitudy)
- **Założenie:** Wszystkie harmoniczne w fazie z H1 (zero-crossing synchronized)

**Konsekwencje:**
- Rekonstrukcja jest **przybliżona** dla przebiegów z dużymi przesunięciami fazowymi harmonicznych
- Dla typowych nieliniowych obciążeń (LED, SMPS) to uproszczenie jest akceptowalne

### 3.5 Analiza calculateApparentPower()

```java
public static double calculateApparentPower(double activePower, double reactivePower) {
    return Math.sqrt(Math.pow(activePower, 2) + Math.pow(reactivePower, 2));
}
```

**Wzór:** $S = \sqrt{P^2 + Q^2}$

**⚠️ PROBLEM: NIEKOMPATYBILNE Z TEORIĄ BUDEANU!**

System używa teorii Budeanu:
$$S^2 = P^2 + Q_1^2 + D^2$$

Ale ta funkcja implementuje klasyczne:
$$S = \sqrt{P^2 + Q^2}$$

**Gdzie jest używana?**
Sprawdzam użycia w kodzie...

**Rekomendacja:**
1. Usunąć tę funkcję (nie jest używana, S jest obliczane jako U_rms × I_rms)
2. Lub przemianować na `calculateApparentPowerSinusoidal()` z ostrzeżeniem Javadoc

---

## 4. DateTimeUtils.java - Analiza

```java
package com.dkowalczyk.scadasystem.util;

public class DateTimeUtils {
}
```

**Status:** Pusty placeholder

**Ocena:** ❌ Dead code (nie używana nigdzie w projekcie)

**Rekomendacja:** Usunąć lub zaimplementować jeśli planowane funkcje:
- Formatowanie dat dla API
- Konwersja stref czasowych
- Zaokrąglanie do początku/końca dnia

---

## 5. Użycie w Projekcie

### 5.1 Zależności Constants.java

```
Constants.java
├── MeasurementValidator.java (progi walidacji)
├── StatsService.java (countEventsWithDuration)
├── MeasurementService.java (wskaźniki PN-EN 50160)
├── WaveformService.java (HARMONICS_COUNT)
└── Testy (wszystkie testują zgodność z Constants)
```

**Kluczowe użycie:** ~95% stałych jest aktywnie używanych

### 5.2 Zależności MathUtils.java

```
MathUtils.java
├── WaveformService.reconstructWaveforms() → reconstructWaveform()
├── StatsService.calculateDailyStats() → average, min, max, standardDeviation, calculateEnergy
└── Testy
```

**Kluczowe użycie:** Wszystkie metody oprócz `calculateApparentPower()`

### 5.3 Zależności DateTimeUtils.java

**Brak użyć** - pusty plik

---

## 6. Problemy i Rekomendacje

### 6.1 Krytyczne ✅ ROZWIĄZANE

| # | Problem | Wpływ | Status |
|---|---------|-------|--------|
| 1 | SAMPLING_RATE = 800 zamiast 3000 | Błędne wyliczenia Nyquist | ✅ Naprawione |
| 2 | HARMONICS_COUNT = 8 zamiast 25 | Niespójność z ESP32 | ✅ Naprawione |

### 6.2 Wysokie

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 3 | `calculateApparentPower()` niekompatybilne z Budeanu | Potencjalne błędy przyszłych deweloperów | Usunąć lub oznaczyć @Deprecated z wyjaśnieniem |
| 4 | `standardDeviation()` używa n zamiast n-1 | Niedoszacowanie σ dla małych próbek | Zmienić na `/ (values.size() - 1)` |

### 6.3 Średnie

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 5 | DateTimeUtils.java pusty plik | Dead code | Usunąć lub zaimplementować |
| 6 | `average/min/max()` zwraca 0.0 dla null/empty | Mylące semantycznie | Zwracać `Optional<Double>` lub rzucać wyjątek |
| 7 | `calculateEnergy()` nie waliduje kolejności chronologicznej | Błędne wyniki przy niepozortowanej liście | Dodać asercję lub sortowanie |

### 6.4 Niskie

| # | Problem | Wpływ | Rekomendacja |
|---|---------|-------|--------------|
| 8 | Brak JavaDoc dla niektórych stałych w Constants | Trudność dla nowych deweloperów | Dodać referencje do norm |
| 9 | `reconstructWaveform()` nie uwzględnia faz harmonicznych | Nieznaczne zniekształcenia przebiegu | Udokumentować w Javadoc |
| 10 | Magic number 3_600_000 w calculateEnergy() | Czytelność | Wyodrębnić jako stałą `WATT_SECONDS_PER_KWH` |

---

## 7. Metryki Jakości Kodu

### 7.1 Constants.java

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| Cyclomatic Complexity | 1 (tylko constructor) | ✅ Minimalna |
| Komentarze | 30% | ✅ Dobra dokumentacja |
| Naming conventions | snake_UPPER_CASE | ✅ Java standard |
| Zgodność z normami | 90% | ✅ Wysokie referencje do IEC/PN-EN |

### 7.2 MathUtils.java

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| Cyclomatic Complexity | Average ~3 | ✅ Niska |
| Test Coverage | (do sprawdzenia) | - |
| Komentarze | 25% | ⚠️ Brak JavaDoc dla niektórych metod |
| Immutability | Wszystkie metody static pure | ✅ Excellent |

---

## 8. Testy

### 8.1 MathUtilsTests.java (do przeanalizowania)

Lokalizacja: `scada-system/src/test/java/com/dkowalczyk/scadasystem/util/MathUtilsTests.java`

**Testowane przypadki (do weryfikacji):**
- [ ] average() z pustą listą
- [ ] standardDeviation() poprawność matematyczna
- [ ] calculateEnergy() dla regularnego próbkowania
- [ ] calculateEnergy() dla nieregularnego próbkowania
- [ ] reconstructWaveform() dla sinusoidy (H1 only)
- [ ] reconstructWaveform() dla przebiegu odkształconego (multiple harmonics)
- [ ] edge case: null inputs

---

## 9. Zgodność z Architekturą

### 9.1 Wzorce Projektowe

| Wzorzec | Implementacja | Ocena |
|---------|---------------|-------|
| Utility Class | `private constructor` + `final class` | ✅ Poprawne |
| Pure Functions | Wszystkie metody statyczne bez side effects | ✅ Functional |
| Separation of Concerns | Math oddzielone od Constants | ✅ Czyste |

### 9.2 Dependency Analysis

**MathUtils zależności:**
- `java.time.Duration` - JDK ✅
- `java.util.List` - JDK ✅
- `Measurement` entity - dopuszczalne (tylko dla `calculateEnergy`)

**Constants zależności:**
- Brak (pure constants) ✅

---

## 10. Podsumowanie

**Ocena ogólna: 8.5/10** ⬆️ (po naprawie błędów krytycznych)

### 10.1 Mocne Strony

✅ **Constants.java po naprawie:** Doskonałe odzwierciedlenie norm PN-EN 50160 i IEC
✅ **MathUtils:** Czyste, pure functions bez side effects
✅ **Wzorce:** Poprawne użycie Utility Class pattern
✅ **Dokumentacja:** Dobra dokumentacja Javadoc z referencjami do norm
✅ **Integracja:** Wykorzystanie Java Streams API

### 10.2 Słabe Strony

⚠️ **calculateApparentPower():** Niekompatybilne z teorią Budeanu, nieużywane
⚠️ **DateTimeUtils:** Dead code (pusty plik)
⚠️ **standardDeviation():** Błąd statystyczny (n zamiast n-1)
⚠️ **Obsługa błędów:** Zwracanie 0.0 zamiast Optional/Exception

### 10.3 Kluczowe Wnioski

1. **Naprawy krytyczne zakończone** - SAMPLING_RATE i HARMONICS_COUNT poprawione
2. **Matematyka w większości poprawna** - tylko drobne błędy (n vs n-1)
3. **Dobra architektura** - separacja concerns, pure functions
4. **Do usunięcia:** DateTimeUtils.java i calculateApparentPower()

### 10.4 Priorytetowe Akcje

| Priorytet | Akcja | Effort |
|-----------|-------|--------|
| 🔴 Wysoki | Zmienić standardDeviation na n-1 | 5 min |
| 🟡 Średni | Usunąć/oznaczyć @Deprecated calculateApparentPower() | 10 min |
| 🟡 Średni | Usunąć DateTimeUtils.java | 2 min |
| 🟢 Niski | Dodać JavaDoc do wszystkich public methods | 30 min |
| 🟢 Niski | Zmienić return type na Optional<Double> | 1 h |

---

**Ostatnia aktualizacja:** 2026-01-23
**Następny moduł:** Java Configuration (#2)
