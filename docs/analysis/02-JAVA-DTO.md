# Analiza Modułu: Java DTO (Data Transfer Objects)

**Katalog:** `scada-system/src/main/java/com/dkowalczyk/scadasystem/model/dto/`
**Pliki:** 9
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Architektury DTO

### 1.1 Przepływ Danych

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   ESP32     │────▶│ MeasurementRequest│────▶│ Measurement     │────▶│ MeasurementDTO│
│   (JSON)    │     │ (@JsonProperty)  │     │ (Entity)        │     │ (camelCase) │
└─────────────┘     └──────────────────┘     └─────────────────┘     └──────┬──────┘
                                                                            │
                                                                            ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Frontend   │◀────│ RealtimeDashboard│◀────│ DashboardDTO    │◀────│ WaveformDTO │
│  (TS)       │     │ DTO (WebSocket)  │     │ (REST)          │     │             │
└─────────────┘     └──────────────────┘     └─────────────────┘     └─────────────┘
```

### 1.2 Lista Plików DTO

| Plik                           | Linie | Kierunek           | Cel                      |
|--------------------------------|-------|--------------------|--------------------------|
| MeasurementRequest.java        | 100   | ESP32 → Backend    | Odbiór danych MQTT       |
| MeasurementDTO.java            | 35    | Backend → Frontend | Pojedynczy pomiar        |
| DashboardDTO.java              | 35    | Backend → Frontend | Kompozyt dla REST        |
| RealtimeDashboardDTO.java      | 26    | Backend → Frontend | Kompozyt dla WebSocket   |
| PowerQualityIndicatorsDTO.java | 119   | Backend → Frontend | Wskaźniki PN-EN 50160    |
| WaveformDTO.java               | 20    | Backend → Frontend | Przebiegi napięcia/prądu |
| StatsDTO.java                  | 82    | Backend → Frontend | Statystyki dzienne       |
| HistoryRequest.java            | 31    | Frontend → Backend | Parametry zapytania      |
| ValidationResult.java          | 21    | Wewnętrzny         | Wynik walidacji          |

---

## 2. Analiza Szczegółowa

### 2.1 MeasurementRequest (ESP32 → Backend)

**Cel:** Deserializacja payloadu JSON z ESP32 przez MQTT

```java
@Data
public class MeasurementRequest {
    @JsonProperty("v_rms")      private Double voltageRms;
    @JsonProperty("i_rms")      private Double currentRms;
    @JsonProperty("p_act")      private Double powerActive;
    @JsonProperty("power_apparent")   private Double powerApparent;
    @JsonProperty("power_reactive")   private Double powerReactive;
    @JsonProperty("power_distortion") private Double powerDistortion;
    @JsonProperty("power_factor")     private Double powerFactor;
    @JsonProperty("freq")       private Double frequency;
    @JsonProperty("thd_v")      private Double thdVoltage;
    @JsonProperty("thd_i")      private Double thdCurrent;
    @JsonProperty("harm_v")     private Double[] harmonicsV;
    @JsonProperty("harm_i")     private Double[] harmonicsI;
    @JsonProperty("waveform_v") private Double[] waveformV;
    @JsonProperty("waveform_i") private Double[] waveformI;
}
```

#### Mapowanie ESP32 JSON → Java

| ESP32 JSON          | @JsonProperty      | Typ Java | Walidacja          |
|---------------------|--------------------|----------|--------------------|
| `v_rms`             | `v_rms`            | Double   | @NotNull, 0-500V   |
| `i_rms`             | `i_rms`            | Double   | @NotNull, 0-100A   |
| `p_act`             | `p_act`            | Double   | ≥0                 |
| `power_apparent`    | `power_apparent`   | Double   | ≥0                 |
| `power_reactive`    | `power_reactive`   | Double   | -                  |
| `power_distortion`  | `power_distortion` | Double   | ≥0                 |
| `power_factor`      | `power_factor`     | Double   | 0-1                |
| `freq`              | `freq`             | Double   | @NotNull, 45-65 Hz |
| `thd_v`             | `thd_v`            | Double   | 0-100%             |
| `thd_i`             | `thd_i`            | Double   | 0-100%             |
| `harm_v`            | `harm_v`           | Double[] | -                  |
| `harm_i`            | `harm_i`           | Double[] | -                  |
| `waveform_v`        | `waveform_v`       | Double[] | -                  |
| `waveform_i`        | `waveform_i`       | Double[] | -                  |

#### Zgodność z ESP32 ✅

```cpp
// ESP32 main.cpp (linie 194-226)
doc["v_rms"] = ...;           // ✅ Zgodne
doc["i_rms"] = ...;           // ✅ Zgodne
doc["p_act"] = ...;           // ✅ Zgodne
doc["power_apparent"] = ...;  // ✅ Zgodne
doc["power_reactive"] = ...;  // ✅ Zgodne
doc["power_distortion"] = ...;// ✅ Zgodne
doc["power_factor"] = ...;    // ✅ Zgodne
doc["freq"] = ...;            // ✅ Zgodne
doc["thd_v"] = ...;           // ✅ Zgodne
doc["thd_i"] = ...;           // ✅ Zgodne
doc["harm_v"] = [...];        // ✅ Zgodne
doc["harm_i"] = [...];        // ✅ Zgodne
doc["waveform_v"] = [...];    // ✅ Zgodne
doc["waveform_i"] = [...];    // ✅ Zgodne
```

#### Brakujące Pole ⚠️

ESP32 wysyła `freq_valid` (boolean), ale **MeasurementRequest nie ma tego pola**!

```cpp
doc["freq_valid"] = isFreqValid;  // ❌ Brak w DTO
```

**Wpływ:** Pole jest ignorowane przy deserializacji (Jackson ignoruje nieznane pola domyślnie).

---

### 2.2 MeasurementDTO (Backend → Frontend)

**Cel:** Reprezentacja pomiaru dla API REST i WebSocket

```java
@Data
@Builder
public class MeasurementDTO {
    private Long id;
    private Instant time;

    private Double voltageRms;
    private Double currentRms;
    private Double powerActive;
    private Double powerApparent;
    private Double powerReactive;       // Q₁
    private Double powerDistortion;     // D
    private Double powerFactor;         // λ = P/S
    private Double frequency;
    private Double thdVoltage;
    private Double thdCurrent;
    private Double[] harmonicsV;
    private Double[] harmonicsI;

    // PN-EN 50160 indicators (obliczane przez backend)
    private Double voltageDeviationPercent;
    private Double frequencyDeviationHz;
}
```

#### Serializacja do JSON (SNAKE_CASE)

Backend używa `spring.jackson.property-naming-strategy=SNAKE_CASE`, więc:

| Java Field              | JSON Output                   |
|-------------------------|-------------------------------|
| voltageRms              | `voltage_rms`                 |
| currentRms              | `current_rms`                 |
| powerActive             | `power_active`                |
| thdVoltage              | `thd_voltage`                 |
| harmonicsV              | `harmonics_v`                 |
| voltageDeviationPercent | `voltage_deviation_percent`   |

---

### 2.3 DashboardDTO vs RealtimeDashboardDTO

**Porównanie:**

| Aspekt              | DashboardDTO          | RealtimeDashboardDTO         |
|---------------------|-----------------------|------------------------------|
| Użycie              | REST `/api/dashboard` | WebSocket `/topic/dashboard` |
| latestMeasurement   | ✅                    | ✅                          |
| waveforms           | ✅                    | ✅                          |
| recentHistory       | ✅ (100 pomiarów)     | ❌                          |
| Rozmiar (szacowany) | ~50 KB                 | ~5 KB                       |

**Uzasadnienie:** WebSocket wysyła dane co 3-6 sekund - brak historii zmniejsza bandwidth o ~90%.

---

### 2.4 PowerQualityIndicatorsDTO

**Cel:** Dedykowany DTO dla wskaźników PN-EN 50160

```java
@Data
@Builder
public class PowerQualityIndicatorsDTO {
    private Instant timestamp;

    // Group 1: Voltage
    private Double voltageRms;
    private Double voltageDeviationPercent;
    private Boolean voltageWithinLimits;

    // Group 2: Frequency
    private Double frequency;
    private Double frequencyDeviationHz;
    private Boolean frequencyWithinLimits;

    // Group 4: THD
    private Double thdVoltage;
    private Boolean thdWithinLimits;
    private Double[] harmonicsVoltage;

    // Overall
    private Boolean overallCompliant;
    private String statusMessage;
}
```

#### Niespójność w Dokumentacji ⚠️

Komentarz w kodzie:

```java
// Group 4: Voltage Waveform Distortions (Partial)
// Limited to 8 harmonics due to Nyquist constraint
private Double[] harmonicsVoltage;
```

Ale ESP32 wysyła **25 harmonicznych** (`MAX_CALC_HARMONIC = 25`), a MeasurementRequest akceptuje tablicę dowolnej długości.

**Wniosek:** Komentarz jest nieaktualny - system obsługuje H1-H25.

---

### 2.5 WaveformDTO

```java
@Data
@Builder
public class WaveformDTO {
    private double[] voltage;  // 200 samples
    private double[] current;  // 200 samples
}
```

**Uwaga:** Używa `double[]` (primitive), nie `Double[]` (boxed). To poprawne dla wydajności, ale niespójne z resztą DTO.

#### Źródło Danych

Przebiegi mogą pochodzić z dwóch źródeł:

1. **Surowe próbki z ESP32** (`waveform_v`, `waveform_i`) - ~120 próbek
2. **Synteza z harmonicznych** (WaveformService) - 200 próbek

Backend preferuje surowe dane, ale wykonuje syntezę jako fallback.

---

### 2.6 StatsDTO

```java
@Data
@Builder
public class StatsDTO {
    private LocalDate date;

    // Voltage
    private double avgVoltage, minVoltage, maxVoltage, stdDevVoltage;

    // Power
    private double avgPowerActive, peakPower, minPower, totalEnergyKwh;

    // Power Factor
    private double avgPowerFactor, minPowerFactor;

    // Frequency
    private double avgFrequency, minFrequency, maxFrequency;

    // Events
    private int voltageSagCount, voltageSwellCount, interruptionCount;
    private int thdViolationsCount, frequencyDevCount, powerFactorPenaltyCount;

    // Meta
    private int measurementCount;
    private double dataCompleteness;
}
```

#### Konstruktor z Entity

```java
public StatsDTO(DailyStats entity) {
    this.date = entity.getDate();
    this.avgVoltage = entity.getAvgVoltage();
    // ... manual mapping ...
}
```

**Uwaga:** Brak użycia MapStruct/ModelMapper - ręczne mapowanie jest podatne na błędy przy dodawaniu pól.

---

## 3. Porównanie: Backend ↔ Frontend Types

### 3.1 MeasurementDTO

| Backend (Java)                  | Frontend (TypeScript)              | Status |
|---------------------------------|------------------------------------|--------|
| id: Long                        | id?: number                        | ✅    |
| time: Instant                   | time?: string                      | ✅    |
| voltageRms: Double              | voltage_rms?: number               | ✅    |
| currentRms: Double              | current_rms?: number               | ✅    |
| powerActive: Double             | power_active?: number              | ✅    |
| powerReactive: Double           | power_reactive?: number            | ✅    |
| powerApparent: Double           | power_apparent?: number            | ✅    |
| powerDistortion: Double         | power_distortion?: number          | ✅    |
| powerFactor: Double             | power_factor?: number              | ✅    |
| frequency: Double               | frequency?: number                 | ✅    |
| thdVoltage: Double              | thd_voltage?: number               | ✅    |
| thdCurrent: Double              | thd_current?: number               | ✅    |
| harmonicsV: Double[]            | harmonics_v?: number[]             | ✅    |
| harmonicsI: Double[]            | harmonics_i?: number[]             | ✅    |
| voltageDeviationPercent: Double | voltage_deviation_percent?: number | ✅    |
| frequencyDeviationHz: Double    | frequency_deviation_hz?: number    | ✅    |

**Wynik:** 100% zgodność ✅

### 3.2 StatsDTO - NIESPÓJNOŚĆ ⚠️

| Backend (Java)          | Frontend (TypeScript) | Status         |
|-------------------------|-----------------------|----------------|
| date                    | date                  | ✅             |
| avgVoltage              | avg_voltage           | ✅             |
| minVoltage              | min_voltage           | ✅             |
| maxVoltage              | max_voltage           | ✅             |
| stdDevVoltage           | -                     | ❌ Brak w TS   |
| avgPowerActive          | -                     | ❌ Brak w TS   |
| peakPower               | -                     | ❌ Brak w TS   |
| minPower                | -                     | ❌ Brak w TS   |
| totalEnergyKwh          | total_energy_kwh      | ✅             |
| avgPowerFactor          | -                     | ❌ Brak w TS   |
| minPowerFactor          | -                     | ❌ Brak w TS   |
| avgFrequency            | -                     | ❌ Brak w TS   |
| minFrequency            | -                     | ❌ Brak w TS   |
| maxFrequency            | -                     | ❌ Brak w TS   |
| voltageSagCount         | voltage_sag_count     | ✅             |
| voltageSwellCount       | voltage_swell_count   | ✅             |
| interruptionCount       | -                     | ❌ Brak w TS   |
| thdViolationsCount      | thd_violations_count  | ✅             |
| frequencyDevCount       | -                     | ❌ Brak w TS   |
| powerFactorPenaltyCount | -                     | ❌ Brak w TS   |
| measurementCount        | measurement_count     | ✅             |
| dataCompleteness        | data_completeness     | ✅             |
| -                       | avg_current           | ❌ Brak w Java |
| -                       | max_current           | ❌ Brak w Java |

**Wynik:** 13 pól zgodnych, 12 niezgodnych ⚠️

**Wpływ:** Frontend StatsDTO jest niekompletny - widok Statistics (0% implementacji) nie może wyświetlić wszystkich danych z backendu.

---

## 4. Wzorce i Antywzorce

### 4.1 Dobre Praktyki ✅

| Praktyka               | Przykład                                   |
|------------------------|--------------------------------------------|
| Lombok @Data           | Wszystkie DTO                              |
| @Builder pattern       | MeasurementDTO, DashboardDTO               |
| Bean Validation        | MeasurementRequest (@NotNull, @DecimalMin) |
| Explicit JSON mapping  | @JsonProperty w MeasurementRequest         |
| Separation of concerns | Osobne DTO dla REST vs WebSocket           |

### 4.2 Obszary do Poprawy ⚠️

| Problem                              | Plik                      | Rekomendacja            |
|--------------------------------------|---------------------------|-------------------------|
| Ręczne mapowanie Entity→DTO          | StatsDTO                  | Użyć MapStruct          |
| Brak @JsonProperty w DTO wyjściowych | MeasurementDTO            | Dodać explicit mapping  |
| Niespójność double[] vs Double[]     | WaveformDTO               | Ujednolicić do Double[] |
| Brakujące pole freq_valid            | MeasurementRequest        | Dodać pole              |
| Nieaktualne komentarze (H8 vs H25)   | PowerQualityIndicatorsDTO | Zaktualizować           |

---

## 5. Walidacja (Bean Validation)

### 5.1 MeasurementRequest Constraints

```java
@NotNull @DecimalMin("0.0") @DecimalMax("500.0")
private Double voltageRms;

@NotNull @DecimalMin("0.0") @DecimalMax("100.0")
private Double currentRms;

@NotNull @DecimalMin("45.0") @DecimalMax("65.0")
private Double frequency;
```

### 5.2 Brakujące Walidacje ⚠️

| Pole | Brak walidacji | Ryzyko |
|------|----------------|--------|
| harmonicsV | Brak @Size | Potencjalnie duża tablica |
| harmonicsI | Brak @Size | Potencjalnie duża tablica |
| waveformV | Brak @Size | ~120-512 elementów |
| waveformI | Brak @Size | ~120-512 elementów |

**Rekomendacja:** Dodać `@Size(max = 100)` dla harmonicznych i `@Size(max = 600)` dla waveform.

---

## 6. Zidentyfikowane Problemy

### 6.1 Krytyczne

| # | Problem                        | Plik                    | Wpływ                     |
|---|--------------------------------|-------------------------|---------------------------|
| 1 | StatsDTO Frontend niekompletny | webapp/src/types/api.ts | 12 pól niedostępnych w UI |

### 6.2 Średnie

| # | Problem | Plik | Wpływ |
|---|---------|------|-------|
| 2 | Brak pola freq_valid | MeasurementRequest.java | Ignorowane przez backend |
| 3 | Nieaktualne komentarze H8 | PowerQualityIndicatorsDTO.java | Dezorientacja |
| 4 | Ręczne mapowanie | StatsDTO.java | Podatność na błędy |

### 6.3 Niskie

| # | Problem | Plik | Wpływ |
|---|---------|------|-------|
| 5 | Brak @Size dla tablic | MeasurementRequest.java | Potencjalny DoS |
| 6 | Niespójność double[]/Double[] | WaveformDTO.java | Estetyka kodu |

---

## 7. Diagram Relacji DTO

```
                    ┌─────────────────────┐
                    │  MeasurementRequest │
                    │  (MQTT Input)       │
                    └──────────┬──────────┘
                               │ deserialize
                               ▼
                    ┌─────────────────────┐
                    │    MeasurementDTO   │◄────────┐
                    │  (Core Transfer)    │         │
                    └──────────┬──────────┘         │
                               │                    │
              ┌────────────────┼────────────────┐   │
              │                │                │   │
              ▼                ▼                ▼   │
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │  DashboardDTO   │ │ RealtimeDTO │ │PowerQualityDTO  │
    │  (REST)         │ │ (WebSocket) │ │(PN-EN 50160)    │
    └────────┬────────┘ └──────┬──────┘ └─────────────────┘
             │                 │
             │    ┌────────────┘
             ▼    ▼
       ┌─────────────────┐
       │   WaveformDTO   │
       │  (200 samples)  │
       └─────────────────┘
```

---

## 8. Podsumowanie

### 8.1 Ocena: **7/10**

**Mocne strony:**

- Poprawne mapowanie ESP32 ↔ Backend (14/15 pól)
- Dobra separacja DTO dla różnych kanałów (REST vs WebSocket)
- Bean Validation dla krytycznych pól
- Dokumentacja Javadoc

**Słabe strony:**

- Niespójność Backend ↔ Frontend StatsDTO
- Brak automatycznego mapowania (MapStruct)
- Nieaktualne komentarze

### 8.2 Zgodność Warstw

| Warstwa | Zgodność |
|---------|----------|
| ESP32 → MeasurementRequest | 93% (brak freq_valid) |
| MeasurementDTO → Frontend | 100% |
| StatsDTO → Frontend | 52% ⚠️ |
| PowerQualityIndicatorsDTO → Frontend | 100% |

### 8.3 Następne Kroki Analizy

→ Przejść do **Java Encje** (`Measurement.java`, `DailyStats.java`) aby zweryfikować mapowanie do bazy danych
