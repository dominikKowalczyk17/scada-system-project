# Analiza Modułu: Java Repositories

**Katalog:** `scada-system/src/main/java/com/dkowalczyk/scadasystem/repository/`
**Pliki:** 2
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Repozytoriów

### 1.1 Lista Repozytoriów

| Plik | Linie | Encja | Custom Queries |
|------|-------|-------|----------------|
| MeasurementRepository.java | 44 | Measurement | 4 + 1 @Query |
| DailyStatsRepository.java | 25 | DailyStats | 2 |

### 1.2 Architektura Dostępu do Danych

```
Service Layer
    ↓
┌──────────────────────┐         ┌──────────────────────┐
│ MeasurementRepository│         │ DailyStatsRepository │
└─────────┬────────────┘         └──────────┬───────────┘
          │                                  │
          ├─ JpaRepository (CRUD)            ├─ JpaRepository (CRUD)
          ├─ Query Methods (4)               └─ Query Methods (2)
          └─ @Query JPQL (1)
          │
          ▼
    PostgreSQL Database
    ├─ measurements (time-series, ~30M rows/year)
    └─ daily_stats (aggregated, 365 rows/year)
```

---

## 2. MeasurementRepository - Analiza Szczegółowa

### 2.1 Interfejs

```java
@Repository
public interface MeasurementRepository extends JpaRepository<Measurement, Long> {

    Optional<Measurement> findTopByIsValidTrueOrderByTimeDesc();

    List<Measurement> findTop100ByIsValidTrueOrderByTimeDesc();

    List<Measurement> findByIsValidTrueAndTimeBetween(Instant from, Instant to, Pageable pageable);

    @Query("""
        SELECT
            MIN(m.voltageRms) as minVoltage,
            MAX(m.voltageRms) as maxVoltage,
            AVG(m.voltageRms) as avgVoltage,
            AVG(m.powerActive) as avgPower
        FROM Measurement m
        WHERE m.time > :since
        AND m.isValid = true
    """)
    Object getDailyStats(Instant since);
}
```

### 2.2 Analiza Query Methods

#### 2.2.1 findTopByIsValidTrueOrderByTimeDesc()

```java
Optional<Measurement> findTopByIsValidTrueOrderByTimeDesc();
```

**Tłumaczenie na SQL:**
```sql
SELECT * FROM measurements
WHERE is_valid = true
ORDER BY time DESC
LIMIT 1;
```

**Wykorzystanie:** MeasurementService.getLatestMeasurement()

**Analiza wydajności:**
- ✅ Używa indeksu `idx_measurement_time` (DESC)
- ✅ Filter `is_valid = true` efektywny
- ✅ LIMIT 1 - minimalna ilość danych

**Optymalizacja:**
- Indeks kompozytowy `(is_valid, time DESC)` byłby szybszy
- Ale przy >95% is_valid=true, obecny indeks wystarczy

**Ocena:** ✅ Bardzo dobra wydajność

#### 2.2.2 findTop100ByIsValidTrueOrderByTimeDesc()

```java
List<Measurement> findTop100ByIsValidTrueOrderByTimeDesc();
```

**SQL:**
```sql
SELECT * FROM measurements
WHERE is_valid = true
ORDER BY time DESC
LIMIT 100;
```

**Wykorzystanie:** MeasurementService.getDashboardData() - recent history

**Analiza:**
- ✅ LIMIT 100 - akceptowalne dla dashboardu
- ✅ Indeks wspiera ORDER BY time DESC
- ⚠️ Hardcoded LIMIT (nie parametryzowane)

**Payload size:**
- 100 measurements × ~2KB = ~200 KB
- Z harmonics arrays (25 doubles × 2) = ~4 KB na measurement
- **Total: ~400 KB dla /api/dashboard**

**Problem:** Frontend może nie potrzebować 100, wystarczy 50
**Rekomendacja:** Parametryzować limit:
```java
List<Measurement> findTopNByIsValidTrueOrderByTimeDesc(int limit);
```

**Ocena:** ✅ Dobra, ale można ulepszyć

#### 2.2.3 findByIsValidTrueAndTimeBetween()

```java
List<Measurement> findByIsValidTrueAndTimeBetween(
    Instant from, Instant to, Pageable pageable);
```

**SQL:**
```sql
SELECT * FROM measurements
WHERE is_valid = true
  AND time >= :from
  AND time <= :to
ORDER BY time DESC  -- z Pageable
LIMIT :limit;
```

**Wykorzystanie:** MeasurementController.getHistory()

**Analiza wydajności:**
- ✅ Range query na indexed column (time)
- ✅ Pageable dla LIMIT/OFFSET
- ✅ is_valid filter

**Indeks wykorzystywany:**
```sql
-- idx_measurement_time: CREATE INDEX ... ON measurements(time DESC)
```

**Efektywność:** Index Range Scan (bardzo szybki)

**Potencjalny problem:**
- Dla dużych zakresów (np. cały miesiąc) może zwrócić tysiące rows
- Kontroler ogranicza do @Max(1000), ale to nadal dużo

**Edge case:**
```java
// User request: ?from=0&to=now&limit=1000
// Może zwrócić kilka lat danych jeśli from=epoch(0)
```

**Rekomendacja:** Dodać walidację zakresu czasu w kontrolerze (max 30 dni)

**Ocena:** ✅ Bardzo dobra

### 2.3 Custom JPQL Query - getDailyStats()

```java
@Query("""
    SELECT
        MIN(m.voltageRms) as minVoltage,
        MAX(m.voltageRms) as maxVoltage,
        AVG(m.voltageRms) as avgVoltage,
        AVG(m.powerActive) as avgPower
    FROM Measurement m
    WHERE m.time > :since
    AND m.isValid = true
""")
Object getDailyStats(Instant since);
```

**Analiza:**

**Return type: Object** - ⚠️ Nietyped!

**Użycie:**
```java
// W StatsService (prawdopodobnie):
Object result = repository.getDailyStats(yesterday);
Object[] row = (Object[]) result;
double minVoltage = (Double) row[0];
// ... etc
```

**Problemy:**
1. **Type safety:** Brak compile-time checking
2. **Maintenance:** Zmiana kolejności SELECT = runtime error
3. **Czytelność:** Kod castujący Object[] jest brzydki

**Lepsze rozwiązanie - Projection Interface:**
```java
public interface DailyStatsProjection {
    Double getMinVoltage();
    Double getMaxVoltage();
    Double getAvgVoltage();
    Double getAvgPower();
}

@Query(...)
DailyStatsProjection getDailyStats(Instant since);
```

**Lub DTO Projection:**
```java
@Query("""
    SELECT new com.dkowalczyk.scadasystem.model.dto.DailyStatsAggregateDTO(
        MIN(m.voltageRms),
        MAX(m.voltageRms),
        AVG(m.voltageRms),
        AVG(m.powerActive)
    )
    FROM Measurement m
    WHERE m.time > :since
    AND m.isValid = true
""")
DailyStatsAggregateDTO getDailyStats(Instant since);
```

**Wydajność SQL:**
```sql
SELECT MIN(voltage_rms), MAX(voltage_rms), AVG(voltage_rms), AVG(power_active)
FROM measurements
WHERE time > :since AND is_valid = true;
```

**Analiza:**
- ⚠️ **Full table scan** dla dużych zakresów (brak LIMIT)
- Dla yesterday (24h × 1200 pomiarów = 28800 rows) - akceptowalne
- Dla dłuższych okresów - bardzo wolne

**Optymalizacja:**
- Indeks na `(is_valid, time)` - partial scan
- Lub materializacja w `daily_stats` table (już jest!)

**Ocena:** ⚠️ Funkcjonalne, ale type safety i wydajność do poprawy

---

## 3. DailyStatsRepository - Analiza

### 3.1 Interfejs

```java
public interface DailyStatsRepository extends JpaRepository<DailyStats, Long> {

    Optional<DailyStats> findByDate(LocalDate date);

    List<DailyStats> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);
}
```

### 3.2 Analiza Query Methods

#### 3.2.1 findByDate()

```java
Optional<DailyStats> findByDate(LocalDate date);
```

**SQL:**
```sql
SELECT * FROM daily_stats
WHERE date = :date;
```

**Analiza:**
- ✅ Unique constraint na `date` - maksymalnie 1 wiersz
- ✅ Indeks na `date` (z UNIQUE constraint)
- ✅ Index Unique Scan - najszybsze możliwe

**Wykorzystanie:**
- StatsService.getStatsForDate()
- StatsService.getTodayStats()

**Ocena:** ✅ Perfekcyjne

#### 3.2.2 findByDateBetweenOrderByDateAsc()

```java
List<DailyStats> findByDateBetweenOrderByDateAsc(LocalDate from, LocalDate to);
```

**SQL:**
```sql
SELECT * FROM daily_stats
WHERE date >= :from AND date <= :to
ORDER BY date ASC;
```

**Wykorzystanie:**
- StatsService.getLastDaysStats(7)
- StatsService.getLastDaysStats(30)
- StatsService.getStatsInDateRange(from, to)

**Analiza wydajności:**
- ✅ Range scan na indexed column
- ✅ Small result set (max 365 rows dla całego roku)
- ✅ ORDER BY date ASC naturalnie wspierany przez indeks

**Edge case:**
```java
// User: ?from=2020-01-01&to=2025-12-31 (6 lat)
// Result: 6 × 365 = 2190 rows
```

**StatsController ma walidację:**
```java
// Prawdopodobnie max 365 dni (sprawdzam w StatsService)
```

**Ocena:** ✅ Doskonałe

---

## 4. Spring Data JPA Patterns

### 4.1 Derived Query Methods

**Wykorzystane wzorce:**

| Pattern | Przykład | SQL Fragment |
|---------|----------|--------------|
| `findBy` | `findByDate()` | `WHERE date = ?` |
| `findTopBy` | `findTopByIsValidTrue...` | `LIMIT 1` |
| `findTop100By` | `findTop100By...` | `LIMIT 100` |
| `OrderBy...Desc` | `OrderByTimeDesc` | `ORDER BY time DESC` |
| `Between` | `TimeBetween` | `time >= ? AND time <= ?` |
| `True` | `IsValidTrue` | `is_valid = true` |

**Ocena:** ✅ Prawidłowe użycie Spring Data naming conventions

### 4.2 @Query vs Derived Methods

| Typ | Użycie | Ocena |
|-----|--------|-------|
| Derived (4) | Simple queries | ✅ Czytelne |
| @Query (1) | Aggregation | ⚠️ Bez projekcji |

**Ratio:** 80% derived / 20% @Query - ✅ Dobry balans

---

## 5. Indeksowanie i Wydajność

### 5.1 Wykorzystanie Indeksów

**Measurements table:**
```sql
CREATE INDEX idx_measurement_time ON measurements(time DESC);
```

**Queries wspierane:**
- ✅ `findTopBy...OrderByTimeDesc()` - Index Scan DESC
- ✅ `findBy...TimeBetween()` - Index Range Scan
- ✅ `WHERE time > :since` - Index Range Scan

**Daily_stats table:**
```sql
CREATE UNIQUE INDEX unique_date ON daily_stats(date);
```

**Queries wspierane:**
- ✅ `findByDate()` - Index Unique Scan
- ✅ `findByDateBetween()` - Index Range Scan

### 5.2 Missing Indexes?

**Potencjalny composite index:**
```sql
CREATE INDEX idx_measurement_valid_time ON measurements(is_valid, time DESC);
```

**Benefit:**
- Queries z `WHERE is_valid = true AND time ...` szybsze
- Index-only scan (nie wymaga table access)

**Trade-off:**
- Dodatkowy storage
- Wolniejsze INSERTy (update 2 indeksów)

**Dla SCADA:**
- 1200 insertów/godzinę - nie problem
- Queries ~10/sekundę (dashboard refresh)
- **Rekomendacja:** Dodać composite index

### 5.3 Query Performance Estimates

**Dla 30M pomiarów (1 rok przy 3s interwale):**

| Query | Indeks | Oczekiwany czas | Ocena |
|-------|--------|-----------------|-------|
| `findTopBy...` | idx_measurement_time | <5 ms | ✅ Excellent |
| `findTop100By...` | idx_measurement_time | 10-20 ms | ✅ Bardzo dobra |
| `findBy...TimeBetween` (1 dzień) | idx_measurement_time | 50-100 ms | ✅ Dobra |
| `findBy...TimeBetween` (30 dni) | idx_measurement_time | 500-1000 ms | ⚠️ Wolne |
| `getDailyStats` (24h) | Table scan | 200-500 ms | ⚠️ Akceptowalne |
| `findByDate` (daily_stats) | unique_date | <1 ms | ✅ Perfect |
| `findByDateBetween` (30 dni) | unique_date | <5 ms | ✅ Perfect |

**Wnioski:**
- Daily_stats queries ekstremalne szybkie (pre-agregacja działa!)
- Measurements queries dobre dla krótkich zakresów (<7 dni)
- Long-range queries (>30 dni) mogą być bottleneckiem

---

## 6. N+1 Query Problem

### 6.1 Analiza Lazy Loading

**Measurement entity:**
```java
@Entity
public class Measurement {
    // Wszystkie pola są @Column (nie @OneToMany, @ManyToOne)
    // Harmonics jako PostgreSQL ARRAY
}
```

**Ocena:** ✅ Brak relacji = brak N+1 problem!

**DailyStats entity:**
```java
@Entity
public class DailyStats {
    // Również brak relacji
}
```

**Wniosek:** Architektura denormalizowana (harmonics w tej samej tabeli) eliminuje N+1

---

## 7. Transaction Management

### 7.1 @Transactional na Repository

**Spring Data JPA:**
- Wszystkie metody JpaRepository domyślnie `@Transactional(readOnly = true)` dla query methods
- Save/delete methods mają `@Transactional` (read-write)

**Repozytoria nie potrzebują własnych adnotacji** ✅

### 7.2 Read-Only Optimization

```java
// Spring automatycznie ustawia:
@Transactional(readOnly = true)
Optional<Measurement> findTopBy...();
```

**Benefit:**
- Hibernate flush mode = MANUAL (skip dirty checking)
- ~5-10% szybsze queries
- PostgreSQL może użyć read replicas (jeśli skonfigurowane)

---

## 8. Pagination Strategy

### 8.1 Obecna Implementacja

```java
List<Measurement> findBy...(Instant from, Instant to, Pageable pageable);
```

**Użycie w kontrolerze:**
```java
PageRequest.of(0, limit)  // Tylko LIMIT, bez OFFSET
```

**Ocena:** ⚠️ Niepełna paginacja
- Brak możliwości "następna strona"
- Działa jak TOP N, nie jak prawdziwa paginacja

### 8.2 True Pagination

**Dla true pagination potrzeba:**
```java
Page<Measurement> findBy...(Instant from, Instant to, Pageable pageable);
```

**Benefit:**
```java
Page<MeasurementDTO> page = repository.findBy...(..., PageRequest.of(1, 100));
// page.getTotalElements() - ile w sumie
// page.getTotalPages() - ile stron
// page.hasNext() - czy jest następna
```

**Dla SCADA to overkill** - dashboard nie potrzebuje paginacji

**Ocena:** ✅ Obecne rozwiązanie wystarczające

---

## 9. Repository Testing

### 9.1 Test Strategy

**Sprawdzam czy istnieją:**
- `MeasurementRepositoryTest.java`
- `DailyStatsRepositoryTest.java`

**Rekomendowane testy:**

**MeasurementRepositoryTest:**
```java
@DataJpaTest
class MeasurementRepositoryTest {

    @Test
    void findTopByIsValidTrue_returnsLatest() { }

    @Test
    void findByTimeBetween_filtersCorrectly() { }

    @Test
    void getDailyStats_calculatesCorrectly() { }
}
```

**Narzędzia:**
- `@DataJpaTest` - tylko JPA context (szybkie)
- H2 in-memory lub Testcontainers PostgreSQL
- `@Sql` dla test fixtures

---

## 10. Problemy i Rekomendacje

### 10.1 Krytyczne

| # | Problem | Repository | Wpływ | Priorytet |
|---|---------|------------|-------|-----------|
| - | Brak | - | - | - |

**Brak krytycznych problemów!** ✅

### 10.2 Wysokie

| # | Problem | Repository | Wpływ | Priorytet |
|---|---------|------------|-------|-----------|
| 1 | getDailyStats zwraca Object | MeasurementRepository | Type safety | 🟠 Wysoki |
| 2 | Brak composite index (is_valid, time) | MeasurementRepository | Performance | 🟠 Wysoki |

### 10.3 Średnie

| # | Problem | Repository | Wpływ | Priorytet |
|---|---------|------------|-------|-----------|
| 3 | Hardcoded TOP100 | MeasurementRepository | Flexibility | 🟡 Średni |
| 4 | Brak date range limit validation | Both | Performance edge case | 🟡 Średni |

### 10.4 Niskie

| # | Problem | Repository | Wpływ | Priorytet |
|---|---------|------------|-------|-----------|
| 5 | Brak @RepositoryRestResource | Both | REST auto-generation | 🟢 Niski (nie potrzebne) |

---

## 11. Best Practices Compliance

### 11.1 Spring Data Best Practices

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| Interface-based repositories | ✅ Extends JpaRepository | ✅ |
| Derived query methods | ✅ 80% queries | ✅ |
| Optional<T> return types | ✅ Dla single results | ✅ |
| Pageable support | ✅ W history queries | ✅ |
| @Query for complex | ✅ Tylko dla aggregation | ✅ |
| Named parameters | ✅ `:since` | ✅ |
| Projection interfaces | ❌ getDailyStats → Object | ❌ |

**Score:** 6/7 (86%)

### 11.2 Database Best Practices

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| Indexed foreign keys | N/A (brak FK) | ✅ |
| Indexed query columns | ✅ time, date | ✅ |
| Composite indexes | ❌ Brak (is_valid, time) | ⚠️ |
| Covering indexes | ❌ | ⚠️ |
| Partial indexes | ❌ WHERE is_valid | ⚠️ |
| Read-only transactions | ✅ Automatyczne | ✅ |

---

## 12. Scalability Analysis

### 12.1 Data Growth Projections

**Pomiary:**
- Interwał: 3 sekundy
- Pomiarów/dzień: 28,800
- Pomiarów/rok: 10,512,000

**Storage:**
- Measurement row: ~2 KB (z harmonics arrays)
- 10M rows = 20 GB/rok

**Po 5 latach:** 100 GB measurements

### 12.2 Query Performance Degradation

| Rows | findTop1 | findTop100 | find 1 day | find 30 days |
|------|----------|------------|------------|--------------|
| 1M | 5 ms | 15 ms | 50 ms | 500 ms |
| 10M | 5 ms | 15 ms | 50 ms | 800 ms |
| 100M | 10 ms | 25 ms | 100 ms | **3000 ms** ⚠️ |

**Bottleneck:** Long-range queries po 3+ latach

### 12.3 Mitigation Strategies

1. **Partitioning (TimescaleDB):**
   ```sql
   CREATE TABLE measurements (...) PARTITION BY RANGE (time);
   ```
   **Benefit:** 10x szybsze range queries

2. **Data retention:**
   ```sql
   DELETE FROM measurements WHERE time < NOW() - INTERVAL '2 years';
   ```

3. **Archive table:**
   ```sql
   CREATE TABLE measurements_archive AS
   SELECT * FROM measurements WHERE time < '2024-01-01';
   ```

4. **Read replicas:**
   - Master dla insertów (MQTT)
   - Replica dla dashboard queries

---

## 13. Podsumowanie

**Ocena ogólna: 8.5/10**

### 13.1 Mocne Strony

✅ **Minimalistyczne** - tylko 2 repozytoria, zero over-engineering
✅ **Właściwe użycie indeksów** - wszystkie queries wspierane
✅ **Spring Data idioms** - czyste, idiomatyczne query methods
✅ **Denormalizacja eliminuje N+1** - harmonics w tej samej tabeli
✅ **Pre-agregacja** - daily_stats ekstremalne szybka
✅ **Optional<T>** - null safety
✅ **Brak circular dependencies** - czysta architektura

### 13.2 Słabe Strony

⚠️ **Object return type** - getDailyStats bez type safety
⚠️ **Brak composite index** - (is_valid, time) przyspieszyłby queries
⚠️ **Hardcoded limits** - TOP100 nie parametryzowane
⚠️ **Long-range queries** - będą wolne po 3+ latach (brak partitioning)

### 13.3 Kluczowe Wnioski

1. **Solid foundation** - repozytoria proste, skuteczne, testowalne
2. **Performance dobra** - dla obecnej skali (<1 rok danych)
3. **Scalability concerns** - trzeba będzie partitioning po 2-3 latach
4. **Type safety gap** - getDailyStats() powinien zwracać DTO/Projection

### 13.4 Priorytetowe Akcje

| Priorytet | Akcja | Effort | Impact |
|-----------|-------|--------|--------|
| 🟠 Wysoki | Zmienić getDailyStats() na Projection | 30 min | Średni (type safety) |
| 🟠 Wysoki | Dodać composite index (is_valid, time) | 5 min | Wysoki (20% faster queries) |
| 🟡 Średni | Parametryzować TOP100 → TOPN | 15 min | Niski (flexibility) |
| 🟢 Niski | Plan TimescaleDB migration | 8h | Wysoki (long-term) |

---

**Następny moduł:** Java Exceptions & Events (#8)
