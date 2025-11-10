# 🔌 Energy Monitor - Plan Implementacji
**Projekt:** Analizator parametrów sieci 230VAC
**Stack:** ESP32 (C++) + Spring Boot (Java) + React Native
**Hardware:** Raspberry Pi 4B 4GB + ESP32 + SCT013 + TV16
**Data:** 2025-01-30

---

## 📋 Spis Treści
1. [Architektura Systemu](#architektura-systemu)
2. [Opcja A: Prototyp Mock](#opcja-a-prototyp-mock)
3. [Opcja B: Schemat Układu](#opcja-b-schemat-układu)
4. [Harmonogram Realizacji](#harmonogram-realizacji)
5. [FAQ i Rozwiązywanie Problemów](#faq)

---

## 🏗️ Architektura Systemu

### 💡 Jak to działa w praktyce?

**Na Raspberry Pi działają 3 procesy równocześnie:**
1. **Mosquitto** (port 1883) - broker MQTT, "skrzynka pocztowa" dla wiadomości
2. **Spring Boot** (port 8080) -  Aplikacja Java, odbiera z Mosquitto i zapisuje do bazy
3. **PostgreSQL** (port 5432) - baza danych

**Przepływ danych krok po kroku:**
```
[ESP32] --WiFi--> [Mosquitto na RPI] --localhost--> [Spring Boot na RPI] --> [PostgreSQL na RPI]
                                                            │
                                                            └--> [WebSocket] --> Frontend
```

**Dlaczego przez Mosquitto zamiast bezpośrednio HTTP POST?**
- ✅ **Buforowanie**: Jeśli Spring Boot się zrestartuje, Mosquitto trzyma wiadomości w kolejce (nie tracisz danych)
- ✅ **Skalowalność**: Możesz mieć kilka ESP32 (node1, node2, node3...) - wszystkie publikują do tego samego brokera
- ✅ **Oszczędność energii**: ESP32 ma persistent connection (nie musi za każdym razem łączyć się HTTP)
- ✅ **Rozszerzalność**: Możesz dodać inne aplikacje które też czytają te dane (np. Home Assistant)

**WAŻNE: To wszystko działa na jednym RPI!** Mosquitto to tylko lekki proces w tle (~10MB RAM).

**Przykład uruchamiania:**
```bash
# Mosquitto (już działa w tle po instalacji)
sudo systemctl status mosquitto   # ✅ active (running)

# Spring Boot (uruchamiasz ręcznie lub przez systemd)
java -jar energy-monitor.jar       # Łączy się z localhost:1883

# Wszystko działa na tym samym RPI!
```

---

```
┌─────────────────────────────────────────────────────────────┐
│                    WARSTWA POMIAROWA                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ESP32 DEVKIT V1 (C++ / Arduino Framework)              │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ ADC Sampling (20 kHz / 50μs)                     │   │ │
│  │ │ - GPIO 34: Napięcie (TV16 → 0-3.3V)              │   │ │
│  │ │ - GPIO 35: Prąd (SCT013 → 0-3.3V)                │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Przetwarzanie                                    │   │ │
│  │ │ - FFT 512-punktowa (harmoniczne 1-9)             │   │ │
│  │ │ - RMS (napięcie, prąd)                           │   │ │
│  │ │ - Moc (czynna, pozorna, bierna)                  │   │ │
│  │ │ - cos φ (współczynnik mocy)                      │   │ │
│  │ │ - THD (Total Harmonic Distortion)                │   │ │
│  │ │ - Pst (migotanie)                                │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  │ ┌──────────────────────────────────────────────────┐   │ │
│  │ │ Komunikacja WiFi                                 │   │ │
│  │ │ - MQTT Publish co 5s → Mosquitto Broker          │   │ │
│  │ │ - Topic: scada/measurements/node1                │   │ │
│  │ │ - QoS: 1 (at least once delivery)                │   │ │
│  │ │ - JSON payload (~500 bytes)                      │   │ │
│  │ └──────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WiFi - MQTT publish co 5s
                           │ Topic: scada/measurements/node1
                           ▼
┌─────────────────────────────────────────────────────────────┐
│       RASPBERRY PI 4B (IP: 192.168.1.100 - statyczny)       │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PROCES 1] Mosquitto MQTT Broker       Port: 1883      │ │
│  │ ───────────────────────────────────────────────────    │ │
│  │ - Odbiera wiadomości MQTT z ESP32                      │ │
│  │ - Kolejkuje jeśli Spring Boot offline (buforowanie)    │ │
│  │ - Przekazuje do subskrybentów (Spring Boot)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           │ localhost (MQTT subscribe)      │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PROCES 2] Spring Boot 3.2 (Java 17)   Port: 8080      │ │
│  │ ───────────────────────────────────────────────────    │ │
│  │ • MQTT Client (MqttMessageHandler.java)                │ │
│  │   - Subscribe: scada/measurements/#                    │ │
│  │   - Parsuje JSON z ESP32                               │ │
│  │   - Auto-reconnect + QoS 1                             │ │
│  │                                                         │ │
│  │ • REST API (dla frontendu)                             │ │
│  │   GET /api/measurements/latest - Ostatni pomiar        │ │
│  │   GET /api/measurements/history - Historia             │ │
│  │   GET /api/stats/daily - Statystyki                    │ │
│  │                                                         │ │
│  │ • WebSocket (/ws/measurements)                         │ │
│  │   - Real-time broadcast do przeglądarki                │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                 │
│                           │ JDBC (localhost:5432)           │
│                           ▼                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [PROCES 3] PostgreSQL 15 + TimescaleDB Port: 5432      │ │
│  │ ───────────────────────────────────────────────────    │ │
│  │ - Tabela: measurements (hypertable)                    │ │
│  │ - Retencja: 1 rok (auto-delete starszych)              │ │
│  │ - Agregacje: 1min, 1h, 1day                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    WARSTWA FRONTEND                         │
│  ┌──────────────────────┐  ┌───────────────────────────┐    │
│  │  Web Dashboard       │  │  React Native App         │    │
│  │  (HTML/JS/Chart.js)  │  │  (Android/iOS)            │    │
│  │                      │  │                           │    │
│  │  - Wykresy real-time │  │  - Notyfikacje push       │    │
│  │  - Historia pomiarów │  │  - Statystyki             │    │
│  │  - Eksport CSV       │  │  - Alarmy                 │    │
│  └──────────────────────┘  └───────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Opcja A: Prototyp Mock (Bez Sprzętu)

### Cel
Uruchomić działający system **przed zakupem komponentów** SCT013/TV16, żeby przetestować:
- Komunikację ESP32 → MQTT Broker → Spring Boot
- Bazę danych
- Dashboard
- Wykresy real-time

### A1. ESP32 - Mock Firmware

**Plik:** `esp32-mock.ino` (Arduino IDE)

**Co robi:**
- Symuluje pomiary (losowe wartości ± zmienność)
- Generuje JSON z danymi
- Publikuje przez MQTT co 5s do Mosquitto Broker na RPI

**Kluczowe dane symulowane:**
```json
{
  "timestamp": 1738264800,
  "voltage_rms": 234.5,
  "current_rms": 10.23,
  "power_active": 2289,
  "power_apparent": 2401,
  "power_reactive": 450,
  "cos_phi": 0.95,
  "frequency": 50.02,
  "thd_voltage": 2.3,
  "thd_current": 15.7,
  "pst_flicker": 0.45,
  "capacitor_uf": 45.2,
  "harmonics_v": [100, 2.1, 1.3, 0.8, 1.2, 0.5, 0.9, 0.3, 0.6],
  "harmonics_i": [100, 15.2, 8.3, 4.1, 10.1, 5.2, 7.3, 3.1, 4.5]
}
```

**Zależności Arduino IDE:**
```cpp
// Biblioteki do zainstalowania (Tools → Manage Libraries):
- WiFi (wbudowana w ESP32)
- PubSubClient (by Nick O'Leary) - wersja 2.8+  // MQTT client
- ArduinoJson (by Benoit Blanchon) - wersja 7.x
```

**Konfiguracja:**
```cpp
const char* ssid = "TWOJA_SIEC_WIFI";
const char* password = "HASLO_WIFI";

// MQTT Broker (Mosquitto na RPI)
const char* mqttServer = "192.168.1.100";  // IP Twojego RPI
const int mqttPort = 1883;                 // Domyślny port MQTT
const char* mqttTopic = "scada/measurements/node1";  // Topic dla tego ESP32
```

**Wgrywanie:**
1. Arduino IDE → Tools → Board → ESP32 Dev Module
2. Port: wybierz odpowiedni (Linux: `/dev/ttyUSB0` lub `/dev/ttyACM0`)
3. Upload Speed: 115200
4. Flash → Upload

**Testowanie:**
- Serial Monitor (115200 baud)
- Powinno pokazywać:
  ```
  ✅ Połączono z WiFi!
  ✅ Połączono z MQTT Broker (192.168.1.100:1883)
  📊 POMIARY (mock):
     U: 234.5 V | I: 10.23 A | P: 2289 W
  ✅ Wysłano przez MQTT (topic: scada/measurements/node1)
  ```

**Testowanie MQTT (opcjonalne):**
```bash
# Na RPI: podsłuchuj wiadomości MQTT
mosquitto_sub -h localhost -t "scada/measurements/#" -v

# Powinieneś zobaczyć wiadomości z ESP32 w formacie JSON
```

---

### A2. Spring Boot Backend (Raspberry Pi)

**Struktura projektu:** (szczegóły w `energy-monitor-structure.md`)
```
backend/
├── pom.xml
├── src/main/java/com/dkowalczyk/scadasystem/
│   ├── ScadaSystemApplication.java
│   ├── controller/
│   │   ├── MeasurementController.java    # REST API (dla frontendu)
│   │   └── StatsController.java          # Statystyki
│   ├── model/
│   │   └── Measurement.java              # Encja JPA
│   ├── repository/
│   │   └── MeasurementRepository.java    # Spring Data JPA
│   ├── service/
│   │   ├── MeasurementService.java       # Logika biznesowa
│   │   ├── MqttMessageHandler.java       # Handler MQTT (od ESP32)
│   │   └── WebSocketService.java         # Broadcast WebSocket
│   └── config/
│       ├── MqttConfig.java               # Konfiguracja MQTT client
│       └── WebSocketConfig.java          # Konfiguracja WS
└── src/main/resources/
    └── application.properties             # Konfiguracja (DB + MQTT)
```

**Technologie:**
- **Spring Boot 3.2.1**
- **Spring Data JPA** (PostgreSQL)
- **Spring Integration MQTT** (Eclipse Paho) - **nowe!**
- **Spring WebSocket** (real-time)
- **Java 17**

**REST API Endpoints** (dla frontendu, NIE dla ESP32):

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/measurements/latest` | Zwraca ostatni pomiar |
| GET | `/api/measurements/history?from={timestamp}&to={timestamp}` | Historia pomiarów |
| GET | `/api/stats/daily` | Statystyki dzienne (min/avg/max) |
| GET | `/health` | Health check |

**WAŻNE:** ESP32 NIE używa HTTP POST! Dane przychodzą przez MQTT → MqttMessageHandler.

**WebSocket:**
- Endpoint: `ws://192.168.1.100:8080/ws/measurements`
- Każdy nowy pomiar jest broadcastowany do wszystkich klientów

**Instalacja na RPI:**
```bash
# 1. Zainstaluj Mosquitto MQTT Broker
sudo apt update
sudo apt install mosquitto mosquitto-clients -y

# Sprawdź czy działa
sudo systemctl status mosquitto
# Powinno pokazać: ✅ active (running)

# 2. Zainstaluj Java 17
sudo apt install openjdk-17-jdk -y
java -version

# 3. Zainstaluj PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib -y

# 4. Zainstaluj TimescaleDB
sudo apt install gnupg postgresql-common apt-transport-https lsb-release wget -y
echo "deb https://packagecloud.io/timescale/timescaledb/debian/ $(lsb_release -c -s) main" | sudo tee /etc/apt/sources.list.d/timescaledb.list
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | sudo apt-key add -
sudo apt update
sudo apt install timescaledb-2-postgresql-15 -y

# 5. Konfiguruj PostgreSQL
sudo -u postgres psql
```

**SQL - Setup Database:**
```sql
-- Utwórz bazę danych
CREATE DATABASE energy_monitor;

-- Utwórz użytkownika
CREATE USER energyuser WITH PASSWORD 'StrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE energy_monitor TO energyuser;

\c energy_monitor

-- Włącz TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Utwórz tabelę
CREATE TABLE measurements (
    id BIGSERIAL,
    time TIMESTAMPTZ NOT NULL,
    voltage_rms FLOAT,
    current_rms FLOAT,
    power_active FLOAT,
    power_apparent FLOAT,
    power_reactive FLOAT,
    cos_phi FLOAT,
    frequency FLOAT,
    thd_voltage FLOAT,
    thd_current FLOAT,
    pst_flicker FLOAT,
    capacitor_uf FLOAT,
    harmonics_v FLOAT[],
    harmonics_i FLOAT[],
    PRIMARY KEY (id, time)
);

-- Konwertuj na hypertable (TimescaleDB magic!)
SELECT create_hypertable('measurements', 'time');

-- Automatyczne usuwanie danych starszych niż 1 rok
SELECT add_retention_policy('measurements', INTERVAL '1 year');

-- Indeksy dla szybkich zapytań
CREATE INDEX ON measurements (time DESC);

\q
```

**application.properties:**
```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/energy_monitor
spring.datasource.username=energyuser
spring.datasource.password=StrongPassword123!
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false

# MQTT Configuration (Mosquitto)
mqtt.broker.url=tcp://localhost:1883
mqtt.client.id=scada-backend
mqtt.topics=scada/measurements/#
mqtt.username=
mqtt.password=

# Server
server.port=8080

# JSON
spring.jackson.serialization.write-dates-as-timestamps=false

# WebSocket
spring.websocket.allowed-origins=*
```

**Build i uruchomienie:**
```bash
# Na Raspberry Pi
cd /home/dominik/energy-monitor/backend

# Build (Maven Wrapper)
./mvnw clean package

# Uruchom
java -jar target/energy-monitor-0.0.1-SNAPSHOT.jar

# Lub jako systemd service (produkcja)
sudo nano /etc/systemd/system/energy-monitor.service
```

**Systemd Service:**
```ini
[Unit]
Description=Energy Monitor Backend
After=network.target postgresql.service

[Service]
Type=simple
User=dominik
WorkingDirectory=/home/dominik/energy-monitor/backend
ExecStart=/usr/bin/java -jar target/energy-monitor-0.0.1-SNAPSHOT.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable energy-monitor
sudo systemctl start energy-monitor
sudo systemctl status energy-monitor
```

---

### A3. Web Dashboard (Frontend)

**Plik:** `frontend/index.html`

**Stack:**
- Vanilla JavaScript (bez React dla prostoty prototypu)
- Chart.js (wykresy)
- Bootstrap 5 (UI)
- WebSocket API (real-time)

**Funkcje:**
- 📊 Real-time chart (napięcie, prąd, moc)
- 📈 Wykres harmonicznych (bar chart)
- 🔢 Karty z aktualnymi wartościami
- 📡 WebSocket connection status
- 📥 Eksport danych do CSV

**Uruchomienie:**
```bash
# Na RPI lub lokalnie
cd /home/dominik/energy-monitor/frontend
python3 -m http.server 8000

# Otwórz w przeglądarce:
# http://192.168.1.100:8000
```

**Kluczowe elementy:**
```javascript
// WebSocket connection
const ws = new WebSocket('ws://192.168.1.100:8080/ws/measurements');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateCharts(data);
  updateCards(data);
};

// Chart.js - Real-time line chart
const ctx = document.getElementById('powerChart').getContext('2d');
const powerChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Moc czynna (W)',
      data: [],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  },
  options: {
    scales: {
      x: { display: true },
      y: { beginAtZero: true }
    },
    animation: false  // Dla lepszej wydajności
  }
});
```

---

## 🔌 Opcja B: Schemat Układu (Real Hardware)

### B1. Schemat Połączeń ESP32 + SCT013 + TV16

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEMAT POŁĄCZEŃ                         │
└─────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║                   ESP32 DEVKIT V1                             ║
║  ┌──────────────────────────────────────────────────────┐     ║
║  │                    3.3V    GND                       │     ║
║  │  GPIO34 (ADC1_6) ──┬───     ──┬──                    │     ║
║  │  GPIO35 (ADC1_7) ──┼──┬      ─┼─┬──                  │     ║
║  │                    │  │       │ │                    │     ║
║  └────────────────────┼──┼───────┼─┼────────────────────┘     ║
║                       │  │       │ │                          ║
╚═══════════════════════╪══╪═══════╪═╪══════════════════════════╝
                        │  │       │ │
        ┌───────────────┘  │       │ └──────────────┐
        │                  │       │                │
        │  ┌───────────────┘       └──────────┐     │
        │  │                                  │     │
        ▼  ▼                                  ▼     ▼
┌─────────────────┐                   ┌──────────────────┐
│ UKŁAD NAPIĘCIA  │                   │  UKŁAD PRĄDU     │
│    (TV16)       │                   │   (SCT013)       │
└─────────────────┘                   └──────────────────┘


═══════════════════════════════════════════════════════════════
UKŁAD 1: POMIAR NAPIĘCIA (TV16 + Dzielnik + Bias)
═══════════════════════════════════════════════════════════════

         230V AC
  ┌────────┴────────┐
  │                 │
  │  Przekładnik    │  Transformator napięciowy TV16
  │     TV16        │  Stosunek: ~230V → ~9V AC
  │                 │
  └────────┬────────┘
           │ ~9V AC
           │
         ┌─┴─┐
         │   │ R1 = 10kΩ (dzielnik 1)
         └─┬─┘
           │
           ├──────────────────────► GPIO 34 (ADC)
           │                        (sygnał 0-3.3V)
         ┌─┴─┐
         │   │ R2 = 10kΩ (dzielnik 2)
         └─┬─┘
           │
          ─┴─ GND
           ─

Dodatkowe:
- Kondensator C1 = 10µF (równolegle do R2, filtr)
- Napięcie odniesienia (bias): 3.3V/2 = 1.65V
  - Można dodać dzielnik z 2x 10kΩ: 3.3V → 1.65V


═══════════════════════════════════════════════════════════════
UKŁAD 2: POMIAR PRĄDU (SCT013-000 100A/1V)
═══════════════════════════════════════════════════════════════

      Przewód FAZY 230V
          │
    ┌─────┴─────┐
    │  SCT013   │ Przekładnik prądowy (klips)
    │  100A/1V  │ Wyjście: 0-1V AC (przy 0-100A)
    └─────┬─────┘
          │ Jack 3.5mm (2 pin)
          │
      ┌───┴────┐
      │   +    │ (wyjście SCT013)
      └───┬────┘
          │
        ┌─┴─┐
        │   │ R_burden = 5kΩ (rezystor obciążający)
        └─┬─┘  **UWAGA:** Ten rezystor może być wbudowany w SCT013-000!
          │     Jeśli wersja "1V" - NIE DODAWAJ, jeśli "50mA" - DODAJ 18Ω
          │
          ├──────────────────────► GPIO 35 (ADC)
          │                        (sygnał 0-1V → skaluj do 0-3.3V)
        ┌─┴─┐
        │   │ R_div = 10kΩ (pull-down + bias)
        └─┬─┘
          │
         ─┴─ GND
          ─

Dodatkowe:
- Kondensator C2 = 10µF (równolegle, filtr)
- **WAŻNE:** SCT013-000 "1V" już ma wbudowany burden resistor!
  Sprawdź datasheet: jeśli wyjście to 1V, NIE dodawaj rezystora.


═══════════════════════════════════════════════════════════════
ZASILANIE ESP32
═══════════════════════════════════════════════════════════════

   230V AC ──┬──► Zasilacz 5V/1A (ładowarka USB)
             │
             └──► micro-USB ──► ESP32 (VIN → 5V reg → 3.3V)


═══════════════════════════════════════════════════════════════
BEZPIECZEŃSTWO - SEPARACJA GALWANICZNA
═══════════════════════════════════════════════════════════════

⚠️  UWAGA! Napięcie 230V jest ŚMIERTELNIE NIEBEZPIECZNE!

✅ TV16: Transformator - JEST separacja galwaniczna
✅ SCT013: Przekładnik prądowy - JEST separacja galwaniczna
✅ ESP32: Zasilany z osobnego zasilacza 5V - JEST separacja

❌ NIE DOTYKAJ części pod napięciem podczas pracy!
❌ NIE UŻYWAJ bez obudowy izolacyjnej!
✅ Testuj przy WYŁĄCZONYM zasilaniu 230V!
```

### B2. Lista Części - Allegro (Linki)

| # | Komponent | Specyfikacja | Ilość | Cena | Link Allegro (przykład) |
|---|-----------|--------------|-------|------|-------------------------|
| 1 | **Przekładnik prądowy** | SCT013-000 100A/1V (JACK 3.5mm) | 1 | ~30 zł | Szukaj: "SCT013-000 100A 1V" |
| 2 | **Przekładnik napięciowy** | TV16 230V transformator | 1 | ~40 zł | Szukaj: "przekładnik napięciowy TV16" |
| 3 | **Potencjometr precyzyjny** | 5kΩ wieloobrotowy (trimmer) | 2 | ~20 zł | Szukaj: "potencjometr 5k wieloobrotowy" |
| 4 | **Rezystory 1/4W** | 10kΩ ±1% | 5 | ~5 zł | Szukaj: "rezystor 10k 1/4W" |
| 5 | **Kondensatory elektrolityczne** | 10µF 25V | 3 | ~5 zł | Szukaj: "kondensator 10uF 25V" |
| 6 | **Płytka uniwersalna** | 5x7cm jednostronna | 1 | ~5 zł | Szukaj: "płytka uniwersalna 5x7" |
| 7 | **Goldpiny** | Męskie 2.54mm (do ESP32) | 2x20 | ~5 zł | Szukaj: "goldpin 2.54mm" |
| 8 | **Przewody** | Zestaw przewodów (0.5mm²) | 1m | ~10 zł | Szukaj: "przewody montażowe" |
| 9 | **Obudowa plastikowa** | Z-73 (130x80x40mm) lub podobna | 1 | ~15 zł | Szukaj: "obudowa plastikowa Z73" |
| 10 | **Zasilacz USB 5V** | 1A mini USB (jeśli nie masz) | 1 | ~10 zł | Opcjonalne |

**SUMA: ~145 zł**

**UWAGI DO ZAKUPU:**

⚠️ **KRYTYCZNE - SCT013:**
- **MUSISZ** kupić wersję "1V" (nie "50mA")!
- Oznaczenie: SCT013-000 lub SCT013-100 (100A/1V)
- Wyjście: JACK 3.5mm (2-pin)
- Przykład z Allegro: szukaj "sct013 100a 1v pomiar prądu"

⚠️ **TV16:**
- Alternatywa: ZMPT101B (gotowy moduł z Aliexpress ~15 zł, ale długa dostawa)
- TV16 jest lepszy (prawdziwy transformator)

💡 **Potencjometry:**
- Wieloobrotowe (10-turn) są DUŻO lepsze do kalibracji
- Jeśli nie znajdziesz 5kΩ, weź 10kΩ (zadziała)

---

### B3. Kod ESP32 - Real Hardware (ADC)

**Plik:** `esp32-real-hardware.ino`

**Kluczowe fragmenty:**

```cpp
// Piny ADC
#define PIN_VOLTAGE 34  // GPIO34 (ADC1_6) - Napięcie
#define PIN_CURRENT 35  // GPIO35 (ADC1_7) - Prąd

// Parametry ADC
#define ADC_RESOLUTION 4095.0  // 12-bit ADC
#define VREF 3.3               // Napięcie referencyjne

// Kalibracja (dostosuj potencjometrami!)
float VOLTAGE_CALIBRATION = 100.0;  // Współczynnik dla napięcia
float CURRENT_CALIBRATION = 30.0;   // Współczynnik dla prądu

// Sampling
#define SAMPLES 512            // Próbki dla FFT (musi być potęgą 2)
#define SAMPLE_RATE 20000      // 20 kHz (50μs)

void setup() {
  analogReadResolution(12);  // 12-bit ADC
  analogSetAttenuation(ADC_11db);  // 0-3.3V range
}

void loop() {
  // Bufory na próbki
  float voltageBuffer[SAMPLES];
  float currentBuffer[SAMPLES];

  // Sampling ADC (20 kHz)
  unsigned long startTime = micros();
  for (int i = 0; i < SAMPLES; i++) {
    voltageBuffer[i] = analogRead(PIN_VOLTAGE);
    currentBuffer[i] = analogRead(PIN_CURRENT);
    delayMicroseconds(50);  // 20 kHz = 50μs
  }

  // Oblicz RMS
  float voltageRMS = calculateRMS(voltageBuffer, SAMPLES);
  float currentRMS = calculateRMS(currentBuffer, SAMPLES);

  // FFT dla harmonicznych
  float harmonicsV[9];
  float harmonicsI[9];
  performFFT(voltageBuffer, harmonicsV);
  performFFT(currentBuffer, harmonicsI);

  // Wyślij do backendu
  sendToBackend(voltageRMS, currentRMS, harmonicsV, harmonicsI);
}

float calculateRMS(float* buffer, int size) {
  float sum = 0;
  for (int i = 0; i < size; i++) {
    float voltage = (buffer[i] / ADC_RESOLUTION) * VREF;
    sum += voltage * voltage;
  }
  return sqrt(sum / size);
}
```

**Biblioteki do FFT:**
- **arduinoFFT** by Enrique Condes (Arduino Library Manager)

---

## 📅 Harmonogram Realizacji

### Tydzień 1: Prototyp Mock (Opcja A)
- **Dzień 1-2:** ESP32 mock firmware
  - [ ] Zainstaluj Arduino IDE + biblioteki
  - [ ] Wgraj mock firmware
  - [ ] Test połączenia WiFi
  - [ ] Test generowania JSON

- **Dzień 3-4:** Raspberry Pi setup
  - [ ] Zainstaluj Java 17
  - [ ] Zainstaluj PostgreSQL + TimescaleDB
  - [ ] Stwórz bazę danych
  - [ ] Napisz Spring Boot backend
  - [ ] Test REST API (Postman/curl)

- **Dzień 5-6:** Frontend
  - [ ] Stwórz prosty dashboard (HTML)
  - [ ] Zaimplementuj Chart.js
  - [ ] Połącz WebSocket
  - [ ] Test real-time charts

- **Dzień 7:** Integracja
  - [ ] ESP32 → Spring Boot → Frontend
  - [ ] Debugowanie
  - [ ] Dokumentacja

### Tydzień 2: Real Hardware (Opcja B)
- **Dzień 8-9:** Zakup komponentów
  - [ ] Zamówienie na Allegro
  - [ ] Weryfikacja dostawy

- **Dzień 10-12:** Montaż
  - [ ] Lutowanie układu na płytce
  - [ ] Podłączenie ESP32
  - [ ] Pierwsze testy ADC (bez 230V!)

- **Dzień 13-14:** Kalibracja
  - [ ] Podłączenie do 230V (OSTROŻNIE!)
  - [ ] Regulacja potencjometrów
  - [ ] Porównanie z miernikiem wzorcowym

### Tydzień 3: Finalizacja
- **Dzień 15-16:** React Native App
  - [ ] Setup projektu React Native
  - [ ] Ekrany: Dashboard, Historia, Ustawienia
  - [ ] Połączenie z API
  - [ ] Test na telefonie

- **Dzień 17-18:** Testy
  - [ ] Testy obciążeniowe (czajniki, pralka)
  - [ ] Test długoterminowy (24h)
  - [ ] Optymalizacja

- **Dzień 19-20:** Obudowa + Dokumentacja
  - [ ] Montaż w obudowie
  - [ ] Dokumentacja użytkownika
  - [ ] Wideo demo

---

## 🔧 FAQ i Rozwiązywanie Problemów

### Q: ESP32 nie łączy się z WiFi
**A:**
- Sprawdź SSID i hasło w kodzie
- ESP32 działa tylko na 2.4 GHz (nie 5 GHz!)
- Spróbuj bliżej routera

### Q: Backend nie odbiera danych
**A:**
```bash
# Sprawdź czy Spring Boot działa
sudo systemctl status energy-monitor

# Sprawdź logi
journalctl -u energy-monitor -f

# Sprawdź firewall
sudo ufw allow 8080/tcp

# Test curl
curl -X POST http://192.168.1.100:8080/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"voltage_rms": 230}'
```

### Q: PostgreSQL nie startuje
**A:**
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql

# Sprawdź logi
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Q: SCT013 pokazuje 0A
**A:**
- Sprawdź kierunek założenia (ma strzałkę!)
- Upewnij się że przewód jest WEWNĄTRZ klipsa
- Sprawdź połączenia (jack 3.5mm)

### Q: Napięcie zawsze 0V
**A:**
- TV16: sprawdź polaryzację (AC, więc dowolna)
- Sprawdź dzielnik napięcia (rezystory 10kΩ)
- Użyj multimetru do testu TV16 (powinno być ~9V AC)

---

## 📚 Przydatne Linki

- **ESP32 Pinout:** https://randomnerdtutorials.com/esp32-pinout-reference-gpios/
- **ArduinoJSON:** https://arduinojson.org/
- **TimescaleDB Docs:** https://docs.timescale.com/
- **Spring Boot Docs:** https://spring.io/projects/spring-boot
- **Chart.js:** https://www.chartjs.org/

---

## 🎯 Następne Kroki

Po przeczytaniu tego planu:

1. **Zacznij od Opcji A (Prototyp Mock)**
   - To da Ci pewność że system działa
   - Nie ryzykujesz pieniędzy na komponenty

2. **Potrzebujesz kodu?**
   - Powiedz mi które części mam przygotować:
     - [ ] ESP32 mock firmware (.ino)
     - [ ] Spring Boot backend (pełny projekt Maven)
     - [ ] Web dashboard (HTML/JS)
     - [ ] ESP32 real hardware (.ino z ADC)

3. **Pytania?**
   - Napisz co jest niejasne
   - Mogę rozwinąć dowolny punkt

---

**Powodzenia!** 🚀
