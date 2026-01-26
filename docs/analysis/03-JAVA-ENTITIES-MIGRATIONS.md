# Analiza Modułu: Java Encje + Migracje DB

**Pliki Encji:** `model/entity/Measurement.java`, `model/entity/DailyStats.java`
**Migracje:** `V1__*.sql` - `V7__*.sql` (brak V6)
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Schematu Bazy Danych

### 1.1 Diagram ERD

```
┌─────────────────────────────────────────────────────────────────┐
│                        measurements                             │
├─────────────────────────────────────────────────────────────────┤
│ PK  id                 BIGSERIAL                                │
│     time               TIMESTAMP NOT NULL                       │
│     voltage_rms        DOUBLE PRECISION NOT NULL                │
│     current_rms        DOUBLE PRECISION NOT NULL                │
│     frequency          DOUBLE PRECISION NOT NULL                │
│     power_active       DOUBLE PRECISION                         │
│     power_apparent     DOUBLE PRECISION                         │
│     power_reactive     DOUBLE PRECISION (Q₁)                    │
│     power_distortion   DOUBLE PRECISION (D)                     │
│     power_factor       DOUBLE PRECISION (λ)                     │
│     thd_voltage        DOUBLE PRECISION                         │
│     thd_current        DOUBLE PRECISION                         │
│     harmonics_v        DOUBLE PRECISION[]                       │
│     harmonics_i        DOUBLE PRECISION[]                       │
│     waveform_v         DOUBLE PRECISION[]                       │
│     waveform_i         DOUBLE PRECISION[]                       │
│     voltage_deviation_percent  DOUBLE PRECISION                 │
│     frequency_deviation_hz     DOUBLE PRECISION                 │
│     is_valid           BOOLEAN                                  │
│     created_at         TIMESTAMP                                │
├─────────────────────────────────────────────────────────────────┤
│ IDX idx_measurement_time (time DESC)                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        daily_stats                              │
├─────────────────────────────────────────────────────────────────┤
│ PK  id                 BIGSERIAL                                │
│ UQ  date               DATE NOT NULL                            │
│     avg_voltage        DOUBLE PRECISION                         │
│     min_voltage        DOUBLE PRECISION                         │
│     max_voltage        DOUBLE PRECISION                         │
│     std_dev_voltage    DOUBLE PRECISION                         │
│     avg_power_active   DOUBLE PRECISION                         │
│     peak_power         DOUBLE PRECISION                         │
│     min_power          DOUBLE PRECISION                         │
│     total_energy_kwh   DOUBLE PRECISION                         │
│     avg_power_factor   DOUBLE PRECISION                         │
│     min_power_factor   DOUBLE PRECISION                         │
│     avg_frequency      DOUBLE PRECISION                         │
│     min_frequency      DOUBLE PRECISION                         │
│     max_frequency      DOUBLE PRECISION                         │
│     voltage_sag_count      INTEGER                              │
│     voltage_swell_count    INTEGER                              │
│     interruption_count     INTEGER                              │
│     thd_violations_count   INTEGER                              │
│     frequency_deviation_count INTEGER                           │
│     power_factor_penalty_count INTEGER                          │
│     measurement_count      INTEGER                              │
│     data_completeness      DOUBLE PRECISION                     │
│     created_at         TIMESTAMP                                │
│     updated_at         TIMESTAMP                                │
├─────────────────────────────────────────────────────────────────┤
│ IDX idx_daily_stats_date (date DESC)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Brak Relacji

Tabele **nie mają relacji** (FK) między sobą. `daily_stats` jest agregatem obliczanym z `measurements`, ale bez formalnego powiązania.

---

## 2. Analiza Encji: Measurement

### 2.1 Mapowanie JPA

```java
@Entity
@Table(name = "measurements", indexes = {
    @Index(name = "idx_measurement_time", columnList = "time")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Measurement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant time;

    // ... 18 dodatkowych pól ...

    @Column(name = "harmonics_v")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private Double[] harmonicsV;
}
```

### 2.2 Typy PostgreSQL ARRAY

```java
@JdbcTypeCode(SqlTypes.ARRAY)
private Double[] harmonicsV;

@JdbcTypeCode(SqlTypes.ARRAY)
private Double[] harmonicsI;

@JdbcTypeCode(SqlTypes.ARRAY)
private Double[] waveformV;

@JdbcTypeCode(SqlTypes.ARRAY)
private Double[] waveformI;
```

**Uwaga:** `SqlTypes.ARRAY` wymaga Hibernate 6+ i PostgreSQL. Nie jest przenośne na inne bazy danych.

### 2.3 Dokumentacja Javadoc

Encja ma **wyjątkowo dobrą dokumentację** (266 linii, ~60% to komentarze):

```java
/**
 * Reactive power of fundamental Q₁ in var (Budeanu theory).
 * Formula: Q₁ = U₁ * I₁ * sin(φ₁)
 * Note: For distorted waveforms, this is NOT the total reactive power.
 */
private Double powerReactive;
```

### 2.4 Niespójność: H8 vs H25 ⚠️

**Komentarz w Entity (linia 26):**
```java
// Harmonics limited to H1-H8 (50-400 Hz) due to Nyquist constraint at 800-1000 Hz sampling
```

**Rzeczywistość (ESP32 main.cpp linia 11):**
```cpp
#define MAX_CALC_HARMONIC 25  // H1-H25
#define SAMPLING_FREQ 3000    // 3000 Hz, nie 800-1000 Hz
```

**Wniosek:** Dokumentacja Entity jest nieaktualna. System mierzy H1-H25 przy 3000 Hz próbkowania.

---

## 3. Analiza Encji: DailyStats

### 3.1 Struktura

```java
@Entity
@Table(name = "daily_stats")
public class DailyStats {
    @Column(unique = true, nullable = false)
    private LocalDate date;

    // Voltage (4 pola)
    private double avgVoltage, minVoltage, maxVoltage, stdDevVoltage;

    // Power (4 pola)
    private double avgPowerActive, peakPower, minPower, totalEnergyKwh;

    // Power Factor (2 pola)
    private double avgPowerFactor, minPowerFactor;

    // Frequency (3 pola)
    private double avgFrequency, minFrequency, maxFrequency;

    // Event counters (6 pól)
    private int voltageSagCount, voltageSwellCount, interruptionCount;
    private int thdViolationsCount, frequencyDevCount, powerFactorPenaltyCount;

    // Meta (2 pola)
    private int measurementCount;
    private double dataCompleteness;

    // Audit (2 pola)
    @CreationTimestamp private LocalDateTime createdAt;
    @UpdateTimestamp private LocalDateTime updatedAt;
}
```

### 3.2 Użycie primitive double vs Double

| Encja | Typ | Problem |
|-------|-----|---------|
| Measurement | `Double` (boxed) | Może być null |
| DailyStats | `double` (primitive) | Nie może być null, defaultuje do 0.0 |

**Konsekwencja:** DailyStats nie rozróżnia "brak danych" od "wartość = 0".

---

## 4. Ewolucja Schematu (Migracje Flyway)

### 4.1 Historia Migracji

| Wersja | Nazwa | Zmiany |
|--------|-------|--------|
| V1 | Create_measurements_table | Tabela measurements z sensor_id, cos_phi |
| V2 | Create_daily_stats_table | Tabela daily_stats |
| V3 | Remove_unmeasurable_fields | Usuwa pst_flicker, capacitor_uf; Dodaje voltage/frequency deviation |
| V4 | Add_is_valid_column | Dodaje is_valid |
| V5 | Refactor_power_parameters | Usuwa cos_phi, power_reactive; Dodaje power_reactive_fund, power_distortion, power_factor, phase_shift |
| V6 | **BRAK** | Skok numeracji |
| V7 | Add_power_distortion_and_power_factor | Dodaje power_distortion; Rename cos_phi → power_factor |

### 4.2 KONFLIKT MIGRACJI ⚠️

**V5 wykonuje:**
```sql
ALTER TABLE measurements DROP COLUMN IF EXISTS cos_phi;
ALTER TABLE measurements DROP COLUMN IF EXISTS power_reactive;
ALTER TABLE measurements ADD COLUMN power_reactive_fund ...;
ALTER TABLE measurements ADD COLUMN power_distortion ...;
ALTER TABLE measurements ADD COLUMN power_factor ...;
ALTER TABLE measurements ADD COLUMN phase_shift ...;
```

**V7 próbuje:**
```sql
ALTER TABLE measurements ADD COLUMN power_distortion ...;  -- Już istnieje!
ALTER TABLE measurements RENAME COLUMN cos_phi TO power_factor;  -- Nie istnieje!
```

**Problem:** V7 zakłada stan sprzed V5, ale V5 już usunęła cos_phi i dodała power_distortion.

**Możliwe scenariusze:**
1. Jeśli V5 uruchomione pierwsze → V7 FAIL (cos_phi nie istnieje)
2. Jeśli V7 uruchomione pierwsze → V5 nadpisuje (działa, ale nieczysty stan)

### 4.3 Rekomendacja

Usunąć V7 lub zmodyfikować na:
```sql
-- V7: Cleanup - ensure correct schema state
ALTER TABLE measurements DROP COLUMN IF EXISTS cos_phi;
ALTER TABLE measurements DROP COLUMN IF EXISTS phase_shift;
ALTER TABLE measurements DROP COLUMN IF EXISTS power_reactive_fund;
-- power_distortion i power_factor już istnieją z V5
```

---

## 5. Indeksy i Wydajność

### 5.1 Istniejące Indeksy

| Tabela | Indeks | Kolumny | Cel |
|--------|--------|---------|-----|
| measurements | idx_measurement_time | time DESC | Range queries |
| measurements | idx_measurements_sensor_time | sensor_id, time DESC | Multi-sensor (nieużywane?) |
| daily_stats | idx_daily_stats_date | date DESC | Range queries |

### 5.2 Brakujące Indeksy

| Tabela | Proponowany indeks | Uzasadnienie |
|--------|-------------------|--------------|
| measurements | idx_measurements_valid | is_valid | Filtrowanie tylko valid |
| measurements | idx_measurements_voltage_dev | voltage_deviation_percent | Wykrywanie anomalii |

### 5.3 Analiza Wielkości Danych

| Interwał | measurements/dzień | measurements/rok | Rozmiar (~1KB/row) |
|----------|-------------------|------------------|-------------------|
| 3s | 28,800 | 10.5M | ~10 GB/rok |
| 6s | 14,400 | 5.3M | ~5 GB/rok |

**Rekomendacja:** Rozważyć partycjonowanie tabeli measurements po time (np. miesięczne partycje).

---

## 6. Mapowanie Entity ↔ DTO ↔ DB

### 6.1 Measurement

| Entity Field | DB Column | DTO Field | ESP32 JSON |
|--------------|-----------|-----------|------------|
| voltageRms | voltage_rms | voltageRms | v_rms |
| currentRms | current_rms | currentRms | i_rms |
| powerActive | power_active | powerActive | p_act |
| powerApparent | power_apparent | powerApparent | power_apparent |
| powerReactive | power_reactive | powerReactive | power_reactive |
| powerDistortion | power_distortion | powerDistortion | power_distortion |
| powerFactor | power_factor | powerFactor | power_factor |
| frequency | frequency | frequency | freq |
| thdVoltage | thd_voltage | thdVoltage | thd_v |
| thdCurrent | thd_current | thdCurrent | thd_i |
| harmonicsV | harmonics_v | harmonicsV | harm_v |
| harmonicsI | harmonics_i | harmonicsI | harm_i |
| waveformV | waveform_v | - | waveform_v |
| waveformI | waveform_i | - | waveform_i |
| voltageDeviationPercent | voltage_deviation_percent | voltageDeviationPercent | - (backend) |
| frequencyDeviationHz | frequency_deviation_hz | frequencyDeviationHz | - (backend) |
| isValid | is_valid | - | - (backend) |

### 6.2 Usunięte Kolumny (nie istnieją w aktualnym schemacie)

| Kolumna | Usunięta w | Powód |
|---------|-----------|-------|
| sensor_id | V3? | Brak w Entity, może być residualne |
| cos_phi | V5 | Zastąpione power_factor |
| pst_flicker | V3 | Niemierzalne (brak sprzętu IEC 61000-4-15) |
| capacitor_uf | V3 | Nieimplementowane |

---

## 7. Komentarze SQL - Best Practice ✅

Migracje zawierają **wyjątkową dokumentację**:

```sql
-- Voltage sag: RMS voltage drops below 90% of nominal for 10ms to 1 minute
-- Causes: Motor starts, short circuits, transformer switching
-- Effects: Equipment malfunction, computer resets, light dimming
voltage_sag_count INTEGER DEFAULT 0,
```

```sql
-- Why pre-aggregation?
-- Problem: Calculating daily stats from raw data requires scanning 86,400 rows
-- Solution: Calculate once per day, store result, query 1 row instead of 86,400
-- Trade-off: Extra storage (~365 rows/year) for 1000x faster queries
```

To wzorcowy przykład dokumentacji schematu DB.

---

## 8. Zidentyfikowane Problemy

### 8.1 Krytyczne

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 1 | Konflikt migracji V5/V7 | V5, V7 | Potencjalny FAIL na świeżej DB |

### 8.2 Średnie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 2 | Nieaktualne komentarze H8 vs H25 | Measurement.java | Dezorientacja |
| 3 | Brak V6 (skok numeracji) | migrations | Estetyka |
| 4 | sensor_id w V1 ale nie w Entity | V1, Measurement.java | Residualna kolumna? |

### 8.3 Niskie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 5 | primitive double w DailyStats | DailyStats.java | Brak null semantyki |
| 6 | Brak partycjonowania | measurements | Wydajność przy dużych danych |
| 7 | Brak indeksu na is_valid | measurements | Wolniejsze filtrowanie |

---

## 9. Podsumowanie

### 9.1 Ocena: **7.5/10**

**Mocne strony:**
- Wyjątkowa dokumentacja SQL (business justification, IEC references)
- Poprawna teoria Budeanu w komentarzach
- Odpowiednie indeksy dla time-series
- Użycie PostgreSQL ARRAY dla harmonicznych

**Słabe strony:**
- Konflikt migracji V5/V7
- Nieaktualne komentarze w Entity (H8 vs H25)
- Brak partycjonowania dla skalowalności

### 9.2 Zgodność Warstw

| Aspekt | Status |
|--------|--------|
| Entity ↔ DB | ✅ (z wyjątkiem sensor_id) |
| Entity ↔ DTO | ✅ |
| Dokumentacja Entity ↔ Rzeczywistość | ⚠️ (H8 vs H25) |

