# SCADA System Backend Implementation Guide

## Document Purpose

This document explains **WHY** we implement each component, **WHAT** problem it solves, and **HOW** it fits into the overall architecture. Every design decision is justified from first principles to help you understand and defend your thesis.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Database Design](#database-design)
3. [Why Database Migrations](#why-database-migrations)
4. [Statistics and Aggregation](#statistics-and-aggregation)
5. [Power Quality Monitoring](#power-quality-monitoring)
6. [Development Environment Setup](#development-environment-setup)

---

## Architectural Overview

### The Problem We're Solving

**Real-world scenario:** A home or industrial facility needs to monitor electrical power quality 24/7 to:
1. Detect anomalies (voltage drops, spikes, frequency deviations)
2. Calculate energy consumption for billing/optimization
3. Ensure compliance with IEC 61000 power quality standards
4. Identify electrical problems before equipment damage occurs

### Why Spring Boot?

**Problem:** Building a production-ready backend from scratch requires solving many problems:
- HTTP server setup
- Dependency injection
- Database connection pooling
- Transaction management
- Configuration management
- Testing framework
- Production monitoring

**Solution:** Spring Boot provides **opinionated defaults** for all of these, reducing development time from months to weeks.

**Thesis justification:** "Spring Boot was chosen because it's an industry-standard framework that provides production-ready features out of the box, allowing focus on domain-specific power quality monitoring rather than infrastructure concerns."

### Architecture Pattern: Layered Architecture

```
┌─────────────────────────────────────┐
│  Controllers (REST API endpoints)   │ ← HTTP requests from frontend
├─────────────────────────────────────┤
│  Services (Business Logic)          │ ← Power quality calculations
├─────────────────────────────────────┤
│  Repositories (Data Access)         │ ← Database queries
├─────────────────────────────────────┤
│  Entities (Domain Models)           │ ← Data structure definitions
└─────────────────────────────────────┘
```

**Why this pattern?**

1. **Separation of Concerns:** Each layer has a single responsibility
   - Controllers handle HTTP (input/output formatting)
   - Services contain business logic (power calculations, event detection)
   - Repositories handle database operations

2. **Testability:** You can test business logic without HTTP or database
   ```java
   // Test service logic in isolation
   StatsService service = new StatsService();
   StatsDTO stats = service.calculateStats(measurements);
   assertEquals(230.0, stats.getAvgVoltage(), 0.1);
   ```

3. **Maintainability:** Changes to database schema don't affect business logic
   - If you switch from PostgreSQL to TimescaleDB, only repositories change
   - Business logic in services remains the same

**Thesis justification:** "The layered architecture separates concerns, making the system maintainable and testable. This follows the SOLID principles taught in Software Engineering courses."

---

## Database Design

### Why Do We Need a Database?

**Problem:** ESP32 sensors send measurements every second (86,400 per day). Where do we store this data?

**Bad solutions:**
- ❌ **In-memory (List/Array):** Lost when server restarts
- ❌ **Files (CSV/JSON):** Slow queries, no concurrent access, manual locking
- ❌ **Cloud storage (S3):** High latency, expensive for small queries

**Good solution:**
- ✅ **Relational Database (PostgreSQL):**
  - ACID guarantees (data consistency)
  - Fast indexed queries (find data in milliseconds)
  - Concurrent access (multiple clients safely)
  - Aggregation functions (SQL AVG, MAX, MIN)

### Why PostgreSQL Specifically?

**Alternatives considered:**

1. **MySQL:** Similar to PostgreSQL but:
   - Less advanced JSON support (we might store harmonics as JSON)
   - Weaker compliance with SQL standards
   - No native time-series optimization

2. **MongoDB (NoSQL):** Good for unstructured data but:
   - Measurements are highly structured (voltage, current, power, etc.)
   - SQL aggregations (AVG, SUM) are simpler than MongoDB's aggregation pipeline
   - No ACID transactions by default

3. **InfluxDB (Time-Series DB):** Specialized for time-series but:
   - Adds complexity (learning a new query language)
   - PostgreSQL with TimescaleDB extension gives similar performance
   - PostgreSQL is more widely known (easier to find help)

**Decision:** PostgreSQL because:
- Industry standard (used by millions of applications)
- Excellent time-series support with TimescaleDB extension (optional future upgrade)
- Rich ecosystem (monitoring tools, backup solutions, connection poolers)
- You likely learned SQL in database courses

**Thesis justification:** "PostgreSQL was selected for its robust ACID compliance, advanced indexing capabilities for time-series data, and widespread industry adoption, making it a reliable choice for storing critical power quality measurements."

### Database Schema Design

#### Measurements Table

**Problem:** We need to store every measurement from ESP32 sensors. What fields do we need?

**Electrical parameters from IEC 61000 standards:**

| Parameter        |                     Why We Need It                              |     Example Value    |
|------------------|-----------------------------------------------------------------|----------------------|
| `time`           | When was measurement taken? Critical for time-series analysis   | 2025-11-07 14:30:00  |
| `voltage_rms`    | RMS voltage (root mean square) - the "effective" voltage        | 230.5 V              |
| `current_rms`    | RMS current - determines load                                   | 5.2 A                |
| `frequency`      | Grid frequency - must be stable at 50Hz ± 1Hz                   | 50.1 Hz              |
| `power_active`   | Real power doing useful work (watts)                            | 1196 W               |
| `power_reactive` | Power oscillating back and forth (VARs)                         | 150 VAR              |
| `power_apparent` | Total power (VA) = √(active² + reactive²)                       | 1205 VA              |
| `cos_phi`        | Power factor = active/apparent (efficiency metric)              | 0.99                 |
| `thd_voltage`    | Total Harmonic Distortion - power quality indicator             | 2.3%                 |
| `harmonics_v[]`  | Voltage harmonics array (2nd to 40th order)                     | [1.2, 0.8, 0.3, ...] |

**SQL Schema:**
```sql
CREATE TABLE measurements (
    id BIGSERIAL PRIMARY KEY,
    time TIMESTAMP NOT NULL,
    sensor_id VARCHAR(50),

    -- Basic electrical parameters
    voltage_rms DOUBLE PRECISION NOT NULL,
    current_rms DOUBLE PRECISION NOT NULL,
    frequency DOUBLE PRECISION NOT NULL,

    -- Power measurements
    power_active DOUBLE PRECISION,
    power_reactive DOUBLE PRECISION,
    power_apparent DOUBLE PRECISION,
    cos_phi DOUBLE PRECISION,

    -- Power quality indicators
    thd_voltage DOUBLE PRECISION,
    thd_current DOUBLE PRECISION,
    pst_flicker DOUBLE PRECISION,

    -- Harmonic arrays (JSON or ARRAY type)
    harmonics_v DOUBLE PRECISION[],
    harmonics_i DOUBLE PRECISION[],

    -- Additional
    capacitor_uf DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Index for fast time-based queries
    INDEX idx_measurements_time (time DESC)
);
```

**Why this index?**
- Most queries search by time: "Give me measurements from last hour"
- `DESC` order because we usually want recent data first
- PostgreSQL B-tree index makes time-range queries **1000x faster**
  - Without index: Full table scan (read all 86,400 rows)
  - With index: Binary search (read ~17 rows)

#### Daily Stats Table

**Problem:** Frontend dashboard needs to show "Daily Average Voltage", "Peak Power Today", etc.

**Bad solution:**
```sql
-- Calculate from raw data every time (SLOW!)
SELECT AVG(voltage_rms), MAX(power_active)
FROM measurements
WHERE time BETWEEN '2025-11-07' AND '2025-11-08';
-- Scans 86,400 rows! Takes seconds for each dashboard load
```

**Good solution:**
```sql
-- Pre-calculate once per day and store
CREATE TABLE daily_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,

    -- Voltage statistics
    avg_voltage DOUBLE PRECISION,
    min_voltage DOUBLE PRECISION,
    max_voltage DOUBLE PRECISION,

    -- Power statistics
    avg_power_active DOUBLE PRECISION,
    peak_power DOUBLE PRECISION,
    total_energy_kwh DOUBLE PRECISION,  -- ∫ power dt

    -- Power quality metrics
    thd_violations_count INTEGER,      -- Count of THD > 8%
    voltage_sag_count INTEGER,         -- Count of voltage < 207V (90%)
    voltage_swell_count INTEGER,       -- Count of voltage > 253V (110%)

    -- Aggregation metadata
    measurement_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fast query (reads 1 row instead of 86,400!)
SELECT * FROM daily_stats WHERE date = '2025-11-07';
```

**This is called "data aggregation" or "materialized views"**

**Trade-offs:**
- ✅ Dashboard loads **instantly** (1 row vs 86,400 rows)
- ✅ Reduces database load (CPU, memory)
- ❌ Uses more disk space (extra table)
- ❌ Adds complexity (need scheduled job to calculate)

**Thesis justification:** "Daily statistics aggregation provides O(1) query performance for dashboard visualizations, reducing response time from seconds to milliseconds and improving user experience significantly."

---

## Why Database Migrations?

### The Problem

**Scenario 1: Development**
```
Day 1: You create measurements table
Day 5: You add 'sensor_id' column
Day 10: Your teammate joins, runs app → CRASH!
       ERROR: Column 'sensor_id' doesn't exist
```

**Scenario 2: Production**
```
Version 1.0: Table has 10 columns
Version 1.1: Need to add 'harmonics_v' column
Challenge: Database has 10 million rows of real data!
          Can't just delete and recreate table
```

### What Are Database Migrations?

**Analogy:** Like Git for your database schema

```
Migration V1: CREATE TABLE measurements
Migration V2: ALTER TABLE measurements ADD COLUMN sensor_id
Migration V3: CREATE TABLE daily_stats
Migration V4: CREATE INDEX idx_measurements_time
```

Each migration is:
1. **Versioned** (V1, V2, V3, ...)
2. **Reproducible** (run same SQL on dev, test, prod)
3. **Incremental** (apply only new changes)
4. **Tracked** (database knows which migrations already ran)

### Why Flyway Specifically?

**Alternatives:**

1. **Manual SQL scripts:**
   - ❌ No version tracking (did I run this script?)
   - ❌ No rollback support
   - ❌ Error-prone (forgot to run on production!)

2. **Liquibase:**
   - ✅ More features (XML/YAML format, advanced rollbacks)
   - ❌ More complex to learn
   - ❌ Overkill for simple schemas

3. **Hibernate `ddl-auto=update`:**
   - ✅ Automatic schema generation
   - ❌ **DANGEROUS** - can drop columns with data!
   - ❌ No migration history
   - ❌ Not recommended for production

**Flyway advantages:**
- Simple: Just write SQL files
- Naming convention: `V1__Initial_schema.sql`, `V2__Add_daily_stats.sql`
- Automatic execution on application startup
- Migration history stored in `flyway_schema_history` table

**How Flyway works:**

```
1. Application starts
2. Flyway checks: "Which migrations did I run before?"
   - Reads flyway_schema_history table
   - Last migration was V3
3. Flyway looks in src/main/resources/db/migration/
   - Finds V4__Add_harmonics.sql (new!)
4. Flyway runs V4, records in history
5. Application continues startup
```

**Thesis justification:** "Flyway provides version-controlled database schema evolution, ensuring consistent database state across development, testing, and production environments. This follows DevOps best practices and prevents schema drift issues."

### Migration File Structure

```
src/main/resources/db/migration/
├── V1__Create_measurements_table.sql
├── V2__Create_daily_stats_table.sql
├── V3__Add_indexes.sql
└── V4__Add_sensor_id.sql
```

**Naming rules:**
- `V<version>__<description>.sql`
- Version must be unique and increasing (V1, V2, V3, ...)
- Double underscore `__` separates version from description
- Description uses underscores (not spaces)

---

## Statistics and Aggregation

### The Business Problem

**User story:** "As a facility manager, I want to see daily voltage trends to detect power quality degradation over time."

**Frontend requirement:** Dashboard widget showing:
```
╔══════════════════════════════════╗
║   Daily Voltage Statistics       ║
║                                  ║
║  Average: 230.2 V    📊          ║
║  Min:     228.5 V    ⬇️          ║
║  Max:     231.8 V    ⬆️          ║
║  Deviation: ±1.5 V               ║
║                                  ║
║  [Chart showing hourly averages] ║
╚══════════════════════════════════╝
```

### Why We Need StatsService

**Without dedicated service (BAD):**

```java
// Controller doing business logic (WRONG!)
@GetMapping("/api/stats/daily")
public ResponseEntity<StatsDTO> getDailyStats() {
    // 50 lines of calculation logic in controller
    // Mixes HTTP concerns with business logic
    // Impossible to test without HTTP
    // Violates Single Responsibility Principle
}
```

**With StatsService (GOOD):**

```java
// Controller: thin, handles HTTP only
@GetMapping("/api/stats/daily")
public ResponseEntity<StatsDTO> getDailyStats(@RequestParam LocalDate date) {
    StatsDTO stats = statsService.calculateDailyStats(date);
    return ResponseEntity.ok(stats);
}

// Service: contains business logic, easy to test
@Service
public class StatsService {
    public StatsDTO calculateDailyStats(LocalDate date) {
        // Pure business logic
        // No HTTP dependencies
        // Unit testable
    }
}
```

**Benefits of separation:**
1. **Testability:** Test calculations without HTTP server
2. **Reusability:** Use same service for REST API, WebSocket, scheduled jobs
3. **Maintainability:** Change business logic without touching HTTP code

### What Statistics Do We Calculate?

**Based on IEC 61000-4-30 power quality standards:**

#### 1. Voltage Statistics
```java
Double avgVoltage;  // Mean voltage over period
Double minVoltage;  // Minimum voltage (detect sags)
Double maxVoltage;  // Maximum voltage (detect swells)
Double stdDevVoltage; // Standard deviation (stability metric)
```

**Why these matter:**
- Nominal voltage: 230V (in Europe) or 120V (in USA)
- IEC 61000-2-2: ±10% tolerance → 207V to 253V
- **Voltage sag:** < 90% for 10ms to 1 minute → equipment malfunction
- **Voltage swell:** > 110% for 10ms to 1 minute → equipment damage
- **Std deviation:** High variance → unstable grid

#### 2. Power Statistics
```java
Double avgPowerActive;     // Average real power (watts)
Double peakPower;          // Maximum power (size equipment)
Double totalEnergyKwh;     // ∫ power dt (billing)
Double avgPowerFactor;     // cos φ (efficiency)
```

**Why these matter:**
- **Energy consumption:** Total kWh → electricity bill
- **Peak demand:** Size generators, circuit breakers, wiring
- **Power factor:** Low cos φ → wasted energy, utility penalties
  - Good: cos φ > 0.95
  - Bad: cos φ < 0.85 → capacitor banks needed

#### 3. Power Quality Events
```java
Integer voltageSagCount;     // Count of sags
Integer voltageSwellCount;   // Count of swells
Integer thdViolations;       // THD > 8% threshold
Integer frequencyDeviations; // Frequency outside 49-51 Hz
```

**Why these matter:**
- IEC 61000-4-30 compliance reporting
- Predictive maintenance (frequent events → grid problems)
- Equipment protection (UPS sizing, surge protectors)

### Calculation Algorithms

#### Average Calculation
```java
// Simple but correct for uniform sampling
double avgVoltage = measurements.stream()
    .mapToDouble(Measurement::getVoltageRms)
    .average()
    .orElse(0.0);
```

#### Energy Calculation (Trapezoidal Integration)
```java
// Energy = ∫ power dt
// Approximate: E ≈ Σ (power[i] + power[i+1])/2 * Δt
double totalEnergy = 0.0;
for (int i = 0; i < measurements.size() - 1; i++) {
    double avgPower = (measurements.get(i).getPowerActive()
                     + measurements.get(i+1).getPowerActive()) / 2.0;
    double deltaTime = Duration.between(
        measurements.get(i).getTime(),
        measurements.get(i+1).getTime()
    ).getSeconds() / 3600.0; // Convert to hours

    totalEnergy += avgPower * deltaTime / 1000.0; // Convert W to kW
}
```

**Thesis note:** "Trapezoidal rule provides second-order accuracy (O(h²) error) for integration, balancing computational efficiency with precision for energy billing calculations."

#### Event Detection (Voltage Sag)
```java
// IEC 61000-4-30: Voltage sag = RMS voltage drops below 90%
final double SAG_THRESHOLD = 230.0 * 0.90; // 207V
final Duration MIN_SAG_DURATION = Duration.ofMillis(10);

int sagCount = 0;
Instant sagStart = null;

for (Measurement m : measurements) {
    if (m.getVoltageRms() < SAG_THRESHOLD) {
        if (sagStart == null) sagStart = m.getTime();
    } else {
        if (sagStart != null) {
            Duration sagDuration = Duration.between(sagStart, m.getTime());
            if (sagDuration.compareTo(MIN_SAG_DURATION) > 0) {
                sagCount++;
            }
            sagStart = null;
        }
    }
}
```

---

## Power Quality Monitoring

### IEC 61000 Standards Overview

**What is IEC 61000?**
- International Electrotechnical Commission standard
- Defines "Electromagnetic Compatibility (EMC)"
- Ensures equipment operates correctly despite power disturbances

**Key parts relevant to SCADA system:**

#### IEC 61000-4-30 (Measurement Methods)
Defines **how** to measure power quality:

| Parameter | Measurement Window | Aggregation |
|-----------|-------------------|-------------|
| Voltage | 10-period (200ms at 50Hz) | 3-second intervals → 10-minute avg |
| Frequency | 10-second | Min/max per day |
| Harmonics | 3-second | 95th percentile over 1 week |
| Flicker | 10-minute | Pst (short-term), Plt (long-term) |

**Why these windows?**
- Too short → noise, false alarms
- Too long → miss transient events
- IEC 61000-4-30 balances sensitivity and stability

#### IEC 61000-2-2 (Voltage Limits)

|  Condition   | Voltage Range |  Duration   | Classification      |
|--------------|---------------|-------------|---------------------|
| Normal       | 230V ± 10%    | Continuous  | No event            |
| Sag          | < 90% (207V)  | 10ms - 1min | Power quality event |
| Swell        | > 110% (253V) | 10ms - 1min | Power quality event |
| Interruption | < 10% (23V)   | > 10ms      | Critical event      |

#### IEC 61000-3-2 (Harmonic Limits)

**Why harmonics matter:**
- Non-linear loads (computers, LEDs, motors) create harmonics
- Harmonics cause:
  - Transformer overheating
  - Neutral conductor overload
  - Equipment malfunction
  - Power meter errors

**THD (Total Harmonic Distortion) formula:**
```
THD = √(V₂² + V₃² + V₄² + ... + V₄₀²) / V₁ × 100%

Where:
- V₁ = fundamental (50Hz)
- V₂ = 2nd harmonic (100Hz)
- V₃ = 3rd harmonic (150Hz)
- ...
- V₄₀ = 40th harmonic (2000Hz)
```

**Limits:**
- Voltage THD: < 8% (IEC 61000-2-2)
- Current THD: < 5% for individual loads (IEC 61000-3-2)

**Implementation:**
```java
public double calculateThdVoltage(Measurement m) {
    double[] harmonics = m.getHarmonicsV();
    double fundamental = harmonics[0]; // V₁ (50Hz)

    double sumSquares = 0.0;
    for (int i = 1; i < harmonics.length; i++) {
        sumSquares += Math.pow(harmonics[i], 2);
    }

    return Math.sqrt(sumSquares) / fundamental * 100.0;
}
```

### Constants Utility Class

**Why we need it:**

Instead of magic numbers scattered everywhere:
```java
// BAD: Magic numbers (what does 207 mean?)
if (voltage < 207) { /* ... */ }
if (thd > 8.0) { /* ... */ }
```

Use named constants with documentation:
```java
// GOOD: Self-documenting code
public class Constants {
    // IEC 61000-2-2 voltage limits for 230V system
    public static final double NOMINAL_VOLTAGE = 230.0;
    public static final double VOLTAGE_TOLERANCE = 0.10; // ±10%
    public static final double VOLTAGE_SAG_THRESHOLD = NOMINAL_VOLTAGE * 0.90;  // 207V
    public static final double VOLTAGE_SWELL_THRESHOLD = NOMINAL_VOLTAGE * 1.10; // 253V

    // IEC 61000-3-2 harmonic limits
    public static final double THD_VOLTAGE_LIMIT = 8.0; // percent

    // IEC 61000-4-30 measurement windows
    public static final Duration MEASUREMENT_WINDOW = Duration.ofMillis(200); // 10 periods
}

// Usage:
if (voltage < Constants.VOLTAGE_SAG_THRESHOLD) {
    // Self-explanatory: voltage sag detected
}
```

**Benefits:**
1. **Readability:** Code explains itself
2. **Maintainability:** Change threshold in one place
3. **Documentation:** Constants act as embedded documentation
4. **Thesis defense:** Shows you understand standards

---

## Development Environment Setup

### Why Docker for PostgreSQL?

**Problem:** Installing PostgreSQL manually:
```
1. Download installer
2. Run installer (5-10 minutes)
3. Configure port, password, locale
4. Create database
5. Create user with permissions
6. Repeat on every team member's machine
7. Different versions → "works on my machine" bugs
```

**Solution:** Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: energy_monitor
      POSTGRES_USER: energyuser
      POSTGRES_PASSWORD: StrongPassword123!
    ports:
      - "5432:5432"
```

```bash
# One command to start
docker-compose up -d

# One command to stop
docker-compose down

# One command to reset (fresh database)
docker-compose down -v && docker-compose up -d
```

**Benefits:**
1. **Consistency:** Same PostgreSQL version everywhere
2. **Isolation:** Doesn't interfere with system packages
3. **Reproducibility:** Teammate runs same command, gets same setup
4. **Easy cleanup:** Delete container, no traces left
5. **Documentation as code:** docker-compose.yml documents setup

**Thesis justification:** "Docker containerization ensures consistent development environments across team members and deployment targets, following DevOps best practices for infrastructure as code."

---

## Next Steps

### Phase 1: Database Setup
1. Create `docker-compose.yml` for PostgreSQL
2. Add Flyway dependency to `pom.xml`
3. Create migration `V1__Create_measurements_table.sql`
4. Create migration `V2__Create_daily_stats_table.sql`
5. Update `application.properties` for Flyway

### Phase 2: Implement Empty Classes
1. Implement `DailyStats` entity
2. Implement `StatsDTO` and `HistoryRequest`
3. Implement `Constants` utility
4. Implement `StatsService` (with your input on calculations)
5. Implement `DataAggregationService`

### Phase 3: Testing
1. Write unit tests for StatsService
2. Write integration tests for repositories
3. Test with mock ESP32 data

---

## Questions for Your Thesis Defense

Be prepared to answer:

**Q: Why did you choose PostgreSQL over NoSQL?**
A: "Power quality measurements are highly structured with defined relationships. PostgreSQL provides ACID guarantees critical for billing data, and SQL aggregations (AVG, SUM) are simpler than NoSQL equivalents. Additionally, PostgreSQL can be extended with TimescaleDB for time-series optimization if needed."

**Q: Why separate daily_stats table instead of calculating on-demand?**
A: "Pre-aggregation provides O(1) query performance for dashboard widgets. Calculating from 86,400 raw measurements per day would create unacceptable latency for user experience. This follows the principle of trading storage space for query speed."

**Q: Why Flyway migrations instead of Hibernate ddl-auto?**
A: "Flyway provides version-controlled schema evolution with full history tracking. Hibernate ddl-auto can drop columns with production data and doesn't provide rollback mechanisms. For a system handling billing data, we need reproducible, auditable database changes."

**Q: What is Total Harmonic Distortion and why do you monitor it?**
A: "THD measures the deviation of voltage/current waveforms from pure sinusoids. High THD causes transformer heating, neutral conductor overload, and equipment malfunction. IEC 61000-3-2 limits THD to 8% for voltage and 5% for current. Our system detects violations for preventive maintenance."

---

## Summary

This backend implements a **production-grade SCADA system** following industry best practices:

- ✅ **Layered architecture:** Separation of concerns
- ✅ **Database migrations:** Version-controlled schema
- ✅ **Data aggregation:** Performance optimization
- ✅ **Standards compliance:** IEC 61000 power quality monitoring
- ✅ **Containerization:** Reproducible environments
- ✅ **Testability:** Unit and integration tests

Every component has a clear **business justification** tied to real-world power quality monitoring requirements.
