# Analiza Modułu: Java Serwisy

**Pliki:** 7 serwisów + 1 klasa stałych
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Architektury

### 1.1 Diagram Przepływu Danych

```
ESP32 (MQTT) ─────────────────────────────────────────────────────────────┐
                                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MqttMessageHandler                                 │
│  @ServiceActivator(inputChannel = "mqttInputChannel")                        │
│  - Parse JSON → MeasurementRequest                                           │
│  - Delegate to MeasurementService                                            │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MeasurementService                                │
│  @Transactional                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ saveMeasurement(request):                                           │    │
│  │   1. Convert DTO → Entity                                           │    │
│  │   2. validator.validate(request) → ValidationResult                 │    │
│  │   3. calculatePowerQualityIndicators(measurement)                   │    │
│  │   4. repository.save(measurement)                                   │    │
│  │   5. eventPublisher.publishEvent(MeasurementSavedEvent)             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  @TransactionalEventListener(phase = AFTER_COMMIT)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ broadcastAfterCommit(event):                                        │    │
│  │   - Skip if !isValid                                                │    │
│  │   - reconstructWaveforms(measurement)                               │    │
│  │   - webSocketService.broadcastMeasurement/RealtimeDashboard         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                               │                        │
         ▼                               ▼                        ▼
┌─────────────────────────┐        ┌──────────────────┐     ┌──────────────────────┐
│MeasurementValidator     │        │ WaveformService  │     │  WebSocketService    │
│  - Voltage limits       │        │ - Reconstruct    │     │ /topic/measurements  │
│  - Budeanu S²=P²+Q₁²+D² │        │ - from harmonics │     │ /topic/dashboard     │
│  - Safety thresholds    │        └──────────────────┘     └──────────────────────┘
└─────────────────────────┘                                           │
                                                                      ▼
                                                               Frontend (STOMP)

┌─────────────────────────────────────────────────────────────────────────────┐
│                       DataAggregationService                                 │
│  @Scheduled(cron = "0 5 0 * * *")  // Daily at 00:05                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ aggregateDailyStats():                                               │   │
│  │   - Get yesterday's date                                             │   │
│  │   - statsService.calculateDailyStats(yesterday)                      │   │
│  │   - Log results + data completeness                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  Thread-safe: ReadWriteLock for status fields                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           StatsService                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ calculateDailyStats(date):                                           │   │
│  │   - Query measurements for date                                      │   │
│  │   - Calculate avg/min/max voltage, power, frequency                  │   │
│  │   - Count events with duration (IEC 61000-4-30)                      │   │
│  │   - Calculate energy (MathUtils.calculateEnergy)                     │   │
│  │   - Persist to DailyStats                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Analiza Poszczególnych Serwisów

### 2.1 MeasurementService (397 linii)

**Cel:** Główna logika zapisu pomiarów i obliczania wskaźników PN-EN 50160

#### Kluczowe Metody

| Metoda | Linie | Odpowiedzialność |
|--------|-------|------------------|
| `saveMeasurement()` | 134-183 | Zapis pomiaru + publikacja eventu |
| `broadcastAfterCommit()` | 185-200 | Broadcast WebSocket po COMMIT |
| `getDashboardData()` | 243-274 | Unified endpoint dla dashboard |
| `calculatePowerQualityIndicators()` | 96-118 | Obliczenia PN-EN 50160 |
| `reconstructWaveforms()` | 43-67 | Synteza przebiegów z harmonicznych |
| `buildPowerQualityIndicatorsDTO()` | 338-365 | Budowa DTO z compliance status |

#### Event-Driven Architecture ✅

```java
// Transakcja: tylko zapis do DB
@Transactional
public MeasurementDTO saveMeasurement(MeasurementRequest request) {
    // ... walidacja, obliczenia ...
    Measurement saved = repository.save(measurement);
    eventPublisher.publishEvent(new MeasurementSavedEvent(this, saved, dto));
    return dto;
}

// Broadcast POZA transakcją - po COMMIT
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void broadcastAfterCommit(MeasurementSavedEvent event) {
    if (!Boolean.TRUE.equals(event.getMeasurement().getIsValid())) {
        log.debug("Skipping broadcast for invalid measurement");
        return;
    }
    // ... broadcast do WebSocket ...
}
```

**Dlaczego to ważne:**
1. Transakcja jest krótka (tylko DB write)
2. Jeśli transakcja się wycofa, broadcast NIE następuje
3. Kosztowna rekonstrukcja przebiegów nie blokuje transakcji

#### Obliczanie Wskaźników PN-EN 50160

```java
private void calculatePowerQualityIndicators(Measurement measurement) {
    // Group 1: Voltage deviation
    if (measurement.getVoltageRms() != null) {
        double deviation = ((measurement.getVoltageRms() - Constants.NOMINAL_VOLTAGE)
                / Constants.NOMINAL_VOLTAGE) * 100.0;
        measurement.setVoltageDeviationPercent(deviation);
    }

    // Group 2: Frequency deviation
    if (measurement.getFrequency() != null) {
        double deviation = measurement.getFrequency() - Constants.NOMINAL_FREQUENCY;
        measurement.setFrequencyDeviationHz(deviation);
    }
}
```

#### Dokumentacja WHY ✅

Serwis zawiera wyjaśnienia **dlaczego** kod jest zaimplementowany w określony sposób:

```java
/**
 * WHY SEPARATE EVENT PUBLISHING:
 * - WebSocket broadcasts happen AFTER transaction commit
 * - This keeps the transaction short (only database write)
 * - Expensive waveform reconstruction doesn't block the transaction
 * - If transaction rolls back, no broadcasts are sent (data consistency)
 */
```

---

### 2.2 MeasurementValidator (87 linii)

**Cel:** Walidacja danych pomiarowych według progów bezpieczeństwa i PN-EN 50160

#### Algorytm Walidacji

```java
public ValidationResult validate(MeasurementRequest request) {
    List<String> warnings = new ArrayList<>();
    List<String> errors = new ArrayList<>();

    // 1. Safety thresholds (ERRORS - critical)
    if (voltageRms > 360.0) {
        errors.add("Błąd krytyczny: Napięcie " + voltageRms + "V przekracza próg bezpieczeństwa (360V).");
    }
    if (currentRms > 40.0) {
        errors.add("Błąd krytyczny: Prąd " + currentRms + "A przekracza próg bezpieczeństwa (40A).");
    }
    if (frequency < 45.0 || frequency > 55.0) {
        errors.add("Błąd krytyczny: Częstotliwość " + frequency + "Hz poza bezpiecznym zakresem.");
    }

    // 2. PN-EN 50160 thresholds (WARNINGS)
    if (voltageRms < 207 || voltageRms > 253) {  // ±10%
        warnings.add("Ostrzeżenie: Napięcie poza normą PN-EN 50160.");
    }

    // 3. Budeanu power theory sanity check
    double calculatedApparentPower = Math.sqrt(p*p + q1*q1 + d*d);
    if (diff > tolerance) {
        errors.add("Błąd krytyczny: Niespójność mocy (P,Q vs S).");
    }

    return new ValidationResult(errors.isEmpty(), warnings, errors);
}
```

#### Teoria Budeanu ✅

```java
// Budeanu power theory: S² = P² + Q₁² + D²
double p = request.getPowerActive();
double q1 = request.getPowerReactive();      // Q₁ (fundamental only)
double d = request.getPowerDistortion();     // D (distortion power)
double calculatedApparentPower = Math.sqrt(p*p + q1*q1 + d*d);
double apparentPowerFromUI = voltageRms * currentRms;
```

**Poprawna implementacja** - walidator sprawdza zgodność teorii Budeanu.

#### Komunikaty w Języku Polskim

Komunikaty błędów są po polsku (dla użytkownika końcowego):
- `"Błąd krytyczny: Napięcie przekracza próg bezpieczeństwa"`
- `"Ostrzeżenie: THD napięcia przekracza limit"`

---

### 2.3 MqttMessageHandler (48 linii)

**Cel:** Obsługa wiadomości MQTT z ESP32

```java
@ServiceActivator(inputChannel = "mqttInputChannel")
public void handleMqttMessage(Message<?> message) {
    try {
        String payload = (String) message.getPayload();
        MeasurementRequest request = objectMapper.readValue(payload, MeasurementRequest.class);
        measurementService.saveMeasurement(request);
    } catch (Exception e) {
        log.error("Error processing MQTT message: {}", e.getMessage(), e);
    }
}
```

#### Problemy

| # | Problem | Wpływ |
|---|---------|-------|
| 1 | Błędy są logowane ale nie propagowane | Brak alertów przy ciągłych błędach |
| 2 | Brak circuit breaker | Przy wadliwych danych każda wiadomość może failować |
| 3 | Brak metryki błędów | Brak visibility w monitoring |

---

### 2.4 WaveformService (32 linie)

**Cel:** Rekonstrukcja przebiegów z harmonicznych

```java
@Service
public class WaveformService {
    public double[] reconstructWaveform(Double[] harmonics, double frequency,
                                        int samplesPerCycle, double phaseShift) {
        return MathUtils.reconstructWaveform(harmonics, frequency, samplesPerCycle, phaseShift);
    }
}
```

**Uwaga:** Bardzo cienka warstwa - deleguje do `MathUtils`. Może być zbędna.

---

### 2.5 WebSocketService (37 linii)

**Cel:** Broadcast do klientów WebSocket via STOMP

```java
@Service
@RequiredArgsConstructor
public class WebSocketService {
    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastMeasurement(MeasurementDTO measurement) {
        messagingTemplate.convertAndSend("/topic/measurements", measurement);
    }

    public void broadcastRealtimeDashboard(RealtimeDashboardDTO dashboard) {
        messagingTemplate.convertAndSend("/topic/dashboard", dashboard);
    }
}
```

**Topics:**
- `/topic/measurements` - legacy, backward compatibility
- `/topic/dashboard` - realtime dashboard z waveforms

---

### 2.6 DataAggregationService (191 linii)

**Cel:** Automatyczna agregacja dziennych statystyk

#### Scheduled Job

```java
@Scheduled(cron = "0 5 0 * * *")  // Sekundy Minuty Godziny Dzień Miesiąc Dzień_Tygodnia
public void aggregateDailyStats() {
    LocalDate yesterday = LocalDate.now().minusDays(1);
    // ...
    StatsDTO stats = statsService.calculateDailyStats(yesterday);
    // ...
}
```

**Dlaczego 00:05?** - Daje margines na ewentualne opóźnione pomiary z północy.

#### Thread-Safety ✅

```java
private final ReadWriteLock lock = new ReentrantReadWriteLock();
private volatile LocalDateTime lastRunTime;
private volatile boolean lastRunSuccess = true;

// Write lock przy aktualizacji statusu
lock.writeLock().lock();
try {
    lastRunTime = LocalDateTime.now();
    lastProcessedDate = yesterday;
} finally {
    lock.writeLock().unlock();
}

// Read lock przy odczycie statusu
public boolean isHealthy() {
    lock.readLock().lock();
    try {
        return lastRunSuccess;
    } finally {
        lock.readLock().unlock();
    }
}
```

#### Health Check

```java
public boolean isHealthy() {
    return lastRunSuccess;  // Thread-safe via ReadWriteLock
}

public LocalDateTime getLastRunTime() { ... }
public LocalDate getLastProcessedDate() { ... }
public String getLastError() { ... }
```

Pozwala na monitoring stanu scheduled job.

---

### 2.7 StatsService (310 linii)

**Cel:** Obliczanie i pobieranie statystyk dziennych

#### Główna Metoda: calculateDailyStats()

```java
public StatsDTO calculateDailyStats(LocalDate date) {
    // 1. Query measurements for date
    List<Measurement> measurements = measurementRepository
        .findByIsValidTrueAndTimeBetween(startOfDay, endOfDay, Pageable.unpaged());

    // 2. Voltage stats
    double avgVoltage = MathUtils.average(voltages);
    double stdDevVoltage = MathUtils.standardDeviation(voltages, avgVoltage);

    // 3. Event counters (IEC 61000-4-30 compliant)
    int voltageSagCount = countEventsWithDuration(
        sortedMeasurements,
        m -> m.getVoltageRms() < Constants.VOLTAGE_SAG_THRESHOLD,
        Constants.SAG_MIN_DURATION_MS / 1000.0
    );

    // 4. Energy calculation
    double totalEnergyKwh = MathUtils.calculateEnergy(sortedMeasurements);

    // 5. Data quality
    int expectedMeasurements = 24 * 60 * 60 / 3;  // every 3 seconds
    double dataCompleteness = (double) measurementCount / expectedMeasurements;

    // 6. Persist
    repository.save(dailyStats);

    return statsDTO;
}
```

#### Algorytm Zliczania Zdarzeń z Czasem Trwania ✅

```java
/**
 * Count events that satisfy a condition for at least the minimum duration.
 *
 * Algorithm:
 * 1. Iterate through chronologically sorted measurements
 * 2. Detect event start when condition becomes true
 * 3. Calculate event duration when condition becomes false
 * 4. If duration >= minDurationSeconds, count as 1 event
 */
private int countEventsWithDuration(List<Measurement> measurements,
                                     Predicate<Measurement> condition,
                                     double minDurationSeconds) {
    int eventCount = 0;
    Instant eventStart = null;

    for (Measurement current : measurements) {
        boolean inEvent = condition.test(current);

        if (inEvent && eventStart == null) {
            eventStart = current.getTime();  // Event starts
        } else if (!inEvent && eventStart != null) {
            // Event ends - calculate duration
            double durationSeconds = Duration.between(eventStart, current.getTime()).toMillis() / 1000.0;
            if (durationSeconds >= minDurationSeconds) {
                eventCount++;
            }
            eventStart = null;
        }
    }

    // Handle event still active at end
    if (eventStart != null) { ... }

    return eventCount;
}
```

**Zgodność z IEC 61000-4-30** - zdarzenia muszą mieć minimalny czas trwania:
- Sag/Swell: ≥10ms
- Interruption: ≥10ms
- THD violation: ≥10ms

#### Data Completeness

```java
int expectedMeasurements = 24 * 60 * 60 / 3;  // 28,800 at 3s interval
double dataCompleteness = (double) measurementCount / expectedMeasurements;

if (dataCompleteness < 0.95) {
    log.warn("Low data completeness: {:.1f}%", dataCompleteness * 100);
}
```

---

### 2.8 Constants (161 linii)

**Cel:** Stałe systemowe oparte na normach PN-EN 50160, IEC 61000

#### Kluczowe Stałe

```java
// PN-EN 50160 Group 1: Voltage
public static final double NOMINAL_VOLTAGE = 230.0;
public static final double VOLTAGE_TOLERANCE = 0.10;  // ±10%
public static final double VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;   // 207V
public static final double VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10; // 253V

// PN-EN 50160 Group 2: Frequency
public static final double NOMINAL_FREQUENCY = 50.0;
public static final double FREQUENCY_MIN = 49.5;  // -1%
public static final double FREQUENCY_MAX = 50.5;  // +1%

// PN-EN 50160 Group 4: THD
public static final double VOLTAGE_THD_LIMIT = 8.0;  // %

// Measurement system
public static final int SAMPLING_RATE_HZ = 800;  // ⚠️ BŁĄD!
public static final int HARMONICS_COUNT = 8;     // ⚠️ BŁĄD!
```

#### KRYTYCZNY BŁĄD: Sampling Rate ⚠️

```java
// Constants.java (linia 145)
public static final int SAMPLING_RATE_HZ = 800;

// ESP32 main.cpp (linia 4)
#define SAMPLING_FREQ 3000  // Rzeczywista wartość!
```

**Konsekwencje:**
1. `MAX_HARMONIC_ORDER = 800/2/50 = 8` - ale ESP32 mierzy H25!
2. `NYQUIST_FREQUENCY_HZ = 400` - ale rzeczywiste Nyquist to 1500 Hz
3. Komentarze odwołujące się do tych stałych są niepoprawne

---

## 3. Wzorce Architektoniczne

### 3.1 Event-Driven ✅

```
MeasurementService.saveMeasurement()
    │
    ▼ publishEvent()
MeasurementSavedEvent
    │
    ▼ @TransactionalEventListener(AFTER_COMMIT)
MeasurementService.broadcastAfterCommit()
    │
    ▼
WebSocketService.broadcast*()
```

### 3.2 Separation of Concerns ✅

| Warstwa | Odpowiedzialność |
|---------|------------------|
| MqttMessageHandler | Tylko parsing i delegacja |
| MeasurementValidator | Tylko walidacja |
| MeasurementService | Orkiestracja + obliczenia |
| WebSocketService | Tylko broadcast |
| StatsService | Tylko statystyki |

### 3.3 Brakujące Wzorce

| Wzorzec | Status | Rekomendacja |
|---------|--------|--------------|
| Circuit Breaker | ❌ | Dodać dla MQTT handler |
| Retry | ❌ | Dodać dla DB operations |
| Metrics | ❌ | Dodać Micrometer counters |
| Caching | ❌ | Dodać dla getDashboardData() |

---

## 4. Zidentyfikowane Problemy

### 4.1 Krytyczne

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 1 | SAMPLING_RATE_HZ = 800 zamiast 3000 | Constants.java:145 | Błędne obliczenia MAX_HARMONIC_ORDER |
| 2 | HARMONICS_COUNT = 8 zamiast 25 | Constants.java:138 | Niespójność z ESP32 |

### 4.2 Średnie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 3 | Błędy MQTT tylko logowane | MqttMessageHandler:44 | Brak alertów |
| 4 | Brak circuit breaker | MqttMessageHandler | Potencjalny cascading failure |
| 5 | WaveformService zbyt cienki | WaveformService | Może być usunięty |

### 4.3 Niskie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 6 | Brak cache dla getDashboardData() | MeasurementService:243 | Każde request to DB query |
| 7 | Polskie komunikaty hardcoded | MeasurementValidator | Brak i18n |
| 8 | Magic numbers w walidacji | MeasurementValidator:46-57 | 360V, 40A, 45-55Hz |

---

## 5. Zgodność z Normami

### 5.1 PN-EN 50160

| Grupa | Wskaźnik | Implementacja | Status |
|-------|----------|---------------|--------|
| 1 | Voltage deviation ±10% | calculatePowerQualityIndicators() | ✅ |
| 2 | Frequency ±0.5 Hz | calculatePowerQualityIndicators() | ✅ |
| 4 | THD < 8% | checkThdCompliance() | ✅ (partial H2-H25) |
| 5 | Interruptions | countEventsWithDuration() | ✅ |

### 5.2 IEC 61000-4-30

| Wymaganie | Implementacja | Status |
|-----------|---------------|--------|
| Event duration thresholds | countEventsWithDuration() | ✅ |
| Minimum 10ms duration | SAG_MIN_DURATION_MS = 10 | ✅ |

### 5.3 Teoria Budeanu

| Formuła | Implementacja | Status |
|---------|---------------|--------|
| S² = P² + Q₁² + D² | MeasurementValidator:43 | ✅ |
| Q₁ = reactive power (H1) | Komentarze w DTO/Entity | ✅ |
| D = distortion power | powerDistortion field | ✅ |

---

## 6. Podsumowanie

### 6.1 Ocena: **8/10**

**Mocne strony:**
- Wzorcowa architektura event-driven (AFTER_COMMIT)
- Poprawna implementacja teorii Budeanu
- Zgodność z IEC 61000-4-30 (event duration)
- Thread-safe DataAggregationService
- Dokumentacja WHY w komentarzach
- Poprawne rozdzielenie warstw (SoC)

**Słabe strony:**
- SAMPLING_RATE_HZ = 800 zamiast 3000 (krytyczne)
- Brak error propagation w MQTT handler
- Brak circuit breaker i retry
- Hardcoded polskie komunikaty

### 6.2 Metryki Kodu

| Serwis | Linie | Komentarze | Coverage (szacowany) |
|--------|-------|------------|----------------------|
| MeasurementService | 397 | ~30% | 80% |
| StatsService | 310 | ~15% | 70% |
| DataAggregationService | 191 | ~20% | 60% |
| MeasurementValidator | 87 | ~10% | 90% |
| MqttMessageHandler | 48 | ~15% | 50% |
| WebSocketService | 37 | ~20% | 70% |
| WaveformService | 32 | ~40% | 90% |
| Constants | 161 | ~60% | N/A |

### 6.3 Rekomendacje

1. **PILNE:** Poprawić Constants.java - SAMPLING_RATE_HZ = 3000, HARMONICS_COUNT = 25
2. Dodać circuit breaker do MqttMessageHandler
3. Przenieść magic numbers (360V, 40A) do Constants.java
4. Rozważyć usunięcie WaveformService (deleguje tylko do MathUtils)
5. Dodać Micrometer metrics dla monitoringu
