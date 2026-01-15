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
