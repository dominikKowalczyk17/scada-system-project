# SCADA System - Kompletna Dokumentacja Projektu

**Tytuł:** System SCADA do monitorowania jakości energii elektrycznej w instalacjach domowych
**Autor:** Dominik Kowalczyk
**Projekt:** Praca inżynierska (Bachelor's Thesis)
**Wersja dokumentacji:** 2.0
**Data ostatniej aktualizacji:** 2025-12-18
**Status projektu:** W realizacji (około 75% ukończone)

---

## Spis treści

1. [Przegląd projektu](#1-przegląd-projektu)
2. [Architektura systemu](#2-architektura-systemu)
3. [Stack technologiczny](#3-stack-technologiczny)
4. [Możliwości pomiarowe i ograniczenia](#4-możliwości-pomiarowe-i-ograniczenia)
5. [Implementacja backendu](#5-implementacja-backendu)
6. [Implementacja frontendu](#6-implementacja-frontendu)
7. [Hardware i ESP32](#7-hardware-i-esp32)
8. [Środowisko deweloperskie](#8-środowisko-deweloperskie)
9. [CI/CD i deployment](#9-cicd-i-deployment)
10. [Wskaźniki jakości energii PN-EN 50160](#10-wskaźniki-jakości-energii-pn-en-50160)
11. [Komendy i workflow](#11-komendy-i-workflow)
12. [Status implementacji](#12-status-implementacji)
13. [Roadmap i przyszły rozwój](#13-roadmap-i-przyszły-rozwój)
14. [Bibliografia i referencje](#14-bibliografia-i-referencje)

---

## 1. Przegląd projektu

### 1.1. Cel projektu

System SCADA (Supervisory Control And Data Acquisition) do monitorowania parametrów jakości energii elektrycznej w instalacjach domowych, zgodnie z normą **PN-EN 50160**. Projekt realizowany jako praca inżynierska (Bachelor's Thesis) na kierunku Informatyka.

**Główne cele:**
- Demonstracja zasad działania systemów SCADA w kontekście energetyki
- Praktyczna implementacja standardów IEC 61000 i PN-EN 50160
- Monitoring podstawowych parametrów jakości energii w czasie rzeczywistym
- Edukacyjna platforma do nauki analizy harmonicznej (FFT/DFT)
- Wykrywanie anomalii (zapady napięcia, przepięcia, przerwy)

### 1.2. Kontekst akademicki

**Ważne:** System jest projektem **edukacyjnym i demonstracyjnym**, nie certyfikowanym urządzeniem pomiarowym.

**System NIE jest:**
- ❌ Certyfikowanym analizatorem jakości energii klasy A (IEC 61000-4-30)
- ❌ Urządzeniem do rozliczeń handlowych energii
- ❌ Profesjonalnym narzędziem audytowym do oceny zgodności instalacji

**System JEST:**
- ✅ Narzędziem edukacyjnym do nauki SCADA i IoT
- ✅ Demonstracją implementacji standardów IEC/PN-EN
- ✅ Użytecznym monitorem podstawowych parametrów w domu
- ✅ Platformą do eksperymentów z analizą harmoniczną

### 1.3. Budżet i ograniczenia

**Budżet sprzętowy:** 1000 PLN (ograniczenie projektowe)

**Główne ograniczenia wynikające z budżetu:**
- Wykorzystanie ESP32 zamiast profesjonalnych analizatorów (klasy PQ3/PQ5)
- ADC 12-bit zamiast 16/24-bit zewnętrznego ADC
- Częstotliwość próbkowania 800-1000 Hz (zamiast 5-20 kHz)
- Jednofazowy pomiar (zamiast trójfazowego)
- Brak dedykowanego sprzętu do pomiaru flickera (IEC 61000-4-15)

**Hardware:**
- ✅ Raspberry Pi 4B 4GB + 32GB microSD (posiadany)
- ✅ 1x ESP32-WROOM-32 development board
- ✅ Układ pomiarowy z elektroda.pl (SCT013 + TV16) w jednej obudowie
- ✅ Komponenty do symulacji obciążenia: żarówka LED, silniczek, ładowarka

### 1.4. Kluczowe funkcje

**Monitoring w czasie rzeczywistym:**
- Napięcie RMS, Prąd RMS (±1-3% dokładności po kalibracji)
- Częstotliwość sieci (±0.01-0.02 Hz)
- Moc czynna, bierna, pozorna
- Współczynnik mocy (cos φ)
- THD napięcia i prądu (harmoniczne H2-H8, częściowy pomiar)
- 8 harmonicznych (50-400 Hz, ograniczenie Nyquista)

**Wskaźniki jakości energii (PN-EN 50160):**
- Grupa 1: Odchylenie napięcia od 230V (±10% limit) - **MOŻLIWE**
- Grupa 2: Odchylenie częstotliwości od 50Hz (±0.5 Hz limit) - **MOŻLIWE**
- Grupa 3: Flicker (Pst/Plt) - **NIEMOŻLIWE** (wymaga IEC 61000-4-15)
- Grupa 4: THD i harmoniczne - **CZĘŚCIOWO** (tylko H2-H8)
- Grupa 5: Zdarzenia (zapady, przepięcia, przerwy) - **W PLANACH** (osobny issue)

**Dashboard i wizualizacja:**
- ✅ Wykresy real-time (napięcie, prąd, częstotliwość, moc)
- ✅ Wykresy harmonicznych (bar chart H1-H8)
- ✅ Wykresy przebiegów czasowych (sinusoida napięcia/prądu)
- ✅ WebSocket streaming (aktualizacja co 3 sekundy)
- 🔴 Statystyki historyczne (agregacje 10-minutowe, godzinowe, dzienne) - TODO
- 🔴 Analiza zdarzeń (timeline zapadów/przepięć/przerw) - TODO
- 🔴 Raporty zgodności z PN-EN 50160 - TODO

---

## 2. Architektura systemu

### 2.1. Architektura ogólna

```
┌─────────────────────────────────────────────────────────────────┐
│                    WARSTWA SENSORYCZNA (ESP32)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ESP32-WROOM-32 (C++ / Arduino Framework)                 │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ ADC Sampling (800-1000 Hz, 12-bit)                 │   │   │
│  │ │ - GPIO 34: Napięcie (TV16 → 0-3.3V)                │   │   │
│  │ │ - GPIO 35: Prąd (SCT013 → 0-3.3V)                  │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ Signal Processing                                  │   │   │
│  │ │ - RMS calculation (okno 10-20 cykli)               │   │   │
│  │ │ - Zero-crossing detection (częstotliwość)          │   │   │
│  │ │ - DFT/Goertzel (harmoniczne H1-H8)                 │   │   │
│  │ │ - THD calculation                                  │   │   │
│  │ │ - Power calculations (P, Q, S, cos φ)              │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ WiFi Communication                                 │   │   │
│  │ │ - MQTT Publish (co 3s)                             │   │   │
│  │ │ - Topic: scada/measurements/node1                  │   │   │
│  │ │ - QoS: 1 (at least once delivery)                  │   │   │
│  │ │ - JSON payload (~300-500 bytes)                    │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │ WiFi / MQTT (QoS 1)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│             RASPBERRY PI 4B (Platforma serwera)                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Docker Container: Mosquitto MQTT Broker (Port 1883)      │  │
│  │ - Odbiera wiadomości z ESP32                             │  │
│  │ - Kolejkuje (QoS 1 persistence)                          │  │
│  │ - Przekazuje do subskrybentów                            │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │ localhost MQTT subscribe                       │
│               ▼                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Docker Container: Spring Boot Backend (Port 8080)        │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ MQTT Client (MqttMessageHandler)                   │   │  │
│  │ │ - Subscribe: scada/measurements/#                  │   │  │
│  │ │ - Parse JSON                                       │   │  │
│  │ │ - Auto-reconnect + QoS 1                           │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Business Logic (Services)                          │   │  │
│  │ │ - MeasurementService: Zapis pomiarów, agregacje    │   │  │
│  │ │ - StatsService: Statystyki dzienne/godzinowe       │   │  │
│  │ │ - WaveformService: Przebiegi czasowe               │   │  │
│  │ │ - DataAggregationService: Scheduled job (00:05)    │   │  │
│  │ │ - PowerQualityService: Wskaźniki PN-EN 50160       │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ REST API (Controllers)                             │   │  │
│  │ │ - GET /api/dashboard - dane ogólne                 │   │  │
│  │ │ - GET /api/dashboard/power-quality-indicators      │   │  │
│  │ │ - GET /api/measurements/latest                     │   │  │
│  │ │ - GET /api/measurements/history                    │   │  │
│  │ │ - GET /api/stats/daily                             │   │  │
│  │ │ - GET /health                                      │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ WebSocket (/ws/measurements)                       │   │  │
│  │ │ - Real-time broadcast do frontendu                 │   │  │
│  │ │ - Topic: /topic/dashboard                          │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  └────────────┬─────────────────────────────────────────────┘  │
│               │ JDBC (localhost:5432)                          │
│               ▼                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Docker Container: PostgreSQL 15 (Port 5432)              │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Tabela: measurements (time-series)                 │   │  │
│  │ │ - Retencja: 1 rok (auto-delete starszych)          │   │  │
│  │ │ - Indeks: idx_measurements_time (B-tree DESC)      │   │  │
│  │ │ - Kolumny: time, voltage_rms, current_rms,         │   │  │
│  │ │   frequency, power_*, cos_phi, thd_*, harmonics_*  │   │  │
│  │ │ - Wskaźniki PN-EN 50160:                           │   │  │
│  │ │   voltage_deviation_percent, frequency_deviation_hz│   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Tabela: daily_stats (agregacje)                    │   │  │
│  │ │ - Agregacje: min, max, avg (voltage, power, etc.)  │   │  │
│  │ │ - Liczniki zdarzeń: voltage_sag_count, ...         │   │  │
│  │ │ - Scheduled job: Codziennie o 00:05                │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Flyway Migrations (Version Control)                │   │  │
│  │ │ - V1: CREATE TABLE measurements                    │   │  │
│  │ │ - V2: CREATE TABLE daily_stats                     │   │  │
│  │ │ - V3: Remove unmeasurable fields + add indicators  │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP / WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WARSTWA PREZENTACJI                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ React Frontend (TypeScript + Vite)                       │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Dashboard Component                                │   │  │
│  │ │ - Real-time metrics (voltage, current, power)      │   │  │
│  │ │ - Streaming charts (Recharts, circular buffer 60)  │   │  │
│  │ │ - Waveform visualization (sinusoida U/I)           │   │  │
│  │ │ - Harmonics bar chart (H1-H8)                      │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Power Quality Indicators Section                   │   │  │
│  │ │ - Odchylenie napięcia (±10% limit)                 │   │  │
│  │ │ - Odchylenie częstotliwości (±0.5 Hz limit)        │   │  │
│  │ │ - THD (8% limit) + ostrzeżenie "częściowy pomiar"  │   │  │
│  │ │ - Overall compliance status (zielony/czerwony)     │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  │ ┌────────────────────────────────────────────────────┐   │  │
│  │ │ Data Fetching (TanStack Query + WebSocket)        │   │  │
│  │ │ - REST API: GET /api/dashboard (initial load)      │   │  │
│  │ │ - WebSocket: ws://backend:8080/ws/measurements     │   │  │
│  │ │ - Auto-reconnect on disconnect                     │   │  │
│  │ └────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2. Przepływ danych (Data Flow)

**Pomiar → Zapis → Agregacja → Wizualizacja:**

```
1. ESP32 ADC Sampling (800-1000 Hz)
   ├─> Okno pomiarowe: 10-20 cykli (200-400 ms)
   ├─> Obliczenia: RMS, FFT/DFT, THD, cos φ
   └─> JSON payload (~300-500 bytes)

2. MQTT Publish (co 3 sekundy)
   ├─> Topic: scada/measurements/node1
   ├─> QoS 1: At least once delivery
   └─> Mosquitto Broker (RPI:1883)

3. Spring Boot Backend
   ├─> MqttMessageHandler: Parse JSON
   ├─> MeasurementService:
   │   ├─> Oblicz wskaźniki PN-EN 50160 (voltage_deviation, frequency_deviation)
   │   ├─> Save to PostgreSQL (table: measurements)
   │   └─> Broadcast via WebSocket (/topic/dashboard)
   └─> Scheduled Job (00:05 daily):
       └─> DataAggregationService: Agreguj daily_stats

4. PostgreSQL Storage
   ├─> measurements: ~28,800 rows/day (co 3s)
   ├─> daily_stats: 1 row/day
   └─> Retencja: Auto-delete > 1 year

5. React Frontend
   ├─> Initial load: GET /api/dashboard
   ├─> Real-time updates: WebSocket subscription
   ├─> Circular buffer: 60 measurements (3 minutes)
   └─> Recharts visualization (no animations, optimized)
```

### 2.3. Komunikacja MQTT vs HTTP

**Dlaczego MQTT zamiast HTTP POST z ESP32?**

| Aspekt | MQTT | HTTP POST |
|--------|------|-----------|
| **Niezawodność** | ✅ QoS 1 gwarantuje dostarczenie | ❌ Brak retry mechanizmu |
| **Buforowanie** | ✅ Broker kolejkuje gdy backend offline | ❌ Dane tracone gdy backend down |
| **Energooszczędność** | ✅ Persistent connection | ❌ Nowy TCP handshake co request |
| **Skalowalność** | ✅ Łatwe dodanie więcej ESP32 (topics) | ⚠️ Wymaga load balancera |
| **Rozszerzalność** | ✅ Inne aplikacje mogą subskrybować | ❌ Tylko 1:1 komunikacja |
| **Overhead** | ✅ Mały (~50 bytes header) | ❌ Większy (~200 bytes HTTP headers) |

**Decyzja:** MQTT dla lepszej niezawodności, buforowania i skalowalności.

---

## 3. Stack technologiczny

### 3.1. Backend (Spring Boot)

**Framework:** Spring Boot 3.5.6 (Java 17)

**Kluczowe zależności:**
```xml
<!-- MQTT Communication -->
<dependency>
    <groupId>org.springframework.integration</groupId>
    <artifactId>spring-integration-mqtt</artifactId>
</dependency>
<dependency>
    <groupId>org.eclipse.paho</groupId>
    <artifactId>org.eclipse.paho.client.mqttv3</artifactId>
    <version>1.2.5</version>
</dependency>

<!-- WebSocket Real-time -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- Database (JPA + PostgreSQL) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
</dependency>

<!-- Database Migrations -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>

<!-- Testing (H2 in-memory DB for tests) -->
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>test</scope>
</dependency>

<!-- Boilerplate Reduction -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
</dependency>
```

**Architektura backendu (Layered Architecture):**
```
Controllers (REST API)
    ↓
Services (Business Logic)
    ↓
Repositories (Data Access - Spring Data JPA)
    ↓
Entities (JPA Models)
```

**Dlaczego Spring Boot?**
- ✅ Opinionated defaults (szybki start)
- ✅ Production-ready features (actuator, metrics, health checks)
- ✅ Ekosystem (Spring Integration dla MQTT, Spring Data dla JPA)
- ✅ Testability (MockMvc, @SpringBootTest)
- ✅ Industry standard (łatwo znaleźć pomoc)

### 3.2. Frontend (React + Vite)

**Framework:** React 18 (TypeScript)

**Build Tool:** Vite (szybszy niż Webpack)

**Kluczowe biblioteki:**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-router-dom": "^7.1.1",
    "@tanstack/react-query": "^5.62.11",
    "axios": "^1.7.9",
    "recharts": "^2.15.0",
    "@radix-ui/react-*": "^1.x",
    "tailwindcss": "^3.4.17",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.1.0",
    "typescript": "~5.6.2",
    "eslint": "^9.17.0"
  }
}
```

**Kluczowe decyzje:**
- **TanStack Query** dla server state (cache, refetch, loading states)
- **Axios** dla HTTP client (lepszy error handling niż fetch)
- **Recharts** dla wykresów (React-native API, TypeScript, łatwość użycia)
- **Native WebSocket API** (bez SockJS/STOMP - zbędna złożoność)
- **shadcn/ui** (Radix UI primitives + Tailwind) zamiast Material-UI

**Dlaczego Vite zamiast Create React App?**
- ⚡ **10-100x szybszy** cold start (ESM zamiast bundlowania)
- ⚡ **Instant HMR** (Hot Module Replacement)
- 📦 Mniejsze bundle size (Rollup zamiast Webpack)
- 🎯 Better TypeScript support out-of-box

### 3.3. Infrastructure (Docker + PostgreSQL + MQTT)

**Platforma:** Raspberry Pi 4B (4GB RAM, 32GB microSD)

**Docker Compose Services:**
```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: energy_monitor
      POSTGRES_USER: energyuser
      POSTGRES_PASSWORD: StrongPassword123!

  mosquitto:
    image: eclipse-mosquitto:2.0
    ports: ["1883:1883", "9001:9001"]
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquitto_data:/mosquitto/data

  backend:
    image: scada-backend:latest
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/energy_monitor
      MQTT_BROKER_URL: tcp://mosquitto:1883
    depends_on:
      - postgres
      - mosquitto
```

**Dlaczego Docker?**
- ✅ Izolacja środowisk (dev, test, prod identyczne)
- ✅ Łatwy deployment (1 komenda: `docker-compose up`)
- ✅ Zarządzanie zależnościami (nie trzeba instalować PostgreSQL/MQTT systemowo)
- ✅ Rollback (poprzednie wersje obrazów dostępne)

**Dlaczego PostgreSQL zamiast MySQL/MongoDB?**
- ✅ **PostgreSQL:**
  - Lepsze wsparcie JSON (harmonics jako JSON array)
  - ACID compliance (krytyczne dla time-series)
  - TimescaleDB extension (opcjonalna optymalizacja w przyszłości)
  - Window functions (agregacje czasowe)
- ❌ **MySQL:** Słabsze JSON, mniej zgodne ze standardem SQL
- ❌ **MongoDB:** Overkill dla strukturalnych danych, brak prostych agregacji SQL

**Dlaczego Mosquitto zamiast RabbitMQ/Kafka?**
- ✅ **Mosquitto:** Lightweight (~10MB RAM), specjalnie dla MQTT, prosty setup
- ❌ **RabbitMQ:** Heavyweight, AMQP (nie MQTT native), overkill
- ❌ **Kafka:** Overkill, skomplikowana konfiguracja, duże wymagania RAM

### 3.4. CI/CD (GitHub Actions)

**Platform:** GitHub Actions

**Workflows:**
1. **CI Pipeline (ci.yml)** - Trigger: Pull Requests
   - Backend tests (JUnit + H2)
   - Frontend tests (Vitest + type checking + linting)
   - Build validation
   - Summary report

2. **CD Pipeline (cd.yml)** - Trigger: Manual only (workflow_dispatch)
   - Pre-deployment tests
   - Build artifacts (JAR + frontend dist)
   - Deploy to RPI via SSH over Tailscale VPN
   - Health checks + rollback on failure
   - Automatic JAR versioning (github.run_number)

**Dlaczego GitHub Actions zamiast Jenkins/GitLab CI?**
- ✅ Integracja z GitHub (no setup needed)
- ✅ Darmowe dla projektów publicznych
- ✅ YAML configuration (human-readable)
- ✅ Marketplace actions (ready-to-use building blocks)
- ❌ Jenkins: Wymaga własnego serwera, ciężki setup
- ❌ GitLab CI: Wymaga migracji repo do GitLab

**Deployment Strategy: Blue-Green z rollback**
```
/opt/scada-system/releases/
├── 20251218_143022/  ← NEW (green)
├── 20251218_120015/  ← CURRENT (blue)
└── 20251217_183045/

/opt/scada-system/current → symlink do aktywnej wersji

Proces:
1. Deploy NEW version
2. Health check NEW
3. ✅ Success: Switch symlink current → NEW
4. ❌ Failure: Rollback (keep CURRENT active)
5. Cleanup old releases (keep last 5)
```

---

## 4. Możliwości pomiarowe i ograniczenia

### 4.1. Parametry pomiarowe ESP32

**ADC (Analog-to-Digital Converter):**
- Rozdzielczość nominalna: 12-bit (4096 poziomów)
- Rozdzielczość efektywna: ~10-bit (szumy + nieliniowość)
- Zakres: 0-3.3V
- Nieliniowość: ±7-15 LSB (Limited SNR)

**Częstotliwość próbkowania:**
- **5 kHz** (stały interwał zapewniony przez Timer Interrupt)
- Timer Interrupt eliminuje problem "gubienia próbek"
- Dedykowany Rdzeń 0 (ESP32 Dual-Core) do zadań czasu rzeczywistego

**Ograniczenie Nyquista:**
```
f_max_measurable = f_sampling / 2

Przy 5000 Hz → f_max = 2500 Hz

Dla sieci 50 Hz:
- 5000 Hz → Teoretycznie do H50 (50 × 50 Hz = 2500 Hz)
- DECYZJA PROJEKTOWA: Harmoniczne H1-H8 (zakres do 400 Hz)
  Powód: Wystarczające do identyfikacji wpływu nieliniowych
         odbiorników domowych (zasilacze impulsowe, LED)
```

**Architektura Edge Computing:**
- ✅ Pełne obliczenia wykonywane lokalnie na ESP32 (RMS, THD, FFT)
- ✅ Przesyłanie zagregowanych wyników co 5 sekund
- ✅ Redukcja obciążenia sieci i serwera
- ✅ Deterministyczne pomiary dzięki Timer Interrupt

**Implikacje:**
- ⚠️ Analiza widmowa ograniczona do H1-H8 (założenie projektowe)
- ✅ Zakres wystarczający dla monitoringu domowych odbiorników
- ✅ THD obliczane z H2-H8 = dolne ograniczenie rzeczywistego zniekształcenia

### 4.2. Możliwości według grup PN-EN 50160

Szczegółowa analiza znajduje się w pliku **[ESP32-MEASUREMENT-SPECS.md](ESP32-MEASUREMENT-SPECS.md)** i **[POWER-QUALITY-INDICATORS.md](POWER-QUALITY-INDICATORS.md)**.

| Grupa | Wskaźnik | Status | Powód ograniczenia |
|-------|----------|--------|-------------------|
| **Grupa 1: Napięcie** | Odchylenie napięcia (ΔU/Un) | ✅ **MOŻLIWE** | Pomiar U_rms z dokładnością ±1-3% |
| **Grupa 2: Częstotliwość** | Odchylenie częstotliwości (Δf) | ✅ **MOŻLIWE** | Zero-crossing detection, ±0.01-0.02 Hz |
| **Grupa 3: Flicker** | Pst (short-term flicker) | ❌ **NIEMOŻLIWE** | Wymaga IEC 61000-4-15 filter + 20 kHz sampling |
| | Plt (long-term flicker) | ❌ **NIEMOŻLIWE** | Wymaga Pst |
| | RVC (rapid voltage changes) | ❌ **NIEMOŻLIWE** | Ściśle związane z flickerem |
| **Grupa 4: Odkształcenia** | THD napięcia | ⚠️ **CZĘŚCIOWO** | Tylko harmoniczne H2-H8 (nie H2-H40) |
| | Poszczególne harmoniczne | ⚠️ **CZĘŚCIOWO** | Tylko H1-H8 (50-400 Hz) |
| | Interharmoniczne | ❌ **NIEMOŻLIWE** | Wymaga wysokiej rozdzielczości FFT |
| **Grupa 5: Zdarzenia** | Zapady napięcia (voltage dips) | 🔴 **W PLANACH** | Detekcja U_rms < 90% Un (osobny issue) |
| | Przepięcia (overvoltages) | 🔴 **W PLANACH** | Detekcja U_rms > 110% Un |
| | Przerwy (interruptions) | 🔴 **W PLANACH** | Detekcja U_rms < 10% Un |

**Pozostałe pomiary (nie PN-EN 50160):**
| Parametr | Status | Zastosowanie |
|----------|--------|--------------|
| Moc czynna (P) | ✅ MOŻLIWE | Analiza obciążenia |
| Moc bierna (Q) | ✅ MOŻLIWE | Kompensacja mocy |
| Moc pozorna (S) | ✅ MOŻLIWE | Bilansowanie |
| Współczynnik mocy (cos φ) | ✅ MOŻLIWE | Diagnostyka odbiorników |
| THD prądu | ⚠️ CZĘŚCIOWO | Diagnostyka (IEC 61000-3-2, nie PN-EN 50160) |
| Harmoniczne prądu | ⚠️ CZĘŚCIOWO | Diagnostyka nieliniowych odbiorników |

### 4.3. Dokładność pomiarów

**Po kalibracji ADC:**
- Napięcie RMS: **±1-3%**
- Prąd RMS: **±2-4%** (zależny od transformatora SCT013)
- Częstotliwość: **±0.01-0.02 Hz**
- Moc czynna: **±2-5%** (propagacja błędów U i I)
- Harmoniczne: **±3-5%** amplitudy

**Źródła błędów:**
- Nieliniowość ADC (±7-15 LSB)
- Szumy (environmental + thermal)
- Niedokładność czujników (SCT013, TV16)
- Przecieki spektralne FFT (windowing)
- Synchronizacja próbkowania z siecią 50 Hz

**Metody poprawy dokładności:**
- Kalibracja ADC (offset + gain correction)
- Okno wagowe Hanna (redukcja przecieków FFT)
- Synchronizacja z zero-crossing
- Uśrednianie wielu cykli (10-20 cykli)
- Filtracja dolnoprzepustowa (hardware/software)

---

## 5. Implementacja backendu

Szczegółowa dokumentacja backendu znajduje się w **[BACKEND-IMPLEMENTATION.md](BACKEND-IMPLEMENTATION.md)**.

### 5.1. Struktura projektu (Maven + Spring Boot)

```
└── 📁scada-system-project
    └── 📁.claude
        ├── settings.local.json
        └── 📁hooks
            ├── applypatch-msg.sample
            ├── commit-msg.sample
            ├── fsmonitor-watchman.sample
            ├── post-update.sample
            ├── pre-applypatch.sample
            ├── pre-commit.sample
            ├── pre-merge-commit.sample
            ├── pre-push.sample
            ├── pre-rebase.sample
            ├── pre-receive.sample
            ├── prepare-commit-msg.sample
            ├── push-to-checkout.sample
            ├── sendemail-validate.sample
            ├── update.sample
        └── 📁info
            ├── exclude
        └── 📁logs
            └── 📁refs
                └── 📁heads
                    ├── 42-frontend-dashboard-api-websocket-integration
                    ├── 44-real-time-streaming-chart
                    ├── 44-real-time-streaming-chart-for-power-measurements
                    ├── 46-comprehensive-tests-frontend
                    ├── 48-wavechart-refactor-and-reconstructwaveform-change
                    ├── 50-documentation-cleanup
                    ├── master
                └── 📁remotes
                    └── 📁origin
                        ├── 42-frontend-dashboard-api-websocket-integration
                        ├── 44-real-time-streaming-chart
                        ├── 46-comprehensive-tests-frontend
                        ├── 48-wavechart-refactor-and-reconstructwaveform-change
                        ├── 50-documentation-cleanup
                        ├── HEAD
                        ├── master
            ├── HEAD
        └── 📁objects
            └── 📁00
                ├── aec208b68e5b832c0ac2ab5e59005b29dc386e
            └── 📁01
                ├── 23a8c69b04f61bd16b108c26ecd4c346fd69bf
                ├── 4b803da551199232a3097632c60ded2bb16e5e
            └── 📁02
                ├── 8e6748b88452dda55a5bdde31185abba705fff
            └── 📁03
                ├── f5d98681471221ceb21d4a37922aedefaaf436
            └── 📁05
                ├── 645067780ccfee6ce6dd5a0413f868f9540d56
                ├── 9440aaecd5aca238c841078f8e342b63932f50
                ├── 9633c8e4b1053fde91740e13570b4569b1e013
                ├── e566a5a67cd50a9e59d6f9d083abfb1bc1268b
            └── 📁06
                ├── 1e314988f5005f849dc8876cd51a349500cde8
                ├── 9d782c21af7d86d705970ee6e148ed8e94f0eb
            └── 📁07
                ├── 668ef5bbf8d3c092ba1f9a5a53ca50809bafac
                ├── 7c6d6d541f7e8b7bc77b716d457e404cec0662
            └── 📁09
                ├── 591669cbaef6753c80b367f1b5cf95fc0550c1
                ├── 9834578165d037014aaa9de8fe01f4f2416eb7
                ├── d8f9bcdc61eb7af58c0c08abb56221a657fe34
            └── 📁0b
                ├── 9b093c66215bd5e4e1ef13d6775957cbfe5b9d
            └── 📁0d
                ├── 32fe6d8dcbf824ba06f6cbe45c35b2720b4c01
                ├── 48d13c9102ab45849ca79f3894a93bf10d8d6b
                ├── bcf39ed733fa4f088a0589101f139e52c971f7
                ├── c7230a30a2c944ee69e44b05511217af97432d
                ├── d9674f74dfd5518f2c6c6328e785e199895e08
            └── 📁0e
                ├── 861b582f2858acacff2880ce93f8f5a04829fa
                ├── beff97b87c95efdee15627236a3d04affe7932
                ├── fdd753afd3d80310d5efca6ddb062c3642abec
            └── 📁0f
                ├── 1bb2cdb8133975f257cf4d34b8cbc39bc8de9c
                ├── a8daccbcb8c45a576ee2bf15775bce0a9ced40
                ├── e988ddffe6bf643f15dac7ae58ce67531de054
            └── 📁10
                ├── 3bbe0af6873a74130793b27f6f1c4b25c12eee
                ├── d79095ec44ce53a3962709010150c273c31759
            └── 📁13
                ├── 03c09fe5c8a4fd8bc46999195bd91efeaf8552
            └── 📁15
                ├── 49a76a3da6643914168bdff8969f02eb27b3a6
                ├── f1bb45a99600ed4da791aa66837eb92c6554c5
            └── 📁17
                ├── 845708b6e8ccb993ef0c1d2ccfcc4892537ba8
            └── 📁18
                ├── 3be9f838ad77c7011e16c31fd97edcc71c0f9f
            └── 📁19
                ├── 1a86414958fa7310a89e03e3f0c5d6c55c7bcb
                ├── 379d6ab6414135928df529d9c343f3ff467e28
                ├── 496a33c34f75f0046bf9f2d6bc4a3ec5af192d
                ├── c528069a952e535150ba538ed48e48c0393ee5
            └── 📁1a
                ├── 5fd559e49376994c9184c5c0b1c8a553afb55d
                ├── e486c07c88c5f03aeb9a4c9cc6a01dc5f48c21
            └── 📁1c
                ├── 0a8ab58072c6f45103436e81e14dbd8270c72c
                ├── a914fc91bc5c1cfb772a950b25afa8470bf263
                ├── eecf6593164791d52d40fb689281303509196c
            └── 📁1d
                ├── 55353ee0f4e4d32aa02fd5a2f1043845115bf4
            └── 📁1e
                ├── 06edf09ed3f29a2457fc6eebe5726484773481
                ├── 33bfc52e22ef85259a679fd30d88bab6f58b11
                ├── 5ead7a58ad2b7eb2f90942e34e0289bd078d9d
                ├── 88aae53d5e68520363b3f87ef61ca05b0c057f
                ├── ff36a3c70bc9c3330a4376949fd4719eb9539c
            └── 📁1f
                ├── 1143fc88b64739cd3ad0ace5a292cb26f26317
            └── 📁21
                ├── 1e7efa68649795b6d2d600ec65696749bee265
                ├── 210b1e6fb10672e743f5a847089dc275ecf092
                ├── 9ee441b53d5a8ae5442d5fd06c5f2736cc0a1d
                ├── e916bb291c06e709f9c85e2d8cdd1063a89869
                ├── f581e7715668fd7fb2fec95b05cdce13ac53a4
            └── 📁22
                ├── 29a901586bd0aae6926ee7f09a7588abe0222a
                ├── 51522457bda372f443256ef84b3888b3012503
                ├── c3fae314bbd810b4b4bb6794fac8d5433ef0cb
            └── 📁23
                ├── 393e64b8f4ae56827b9b03a4e2147381df0c8b
                ├── 8589b539ce37a3c62b03fe6227fb27b2406109
                ├── bb0f075bee81cc02a82326ba9409cdfb6bb897
                ├── d6a09d2896e835f37302f27236cffce76cea89
                ├── e453e2a7c280f93d32d3179ef9c8ce219c797b
            └── 📁24
                ├── 05575061e521c57cab51333d4edfae5c502fdf
            └── 📁25
                ├── 67dedaf6d4c011e13a9fa2f75f4b4dd518ad63
            └── 📁26
                ├── 1cd6e0a98f1b920e47f4a8bd924848375713d8
                ├── bd64e4f41230f08f185144ac4a0de8019cb663
                ├── d7d2e0360120424a35e4f8b967617f7229884f
            └── 📁27
                ├── 4dc6fceac3ec198b9f8a5bc7856e8474cbbed8
                ├── 6b78bb4ef2c8a5ce148764f385be737157c89f
            └── 📁28
                ├── 1409368a0de599adc90ba5bcd047b29e9c5137
                ├── 85ecb16b34248df47d5243125036d1150256d6
                ├── c553fa3f26a6ec320a557ad0492bc34cd46a3a
            └── 📁29
                ├── 8af284461ccacf8043cc6079578ce4384fbdbe
                ├── d4c568cd3081855976637c3d1aaa417b8d896a
            └── 📁2b
                ├── 3b4a8aeff08346e3da6f6344d8dbf739170fb5
            └── 📁2d
                ├── 72cff4fb2729bbc788cb02125660e9de24530b
                ├── ccd211f6a101c70d973552c6cae2a0919ed3e1
            └── 📁2e
                ├── 36ece3600539d0ef18b51b4fd01e3aa958e215
                ├── 440492c45577c96ed4b8555e2ae3e2caee80be
            └── 📁2f
                ├── 27802749ccc46fd9aa4e503e3cf15aeaa58599
            └── 📁30
                ├── d274954d39470a298fcb9933f7a9e0573af40c
            └── 📁31
                ├── 1e9b26a50f5bff7c378d525642bbda04a8a928
            └── 📁33
                ├── 05e8acb566e1819be874f615692851d7956fbb
                ├── 5279881a7a20c6aa515082f7f6e795c95bcc90
                ├── 6214c43f0f3538e4aebdc751364c9f63067876
            └── 📁34
                ├── 47b976adb11292460e8b0ba8289080e6020d5b
                ├── ab6be63eab867784c3a60bba014863cb16c40f
            └── 📁35
                ├── 6b44f87064427115b2cc4a001989c328be3263
            └── 📁36
                ├── 4e98f6d52da4268092b242e0e87523f92f5847
                ├── 9a13cabf74860688f6232b1b4ddaff05ee03bb
                ├── a28d0dd3ec10af957c9441e99ee63ecca9f62e
            └── 📁37
                ├── 15414be48d88731d57af6ca35f701c283bee5e
            └── 📁38
                ├── 2c25c3843269eace023c9d6559d124e3e39267
            └── 📁39
                ├── 442525e10f48d74fe26b92288a661ff257b6d2
                ├── 552d398ae33614a44ecf9f9f9d601857849a60
                ├── d2164d63e996c0d3c24e40a426eef7f9d50976
            └── 📁3a
                ├── 7e974e08da0ec7d0f14dae8a02586301b2781d
            └── 📁3b
                ├── a46473ca8fd1dd7ad61b201d28f35ae030a6ae
                ├── bb1845bf09fed1644f04bc1986a6adcadd7093
            └── 📁3c
                ├── 3f0912594eff758f94ec304ce852404e9a4adb
                ├── d386a754a5db4fa9fd164168032912ef4d36f9
                ├── e6ca9e3931b7205ce780f51deb1d9c50062d31
                ├── f03a1b4527cfee6dbdcca28560a2e8186bbfb3
            └── 📁3d
                ├── 6e75c7e79f2a65fb5543ea18f22a95e329528e
                ├── b2455dc715bae0e263e9ba73a018d63c767b1a
            └── 📁3f
                ├── 6c6389768f17657d917e6fceaf349a70cccf90
            └── 📁40
                ├── 6d481dad6656f46e02d701b890bda6756a49f0
            └── 📁41
                ├── ea1645c342169a12d05f82630a7e24254bd5de
            └── 📁42
                ├── 59aae90a9c51971f1979816e3f6ef04c37d8fc
                ├── 99ae2da94fcda4e8da79bbd5785bb8303171e4
                ├── bbbb5c2008be3ddae74def7ac0f834f951e2e8
            └── 📁43
                ├── 59602908717632a648bd633e72606778daafd8
            └── 📁44
                ├── 1eaccc6cd03ac05890698602ce61a68f6f04ef
                ├── a600e39960bb3bfdcd9381af2f788e693798f0
                ├── a7e0d11d47afb32ae9e843a0d0221e31a12493
                ├── ac26d33dc0de78b6e2265ede6ce9cdcdfc57ca
                ├── d386f88c8e6c4a588c5cebec99e2a002f27cc1
            └── 📁45
                ├── 267368393289b468e018429412a0cbaef5aa24
            └── 📁46
                ├── 262a3ba9ef4dad798b3639b8294f55ce540f74
            └── 📁49
                ├── dc9f68098cb83ecd332b51b26cfa9a65b76235
            └── 📁4b
                ├── c55d8bbcf4757dc09a3f7670a4cc9d403c4fa4
                ├── e6e201407846784c76509aec058c558cf935a0
            └── 📁4c
                ├── 477bbaa41afc224299457b9c75388009b866b5
            └── 📁4d
                ├── 4cb2c1303a1f4a4d3c943c2bad10fd9351184d
                ├── 50a221b9e6c4a4d8601ddf73edda96317a29a1
                ├── c067c30b3842db49e4beb9a2fb4cd0802b2f56
            └── 📁4e
                ├── 14442ac052fb046fac607939d0ecf62db4c040
                ├── 57e6d8861d027a31201b50c2d0d20466fef998
                ├── a4551cf2b8112c87570c11df1ec8dd4cc2545f
                ├── d70ae5ac82ccc64cd6aa91766853bdd99e6bd9
                ├── def82ebec542d46b6a866ba35ac1d70aba2ea4
                ├── ee1cd05c031f4a38c2368d3ce72c583c3eaca5
            └── 📁4f
                ├── 9202c20e528c6293b67a54c75d152cb3c34d17
                ├── db75824313958b8076f7a507bbf1aaaab0d6d6
            └── 📁51
                ├── 0b2d1f3954013ee1003e24f86df3fb5de364bf
                ├── 284a4b3d2cfa2ec98f72e33224ee2e00995ff0
                ├── 9e940916c7b40ec88e8a1957e24152fa31138f
            └── 📁53
                ├── 0d1ed2ba83fd9fdaee5c91dbdd31ee54aa5c4b
                ├── 8401561a850f74364ac5d6759d0abe75f48f7c
                ├── 84b0da5e0fa812a607426da08c23cd07a412fa
            └── 📁54
                ├── f4bd3c1ce37a0ace8084f72f3593bad78eb005
                ├── fbc4048f22039f38b0ad80067fda1205eef13a
            └── 📁55
                ├── 94c9af2f96e7cfe5fc0d5339ac98207ca55a06
            └── 📁56
                ├── 62b359224bf566b93ab80f5774fba3c6547f6c
            └── 📁58
                ├── 4036a308ddc259863bc5f4e0fc83561cec265c
            └── 📁59
                ├── 3714fe00a337cd504397de7daa729b098b3afd
                ├── c1e5d9e92f633489661a8f2c0d24f53d9ff4bb
            └── 📁5a
                ├── 3ef1b9e6e1f9ea8d7937b2d6aed5edd37eab54
                ├── 72cc7da1f17caa53d69acee3c08b526b3bb96f
            └── 📁5b
                ├── 101ef660a37c3b8c2a3457aced44b6e624af14
                ├── 820ebc9b180680a96837fc4b9507cd1cfc38ac
                ├── b227182e21dcb25ea7d6e02b4d8fe0f295df7e
                ├── bcd04086b79f6c5999495f58a9a4b34bd9eb81
            └── 📁5c
                ├── a64df034452ada44db278b3899534acc8c83d1
                ├── e37a622ae776efe8650f1461cac086432940d7
            └── 📁5d
                ├── 73de987d105c5479c456a73211eda4088c0a8b
            └── 📁5f
                ├── 17d2effb2a99238d24e2cd54f33f48d2e08e00
                ├── 55408c75ce43016ffe8c92a85a717370f5e495
                ├── d80184f97396090d36f53b0481e221d1711412
            └── 📁60
                ├── cd140e35f551ddc4261152059bb2ff5ba239d9
            └── 📁61
                ├── a5c8d915fbe657afcdb2293a40c2ad286f3436
                ├── e8ae7df7cbc7335c6bcd4ef1097ca24cb8acd0
            └── 📁62
                ├── 2247250e4a86234e61c3f17a88496ba72191b4
                ├── 46c5ba458d7fdaf38849cadc87663e0c46a718
                ├── 6eae06906958c751e6d1c8ccc5a0e2d83e4fed
            └── 📁64
                ├── 5db2a1d5c9b8a0e4def3e76bbac911c48b7323
            └── 📁65
                ├── 25ddadd6e92c8e7e90d11b4c1c7473ab5cbaae
                ├── 908507415ba50609a9e43ec49f6144cd004c69
            └── 📁66
                ├── 47f715140399f39d71fc1f79efc210d3da8960
                ├── a9824a3b22772c4c3aa8633969149af5740d2a
                ├── c1cdab24fa8788662cf636b3e87aae4f0f5349
            └── 📁67
                ├── 0b1d846af264e74fd380d21254e44d0cd2f8a7
                ├── 2fa4f8a13b184d78daf52c4401ca54c6e135d3
                ├── 9c1ee7eac88ce52a77bf8f2673120b17856338
                ├── a86484bedea0b7fe312d16a46672bb214ff552
                ├── de7dab48ef68d6b2d67852c683ef98333f26fd
            └── 📁68
                ├── b16b546c8831f50c4ac1375cfae6ffd2495f0f
            └── 📁69
                ├── 327036b907861b7a9541411eb81af7ee4954fa
                ├── c44451948e3410bd4c6ab722535c557e23a157
            └── 📁6a
                ├── 3434dab73ff6dad82b2472e7ce10b62928f72a
            └── 📁6b
                ├── 2f302d0114e47f148337b2c0d38b280de51629
            └── 📁6c
                ├── 3c4514a465c131e6719b8c3b7a84a3c0e07cf8
            └── 📁6d
                ├── 06707789a5d6fc17aca0494fd25ee94149aa74
                ├── 48d8595ebc1b5194402888dc27e05f6779b7b2
            └── 📁6e
                ├── a961a8a022bf0daabd50dab0c5d3949d8a4e54
                ├── bdc01ce40772db1c2da0503bb15f04d8698a93
                ├── d68316eb3f65dec9063332d2f69bf3093bbfab
            └── 📁6f
                ├── 3a3945ade6ac49e9679efaaaefaf2159a98be8
                ├── 6da50c83127d5b7f5afe6caab90e8ea397284c
                ├── 6f9e0c9064eeb628c93e7510d1044198525c9f
            └── 📁70
                ├── 2cbc621b37d2b170f3ceb60abf1243ace60466
                ├── 3257e8cdede87aff6ec0ba0f9315b380ead271
                ├── 82a7741f8ee3afeb75f28cac39297d4efcf3bb
                ├── a582f0c1a0ffb07f5b35760b0f95d80b56b7fb
                ├── c99494ebc869768d26f6ace6d89a5ab3c55c46
            └── 📁71
                ├── a8b83c4f1728fe72ca5a789bb08e69c0a8ebe4
                ├── aa19c86661b2f6de30d145ea56aa41fa7363d4
                ├── cb4a59e6d9a441ca66261a5194b8523be3160a
            └── 📁72
                ├── 31ecc0b99849b46d0752e5afb75e84a3dc04f4
                ├── 7d01a004659017314dc94d4c7a7a69afc3d7ea
                ├── 8a92bf66a9eaf80a478d1a59950ea543e087e6
            └── 📁73
                ├── 1a73af136df63e9e30d626de0bb4f2b869aeb1
                ├── 3f17ec22fb3dd77c166c37e428ed690d56f0df
            └── 📁74
                ├── 54aeac39b4e20b7de080803a557b19d1806ec5
                ├── 9507986cebb23bb9280e22fb248aa66ee35c9c
            └── 📁75
                ├── 2c142fd0fc6666094502bcf3d2949899694dae
                ├── 5f4d6b2417bf10f3a1f63b9512bef3f4c56ae2
                ├── 609ce47e11a3cddb1049f82a3e092a306102b7
                ├── 64f143dd7b4560e707dc37b53f3f76ffd4633b
                ├── c0d8db6584ee3c93a834b73a01c793de0925de
                ├── e39ca859a920f94ddf5d72e543454d86333cdf
            └── 📁76
                ├── e42062120de8a0e351787dbde83ab5c60a4fa8
            └── 📁77
                ├── 399b113445866de4e9730ec2c7cf24fe914b38
            └── 📁78
                ├── 09af2b3d2dd87a0d59165de681121b149cf764
                ├── 1951aafc5064f4081b1a6ecb90a43d15b70306
                ├── 1bc7e5d3bc3988610534589e6665d58b7246b5
                ├── 485ce7abd87033c3b4ee2d6969c7d0e3f08c0e
                ├── 57b2fe61adaef90366a26adf372702b80d21e1
            └── 📁7a
                ├── b177be558299bc667e3f1aded0c3c5a6c481b0
                ├── bf5231e37d9c895bc90fce9207a2216d248326
            └── 📁7b
                ├── 009c8cf158810538c59a0caa45e8118a1a5147
                ├── 10747500454118bd2f78bc91ff203742bf3947
                ├── aeb2355082a054361636611f3f7ae3cc040586
            └── 📁7c
                ├── 0c13c742d43409c16b6418113867081157558f
            └── 📁7d
                ├── 2793cc38e7d0d3b5480f73746ced4671c79f0d
                ├── 9d957e09957e126b07dc0fa5cf1e42195a4375
                ├── a7e602f6529ceb79a76ccb834111fb4ea31c72
            └── 📁7e
                ├── 18ea2db0b454c4ec35441b34826f5c4cac3b38
                ├── 94f38397953c79182217785df76a94ad8bd433
                ├── ccfe5ed355167446923cced9de6b2c7c9ba33c
            └── 📁7f
                ├── 9a0b635c80c57229e23a32111f99fb862e9c09
                ├── a64b5f4fa0e1f72fbb4f4bd1581b2fad0f4eb0
            └── 📁81
                ├── 3495a6604bd40e6c947a302fa501a108625615
                ├── 7acdbd137fc0828e4e28b03bc9c7dfcb502af7
                ├── ca9cca44a6ac853ddfbc0e6e62c6f494579b2f
                ├── ef8eea3d361b537baadd5033d92caccfeb5d95
            └── 📁82
                ├── 0e5ba09b35081092249a1aacbe18998bc5f083
                ├── 6c940c1608254443684f69e723cda898418085
            └── 📁85
                ├── 8b28112f9fe46e906c8c351ccdb586f17343e0
                ├── b649ee2b66ea34874f690a421fc9e5435d1670
                ├── dfa01c31ccb72348b558211b6ebfc95091c780
            └── 📁86
                ├── 61ba730b1a4797b9922055fd886156c300adf6
                ├── 6724ca27a69da6026343f32693e1392c8ddb2e
                ├── 6f27bd04e77cb71c351f65347060e5d1cf7c65
            └── 📁87
                ├── 125a0b42f18fff998db5d5f56b5c01c49f66c1
            └── 📁88
                ├── 0689add066edb7bf60a0fd2e3e231b7a924c3e
                ├── a3b16c021ca4df9cd51544309b8b62b5412cdc
            └── 📁89
                ├── 8993ccdc1de31ff601f0ab6f67e66182dcaf6b
            └── 📁8a
                ├── 1485e1341aa82c398b5f6d30bea9972223990d
                ├── 48c42d0c6544355a04ba446070c69cf4413334
            └── 📁8d
                ├── 052dd322cbf75ae48b672240e0bd6848704d57
            └── 📁8e
                ├── 52808b9baf1b8fd124b5cf69e1bb31403f3012
                ├── a90dc08a14cb0b53c5ecd5b11b916bf70db5e6
            └── 📁8f
                ├── 44d08486986edf2f5392a660e6f8c78cba4df2
            └── 📁90
                ├── 0fb9341479264af30f54f2f31123dae303928f
                ├── f5710cdd0bf24164de8daf4ff6396f52083a5e
            └── 📁91
                ├── 1808d670ff94313a78d1a8eef61fff53077e4d
                ├── e07cbd3038b8a17de1618eea115a1e1a59c754
            └── 📁92
                ├── 1ce48d6b303da2051ae979ba74b4db0ccab3cb
                ├── 5e992b7691ad81b6b7326411e6105c45d1bd7c
            └── 📁93
                ├── 6c28e27fcc1680171c7316a4a122b742103d49
                ├── 73fc6fb92a22d2b0415c4e1f2f016e69b9da35
                ├── b44f3b1567475d3fac6733a60b79bb1ac14ee2
            └── 📁94
                ├── f79a6ffde14d9eade26699a3cf8461f71e337a
            └── 📁95
                ├── 2fd419e20e2712c22d119571cbc4bb01d71ded
                ├── 5060bd358a374f95a24263149ec76929fc1305
                ├── c625fb9c7f946ba0548d2c85d654d6362aaa25
            └── 📁96
                ├── 4413e74c7a48a7af4a594b3f1072ce4520efb4
                ├── c1377b84a7da79de658316761390465ca9b795
                ├── c7ce33398e3a53089320bb945faa28be71ceef
                ├── c92370ada310b22b2de81367736b6c0ff33c00
            └── 📁97
                ├── d2327ff749cd781e7cf00706468f61005c0d63
            └── 📁98
                ├── c5aabf6e5c1db50da977ce4883178076690073
                ├── e6637c99e3fb6ee203c9972c44d6c4a5301d98
                ├── f09b916fadd1ee12f84652c345e69a265f9128
            └── 📁99
                ├── a84c78725c62b7d01a4f925f34bcfc3c1d7bf7
                ├── d7c26579800850b4be6d3e1b8e37df1bd37e85
            └── 📁9a
                ├── a06a58f6b760c6ace4ecc06a55f682a813fe32
            └── 📁9c
                ├── 74310ad5f552d64527e927437b2810d6290d1f
            └── 📁9d
                ├── 38c4992d13f5a46cb6554125cbe4a8157bad2e
            └── 📁9e
                ├── b460c255c0e0cf79db7f68dd994f7a526db572
                ├── b7f574eb7552992771d7049c1272e1fa6fb2bd
                ├── d06fb213ed5c1816b11451638f6793260b78e9
            └── 📁9f
                ├── 8b4a2e1235f64886da2c9600ff4b10d50f4008
            └── 📁a1
                ├── 0c3c00767d1b007466675548a76205827775ea
                ├── 7826b1fd562218437dfe98442d05bfde30b356
                ├── 9f0e7def6c6772ef38be918780b0d703d833dc
                ├── fed7adc2e296597b74934bc778946535a34f3e
            └── 📁a3
                ├── 514350f4c079fd5be62df83b0e464630e8c315
                ├── 8ed7a3fc8e437b2a5de8db0ffc9b59a00d8d75
            └── 📁a4
                ├── 8f3ed43d6ef18cb31825977cbb60a87e033771
            └── 📁a5
                ├── 9419a2d98ad7a03869650ed8183cf8b1566a1a
                ├── e27615cc4a144deec7e19048a8f8b1282b0058
            └── 📁a6
                ├── e5d94b71f8d1c8ff061d54d535024eafb9496b
            └── 📁a7
                ├── 97271b60a249addef1601e25e935116b84acf6
            └── 📁a8
                ├── 90badb6510decad4b2a1620d3bebf245d2692c
                ├── ff8c48119d9fd3264a36e5bf360e21c0c6bf4a
            └── 📁aa
                ├── f1427b2405a5fe16cf87deec6a0cfb89cbb6b8
            └── 📁ac
                ├── 9ee07ab6f5932f4e37996af4e746c2f707659a
                ├── b42a2609bce521cfcdaf3764c7a8e5c7f79240
            └── 📁ad
                ├── 3796daca490b253151a2823c4779934fbb39de
                ├── 6cd52fd3e2d5754a639c1b5f46a27038838c8d
            └── 📁ae
                ├── 84bd14af5770a37e6f2b30881b08b6f30ee380
            └── 📁af
                ├── 29d00f9da9042cee96f373ac3f0724b4e6b3dc
                ├── 4f1b34bbf6426b50bf8d1180c8d28d6ec1b7b1
                ├── 50ac4c934b02e6d09e7321bf4e75a6b62be2a2
                ├── 73ab34eaec8bdeec9932f1bcbbd43dd45a89ac
                ├── ac2ef0f0533d01f9168fc92ab865f87ba2e531
            └── 📁b0
                ├── 2ab574cdcf1497de65a8e88b935166587e0a95
                ├── 39b06a6148ce08a3a802a0002ffc374d984e87
                ├── 4b26084f2f815ac7017dff44a410d873b129e5
                ├── 7d7f0b96b2162d12bb3e00344b81a2a418de76
                ├── af05ef1bee8b4f391763cba9dab17906e4305d
            └── 📁b2
                ├── 33ffae3ee00575370d233066258b2a8afc10f4
                ├── a9fc600421f4497d5dad6fd90b70acaee21feb
                ├── b8d6301b91a07a282d11545b31f2765f0e8569
            └── 📁b3
                ├── 17a7cda31a440fbd47540297ee3c68d51f343e
                ├── 225238f26e3ab49a5e41e9cb287a73c82740b7
                ├── 50192152f714c0a0f85658753f251e2a85c9f9
                ├── 5044fafea0a4fb2a1c0469cb0f14c358348ae8
                ├── e386ccf8ff4b44fb3687efdbb83c0a1b07340c
            └── 📁b4
                ├── ac9c661b7414b853adf417ef4b6178f41b763c
            └── 📁b5
                ├── 15f537484d99699d121c69a0e642caa6561c7e
            └── 📁b7
                ├── 258a2cdabee69dd1a93fa07d0075a3466b2054
            └── 📁b8
                ├── 3fca46444e64b06e3f74ba395fb24ca0db7636
                ├── 5904decde3c83c90cb2f0c17773130f1c99ab6
                ├── cdb72dc845de6665969cda1faaadee59f2fd70
            └── 📁b9
                ├── b52ae28e1237875bf1c639aa983906bb8dc449
            └── 📁ba
                ├── 2b2d619d6fa260dd696d1af7951f9a10ff206e
            └── 📁bc
                ├── 0dc254ca892d5ab4032fcddda6f73793f33488
                ├── 1397f1aa162547c1202a4402b320cf33c793c7
                ├── a6fbc7e3d098bf0eabcefdcc5d5ac1e96120b5
            └── 📁bd
                ├── 499c1caf717cfa1066ffcaa993951aef789b3d
                ├── 5a77842bcd23e0da59482e56a94696b8ba0d98
                ├── 6432793e7de38f3744bfa04021cb6c7efe3907
                ├── abbfa34b434077ee2f76f278e9c2ef067a612b
                ├── b4f730e221cbb7103282d4cd3e929f5b1889c6
            └── 📁be
                ├── 4f914aff2a217006786e841620584e17025efd
                ├── f1d6add44370a18763522ab38bdf7ccd817b00
            └── 📁bf
                ├── b767bb694212f5708dca0da3a3800bdd0bc723
            └── 📁c0
                ├── c968538bd4eeb4075b273bfadefaa2e3e88500
                ├── f850efca5280e7b216cabb8051f5aacf13a13e
            └── 📁c1
                ├── 41ab6742bfb3bb871ba3308c60cb395e89c44d
                ├── 525b811a167671e9de1fa78aab9f5c0b61cef7
                ├── 6c7ee8617391b5e11c62d33af8d62227a7e7ce
            └── 📁c2
                ├── 92f49c744c79c56bd79e200124d517476dc568
                ├── a51deb8fc59bc1918336348ee28550462c2212
            └── 📁c3
                ├── 45e942129864d552f9ecf2df4d066a80bc3575
                ├── 91d0abae69fae42802e7539fa1265f68449146
                ├── c450d045d07f9763a4a0dcdc745066bf74a72a
                ├── daa873fe1152fbd24e655180b9e09eaef85edc
                ├── e50b5064a7c9740fca1e47d98721b87dec865a
            └── 📁c4
                ├── dde612f758265a8e0b1f649f1e77f3ce5fdc90
                ├── ff3fefda9861f7a50698e07e1edf3ebebc2a21
            └── 📁c6
                ├── 52078974a5c0b1361cefa6b73e361655605a3e
            └── 📁c7
                ├── 3fbf30eaba757c40002b2dcc87e845eb384cbd
            └── 📁c8
                ├── a932cc67236641dd84d630cf69f45990b620e2
                ├── d004a5f5f6354136f265c17a6f36305f7a06ed
                ├── f3cd1cbbb5882b6472f1dc298ed01b35180a28
            └── 📁c9
                ├── af7da13c4dae926c859e3c754cd70d0d64ecdd
                ├── d16a50687ec74f11ff6fe3ac2dda19a8419a4b
            └── 📁ca
                ├── d9830c005d53cb7cebed784b74294af07c53e4
                ├── ee0e80b8c029f3ffc0b7940b5af6045c982162
            └── 📁cb
                ├── 61f11601b70140b9d6812d0cb1991b8a4ccc18
                ├── 81f6e550268072177d54535087ef1cd85617db
            └── 📁cd
                ├── 456d53961b7ce5accdd9ab3f8c827463254c97
                ├── 9ecb63d276de409b3372612d2270cf427a1cea
                ├── bba7199cff598a3375cb60eb11414dd74e987b
            └── 📁ce
                ├── 2ec7d42f8cd50c2dfb8731b538e5c72dc3ec74
                ├── 9d372265ce66a6816620c26c8da91828f0b405
                ├── be47291ac5659354789e05b51dfebe6afcc864
                ├── c2a926d85f3e0e48754f1ff7d92db001adff1e
                ├── daa4efae99a10951970c0f63c59f41e5502e8b
            └── 📁cf
                ├── 0c7230e47ccb6a84432941ef754978a3a44e8b
                ├── 54212c2561deddbb25c1c1fc73743f0e890b16
                ├── 5efbeecbc164bce9a9475a19561325a35821d2
            └── 📁d0
                ├── 4aaa18a3e5cd6d181310f118dc772129142723
                ├── 81237d424a260d33205f73982853b7002267da
                ├── b8e7409fb21dbb90c392a062bc16e758237ebd
            └── 📁d1
                ├── 6c79a976d1ac23020622432e83255fda18f859
                ├── 6eba19b0eb03cfa6f5bac9809beff4e51e5dc7
            └── 📁d3
                ├── 4090d4d44f11bf4689708711f3f2f8c3a7c161
                ├── 9050b97407cab3d7efb89b59829577cf356232
                ├── cd0d788fc2edb2a4e32b0c32727cfb03676587
            └── 📁d4
                ├── 387b12c915ccda44fc36f1e48ea6933e033246
                ├── fb62a6df5650e1ec9b6e00a9232a4e719fdd77
            └── 📁d6
                ├── 5cfd8b6532a73571f17de972ac5b0cfd36a217
                ├── ad4921ea259fcb2e06e76b9e8447c4e5ff207e
            └── 📁d7
                ├── 1951b3d78ccc5220b94e1c67c5ba077daf2c27
                ├── 38c083538bfedd45cb74783bed7d1d9b93d80b
                ├── 446c6864ce1b68140fc54a4f4fb4b1f53bd930
                ├── 947893dc7d505a033282015eba68c7280b19fe
                ├── e4ce4e1412e568e2629dbda99148370b69a7a5
                ├── fa357d7b42da43d4d13e91ce7f6028e4f7a938
            └── 📁d8
                ├── d09a326921f1d517d5c36ef5c8860a7cdc1ac6
            └── 📁d9
                ├── 4f07099fa30ec651ad7f16cc005c206684bbd7
                ├── fb283e1e6b70a618906eb353ab2232bc5269fd
            └── 📁da
                ├── 766693fc1f876e55b3ef50d36c7abfd844556a
            └── 📁db
                ├── 5b022c342a8c1b18159d016ba25aa6c4733ca0
            └── 📁dc
                ├── 0f97d4cfc4ec4aa86ac688a0b115c0379b07bb
                ├── 75a08ef658991ad5128f14158a1cc8be73b19d
            └── 📁dd
                ├── b67d385050c15fdbd811264707fc9b2b021a69
            └── 📁de
                ├── 48b9480e85ad990d14d2982626e425428e35d9
                ├── 938693f4a65e0bb57e0c2a35df5fa2df96dcb7
                ├── b0650a481ac3d3c14cd85145d9bf4da92298f9
            └── 📁df
                ├── d4a6c1e3df7a818ab8f0b53a9d63961c82f9ca
            └── 📁e0
                ├── 3528ba26045d8a5fad2ce0de85aa469ddaafc8
            └── 📁e1
                ├── 0c17159304af3a0228a3f4d0374c8546f86b59
                ├── 36787864f44e004d86804ad20c126137c8535f
                ├── 46e969018a4aa870d3eadec9d96aa56fcbc47d
                ├── a4a9c9c1be88ad1e6fa0947fa9374542c047a4
                ├── e00656f7c6db58dde9f12fab6460acd440b525
                ├── ee5b399aac14d4e73871bc524ecab607fdbd9f
            └── 📁e2
                ├── 0d4ba634cf64e551ee9728e7eb20c75b1c3c86
                ├── 459547e4e85e78a7781bc5d222ca4281e53f8e
                ├── c5071484e0ad8558e6f0c866c43e8eddebdecb
                ├── ce14c804266b5d292879cc9cf330de9d536d69
                ├── f5634cf33f4e2cd07ab39a79df95600da1e175
                ├── f871618dadb7d08f0d80a4ed758677157ff254
            └── 📁e3
                ├── 6d7fd38ea4a2a520d8bc727f3d4b3c917cd0f4
            └── 📁e4
                ├── 2199c11050f93016b378bb41fd39df91afbed4
                ├── 6f281f1ee4122865548fbef4be32bad1e935fa
                ├── b750bf10931a1ea24c6e1d9587452d17ecb48b
                ├── fbe5fe25336eab3255809d6b228d1973963042
            └── 📁e5
                ├── 7694a3ffcec83606437fa17b28809fd46c69cf
            └── 📁e6
                ├── 351a67a8e7353684064524eda9eb5b561d47aa
                ├── 3dabbd21a9dbaca1342e268c6eeed8cc458faf
                ├── cada79a8b26498e00e4563adb8131906ddcbed
            └── 📁e7
                ├── 720c85808c990b5f48e54bffa74c47cd1a1e51
            └── 📁e8
                ├── 6056a55349f9392c3b3a58d3f6b5f29e61a653
                ├── 9a455fba6d8093f39ef0fcea257520a582ff3a
            └── 📁e9
                ├── 43f71bb6210e599b07e5f194df62f9728bf9b8
                ├── eee23124cd86599e7cf907c9cec6c655d25d3a
            └── 📁ea
                ├── dd4a2c8bdce436ed5d53f367411e42ff504a10
            └── 📁eb
                ├── 697d9d28067aec1c2a78cb92e8b3d348e4690f
            └── 📁ed
                ├── c01c8ce3173e39d5770c254c6cdb04dc42d5a3
                ├── d942e51ec73ea6ea3d65e8d23b4a2b3503f7ad
            └── 📁ee
                ├── 3c5f95c9bbde8c90c00b39fe52f9a7e5702fa6
            └── 📁ef
                ├── 14aadd260e43d1aafdf2ac9d9bc8b1ff1774c4
                ├── 19eaf7271290a6b7639f815fcf270bea93f0c9
            └── 📁f0
                ├── ea25b10f8b4753212ef1f19eb2a6aac332c977
                ├── fa67a451058b9356758cf262b95ab68a61bdf2
            └── 📁f2
                ├── 070dafac133aba8fe7f8a7b6166ef9948f416e
                ├── efd0cd4145010e311c592c9135492accdc7eef
                ├── fcb3809d9835c2d0a1e8bdc2541cab8cbe174a
            └── 📁f3
                ├── 88506eb2b5c5ce95fdcd097d47ee952608b61f
            └── 📁f4
                ├── 18035b469aff23689a74c912849662f442aed4
                ├── cff6fde2945419f6a4d4b8cbd2c5c0045776b5
            └── 📁f5
                ├── 16b4d11367d5a456be08396bf675a1207374ac
                ├── 1949d93b8f739ded654d26db60b75642b9d421
                ├── c93d275526bf11931f2267890b6890b8e00b51
            └── 📁f6
                ├── 47059c493e8e2e04feb8e4c0f0254b16559688
            └── 📁f7
                ├── 8682c39dec89b0b82c0c53dfeda409d916f70b
                ├── 8ed9897c9d3f51c90aadefdee5201eb9827452
                ├── 96db5433e47857273ae51a2b44373a55749a6c
                ├── cd85e297f01063404333719175a7fe707e9fc5
            └── 📁f8
                ├── 29713404f493e194bac3f62322365274e4bea4
                ├── ac630f25aa4bdd7b2bcb513490db3701e6ac12
            └── 📁f9
                ├── a6e90664c33ea31df23fa3ee9e5566289ed063
                ├── e021ef058dc920e3581cfa183ab0b5a3e674da
            └── 📁fa
                ├── f79209a391ca206406663aabceb35770d119c0
            └── 📁fc
                ├── 087f45369f007fa8597c9de9f205f07497b32f
                ├── d67be870294d9eaa6aaab0e6a1f3ba11e89364
                ├── d74fc6aacfd42fbacdd7e08e61b85b7d06fa94
            └── 📁fe
                ├── 383f8b7298dacdfd87351a438afdaab3c94b63
                ├── 907521144463184effd13317d888550cc28c25
            └── 📁ff
                ├── 914d9c8336bac266bc7ff81aadabcd27f507d2
            └── 📁info
            └── 📁pack
                ├── pack-6862c97b5ad90c8dd7967f3720ba94b317c00253.idx
                ├── pack-6862c97b5ad90c8dd7967f3720ba94b317c00253.pack
                ├── pack-6862c97b5ad90c8dd7967f3720ba94b317c00253.rev
        └── 📁refs
            └── 📁heads
                ├── 42-frontend-dashboard-api-websocket-integration
                ├── 44-real-time-streaming-chart
                ├── 44-real-time-streaming-chart-for-power-measurements
                ├── 46-comprehensive-tests-frontend
                ├── 48-wavechart-refactor-and-reconstructwaveform-change
                ├── 50-documentation-cleanup
                ├── master
            └── 📁remotes
                └── 📁origin
                    ├── 42-frontend-dashboard-api-websocket-integration
                    ├── 44-real-time-streaming-chart
                    ├── 46-comprehensive-tests-frontend
                    ├── 48-wavechart-refactor-and-reconstructwaveform-change
                    ├── 50-documentation-cleanup
                    ├── HEAD
                    ├── master
            └── 📁tags
        ├── COMMIT_EDITMSG
        ├── config
        ├── description
        ├── FETCH_HEAD
        ├── HEAD
        ├── index
        ├── ORIG_HEAD
        ├── packed-refs
    └── 📁.github
        └── 📁workflows
            ├── cd.yml
            ├── ci.yml
    └── 📁.idea
        ├── .gitignore
        ├── misc.xml
        ├── modules.xml
        ├── scada-app.iml
    └── 📁deployment
        └── 📁scripts
            ├── cleanup.sh
            ├── deploy.sh
            ├── health-check.sh
            ├── integration-tests.sh
            ├── rollback.sh
            ├── verify-deployment.sh
        ├── README.md
    └── 📁esp32-mock-generator
        └── 📁include
            ├── config.h.example
        └── 📁src
            ├── main.cpp
        ├── .gitignore
        ├── platformio.ini
        ├── README.md
    └── 📁mosquitto
        └── 📁config
            ├── mosquitto.conf
    └── 📁scada-system
        └── 📁.idea
            ├── .gitignore
            ├── encodings.xml
            ├── jarRepositories.xml
            ├── misc.xml
            ├── vcs.xml
        └── 📁.mvn
            └── 📁wrapper
                ├── maven-wrapper.properties
        └── 📁src
            └── 📁main
                └── 📁java
                    └── 📁com
                        └── 📁dkowalczyk
                            └── 📁scadasystem
                                └── 📁config
                                    ├── AsyncConfig.java
                                    ├── CorsConfig.java
                                    ├── JpaConfig.java
                                    ├── MqttConfig.java
                                    ├── WebSocketConfig.java
                                └── 📁controller
                                    ├── DashboardController.java
                                    ├── HealthController.java
                                    ├── MeasurementController.java
                                    ├── StatsController.java
                                    ├── WebSocketController.java
                                └── 📁exception
                                    ├── GlobalExceptionHandler.java
                                    ├── MeasurementNotFoundException.java
                                    ├── ValidationException.java
                                └── 📁model
                                    └── 📁dto
                                        ├── DashboardDTO.java
                                        ├── HistoryRequest.java
                                        ├── MeasurementDTO.java
                                        ├── MeasurementRequest.java
                                        ├── PowerQualityIndicatorsDTO.java
                                        ├── RealtimeDashboardDTO.java
                                        ├── StatsDTO.java
                                        ├── ValidationResult.java
                                        ├── WaveformDTO.java
                                    └── 📁entity
                                        ├── DailyStats.java
                                        ├── Measurement.java
                                    └── 📁event
                                        ├── MeasurementSavedEvent.java
                                └── 📁repository
                                    ├── DailyStatsRepository.java
                                    ├── MeasurementRepository.java
                                └── 📁service
                                    ├── DataAggregationService.java
                                    ├── MeasurementService.java
                                    ├── MeasurementValidator.java
                                    ├── MqttMessageHandler.java
                                    ├── StatsService.java
                                    ├── WaveformService.java
                                    ├── WebSocketService.java
                                └── 📁util
                                    ├── Constants.java
                                    ├── DateTimeUtils.java
                                    ├── MathUtils.java
                                ├── ScadaSystemApplication.java
                └── 📁resources
                    └── 📁db
                        └── 📁migration
                            ├── V1__Create_measurements_table.sql
                            ├── V2__Create_daily_stats_table.sql
                            ├── V3__Remove_unmeasurable_fields_and_add_indicators.sql
                    ├── application.properties
            └── 📁test
                └── 📁java
                    └── 📁com
                        └── 📁dkowalczyk
                            └── 📁scadasystem
                                └── 📁controller
                                    ├── StatsControllerTest.java
                                └── 📁service
                                    ├── MeasurementServiceTest.java
                                    ├── MeasurementValidatorTest.java
                                    ├── StatsServiceTest.java
                                    ├── WaveformServiceTest.java
                                └── 📁util
                                    ├── MathUtilsTests.java
                                ├── ScadaSystemApplicationTests.java
                └── 📁resources
                    ├── application-test.properties
        └── 📁target
            └── 📁classes
                └── 📁com
                    └── 📁dkowalczyk
                        └── 📁scadasystem
                            └── 📁config
                                ├── AsyncConfig.class
                                ├── CorsConfig.class
                                ├── JpaConfig.class
                                ├── MqttConfig.class
                                ├── WebSocketConfig.class
                            └── 📁controller
                                ├── DashboardController.class
                                ├── HealthController.class
                                ├── MeasurementController.class
                                ├── StatsController.class
                                ├── WebSocketController.class
                            └── 📁exception
                                ├── GlobalExceptionHandler.class
                                ├── MeasurementNotFoundException.class
                                ├── ValidationException.class
                            └── 📁model
                                └── 📁dto
                                    ├── DashboardDTO.class
                                    ├── DashboardDTO$DashboardDTOBuilder.class
                                    ├── HistoryRequest.class
                                    ├── MeasurementDTO.class
                                    ├── MeasurementDTO$MeasurementDTOBuilder.class
                                    ├── MeasurementRequest.class
                                    ├── PowerQualityIndicatorsDTO.class
                                    ├── PowerQualityIndicatorsDTO$PowerQualityIndicatorsDTOBuilder.class
                                    ├── RealtimeDashboardDTO.class
                                    ├── RealtimeDashboardDTO$RealtimeDashboardDTOBuilder.class
                                    ├── StatsDTO.class
                                    ├── StatsDTO$StatsDTOBuilder.class
                                    ├── ValidationResult.class
                                    ├── WaveformDTO.class
                                    ├── WaveformDTO$WaveformDTOBuilder.class
                                └── 📁entity
                                    ├── DailyStats.class
                                    ├── DailyStats$DailyStatsBuilder.class
                                    ├── Measurement.class
                                    ├── Measurement$MeasurementBuilder.class
                                └── 📁event
                                    ├── MeasurementSavedEvent.class
                            └── 📁repository
                                ├── DailyStatsRepository.class
                                ├── MeasurementRepository.class
                            └── 📁service
                                ├── DataAggregationService.class
                                ├── MeasurementService.class
                                ├── MeasurementValidator.class
                                ├── MqttMessageHandler.class
                                ├── StatsService.class
                                ├── WaveformService.class
                                ├── WebSocketService.class
                            └── 📁util
                                ├── Constants.class
                                ├── DateTimeUtils.class
                                ├── MathUtils.class
                            ├── ScadaSystemApplication.class
                └── 📁db
                    └── 📁migration
                        ├── V1__Create_measurements_table.sql
                        ├── V2__Create_daily_stats_table.sql
                        ├── V3__Remove_unmeasurable_fields_and_add_indicators.sql
                ├── application.properties
            └── 📁generated-sources
                └── 📁annotations
            └── 📁generated-test-sources
                └── 📁test-annotations
            └── 📁test-classes
                └── 📁com
                    └── 📁dkowalczyk
                        └── 📁scadasystem
                            └── 📁controller
                                ├── StatsControllerTest.class
                            └── 📁service
                                ├── MeasurementServiceTest.class
                                ├── MeasurementValidatorTest.class
                                ├── StatsServiceTest.class
                                ├── WaveformServiceTest.class
                            └── 📁util
                                ├── MathUtilsTests.class
                            ├── ScadaSystemApplicationTests.class
                ├── application-test.properties
        ├── HELP.md
        ├── mvnw
        ├── mvnw.cmd
        ├── pom.xml
    └── 📁tools
        ├── mqtt-mock-publisher.js
        ├── mqtt-poor-quality-publisher.js
        ├── package-lock.json
        ├── package.json
        ├── README.md
    └── 📁webapp
        └── 📁coverage
            └── 📁lcov-report
                └── 📁webapp
                    └── 📁src
                        └── 📁components
                            ├── AlertPanel.tsx.html
                            ├── GridSection.tsx.html
                            ├── HarmonicsChart.tsx.html
                            ├── index.html
                            ├── LiveChart.tsx.html
                            ├── ParameterCard.tsx.html
                            ├── PowerQualitySection.tsx.html
                            ├── StatusIndicator.tsx.html
                            ├── StreamingChart.tsx.html
                            ├── WaveformChart.tsx.html
                        └── 📁hooks
                            ├── index.html
                            ├── useDashboardData.ts.html
                            ├── useHistoryData.ts.html
                            ├── useLatestMeasurement.ts.html
                            ├── usePowerQualityIndicators.ts.html
                            ├── useWebSocket.ts.html
                        └── 📁lib
                            ├── api.ts.html
                            ├── constants.ts.html
                            ├── dateUtils.ts.html
                            ├── index.html
                            ├── queryClient.ts.html
                            ├── utils.ts.html
                        └── 📁types
                            ├── api.ts.html
                            ├── index.html
                        └── 📁ui
                            ├── Button.tsx.html
                            ├── Card.tsx.html
                            ├── Icon.tsx.html
                            ├── index.html
                            ├── index.ts.html
                        └── 📁views
                            ├── Dashboard.tsx.html
                            ├── History.tsx.html
                            ├── index.html
                        ├── App.tsx.html
                        ├── index.html
                        ├── main.tsx.html
                    ├── index.html
                    ├── screenshot.mjs.html
                ├── base.css
                ├── block-navigation.js
                ├── favicon.png
                ├── index.html
                ├── prettify.css
                ├── prettify.js
                ├── sort-arrow-sprite.png
                ├── sorter.js
            └── 📁webapp
                └── 📁src
                    └── 📁components
                        ├── AlertPanel.tsx.html
                        ├── GridSection.tsx.html
                        ├── HarmonicsChart.tsx.html
                        ├── index.html
                        ├── LiveChart.tsx.html
                        ├── ParameterCard.tsx.html
                        ├── PowerQualitySection.tsx.html
                        ├── StatusIndicator.tsx.html
                        ├── StreamingChart.tsx.html
                        ├── WaveformChart.tsx.html
                    └── 📁hooks
                        ├── index.html
                        ├── useDashboardData.ts.html
                        ├── useHistoryData.ts.html
                        ├── useLatestMeasurement.ts.html
                        ├── usePowerQualityIndicators.ts.html
                        ├── useWebSocket.ts.html
                    └── 📁lib
                        ├── api.ts.html
                        ├── constants.ts.html
                        ├── dateUtils.ts.html
                        ├── index.html
                        ├── queryClient.ts.html
                        ├── utils.ts.html
                    └── 📁types
                        ├── api.ts.html
                        ├── index.html
                    └── 📁ui
                        ├── Button.tsx.html
                        ├── Card.tsx.html
                        ├── Icon.tsx.html
                        ├── index.html
                        ├── index.ts.html
                    └── 📁views
                        ├── Dashboard.tsx.html
                        ├── History.tsx.html
                        ├── index.html
                    ├── App.tsx.html
                    ├── index.html
                    ├── main.tsx.html
                ├── index.html
                ├── screenshot.mjs.html
            ├── base.css
            ├── block-navigation.js
            ├── coverage-final.json
            ├── favicon.png
            ├── index.html
            ├── lcov.info
            ├── prettify.css
            ├── prettify.js
            ├── sort-arrow-sprite.png
            ├── sorter.js
        └── 📁public
            ├── vite.svg
        └── 📁src
            └── 📁assets
                ├── react.svg
            └── 📁components
                ├── AlertPanel.tsx
                ├── GridSection.tsx
                ├── HarmonicsChart.tsx
                ├── LiveChart.tsx
                ├── ParameterCard.tsx
                ├── PowerQualitySection.tsx
                ├── StatusIndicator.tsx
                ├── StreamingChart.tsx
                ├── WaveformChart.tsx
            └── 📁hooks
                ├── useDashboardData.ts
                ├── useHistoryData.ts
                ├── useLatestMeasurement.ts
                ├── usePowerQualityIndicators.ts
                ├── useWebSocket.ts
            └── 📁lib
                ├── api.ts
                ├── constants.ts
                ├── dateUtils.ts
                ├── queryClient.ts
                ├── utils.ts
            └── 📁test
                └── 📁components
                    ├── HarmonicsChart.test.tsx
                    ├── StreamingChart.test.tsx
                    ├── WaveformChart.test.tsx
                └── 📁hooks
                    ├── useDashboardData.test.ts
                    ├── useHistoryData.test.ts
                    ├── usePowerQualityIndicators.test.ts
                    ├── useWebSocket.test.ts
                └── 📁lib
                    ├── api.test.ts
                    ├── constants.test.ts
                    ├── dateUtils.test.ts
                    ├── utils.test.ts
                └── 📁ui
                    ├── Button.test.tsx
                    ├── Card.test.tsx
                    ├── Icon.test.tsx
                    ├── ParameterCard.test.tsx
                    ├── PowerQualitySection.test.tsx
                    ├── StatusIndicator.test.tsx
                └── 📁utils
                    ├── api-mock.ts
                    ├── index.ts
                    ├── mocks.ts
                    ├── test-utils.tsx
                    ├── TestWrapper.tsx
                ├── setup.ts
            └── 📁types
                ├── api.ts
            └── 📁ui
                ├── Button.tsx
                ├── Card.tsx
                ├── Icon.tsx
                ├── index.ts
            └── 📁views
                ├── Dashboard.tsx
                ├── History.tsx
            ├── App.css
            ├── App.tsx
            ├── index.css
            ├── main.tsx
        ├── .gitignore
        ├── eslint.config.js
        ├── index.html
        ├── package-lock.json
        ├── package.json
        ├── postcss.config.js
        ├── README.md
        ├── screenshot.mjs
        ├── tailwind.config.ts
        ├── tsconfig.app.json
        ├── tsconfig.json
        ├── tsconfig.node.json
        ├── vite.config.ts
        ├── vitest.config.ts
    ├── .gitignore
    ├── CI-CD-SETUP.md
    ├── CLAUDE.md
    ├── docker-compose.prod.yml
    ├── docker-compose.yml
    ├── ESP32-MEASUREMENT-SPECS.md
    ├── FUTURE-IMPROVEMENTS.md
    ├── POWER-QUALITY-INDICATORS.md
    ├── PROJECT-DOCUMENTATION.md
    └── ZMIANY-WSKAZNIKI-PN-EN-50160.md
```

### 5.2. Kluczowe komponenty

#### Measurement Entity (JPA)

```java
@Entity
@Table(name = "measurements")
public class Measurement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant time;

    // Basic electrical parameters
    private Double voltageRms;          // V (RMS)
    private Double currentRms;          // A (RMS)
    private Double frequency;           // Hz

    // Power measurements
    private Double powerActive;         // W
    private Double powerReactive;       // VAR
    private Double powerApparent;       // VA
    private Double cosPhi;              // 0-1

    // Power quality indicators (THD)
    private Double thdVoltage;          // % (H2-H8 only, partial)
    private Double thdCurrent;          // % (H2-H8 only)

    // PN-EN 50160 indicators (calculated by backend)
    private Double voltageDeviationPercent;   // (U - 230) / 230 × 100%
    private Double frequencyDeviationHz;      // f - 50 Hz

    // Harmonics (H1-H8 arrays)
    @Column(columnDefinition = "real[]")
    private Double[] harmonicsVoltage;  // [H1, H2, ..., H8]

    @Column(columnDefinition = "real[]")
    private Double[] harmonicsCurrent;  // [H1, H2, ..., H8]

    // Metadata
    @Column(updatable = false)
    private Instant createdAt = Instant.now();
}
```

**Flyway Migration V3 (2025-11-20):**
- **Usunięto:** `pst_flicker` (wymaga IEC 61000-4-15), `capacitor_uf` (nie implementowane)
- **Dodano:** `voltage_deviation_percent`, `frequency_deviation_hz` (wskaźniki PN-EN 50160)
- **Zaktualizowano:** SQL comments (wzory, limity, ograniczenia harmonicznych H2-H8)

#### MQTT Message Handler

```java
@Service
@RequiredArgsConstructor
public class MqttMessageHandler {
    private final MeasurementService measurementService;
    private final ObjectMapper objectMapper;

    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(Message<?> message) {
        String payload = (String) message.getPayload();
        String topic = (String) message.getHeaders().get("mqtt_receivedTopic");

        log.info("Received MQTT from topic: {}", topic);

        // Parse JSON
        MeasurementRequest request = objectMapper.readValue(payload, MeasurementRequest.class);

        // Save measurement (calculates PN-EN 50160 indicators)
        measurementService.saveMeasurement(request);
    }
}
```

#### MeasurementService (Business Logic)

```java
@Service
@Transactional
public class MeasurementService {
    private final MeasurementRepository repository;
    private final WebSocketService webSocketService;

    public MeasurementDTO saveMeasurement(MeasurementRequest request) {
        Measurement measurement = toEntity(request);

        // Calculate PN-EN 50160 indicators
        calculatePowerQualityIndicators(measurement);

        // Save to DB
        Measurement saved = repository.save(measurement);

        // Broadcast via WebSocket
        MeasurementDTO dto = toDTO(saved);
        webSocketService.broadcastMeasurement(dto);

        return dto;
    }

    private void calculatePowerQualityIndicators(Measurement m) {
        // Grupa 1: Odchylenie napięcia
        double voltageDeviation = ((m.getVoltageRms() - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE) * 100.0;
        m.setVoltageDeviationPercent(voltageDeviation);

        // Grupa 2: Odchylenie częstotliwości
        double frequencyDeviation = m.getFrequency() - NOMINAL_FREQUENCY;
        m.setFrequencyDeviationHz(frequencyDeviation);
    }
}
```

#### Dashboard Controller (REST API)

```java
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final MeasurementService measurementService;

    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard() {
        // Latest measurement + waveform + harmonics
        return ResponseEntity.ok(measurementService.getDashboardData());
    }

    @GetMapping("/power-quality-indicators")
    public ResponseEntity<PowerQualityIndicatorsDTO> getPowerQualityIndicators() {
        Measurement latest = measurementService.getLatestMeasurementEntity()
            .orElseThrow(() -> new MeasurementNotFoundException("No measurements available"));

        PowerQualityIndicatorsDTO dto = PowerQualityIndicatorsDTO.builder()
            .timestamp(latest.getTime())
            .voltageRms(latest.getVoltageRms())
            .voltageDeviationPercent(latest.getVoltageDeviationPercent())
            .voltageWithinLimits(checkVoltageCompliance(latest))
            .frequency(latest.getFrequency())
            .frequencyDeviationHz(latest.getFrequencyDeviationHz())
            .frequencyWithinLimits(checkFrequencyCompliance(latest))
            .thdVoltage(latest.getThdVoltage())
            .thdWithinLimits(checkThdCompliance(latest))
            .harmonicsVoltage(Arrays.asList(latest.getHarmonicsVoltage()))
            .overallCompliant(/* all flags true */)
            .statusMessage(buildStatusMessage(/* flags */))
            .build();

        return ResponseEntity.ok(dto);
    }

    private boolean checkVoltageCompliance(Measurement m) {
        double deviation = m.getVoltageDeviationPercent();
        return deviation >= VOLTAGE_DEVIATION_LOWER_LIMIT_PERCENT
            && deviation <= VOLTAGE_DEVIATION_UPPER_LIMIT_PERCENT;
    }

    private boolean checkFrequencyCompliance(Measurement m) {
        double deviation = m.getFrequencyDeviationHz();
        return deviation >= FREQUENCY_DEVIATION_LOWER_LIMIT_HZ
            && deviation <= FREQUENCY_DEVIATION_UPPER_LIMIT_HZ;
    }

    private boolean checkThdCompliance(Measurement m) {
        return m.getThdVoltage() != null && m.getThdVoltage() < THD_VOLTAGE_LIMIT_PERCENT;
    }
}
```

### 5.3. Database Migrations (Flyway)

**Dlaczego Flyway?**
- ✅ Version control dla schematu DB (jak Git dla kodu)
- ✅ Reprodukowalność (dev, test, prod mają ten sam schemat)
- ✅ Incremental (tylko nowe zmiany)
- ✅ Tracked (DB wie które migracje wykonano)
- ❌ Bez Flyway: Manualne SQL scripts (error-prone, brak śledzenia)

**Migration V1:**
```sql
-- V1__Create_measurements_table.sql
CREATE TABLE measurements (
    id BIGSERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL,
    voltage_rms DOUBLE PRECISION COMMENT 'RMS voltage (V)',
    current_rms DOUBLE PRECISION COMMENT 'RMS current (A)',
    frequency DOUBLE PRECISION COMMENT 'Grid frequency (Hz)',
    -- ... (all electrical parameters)
    harmonics_voltage DOUBLE PRECISION[] COMMENT 'Harmonics H1-H8 (50-400 Hz)',
    harmonics_current DOUBLE PRECISION[] COMMENT 'Current harmonics H1-H8',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_measurements_time ON measurements (time DESC);
```

**Migration V2:**
```sql
-- V2__Create_daily_stats_table.sql
CREATE TABLE daily_stats (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    avg_voltage DOUBLE PRECISION,
    min_voltage DOUBLE PRECISION,
    max_voltage DOUBLE PRECISION,
    avg_power_active DOUBLE PRECISION,
    peak_power DOUBLE PRECISION,
    total_energy_kwh DOUBLE PRECISION,
    thd_violations_count INTEGER,
    voltage_sag_count INTEGER,
    voltage_swell_count INTEGER,
    measurement_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Migration V3 (2025-11-20):**
```sql
-- V3__Remove_unmeasurable_fields_and_add_indicators.sql

-- REMOVE unmeasurable fields
ALTER TABLE measurements DROP COLUMN IF EXISTS pst_flicker;
ALTER TABLE measurements DROP COLUMN IF EXISTS capacitor_uf;

-- ADD PN-EN 50160 indicators
ALTER TABLE measurements ADD COLUMN voltage_deviation_percent DOUBLE PRECISION
  COMMENT 'PN-EN 50160 Grupa 1: (U - 230) / 230 × 100%. Limit: ±10%';

ALTER TABLE measurements ADD COLUMN frequency_deviation_hz DOUBLE PRECISION
  COMMENT 'PN-EN 50160 Grupa 2: f - 50 Hz. Limit: ±0.5 Hz';

-- UPDATE comments for existing columns
COMMENT ON COLUMN measurements.thd_voltage IS
  'THD voltage (%) - PARTIAL: H2-H8 only (not H2-H40). Lower bound of true THD.';

COMMENT ON COLUMN measurements.harmonics_voltage IS
  'Voltage harmonics H1-H8 (50-400 Hz). Limited by Nyquist at 800 Hz sampling.';
```

---

## 6. Implementacja frontendu

### 6.1. Struktura projektu (React + Vite)

```
webapp/
├── src/
│   ├── components/
│   │   ├── ui/                              # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── Dashboard.tsx                    # Main dashboard component
│   │   ├── LiveChart.tsx                    # Streaming real-time chart (circular buffer)
│   │   ├── WaveformChart.tsx                # Voltage/current sinusoid
│   │   ├── HarmonicsChart.tsx               # Bar chart H1-H8
│   │   ├── PowerQualityIndicators.tsx       # PN-EN 50160 section
│   │   └── MetricCard.tsx                   # Reusable metric display
│   ├── hooks/
│   │   ├── useDashboardData.ts              # TanStack Query hook (GET /api/dashboard)
│   │   ├── useWebSocket.ts                  # WebSocket connection hook
│   │   └── usePowerQualityIndicators.ts     # GET /api/dashboard/power-quality-indicators
│   ├── lib/
│   │   ├── api.ts                           # Axios instance
│   │   └── utils.ts                         # Utility functions
│   ├── pages/
│   │   ├── DashboardPage.tsx                # Main page
│   │   ├── HistoryPage.tsx                  # Historical data (TODO)
│   │   └── SettingsPage.tsx                 # Settings (TODO)
│   ├── App.tsx                              # Root component (React Router)
│   └── main.tsx                             # Entry point (Vite)
├── src/test/
│   ├── setup.ts                             # Vitest config
│   └── components/
│       └── Dashboard.test.tsx               # Component tests
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### 6.2. Kluczowe komponenty

#### Dashboard Component

```tsx
// src/components/Dashboard.tsx
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePowerQualityIndicators } from '@/hooks/usePowerQualityIndicators';

export function Dashboard() {
  // Initial data from REST API
  const { data: initialData, isLoading, error } = useDashboardData();

  // Real-time updates via WebSocket
  const { latestMeasurement, isConnected } = useWebSocket('ws://backend:8080/ws/measurements');

  // PN-EN 50160 indicators
  const { data: indicators } = usePowerQualityIndicators();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Real-time metrics */}
      <MetricCard
        title="Voltage"
        value={latestMeasurement?.voltageRms || initialData.voltageRms}
        unit="V"
        status={isConnected ? 'connected' : 'disconnected'}
      />
      <MetricCard title="Current" value={latestMeasurement?.currentRms} unit="A" />
      <MetricCard title="Power" value={latestMeasurement?.powerActive} unit="W" />
      <MetricCard title="Frequency" value={latestMeasurement?.frequency} unit="Hz" />

      {/* Streaming charts (4 parameters, 60 measurements buffer) */}
      <div className="col-span-full">
        <LiveChart
          data={latestMeasurement}
          parameters={['voltage', 'current', 'frequency', 'powerActive']}
          bufferSize={60}  // 3 minutes at 3s interval
        />
      </div>

      {/* Waveform reconstruction */}
      <div className="col-span-2">
        <WaveformChart
          voltage={initialData.waveform.voltage}
          current={initialData.waveform.current}
        />
      </div>

      {/* Harmonics bar chart */}
      <div className="col-span-2">
        <HarmonicsChart
          harmonicsVoltage={latestMeasurement?.harmonicsVoltage || initialData.harmonicsVoltage}
          harmonicsCurrent={latestMeasurement?.harmonicsCurrent || initialData.harmonicsCurrent}
        />
      </div>

      {/* PN-EN 50160 Power Quality Indicators */}
      <div className="col-span-full">
        <PowerQualityIndicators indicators={indicators} />
      </div>
    </div>
  );
}
```

#### WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useState, useRef } from 'react';

interface MeasurementData {
  timestamp: string;
  voltageRms: number;
  currentRms: number;
  // ... all fields
}

export function useWebSocket(url: string) {
  const [latestMeasurement, setLatestMeasurement] = useState<MeasurementData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      // Subscribe to topic (if using STOMP)
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', topic: '/topic/dashboard' }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLatestMeasurement(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Auto-reconnect after 3s
      setTimeout(() => {
        console.log('Reconnecting...');
        // Trigger re-mount to reconnect
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { latestMeasurement, isConnected };
}
```

#### Live Streaming Chart (Circular Buffer)

```typescript
// src/components/LiveChart.tsx
import { useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LiveChartProps {
  data: MeasurementData | null;
  parameters: string[];
  bufferSize: number; // 60 measurements = 3 minutes at 3s interval
}

export function LiveChart({ data, parameters, bufferSize }: LiveChartProps) {
  // Circular buffer stored in ref (no re-render on update)
  const bufferRef = useRef<MeasurementData[]>([]);

  // Update buffer when new data arrives
  useEffect(() => {
    if (!data) return;

    const buffer = bufferRef.current;
    buffer.push(data);

    // Keep only last `bufferSize` measurements (FIFO)
    if (buffer.length > bufferSize) {
      buffer.shift();
    }
  }, [data, bufferSize]);

  // Memoize chart data (recalculate only when buffer changes)
  const chartData = useMemo(() => {
    return bufferRef.current.map((m, index) => ({
      time: index, // Simplified x-axis (could use timestamp)
      voltage: m.voltageRms,
      current: m.currentRms,
      frequency: m.frequency,
      powerActive: m.powerActive,
    }));
  }, [bufferRef.current.length]); // Dependency on length (updates when buffer changes)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        {parameters.map((param) => (
          <Line
            key={param}
            type="monotone"
            dataKey={param}
            stroke={getColorForParam(param)}
            isAnimationActive={false}  // IMPORTANT: Disable animations for performance
            dot={false}  // No dots for cleaner look
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function getColorForParam(param: string): string {
  const colors: Record<string, string> = {
    voltage: '#8884d8',
    current: '#82ca9d',
    frequency: '#ffc658',
    powerActive: '#ff7300',
  };
  return colors[param] || '#000000';
}
```

**Optimizations for real-time streaming:**
- ✅ Circular buffer in `useRef` (no re-render when updating buffer)
- ✅ `useMemo` for chart data (recalculate only when buffer length changes)
- ✅ `isAnimationActive={false}` (animations slow down updates)
- ✅ `dot={false}` (no dots on line = cleaner + faster)

#### Power Quality Indicators Component

```tsx
// src/components/PowerQualityIndicators.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PowerQualityIndicatorsProps {
  indicators: PowerQualityIndicatorsDTO | undefined;
}

export function PowerQualityIndicators({ indicators }: PowerQualityIndicatorsProps) {
  if (!indicators) return <div>Loading indicators...</div>;

  const {
    voltageDeviationPercent,
    voltageWithinLimits,
    frequencyDeviationHz,
    frequencyWithinLimits,
    thdVoltage,
    thdWithinLimits,
    overallCompliant,
    statusMessage
  } = indicators;

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">
        Wskaźniki jakości energii PN-EN 50160
      </h2>

      {/* Overall status */}
      <div className="mb-6">
        <Badge variant={overallCompliant ? 'success' : 'destructive'}>
          {overallCompliant ? 'Wszystkie wskaźniki w normie' : 'Wykroczenie poza limity'}
        </Badge>
        <p className="text-sm text-muted-foreground mt-2">{statusMessage}</p>
      </div>

      {/* Grupa 1: Napięcie */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <MetricCard
          title="Odchylenie napięcia (Grupa 1)"
          value={voltageDeviationPercent?.toFixed(2)}
          unit="%"
          status={voltageWithinLimits ? 'ok' : 'warning'}
          limit="±10%"
        />

        {/* Grupa 2: Częstotliwość */}
        <MetricCard
          title="Odchylenie częstotliwości (Grupa 2)"
          value={frequencyDeviationHz?.toFixed(3)}
          unit="Hz"
          status={frequencyWithinLimits ? 'ok' : 'warning'}
          limit="±0.5 Hz"
        />

        {/* Grupa 4: THD (częściowe) */}
        <MetricCard
          title="THD napięcia (Grupa 4)"
          value={thdVoltage?.toFixed(2)}
          unit="%"
          status={thdWithinLimits ? 'ok' : 'warning'}
          limit="<8%"
          warning="⚠️ Częściowy pomiar (H2-H8 tylko)"
        />
      </div>

      {/* Wykresy harmonicznych */}
      <HarmonicsChart harmonics={indicators.harmonicsVoltage} />

      {/* Legend */}
      <div className="text-xs text-muted-foreground mt-4">
        <p>Norma: PN-EN 50160:2010 - Parametry napięcia zasilającego w publicznych sieciach elektroenergetycznych</p>
        <p>Uwaga: System mierzy harmoniczne H1-H8 (50-400 Hz) ze względu na ograniczenia częstotliwości próbkowania (800 Hz).</p>
        <p>THD obliczane tylko z H2-H8 (zamiast H2-H40 zgodnie z IEC 61000-4-7) - wartość stanowi dolne ograniczenie rzeczywistego THD.</p>
      </div>
    </Card>
  );
}
```

### 6.3. Data Fetching Strategy

**Initial Load: REST API (TanStack Query)**
```typescript
// src/hooks/useDashboardData.ts
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard');
      return response.data as DashboardDTO;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // No polling (we use WebSocket for real-time)
  });
}
```

**Real-time Updates: WebSocket**
```typescript
// Native WebSocket API (no SockJS/STOMP overhead)
const ws = new WebSocket('ws://backend:8080/ws/measurements');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setLatestMeasurement(data);
};
```

**Why TanStack Query + WebSocket?**
- ✅ **TanStack Query** for initial load: caching, loading states, error handling
- ✅ **WebSocket** for real-time: low latency (<100ms), bidirectional, efficient
- ❌ **Polling (setInterval):** Higher latency, more HTTP overhead, inefficient
- ❌ **SSE (Server-Sent Events):** Unidirectional only, less browser support

---

## 7. Hardware i ESP32

### 7.1. ESP32 Mock Data Generator

**Lokalizacja:** `esp32-mock-generator/`

**Przeznaczenie:** Testowanie backendu bez fizycznych czujników (SCT013 + TV16).

**Features:**
- ✅ Generuje realistyczne pomiary (napięcie, prąd, moc, harmoniczne)
- ✅ Symuluje zdarzenia jakości energii (zapady, przepięcia, wysokie THD)
- ✅ IEC 61000 compliant (limity napięcia ±10%, częstotliwości ±1%, THD <8%)
- ✅ Konfigurowalny (WiFi credentials w `include/config.h`)
- ✅ Serial monitoring z kolorowymi statusami

**Konfiguracja:**
```cpp
// include/config.h (gitignored)
const char* WIFI_SSID = "Your_WiFi_2.4GHz";  // ESP32 only 2.4GHz!
const char* WIFI_PASSWORD = "password";
const char* MQTT_BROKER_IP = "192.168.1.100"; // PC lub RPI IP
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC = "scada/measurements/node1";
```

**JSON Payload Example:**
```json
{
  "timestamp": 1734528000,
  "voltage_rms": 231.2,
  "current_rms": 5.45,
  "power_active": 1258.0,
  "power_apparent": 1260.0,
  "power_reactive": 150.0,
  "cos_phi": 0.998,
  "frequency": 50.02,
  "thd_voltage": 1.8,
  "thd_current": 5.1,
  "harmonics_v": [231.2, 4.2, 2.1, 1.1, 0.8, 0.5, 0.3, 0.2],
  "harmonics_i": [5.45, 0.28, 0.14, 0.07, 0.04, 0.02, 0.01, 0.01]
}
```

**Power Quality Events Simulation:**
| Event | Probability | Voltage Range | THD Range |
|-------|-------------|---------------|-----------|
| Normal | 90% | 220-240V | <3% |
| Voltage Sag | 2% | 180-207V (90% Un) | 2-5% |
| Voltage Swell | 1% | 253-260V (110% Un) | 2-5% |
| High THD | 5% | 220-240V | 8-12% |
| High Load | 10% | 220-240V, 10-20A | <3% |

**Serial Monitor Output:**
```
╔════════════════════════════════════════════════╗
║  ESP32 Mock Data Generator for SCADA System   ║
╚════════════════════════════════════════════════╝

Configuration:
  WiFi SSID: MyHomeWiFi
  MQTT Broker: 192.168.1.50:1883
  MQTT Topic: scada/measurements/node1
  Interval: 3000 ms

→ Connecting to WiFi: MyHomeWiFi ....... ✓
  IP Address: 192.168.1.123
  Signal: -45 dBm
→ Connecting to MQTT broker 192.168.1.50:1883 ✓
  Publishing to: scada/measurements/node1

✓ Setup complete! Starting measurement generation...

─────────────────────────────────────────────────────
    [   1] ✓ 231.2V  5.45A 1258.0W THD: 1.8% (312 bytes)
    [   2] ✓ 228.7V  6.12A 1398.5W THD: 2.1% (312 bytes)
    ⚠️  VOLTAGE SAG [   3] ✓ 198.3V  5.01A  993.2W THD: 2.3% (312 bytes)
    [   4] ✓ 232.1V  7.23A 1676.8W THD: 1.5% (312 bytes)
```

**Upload i użycie:**
```bash
cd esp32-mock-generator

# PlatformIO
pio run --target upload
pio device monitor

# Arduino IDE
# Open src/main.cpp → Upload → Serial Monitor (115200 baud)
```

### 7.2. Real Hardware (Dedykowana płytka PCB z ESP32)

**Status:** ✅ **ZAKOŃCZONE** - Płytka wykonana i zweryfikowana pomiarowo.

System bazuje na dedykowanej płytce drukowanej (PCB) z mikrokontrolerem ESP32, zaprojektowanej do bezpiecznego pomiaru parametrów sieci 230V.

**Izolacja i Bezpieczeństwo:**
- ✅ Pełna izolacja galwaniczna zapewniona przez przekładniki napięciowe oraz prądowe
- ✅ Separacja układu mocy (230V AC) od układu pomiarowego (3.3V DC)
- ✅ Enclosure: Wszystkie elementy 230V w obudowie ochronnej
- ✅ Normy bezpieczeństwa: Laboratoryjne standardy edukacyjne

**Architektura Softwarowa (Dual-Core ESP32):**

**Rdzeń 0 (Core 0):** Dedykowany do zadań czasu rzeczywistego
- ✅ Obsługa przerwań timera (5 kHz)
- ✅ Zbieranie próbek z ADC
- ✅ Eliminacja problemu "gubienia próbek"
- ✅ Deterministyczny czas wykonania

**Rdzeń 1 (Core 1):** Obsługa stosu TCP/IP i logiki biznesowej
- ✅ Komunikacja MQTT (publikacja co 5s)
- ✅ Obsługa WiFi
- ✅ Obliczenia RMS, THD, FFT
- ✅ Formatowanie danych JSON

**Synchronizacja (Zero-Crossing Detection):**
- ✅ Autorska implementacja programowej detekcji przejścia przez zero
- ✅ Analiza zbocza narastającego sygnału względem cyfrowego offsetu (~2048 dla 12-bit ADC)
- ✅ Deterministyczny start okna pomiarowego (10 cykli / 200 ms)
- ✅ Synchronizacja z siecią 50 Hz dla precyzyjnej analizy FFT

**Kompensacja Metrologiczna:**

**Korekta fazy:**
- ✅ Programowe niwelowanie błędu kątowego wynikającego z czasu przełączania kanałów ADC
- ✅ Stała poprawka kąta Δφ = f(t_switching, f_sampling)
- ✅ Precyzyjny pomiar mocy czynnej/biernej

**Pamięć NVS (Non-Volatile Storage):**
- ✅ Współczynniki kalibracyjne K_u i K_i przechowywane w Flash
- ✅ Skalowanie wyników do jednostek fizycznych (V, A, W)
- ✅ Brak konieczności reflashowania kodu po kalibracji
- ✅ Odporność na restart urządzenia

**Procedura kalibracji:**
1. ✅ Pomiar referencyjny (wzorcowy miernik cyfrowy)
2. ✅ Pomiar surowych wartości ADC z ESP32
3. ✅ Obliczenie współczynników K_u = U_rzeczywiste / ADC_raw
4. ✅ Obliczenie współczynników K_i = I_rzeczywiste / ADC_raw
5. ✅ Zapis K_u, K_i do pamięci NVS
6. ✅ Weryfikacja dokładności: ±1-3% dla napięcia, ±2-4% dla prądu

---

## 8. Środowisko deweloperskie

Szczegółowa dokumentacja znajduje się w **[DEV-SETUP.md](DEV-SETUP.md)**.

### 8.1. Wymagania systemowe

**Backend:**
- Java 17 (OpenJDK)
- Maven 3.9+ (included via wrapper `./mvnw`)
- Docker Desktop (dla PostgreSQL + Mosquitto)

**Frontend:**
- Node.js 20.19.0+ lub 22.12.0+
- npm 10+

**Infrastructure:**
- Docker 24.x
- Docker Compose 2.x

### 8.2. Quick Start (Local Development)

**1. Start infrastructure (PostgreSQL + Mosquitto):**
```bash
cd scada-system-project
docker-compose up -d

# Verify
docker ps
# Should show: scada-postgres, scada-mqtt
```

**2. Start backend:**
```bash
cd scada-system
./mvnw spring-boot:run

# Backend available at: http://localhost:8080
# Health check: http://localhost:8080/health
```

**3. Start frontend:**
```bash
cd webapp
npm install
npm run dev

# Frontend available at: http://localhost:5173 (Vite dev server)
```

**4. Upload ESP32 mock generator:**
```bash
cd esp32-mock-generator

# Copy config template
cp include/config.h.example include/config.h

# Edit config.h with your WiFi + MQTT broker IP
nano include/config.h

# Upload (PlatformIO)
pio run --target upload
pio device monitor
```

**5. Verify data flow:**
```bash
# Check database
docker exec -it scada-postgres psql -U energyuser -d energy_monitor
SELECT COUNT(*) FROM measurements;
SELECT * FROM measurements ORDER BY time DESC LIMIT 5;

# Check MQTT
docker exec -it scada-mqtt mosquitto_sub -t "scada/measurements/#" -v

# Check backend logs
# (check terminal where ./mvnw spring-boot:run is running)

# Check frontend
# Open browser: http://localhost:5173
# Should see real-time updates every 3 seconds
```

### 8.3. Environment Variables

**Backend (`application.properties`):**
```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/energy_monitor
spring.datasource.username=energyuser
spring.datasource.password=StrongPassword123!

# MQTT
mqtt.broker.url=tcp://localhost:1883
mqtt.topics=scada/measurements/#

# Server
server.port=8080

# Flyway
spring.flyway.enabled=true
```

**Frontend (Vite `.env`):**
```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/measurements
```

### 8.4. Testing

**Backend tests (JUnit 5 + H2 in-memory DB):**
```bash
cd scada-system
./mvnw clean test

# Tests use H2 database (PostgreSQL compatibility mode)
# No need for Docker during tests
# Profile: @ActiveProfiles("test")
```

**Frontend tests (Vitest + React Testing Library):**
```bash
cd webapp

# Run tests once
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
```

### 8.5. IDE Setup

**Backend: IntelliJ IDEA Ultimate**
```
File → Open → Select scada-system/
Maven → Reload Project
Run → Edit Configurations → + → Spring Boot
  Main class: com.dkowalczyk.scadasystem.ScadaSystemApplication
  Active profiles: dev (optional)
  VM options: (empty)
Run (Shift+F10) or Debug (Shift+F9)
```

**Frontend: Visual Studio Code**
```
Extensions:
- ESLint
- Prettier
- Vite
- Tailwind CSS IntelliSense

Terminal → npm run dev
Debug: F5 (if configured launch.json)
```

---

## 9. CI/CD i deployment

Szczegółowa dokumentacja znajduje się w **[CI-CD-SETUP.md](CI-CD-SETUP.md)**.

### 9.1. CI Pipeline (Continuous Integration)

**Trigger:** Pull Requests do `master`

**Jobs:**
1. **Backend tests** (JUnit + H2 database)
2. **Frontend tests** (Vitest + type checking + linting)
3. **Build validation** (JAR + frontend dist)
4. **CI Summary** (podsumowanie)

**Example output:**
```
✅ CI Pipeline - Pull Request #42

Backend Tests ............ ✅ Passed (2m 15s)
  - Unit tests: 127 passed, 0 failed
  - Coverage: 87.3%

Frontend Tests ........... ✅ Passed (1m 42s)
  - Type checking: ✅ No errors
  - Linting: ✅ No issues
  - Unit tests: 45 passed, 0 failed

Build Validation ......... ✅ Passed (3m 05s)
  - Backend JAR: 45.2 MB
  - Frontend dist: 2.1 MB

✅ All checks passed - Ready to merge!
```

### 9.2. CD Pipeline (Continuous Deployment)

**Trigger:** Manual only (`workflow_dispatch`)

**Why manual?** Bezpieczeństwo - deployment na RPI produkcyjny wymaga świadomej decyzji.

**Jobs:**
1. **Pre-deployment tests** - Safety check
2. **Build artifacts** - JAR + frontend dist
3. **Deploy to RPI** via SSH over Tailscale VPN
4. **Health checks** - Verify services running
5. **Rollback on failure** - Automatic rollback if health check fails

**Deployment strategy: Blue-Green**
```
/opt/scada-system/
├── current → symlink to active version
├── releases/
│   ├── 20251218_143022/ (NEW - green)
│   ├── 20251218_120015/ (CURRENT - blue)
│   └── 20251217_183045/ (OLD)
└── shared/
    ├── logs/
    └── data/ (PostgreSQL volumes, MQTT persistence)

Process:
1. Upload NEW version to releases/20251218_143022/
2. Start Docker Compose in NEW/
3. Health check NEW/ (30s timeout)
4. ✅ Success: Update symlink current → NEW
5. ❌ Failure: Rollback (keep current → CURRENT)
6. Stop old version (blue)
7. Cleanup old releases (keep last 5)
```

**Automatic JAR Versioning:**
```bash
# Version format: 0.0.<github.run_number>
# Example: scada-system-0.0.152.jar

# Benefits:
# - Traceability (version = GitHub Actions run number)
# - Rollback easy (previous JARs kept)
# - No manual versioning
```

**Tailscale VPN for Deployment:**
```
Why Tailscale?
- ✅ No port forwarding (SSH not exposed to internet)
- ✅ Secure VPN (encrypted connection)
- ✅ GitHub Actions → Tailscale → RPI (private network)
- ✅ Works from anywhere (no NAT traversal issues)

Setup:
1. Install Tailscale on RPI: curl -fsSL https://tailscale.com/install.sh | sh
2. Connect RPI: sudo tailscale up
3. Get RPI Tailscale IP (e.g., 100.121.244.61)
4. Add GitHub Secrets:
   - DEPLOY_SSH_KEY (private key)
   - TAILSCALE_CLIENT_ID
   - TAILSCALE_SECRET
```

### 9.3. Deployment scripts

**Lokalizacja:** `deployment/scripts/` (w katalogu release na RPI)

**deploy.sh:**
```bash
#!/bin/bash
# Main deployment script
# - Stops current version
# - Starts new version with Docker Compose
# - Waits for services to be healthy
# - Updates symlink current → NEW

./deployment/scripts/deploy.sh
```

**health-check.sh:**
```bash
#!/bin/bash
# Verifies deployment success
# - Checks backend /health endpoint (30 retries, 2s delay)
# - Checks frontend / endpoint
# - Checks Docker services status

./deployment/scripts/health-check.sh
```

**rollback.sh:**
```bash
#!/bin/bash
# Rolls back to previous version
# - Finds previous release directory
# - Stops current (failed) version
# - Starts previous version
# - Updates symlink current → PREVIOUS

./deployment/scripts/rollback.sh
```

**cleanup.sh:**
```bash
#!/bin/bash
# Removes old releases
# - Keeps last 5 releases
# - Cleans up Docker images (>72h old)
# - Cleans up Docker volumes (unused)

./deployment/scripts/cleanup.sh
```

**verify-deployment.sh:**
```bash
#!/bin/bash
# Comprehensive verification
# - Checks all Docker services running
# - Checks backend endpoints (/health, /actuator/info)
# - Checks MQTT broker responding
# - Checks PostgreSQL ready
# - Checks Redis (if used)
# - Checks disk space
# - Checks logs for recent errors

./deployment/scripts/verify-deployment.sh
```

**integration-tests.sh:**
```bash
#!/bin/bash
# Post-deployment smoke tests
# - Test /health endpoint
# - Test /api/measurements/latest (200 or 404)
# - Test WebSocket endpoint availability
# - Test frontend accessibility
# - Test MQTT publish/subscribe
# - Test database connectivity

./deployment/scripts/integration-tests.sh
```

### 9.4. GitHub Secrets (wymagane dla CD)

```bash
DEPLOY_SSH_KEY       # SSH private key for RPI access
RPI_USER             # SSH username (pi)
RPI_HOST             # RPI IP or hostname
TAILSCALE_CLIENT_ID  # Tailscale OAuth client ID
TAILSCALE_SECRET     # Tailscale OAuth secret
```

---

## 10. Wskaźniki jakości energii PN-EN 50160

Szczegółowa dokumentacja znajduje się w **[POWER-QUALITY-INDICATORS.md](POWER-QUALITY-INDICATORS.md)** i **[ESP32-MEASUREMENT-SPECS.md](ESP32-MEASUREMENT-SPECS.md)**.

### 10.1. Podsumowanie możliwości pomiarowych

| Grupa PN-EN 50160 | Wskaźnik | Status | Limit normy | Źródło danych | Endpoint |
|-------------------|----------|--------|-------------|---------------|----------|
| **1. Napięcie** | Odchylenie napięcia (ΔU/Un) | ✅ MOŻLIWE | ±10% (207-253V) | `voltage_rms`, `voltage_deviation_percent` | `/api/dashboard/power-quality-indicators` |
| **2. Częstotliwość** | Odchylenie częstotliwości (Δf) | ✅ MOŻLIWE | ±0.5 Hz (49.5-50.5 Hz) | `frequency`, `frequency_deviation_hz` | `/api/dashboard/power-quality-indicators` |
| **3. Flicker** | Pst (short-term) | ❌ NIEMOŻLIWE | ≤1.0 | BRAK | N/A |
| | Plt (long-term) | ❌ NIEMOŻLIWE | ≤1.0 | BRAK | N/A |
| | RVC (rapid changes) | ❌ NIEMOŻLIWE | - | BRAK | N/A |
| **4. Odkształcenia** | THD napięcia | ⚠️ CZĘŚCIOWO | <8% | `thd_voltage` (H2-H8 only) | `/api/dashboard/power-quality-indicators` |
| | Harmoniczne U_h | ⚠️ CZĘŚCIOWO | Różne limity | `harmonics_voltage[]` (H1-H8) | `/api/dashboard/power-quality-indicators` |
| | Interharmoniczne | ❌ NIEMOŻLIWE | - | BRAK | N/A |
| **5. Zdarzenia** | Zapady (voltage dips) | 🔴 W PLANACH | U < 90% Un | BRAK (TODO: events table) | `/api/events` (TODO) |
| | Przepięcia (swells) | 🔴 W PLANACH | U > 110% Un | BRAK (TODO: events table) | `/api/events` (TODO) |
| | Przerwy (interruptions) | 🔴 W PLANACH | U < 10% Un | BRAK (TODO: events table) | `/api/events` (TODO) |

**Legenda:**
- ✅ **MOŻLIWE** - Pełna implementacja zgodna z normą
- ⚠️ **CZĘŚCIOWO** - Ograniczona implementacja (harmoniczne H2-H8 zamiast H2-H40)
- ❌ **NIEMOŻLIWE** - Wymaga sprzętu/algorytmu poza możliwościami ESP32
- 🔴 **W PLANACH** - Zaplanowane w przyszłych issues

### 10.2. Wzory wskaźników (implementacja w backendzie)

**Grupa 1: Odchylenie napięcia**
```java
// MeasurementService.java
double voltageDeviation = ((voltageRms - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE) * 100.0;
measurement.setVoltageDeviationPercent(voltageDeviation);

// NOMINAL_VOLTAGE = 230.0 V (Constants.java)
// Limit: ±10% → [-10%, +10%] → [207V, 253V]
```

**Grupa 2: Odchylenie częstotliwości**
```java
// MeasurementService.java
double frequencyDeviation = frequency - NOMINAL_FREQUENCY;
measurement.setFrequencyDeviationHz(frequencyDeviation);

// NOMINAL_FREQUENCY = 50.0 Hz (Constants.java)
// Limit: ±0.5 Hz → [49.5 Hz, 50.5 Hz]
```

**Grupa 4: THD napięcia (częściowe)**
```cpp
// ESP32 (docelowo)
// THD = sqrt(sum(U_h² dla h=2..8)) / U_1 × 100%

double sumSquares = 0.0;
for (int h = 2; h <= 8; h++) {
    sumSquares += harmonicsVoltage[h] * harmonicsVoltage[h];
}
double thd = (sqrt(sumSquares) / harmonicsVoltage[1]) * 100.0;

// UWAGA: To jest THD częściowe (H2-H8 zamiast H2-H40)
// Rzeczywiste THD może być wyższe!
```

**Notka projektowa:**

Zgodnie z założeniami projektowymi, współczynnik THD obliczany jest na podstawie **pierwszych 8 harmonicznych**, co jest wystarczające do identyfikacji wpływu nieliniowych odbiorników domowych (zasilacze impulsowe, oświetlenie LED).

Pełna norma IEC 61000-4-7 wymaga analizy harmonicznych H2-H40, jednak dla zastosowań domowych (monitoring jakości energii w instalacji 230V) zakres H2-H8 dostarcza wystarczających informacji diagnostycznych o źródłach zniekształceń.

### 10.3. Frontend: Sekcja wskaźników PN-EN 50160

**Podział na sekcje:**

**Sekcja 1: Wskaźniki jakości energii PN-EN 50160**
- Endpoint: `GET /api/dashboard/power-quality-indicators`
- Wyświetla:
  - Odchylenie napięcia (±10% limit, status: zielony/czerwony)
  - Odchylenie częstotliwości (±0.5 Hz limit, status: zielony/czerwony)
  - THD napięcia (<8% limit, status: zielony/czerwony)
    - **OSTRZEŻENIE:** "⚠️ Częściowy pomiar (harmoniczne H2-H8 zamiast H2-H40)"
  - Wykres harmonicznych H1-H8 (bar chart)
  - Overall compliance status (zielony: OK, czerwony: FAIL)
  - Status message (czytelny komunikat)

**Sekcja 2: Pozostałe pomiary**
- Endpoint: `GET /api/dashboard`
- Wyświetla:
  - Napięcie RMS, Prąd RMS
  - Moc czynna, bierna, pozorna
  - Współczynnik mocy (cos φ)
  - THD prądu (diagnostyka, nie PN-EN 50160)
  - Harmoniczne prądu (diagnostyka)
  - Przebiegi czasowe (sinusoida U/I)

**Sekcja 3: Zdarzenia (TODO - osobny issue)**
- Endpoint: `GET /api/events`
- Wyświetla:
  - Timeline zdarzeń (zapady, przepięcia, przerwy)
  - Histogram częstotliwości zdarzeń
  - Tabela zdarzeń (timestamp, typ, czas trwania, amplituda)

### 10.4. Limityzacje i ostrzeżenia

**Frontend powinien wyświetlać:**
```
⚠️ UWAGI:
- Harmoniczne: System mierzy tylko H1-H8 (50-400 Hz) ze względu na ograniczenia
  częstotliwości próbkowania (800 Hz → częstotliwość Nyquista 400 Hz).

- THD: Obliczane tylko z harmonicznych H2-H8 (zamiast H2-H40 zgodnie z IEC 61000-4-7).
  Wartość stanowi DOLNE OGRANICZENIE rzeczywistego THD. Rzeczywiste THD może być wyższe.

- Flicker: Pomiar Pst/Plt niemożliwy (wymaga dedykowanego sprzętu IEC 61000-4-15
  i próbkowania 20 kHz).

- Zdarzenia: Wykrywanie zapadów/przepięć/przerw w planach (osobny issue).

⚙️ KONTEKST:
System jest projektem edukacyjnym (praca inżynierska), nie certyfikowanym analizatorem
jakości energii. Demonstruje zasady monitorowania PN-EN 50160 w ograniczonym budżecie.
```

---

## 11. Komendy i workflow

### 11.1. Development Commands

**Backend:**
```bash
cd scada-system

# Run dev server
./mvnw spring-boot:run

# Run tests
./mvnw test

# Build JAR
./mvnw clean package

# Build JAR skip tests
./mvnw clean package -DskipTests
```

**Frontend:**
```bash
cd webapp

# Install dependencies
npm install

# Dev server (hot reload)
npm run dev

# Production build
npm run build

# Tests
npm run test
npm run test:watch
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
npm run lint:fix
```

**Docker (Infrastructure):**
```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose stop

# Remove containers + volumes
docker-compose down -v

# View logs
docker-compose logs -f
docker-compose logs -f postgres
docker-compose logs -f mosquitto
```

**Database:**
```bash
# Connect to PostgreSQL
docker exec -it scada-postgres psql -U energyuser -d energy_monitor

# Inside psql:
\dt                         # List tables
\d measurements            # Describe table
SELECT COUNT(*) FROM measurements;
SELECT * FROM measurements ORDER BY time DESC LIMIT 10;
SELECT * FROM flyway_schema_history;  # Migration history
\q                         # Exit
```

**MQTT:**
```bash
# Subscribe (listen to messages)
docker exec -it scada-mqtt mosquitto_sub -t "scada/measurements/#" -v

# Publish test message
docker exec -it scada-mqtt mosquitto_pub -t "scada/measurements/test" -m '{"voltage_rms": 230.5}'
```

### 11.2. Developer Workflow

**Typical day:**
```bash
# 1. Update master
git checkout master
git pull origin master

# 2. Create feature branch
git checkout -b feature/add-mqtt-client

# 3. Work on code...
# Edit files, write tests

# 4. Test locally
cd scada-system && ./mvnw test
cd webapp && npm test

# 5. Commit
git add .
git commit -m "feat: add MQTT client configuration"

# 6. Push
git push origin feature/add-mqtt-client

# 7. Create Pull Request (GitHub UI or gh CLI)
gh pr create --title "Add MQTT client" --body "Implements MQTT client..."

# 8. Wait for CI to pass (3-5 minutes)

# 9. Merge PR
gh pr merge --squash

# 10. Manual deployment (when ready)
gh workflow run cd.yml --ref master
```

### 11.3. Deployment Commands

**Manual deployment (GitHub CLI):**
```bash
# Trigger CD pipeline
gh workflow run cd.yml --ref master

# Check deployment status
gh run list --workflow=cd.yml

# View logs
gh run view --log
```

**On RPI (SSH):**
```bash
# SSH to RPI
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122

# Check services
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart service
docker compose -f docker-compose.prod.yml restart backend

# Health check
/opt/scada-system/current/deployment/scripts/health-check.sh

# Rollback (if needed)
/opt/scada-system/current/deployment/scripts/rollback.sh

# Cleanup old releases
/opt/scada-system/current/deployment/scripts/cleanup.sh
```

### 11.4. Monitoring

**Logs (real-time):**
```bash
# Backend logs
ssh pi@192.168.0.122
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml logs -f backend

# All services
docker compose -f docker-compose.prod.yml logs -f

# System logs
sudo journalctl -u scada-backend -f
```

**Metrics (if Prometheus/Grafana configured):**
```
Grafana: http://192.168.0.122:3000
Prometheus: http://192.168.0.122:9090
```

**Health checks:**
```bash
# Backend
curl http://192.168.0.122:8080/health

# Frontend
curl http://192.168.0.122:80/

# Database
docker exec scada-postgres pg_isready -U energyuser
```

---

## 12. Status implementacji

**Ostatnia aktualizacja:** 2025-12-18

### 12.1. Backend

**Ukończone (✅ 95%):**
- ✅ MQTT Integration (MqttConfig, MqttMessageHandler)
- ✅ Database layer (Measurement, DailyStats entities)
- ✅ Flyway migrations (V1, V2, V3)
- ✅ REST API (MeasurementController, StatsController, HealthController, DashboardController)
- ✅ WebSocket broadcasting (/ws/measurements → /topic/dashboard)
- ✅ Service layer (MeasurementService, WebSocketService, StatsService, WaveformService)
- ✅ DataAggregationService (scheduled daily job at 00:05)
- ✅ PowerQualityIndicators DTO i endpoint
- ✅ Exception handling & validation
- ✅ Utilities (Constants.java - PN-EN 50160 limits, system specs)
- ✅ Testing framework (JUnit 5 + H2 in-memory DB)
- ✅ ESP32 Mock Data Generator (PlatformIO firmware)
- ✅ CI/CD pipeline (GitHub Actions - ci.yml, cd.yml)

**Do zrobienia (🔴 5%):**
- 🔴 Events detection (voltage dips, swells, interruptions) - osobny issue
- 🔴 Events table (power_quality_events) - migration V4
- 🔴 Events REST API (/api/events)
- 🔴 Long-term aggregations (10-minute, hourly)
- 🔴 PN-EN 50160 compliance reports (PDF export)

### 12.2. Frontend

**Ukończone (✅ 60%):**
- ✅ Project setup (React + TypeScript + Vite)
- ✅ shadcn/ui components
- ✅ Dashboard layout
- ✅ Vitest testing framework
- ✅ TanStack Query integration
- ✅ Backend API connection (GET /api/dashboard)
- ✅ WebSocket real-time updates
- ✅ Recharts data visualization
- ✅ Loading states & error handling
- ✅ Real-time streaming charts (oscilloscope-like, circular buffer 60 measurements)
- ✅ Optimized performance (no animations, memoized data, ref-based buffer)
- ✅ Waveform chart (voltage/current sinusoid)
- ✅ Harmonics bar chart (H1-H8)
- ✅ 4 streaming parameters: Voltage, Current, Frequency, Active Power

**Do zrobienia (🔴 40%):**
- 🔴 Power Quality Indicators section (PN-EN 50160)
  - Endpoint: GET /api/dashboard/power-quality-indicators
  - Display: voltage deviation, frequency deviation, THD with limits
  - Overall compliance status (green/red)
  - Warning: "Częściowy pomiar THD (H2-H8 only)"
- 🔴 Historical data view (GET /api/measurements/history)
  - Date range picker
  - Historical charts (10-min, hourly, daily)
- 🔴 Statistics dashboard (GET /api/stats/daily)
  - Daily/weekly/monthly stats
  - Min/max/avg displays
  - Energy consumption (kWh)
- 🔴 Events timeline (GET /api/events - TODO backend)
  - Voltage dips/swells/interruptions history
  - Event details
- 🔴 Settings page
  - Threshold configuration
  - Alert settings
  - Export settings

### 12.3. Hardware

**Ukończone (✅ 100%):**

**Hardware (PCB):**
- ✅ Dedykowana płytka drukowana (PCB) z ESP32
- ✅ Pełna izolacja galwaniczna (przekładniki napięciowe i prądowe)
- ✅ Wykonanie i weryfikacja pomiarowa
- ✅ Obudowa ochronna dla elementów 230V

**Przetwarzanie sygnałów:**
- ✅ Timer Interrupt (5 kHz) na Core 0 (zadania real-time)
- ✅ Obliczenia RMS, FFT (8 harmonicznych) na Core 1
- ✅ Synchronizacja Zero-Crossing (detekcja przejścia przez zero)
- ✅ Kompensacja fazy (korekta błędu kątowego ADC)

**Komunikacja MQTT:**
- ✅ Wysyłka paczek JSON co 5 sekund
- ✅ Edge Computing (pełne obliczenia lokalnie na ESP32)
- ✅ WiFi stack na Core 1

**Kalibracja:**
- ✅ System skalowania oparty o NVS (Non-Volatile Storage)
- ✅ Współczynniki K_u i K_i w pamięci Flash
- ✅ Weryfikacja z zewnętrznym miernikiem wzorcowym
- ✅ Dokładność: ±1-3% napięcie, ±2-4% prąd

**Mock Hardware (testy backendu):**
- ✅ ESP32 Mock Data Generator (PlatformIO)
- ✅ Symulacja zdarzeń jakości energii
- ✅ Serial monitoring z kolorowymi statusami

### 12.4. Deployment

**Ukończone (✅ 90%):**
- ✅ Docker Compose setup (PostgreSQL + Mosquitto + Backend)
- ✅ GitHub Actions CI (tests + build validation)
- ✅ GitHub Actions CD (manual trigger, blue-green deployment)
- ✅ Tailscale VPN for secure deployment
- ✅ Automatic JAR versioning (github.run_number)
- ✅ Deployment scripts (deploy.sh, health-check.sh, rollback.sh, cleanup.sh)
- ✅ Raspberry Pi setup documentation

**Do zrobienia (🔴 10%):**
- 🔴 systemd service file dla backend (auto-start on boot)
- 🔴 Nginx reverse proxy (optional, currently direct port 8080)
- 🔴 SSL/TLS certificates (Let's Encrypt for production)
- 🔴 Prometheus + Grafana monitoring (metrics collection)
- 🔴 Automated backups (database + config files)

---

## 13. Roadmap i przyszły rozwój

### 13.1. Faza 1: Uzupełnienie podstawowych funkcji (Q1 2025)

**Frontend:**
- [ ] Sekcja wskaźników PN-EN 50160 (Grupy 1, 2, 4)
- [ ] Historical data view (wykresy 10-min, hourly, daily)
- [ ] Statistics dashboard (daily/weekly/monthly)

**Backend:**
- [ ] Long-term aggregations (10-minute, hourly)
- [ ] Optimized queries (materialized views?)
- [ ] API pagination (history endpoint)

**Dokumentacja:**
- [ ] User manual (instrukcja użytkownika)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Architecture diagrams (C4 model?)

### 13.2. Faza 2: Events detection (Q2 2025)

**Backend:**
- [ ] Events detection logic (voltage dips, swells, interruptions)
- [ ] Events table (power_quality_events)
- [ ] Migration V4 (CREATE TABLE power_quality_events)
- [ ] Events REST API (GET /api/events, query by type/date)
- [ ] Circular buffer na ESP32 (snapshot surowych próbek przy zdarzeniu)

**Frontend:**
- [ ] Events timeline component
- [ ] Event details modal
- [ ] Histogram frequency chart
- [ ] Export events to CSV

**Algorytm detekcji:**
```java
// Backend service: PowerQualityEventDetector.java
@Scheduled(fixedDelay = 3000) // Co 3 sekundy (nowy pomiar)
public void detectEvents(Measurement m) {
    // Zapady napięcia (voltage dips)
    if (m.getVoltageRms() < 207.0) { // 90% Un
        createEvent(EventType.VOLTAGE_DIP, m, severity);
    }

    // Przepięcia (voltage swells)
    if (m.getVoltageRms() > 253.0) { // 110% Un
        createEvent(EventType.VOLTAGE_SWELL, m, severity);
    }

    // Przerwy (interruptions)
    if (m.getVoltageRms() < 23.0) { // 10% Un
        createEvent(EventType.INTERRUPTION, m, severity);
    }

    // High THD violation
    if (m.getThdVoltage() > 8.0) { // >8% limit
        createEvent(EventType.THD_VIOLATION, m, severity);
    }
}

// Event entity
@Entity
class PowerQualityEvent {
    Long id;
    Instant timestamp;
    EventType type; // DIP, SWELL, INTERRUPTION, THD_VIOLATION
    Double voltageRms;
    Integer durationMs;
    String severity; // LOW, MEDIUM, HIGH
    Double[] snapshotRaw; // Raw ADC samples (circular buffer from ESP32)
}
```

### 13.3. Faza 3: Real Hardware (Q3 2025)

**Hardware:**
- [ ] Zakup komponentów (SCT013, TV16, rezystory, kondensatory, obudowa)
- [ ] Montaż układu pomiarowego (według schematu elektroda.pl)
- [ ] Testy bezpieczeństwa (galvanic isolation, enclosure)

**ESP32 Firmware:**
- [ ] ADC reading (GPIO 34 napięcie, GPIO 35 prąd)
- [ ] RMS calculation (okno 10-20 cykli)
- [ ] Zero-crossing detection (częstotliwość)
- [ ] FFT/DFT implementation (biblioteka: arduinoFFT lub Kiss FFT)
- [ ] Harmonics extraction (H1-H8)
- [ ] Circular buffer (1000 próbek dla snapshot przy zdarzeniach)
- [ ] Calibration mode (EEPROM storage)

**Kalibracja:**
- [ ] Procedura kalibracji (reference meter vs ESP32)
- [ ] Calibration factors (offset, gain)
- [ ] Accuracy validation (±1-3% target)
- [ ] Documentation (calibration guide)

### 13.4. Faza 4: Advanced Features (Q4 2025+)

**Opcjonalnie (poza scope pracy):**
- [ ] Próbkowanie 5 kHz (harmoniczne do H40) przy wyłączonym WiFi
  - Zapisz dane do SD card, upload później przez WiFi
- [ ] Zewnętrzny ADC 16/24-bit (ADS1115, ADS1256)
  - Lepsza rozdzielczość i dokładność
- [ ] Pomiar trójfazowy (3x ESP32 + synchronizacja)
  - Asymetria napięć
  - Asymetria prądów
  - Reactive power direction
- [ ] Machine Learning anomaly detection
  - TensorFlow Lite on ESP32
  - Predykcja zużycia energii
  - Klasyfikacja odbiorników (load disaggregation)
- [ ] Mobile app (React Native)
  - Push notifications (alerts)
  - Remote monitoring
- [ ] Cloud integration (AWS IoT / Azure IoT Hub)
  - Remote access
  - Multi-site monitoring
- [ ] PN-EN 50160 compliance reports
  - Automated PDF generation
  - Monthly/yearly reports
  - Regulatory compliance

---

## 14. Bibliografia i referencje

### 14.1. Normy i standardy

**PN-EN 50160:**
- PN-EN 50160:2010 - Parametry napięcia zasilającego w publicznych sieciach elektroenergetycznych
- Grupy wskaźników: Napięcie, Częstotliwość, Flicker, Odkształcenia, Zdarzenia
- Limity: ±10% napięcia, ±1% częstotliwości, THD <8%

**IEC 61000 (Power Quality Series):**
- IEC 61000-4-7:2002 - Metody pomiaru harmonicznych i interharmonicznych
  - Wymagania: Harmoniczne H1-H40 (do 2000 Hz przy 50 Hz)
  - Okno pomiarowe: 10-12 cykli
  - Synchronizacja z PLL
- IEC 61000-4-15:2010 - Flickermeter (pomiar migotania)
  - Wymaga dedykowanego sprzętu (filtr percepcji wzrokowej)
  - Próbkowanie: 20 kHz
  - Pst (10 min), Plt (2h)
- IEC 61000-4-30:2015 - Metody pomiaru jakości energii
  - Klasy: A (najbardziej dokładna), S (survey), B (basic)
  - Agregacje: 10-cyklowe, 150/180-cyklowe (3s), 10-minutowe
- IEC 61000-3-2:2018 - Limity emisji harmonicznych prądu
  - Klasyfikacja urządzeń (A, B, C, D)
  - Limity harmonicznych dla odbiorników

### 14.2. Referencje techniczne

**Dokumenty projektu:**
- [CLAUDE.md](CLAUDE.md) - Główna dokumentacja projektu (angielski)
- [BACKEND-IMPLEMENTATION.md](BACKEND-IMPLEMENTATION.md) - Architektura backendu z uzasadnieniami
- [DEV-SETUP.md](DEV-SETUP.md) - Setup środowiska deweloperskiego
- [CI-CD-SETUP.md](CI-CD-SETUP.md) - Pipeline CI/CD i deployment
- [PRESENTATION-SETUP.md](PRESENTATION-SETUP.md) - Konfiguracja demo (laptop hotspot + RPI + ESP32)
- [ESP32-MEASUREMENT-SPECS.md](ESP32-MEASUREMENT-SPECS.md) - Specyfikacja możliwości pomiarowych ESP32
- [POWER-QUALITY-INDICATORS.md](POWER-QUALITY-INDICATORS.md) - Mapowanie wskaźników PN-EN 50160
- [ZMIANY-WSKAZNIKI-PN-EN-50160.md](ZMIANY-WSKAZNIKI-PN-EN-50160.md) - Changelog implementacji wskaźników
- [energy-monitor-plan.md](energy-monitor-plan.md) - Początkowy plan projektu (polski)
- [energy-monitor-structure.md](energy-monitor-structure.md) - Szczegółowa struktura backendu (polski)
- [energy-monitor-devops.md](energy-monitor-devops.md) - Plan DevOps i CI/CD (polski)
- [deployment/README.md](deployment/README.md) - Pliki deployment (nie commitowane)
- [esp32-mock-generator/README.md](esp32-mock-generator/README.md) - Mock generator documentation

**Code Repository:**
- GitHub: (private repository - link nie publiczny)
- Branch strategy: feature branches → PR → master → manual deployment

**Hardware Resources:**
- Elektroda.pl circuit: https://www.elektroda.pl/rtvforum/topic3929533.html
- ESP32 Datasheet: https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf
- SCT013 Datasheet: (split-core current transformer)
- TV16 Transformer: (voltage transformer 230V → 9V AC)

### 14.3. Stack technologiczny - linki

**Backend:**
- Spring Boot: https://spring.io/projects/spring-boot
- Spring Integration MQTT: https://docs.spring.io/spring-integration/reference/mqtt.html
- PostgreSQL: https://www.postgresql.org/
- Flyway: https://flywaydb.org/
- Eclipse Paho MQTT: https://www.eclipse.org/paho/

**Frontend:**
- React: https://react.dev/
- Vite: https://vitejs.dev/
- TanStack Query: https://tanstack.com/query/latest
- Recharts: https://recharts.org/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind CSS: https://tailwindcss.com/

**Infrastructure:**
- Docker: https://www.docker.com/
- Mosquitto MQTT: https://mosquitto.org/
- Raspberry Pi: https://www.raspberrypi.com/

**CI/CD:**
- GitHub Actions: https://docs.github.com/en/actions
- Tailscale VPN: https://tailscale.com/

**ESP32:**
- PlatformIO: https://platformio.org/
- Arduino Framework for ESP32: https://docs.espressif.com/projects/arduino-esp32/
- arduinoFFT: https://github.com/kosme/arduinoFFT
- ArduinoJson: https://arduinojson.org/

### 14.4. Prace naukowe i publikacje (inspiracje)

- Bollen, M. H., & Gu, I. Y. (2006). *Signal processing of power quality disturbances* (Vol. 30). John Wiley & Sons.
- Dugan, R. C., McGranaghan, M. F., Santoso, S., & Beaty, H. W. (2012). *Electrical power systems quality* (Vol. 3). New York: McGraw-Hill.
- IEEE Recommended Practice for Monitoring Electric Power Quality (IEEE Std 1159-2019)

---

## Podsumowanie

Ten dokument stanowi kompletną dokumentację projektu SCADA System, łącząc:
- Przegląd projektu i kontekst akademicki
- Szczegółową architekturę (backend, frontend, hardware, infrastruktura)
- Stack technologiczny z uzasadnieniami decyzji
- Możliwości pomiarowe i ograniczenia (PN-EN 50160)
- Implementację backendu (Spring Boot + PostgreSQL + MQTT)
- Implementację frontendu (React + Vite + WebSocket)
- Hardware i ESP32 (mock generator + real hardware plan)
- Środowisko deweloperskie i CI/CD
- Wskaźniki jakości energii (5 grup PN-EN 50160)
- Komendy i workflow
- Status implementacji i roadmap

**Dla szczegółów technicznych, patrz:**
- Backend: [BACKEND-IMPLEMENTATION.md](BACKEND-IMPLEMENTATION.md)
- DevOps: [CI-CD-SETUP.md](CI-CD-SETUP.md), [DEV-SETUP.md](DEV-SETUP.md)
- Hardware: [ESP32-MEASUREMENT-SPECS.md](ESP32-MEASUREMENT-SPECS.md)
- Wskaźniki: [POWER-QUALITY-INDICATORS.md](POWER-QUALITY-INDICATORS.md)

---

**Koniec dokumentacji**
**Wersja:** 2.0
**Data:** 2025-12-18
**Autor:** Dominik Kowalczyk
**Projekt:** Bachelor's Thesis - SCADA System for Power Quality Monitoring
