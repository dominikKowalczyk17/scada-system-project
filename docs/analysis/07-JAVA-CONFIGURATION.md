# Analiza Modułu: Java Configuration

**Katalog:** `scada-system/src/main/java/com/dkowalczyk/scadasystem/config/`
**Pliki:** 5
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Modułu

### 1.1 Lista Plików Konfiguracyjnych

| Plik | Linie | Status | Cel |
|------|-------|--------|-----|
| MqttConfig.java | 91 | ✅ Aktywny | Konfiguracja MQTT (Eclipse Paho, Spring Integration) |
| WebSocketConfig.java | 23 | ✅ Aktywny | STOMP over SockJS dla real-time dashboard |
| CorsConfig.java | 22 | ✅ Aktywny | CORS dla REST API i WebSocket |
| AsyncConfig.java | 5 | ⚠️ Pusty | Placeholder (nie używany) |
| JpaConfig.java | 5 | ⚠️ Pusty | Placeholder (konfiguracja w application.properties) |

### 1.2 Diagram Architektury

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SCADA System Backend                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌────────────────┐         ┌──────────────────┐                  │
│   │  MqttConfig    │────────▶│  mqttInbound()   │                  │
│   │  (Paho Client) │         │  QoS 1, Auto-    │                  │
│   │                │         │  Reconnect       │                  │
│   └────────┬───────┘         └────────┬─────────┘                  │
│            │                          │                             │
│            ▼                          ▼                             │
│   tcp://localhost:1883      mqttInputChannel                        │
│   (Mosquitto Broker)        (DirectChannel)                         │
│            │                          │                             │
│            │                          ▼                             │
│            │                 MqttMessageHandler                     │
│            │                 (@ServiceActivator)                    │
│            │                          │                             │
└────────────┼──────────────────────────┼─────────────────────────────┘
             │                          │
             │                          ▼
             │                 MeasurementService.save()
             │                          │
             │                          ▼
        ┌────┴────┐             WebSocketService
        │  ESP32  │                     │
        │ Devices │                     │
        └─────────┘                     ▼
                          ┌──────────────────────────┐
                          │   WebSocketConfig        │
                          │   /ws/measurements       │
                          │   STOMP + SockJS         │
                          └────────┬─────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Frontend (STOMP) │
                          │  /topic/dashboard │
                          └──────────────────┘

                ┌──────────────────────────┐
                │     CorsConfig           │
                │  /api/** → Allow All     │
                │  /ws/** → Allow All      │
                └──────────────────────────┘
```

---

## 2. MqttConfig.java - Analiza Szczegółowa

### 2.1 Konfiguracja Połączenia

```java
@Value("${mqtt.broker.url}")         // tcp://localhost:1883
private String brokerUrl;

@Value("${mqtt.client.id}")          // scada-backend
private String clientId;

@Value("${mqtt.topics}")             // scada/measurements/#
private String topics;

@Value("${mqtt.username:}")          // Optional (empty default)
private String username;

@Value("${mqtt.password:}")          // Optional (empty default)
private String password;
```

**application.properties:**
```properties
mqtt.broker.url=tcp://localhost:1883
mqtt.client.id=scada-backend
mqtt.topics=scada/measurements/#
mqtt.username=
mqtt.password=
```

### 2.2 MQTT Connection Options

```java
@Bean
public MqttConnectOptions mqttConnectOptions() {
    MqttConnectOptions options = new MqttConnectOptions();
    options.setServerURIs(new String[]{brokerUrl});
    options.setCleanSession(true);              // ⚠️ Nie zachowuje sesji
    options.setAutomaticReconnect(true);        // ✅ Auto-reconnect
    options.setConnectionTimeout(10);           // 10 sekund
    options.setKeepAliveInterval(60);           // 60 sekund ping

    if (!username.isEmpty()) {
        options.setUserName(username);
        options.setPassword(password.toCharArray());
    }

    return options;
}
```

#### Analiza Parametrów

| Parametr | Wartość | Ocena | Wpływ |
|----------|---------|-------|-------|
| `cleanSession` | `true` | ⚠️ | Przy reconnect tracone są wiadomości wysłane podczas offline |
| `automaticReconnect` | `true` | ✅ | Automatyczny reconnect po utracie połączenia |
| `connectionTimeout` | 10s | ✅ | Rozsądny timeout dla LAN |
| `keepAliveInterval` | 60s | ✅ | Standardowy ping dla wykrycia martwych połączeń |

**Problemy zidentyfikowane:**

1. **cleanSession=true + QoS 1 = Utrata danych**
   - Przy `cleanSession=true` broker nie przechowuje wiadomości dla offline clients
   - Jeśli backend się zrestartuje, wiadomości z ESP32 wysłane podczas restartu są tracone
   - **Rozwiązanie:** `cleanSession=false` + `QoS 1` dla durable subscription

2. **Brak MaxInflight limit**
   - Domyślnie Eclipse Paho: `maxInflight=10`
   - Przy intensywnym ruchu (ESP32 co 3s) może być bottleneck
   - **Rekomendacja:** `options.setMaxInflight(100);`

3. **Brak Will Message**
   - Przy nieprawidłowym wyłączeniu backendu broker nie wysyła "last will"
   - **Rekomendacja:** Dodać LWT topic dla monitorowania dostępności

### 2.3 MQTT Inbound Adapter

```java
@Bean
public MessageProducer mqttInbound() {
    MqttPahoMessageDrivenChannelAdapter adapter =
            new MqttPahoMessageDrivenChannelAdapter(
                    brokerUrl,
                    clientId + "-inbound",      // scada-backend-inbound
                    mqttClientFactory(),
                    topics.split(",")           // scada/measurements/#
            );

    adapter.setCompletionTimeout(5000);         // 5s timeout
    adapter.setConverter(new DefaultPahoMessageConverter());
    adapter.setQos(1);                          // QoS 1 - at least once
    adapter.setOutputChannel(mqttInputChannel());

    return adapter;
}
```

#### Analiza QoS

| QoS Level | Gwarancje | Overhead | Wybrana |
|-----------|-----------|----------|---------|
| QoS 0 | At most once | Niski | ❌ |
| QoS 1 | At least once | Średni | ✅ Tak |
| QoS 2 | Exactly once | Wysoki | ❌ |

**Ocena:** ✅ QoS 1 to dobry kompromis dla pomiarów SCADA
- ESP32 używa QoS 0, ale backend subscribe z QoS 1
- **Uwaga:** Efektywne QoS to min(publish_qos, subscribe_qos) = QoS 0

**Problem:** ESP32 publishuje z QoS 0, więc ustawienie QoS 1 po stronie backendu nie ma efektu!

#### Completion Timeout

```java
adapter.setCompletionTimeout(5000);  // 5 seconds
```

**Cel:** Timeout dla async MQTT operations
**Ocena:** ✅ Rozsądna wartość dla LAN (wifi ESP32 może mieć większe jittery)

### 2.4 Message Channel

```java
@Bean
public MessageChannel mqttInputChannel() {
    return new DirectChannel();
}
```

**DirectChannel:**
- Synchroniczna obsługa wiadomości
- Single-threaded execution (w obrębie jednego wywołania)
- **Konsekwencje:** Jeśli MqttMessageHandler jest wolny, może powstać bottleneck

**Alternatywy:**
- `ExecutorChannel` - async, thread pool
- `QueueChannel` - buffering + backpressure

**Rekomendacja:** Dla SCADA z interwałem 3s DirectChannel jest wystarczający

---

## 3. WebSocketConfig.java - Analiza Szczegółowa

### 3.1 Konfiguracja STOMP

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");           // In-memory broker
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/measurements")
                .setAllowedOriginPatterns("*")         // ⚠️ Security risk
                .withSockJS();                         // Fallback dla starszych przeglądarek
    }
}
```

### 3.2 Architektura STOMP

```
Client                    Backend
  │                         │
  ├──── HTTP Upgrade ───────▶ /ws/measurements
  │                         │
  │◀─── CONNECTED ──────────┤
  │                         │
  │                         │ MeasurementService
  │                         │ publishes to:
  │                         │ /topic/measurements
  │                         │ /topic/dashboard
  │◀─── MESSAGE ────────────┤
  │    (RealtimeDashboardDTO)
  │                         │
```

### 3.3 Topics

| Topic | Publisher | Subscriber | Payload | Częstotliwość |
|-------|-----------|------------|---------|---------------|
| `/topic/measurements` | WebSocketService | Frontend | MeasurementDTO | Co ~3s (gdy ESP32 wysyła) |
| `/topic/dashboard` | WebSocketService | Frontend | RealtimeDashboardDTO | Co ~3s |

### 3.4 SockJS Fallback

```java
.withSockJS();
```

**Cel:** Compatibility dla przeglądarek bez WebSocket support
**Mechanizmy fallback:**
1. WebSocket (native)
2. HTTP Streaming
3. HTTP Long Polling
4. XHR Polling

**Ocena:** ✅ Dobra praktyka dla production

### 3.5 Problemy Bezpieczeństwa

```java
.setAllowedOriginPatterns("*")  // ⚠️ KRYTYCZNY PROBLEM
```

**Ryzyko:**
- Każdy origin może się połączyć przez WebSocket
- Potencjalny wektor ataku CSRF
- Brak autentykacji/autoryzacji

**Rekomendacja:**
```java
.setAllowedOriginPatterns(
    "http://localhost:3000",     // Development
    "https://yourdomain.com"     // Production
)
```

Lub lepiej: użyć `@Value` z application.properties:
```java
@Value("${websocket.allowed-origins}")
private String[] allowedOrigins;

// ...
.setAllowedOriginPatterns(allowedOrigins)
```

### 3.6 Simple Broker vs External Broker

```java
config.enableSimpleBroker("/topic");  // In-memory
```

**Cechy Simple Broker:**
- ✅ Łatwa konfiguracja, zero dependencies
- ✅ Wystarczająca dla małej liczby klientów (<100)
- ❌ Brak persistence - przy restart tracone są subskrypcje
- ❌ Brak skalowalności (single instance only)
- ❌ Brak zaawansowanych features (routing, authentication)

**Alternatywa:** RabbitMQ/ActiveMQ STOMP Relay
```java
config.enableStompBrokerRelay("/topic")
      .setRelayHost("localhost")
      .setRelayPort(61613);
```

**Dla tego projektu:** Simple broker jest wystarczający (max 5-10 użytkowników)

---

## 4. CorsConfig.java - Analiza Szczegółowa

### 4.1 Konfiguracja CORS

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // REST API
        registry.addMapping("/api/**")
                .allowedOrigins("*")          // ⚠️ Security risk
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");

        // WebSocket (SockJS handshake)
        registry.addMapping("/ws/**")
                .allowedOrigins("*")          // ⚠️ Security risk
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}
```

### 4.2 Analiza Bezpieczeństwa

| Aspekt | Konfiguracja | Ryzyko | Priorytet |
|--------|--------------|--------|-----------|
| `allowedOrigins("*")` | Każdy origin dozwolony | 🔴 Wysokie | Krytyczne |
| `allowedMethods(*)` | GET, POST, PUT, DELETE | 🟡 Średnie | Średni |
| `allowedHeaders("*")` | Wszystkie headers | 🟢 Niskie | Niski |
| Brak `allowCredentials` | Domyślnie false | ✅ OK | - |
| Brak `maxAge` | Domyślnie 1800s | ✅ OK | - |

### 4.3 Problemy i Rekomendacje

**Problem 1: allowedOrigins("*") - KRYTYCZNY**

```java
// ❌ ŹLE (obecne):
.allowedOrigins("*")

// ✅ DOBRZE:
.allowedOrigins(
    "http://localhost:3000",      // Development (React dev server)
    "http://localhost:5173",      // Development (Vite)
    "https://scada.yourdomain.com"
)

// ✅ JESZCZE LEPIEJ (z properties):
@Value("${cors.allowed-origins}")
private String[] allowedOrigins;

.allowedOrigins(allowedOrigins)
```

**Problem 2: Brak rate limiting**

CORS sam w sobie nie chroni przed flood/DDoS. Rozważyć:
- Spring Security + rate limiting filter
- Nginx reverse proxy z `limit_req`

**Problem 3: Duplikacja konfiguracji CORS**

- `CorsConfig` dla REST API
- `WebSocketConfig.setAllowedOriginPatterns("*")` dla WS

**Rekomendacja:** Centralizować allowed origins w application.properties:
```properties
cors.allowed-origins=http://localhost:3000,https://scada.yourdomain.com
```

---

## 5. AsyncConfig.java i JpaConfig.java

### 5.1 Status

```java
// AsyncConfig.java
public class AsyncConfig {
}

// JpaConfig.java
public class JpaConfig {
}
```

**Status:** ⚠️ Puste placeholdery

### 5.2 Analiza

**AsyncConfig:**
- Nie implementuje `AsyncConfigurer`
- Nie jest oznaczony `@Configuration` ani `@EnableAsync`
- **Wniosek:** Dead code, można usunąć

**JpaConfig:**
- Konfiguracja JPA jest w `application.properties`:
  ```properties
  spring.jpa.hibernate.ddl-auto=validate
  spring.jpa.properties.hibernate.dialect=PostgreSQLDialect
  ```
- **Wniosek:** Dead code, można usunąć

### 5.3 Async w Projekcie

Sprawdzam użycie `@Async` w kodzie:

```bash
grep -r "@Async" scada-system/src/main/java
```

**Wynik:** Brak użycia `@Async` w projekcie

**Wniosek:**
- DataAggregationService używa `@Scheduled`, ale nie `@Async`
- WebSocketService.broadcast* to synchroniczne wywołania
- **Rekomendacja:** Jeśli nie planowane użycie @Async, usunąć AsyncConfig.java

---

## 6. Application.properties - Analiza Pełna

### 6.1 Database Configuration

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/energy_monitor
spring.datasource.username=energyuser
spring.datasource.password=StrongPassword123!
```

**Problemy bezpieczeństwa:**
- ⚠️ Hasło w plain text w application.properties
- **Rekomendacja:** Użyć Spring Cloud Config lub environment variables

```bash
# Better approach:
export DB_PASSWORD=StrongPassword123!
```

```properties
spring.datasource.password=${DB_PASSWORD}
```

### 6.2 Hibernate DDL Auto

```properties
spring.jpa.hibernate.ddl-auto=validate
```

**Ocena:** ✅ DOSKONAŁE - validate-only z Flyway

| Opcja | Zachowanie | Ocena dla Production |
|-------|------------|----------------------|
| `create` | Drop + create na starcie | ❌ Utrata danych |
| `create-drop` | Drop na shutdown | ❌ Utrata danych |
| `update` | Auto-migration | ❌ Nieprzewidywalne |
| `validate` | Tylko walidacja | ✅ Bezpieczne |
| `none` | Brak akcji | ✅ Bezpieczne |

**validate + Flyway = Best practice** ✅

### 6.3 Flyway Configuration

```properties
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration
spring.flyway.validate-on-migrate=true
```

**Ocena:** ✅ Wzorcowa konfiguracja

| Parametr | Wartość | Cel |
|----------|---------|-----|
| `enabled` | true | Flyway aktywny |
| `baseline-on-migrate` | true | Dla istniejących DB bez flyway_schema_history |
| `validate-on-migrate` | true | Wykrywa ręczne zmiany w DB |

### 6.4 Jackson JSON

```properties
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.property-naming-strategy=SNAKE_CASE
```

**Analiza:**
- `write-dates-as-timestamps=false` → ISO-8601 string ("2026-01-23T12:34:56Z")
- `SNAKE_CASE` → `powerFactor` Java → `power_factor` JSON

**Ocena:** ✅ Zgodne z analizą DTO (wszystkie DTOs używają snake_case)

### 6.5 Logging

```properties
logging.level.com.dkowalczyk.scadasystem=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.springframework.integration.mqtt=DEBUG
```

**Ocena:** ⚠️ DEBUG w production to performance hit

**Rekomendacja:**
- Development: DEBUG
- Production: INFO lub WARN

```properties
# Use profiles:
# application-dev.properties:
logging.level.com.dkowalczyk.scadasystem=DEBUG

# application-prod.properties:
logging.level.com.dkowalczyk.scadasystem=INFO
```

---

## 7. Problemy i Rekomendacje

### 7.1 Krytyczne

| # | Problem | Moduł | Wpływ | Priorytet |
|---|---------|-------|-------|-----------|
| 1 | `allowedOrigins("*")` w CORS | CorsConfig | CSRF vulnerability | 🔴 Krytyczny |
| 2 | `allowedOriginPatterns("*")` w WebSocket | WebSocketConfig | Unauthorized access | 🔴 Krytyczny |
| 3 | `cleanSession=true` + QoS mismatch | MqttConfig | Utrata danych podczas restart | 🔴 Krytyczny |
| 4 | Hasło DB w plain text | application.properties | Credentials leak | 🔴 Krytyczny |

### 7.2 Wysokie

| # | Problem | Moduł | Wpływ | Priorytet |
|---|---------|-------|-------|-----------|
| 5 | ESP32 QoS 0 vs Backend QoS 1 | MqttConfig + ESP32 | Efektywne QoS 0 (brak gwarancji) | 🟠 Wysoki |
| 6 | Brak Will Message (LWT) | MqttConfig | Brak monitorowania dostępności | 🟠 Wysoki |
| 7 | DEBUG logging w default profile | application.properties | Performance | 🟠 Wysoki |

### 7.3 Średnie

| # | Problem | Moduł | Wpływ | Priorytet |
|---|---------|-------|-------|-----------|
| 8 | AsyncConfig.java pusty plik | AsyncConfig | Dead code | 🟡 Średni |
| 9 | JpaConfig.java pusty plik | JpaConfig | Dead code | 🟡 Średni |
| 10 | Brak maxInflight limit | MqttConfig | Potencjalny bottleneck | 🟡 Średni |

### 7.4 Niskie

| # | Problem | Moduł | Wpływ | Priorytet |
|---|---------|-------|-------|-----------|
| 11 | Brak CORS maxAge | CorsConfig | Dodatkowe preflight requests | 🟢 Niski |
| 12 | Simple broker zamiast relay | WebSocketConfig | Brak skalowalności | 🟢 Niski (OK dla małego systemu) |

---

## 8. Zgodność z Best Practices

### 8.1 Spring Boot Configuration

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| Externalized configuration | application.properties | ✅ |
| Profile-specific properties | Nie używane | ⚠️ |
| Environment variables dla secrets | Nie | ❌ |
| @ConfigurationProperties zamiast @Value | Nie | ⚠️ |

### 8.2 MQTT Best Practices

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| Automatic reconnect | ✅ Enabled | ✅ |
| QoS odpowiednie dla use case | QoS 1 (ale ESP32 = QoS 0) | ⚠️ |
| Clean session dla durable sub | false | ❌ (jest true) |
| Last Will Testament | Brak | ❌ |
| Keep-alive tuning | 60s | ✅ |

### 8.3 WebSocket Best Practices

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| SockJS fallback | ✅ Enabled | ✅ |
| Origin validation | ❌ Allow all | ❌ |
| Message size limits | Default | ⚠️ |
| Heartbeat configuration | Default | ✅ |

---

## 9. Security Checklist

### 9.1 OWASP Top 10

| Ryzyko | Status | Obecny Stan | Rekomendacja |
|--------|--------|-------------|--------------|
| A01:2021 Broken Access Control | ❌ FAIL | CORS allow all | Whitelistować origins |
| A02:2021 Cryptographic Failures | ❌ FAIL | DB password w plain text | Env variables |
| A03:2021 Injection | ✅ OK | Parametryzowane queries JPA | - |
| A05:2021 Security Misconfiguration | ❌ FAIL | DEBUG logging, allow all CORS | Fix |
| A07:2021 Auth Failures | ⚠️ PARTIAL | Brak auth dla WebSocket | Rozważyć Spring Security |

### 9.2 Priorytetowe Akcje Bezpieczeństwa

1. **Natychmiast:**
   - Zmienić `allowedOrigins("*")` na whitelistę
   - Przenieść DB password do env variables

2. **W ciągu tygodnia:**
   - Zmienić `cleanSession=true` → `false` w MQTT
   - Dodać profile-specific logging (prod = INFO)

3. **W ciągu miesiąca:**
   - Rozważyć Spring Security dla WebSocket auth
   - Dodać MQTT LWT dla monitorowania

---

## 10. Metryki i Ocena

### 10.1 Kod Quality

| Metryka | Wartość | Ocena |
|---------|---------|-------|
| Aktywne pliki | 3/5 (60%) | ⚠️ |
| Dead code | 2 pliki | ❌ |
| Komentarze | ~15% | ⚠️ Mało |
| Complexity | Niska | ✅ |

### 10.2 Security Score

| Kategoria | Score | Uwagi |
|-----------|-------|-------|
| CORS | 3/10 | Allow all origins |
| WebSocket | 4/10 | Allow all + brak auth |
| MQTT | 6/10 | QoS OK, ale cleanSession=true |
| Database | 5/10 | Password w plain text |
| **Overall** | **4.5/10** | ⚠️ Wymaga poprawy |

---

## 11. Podsumowanie

**Ocena ogólna: 6/10**

### 11.1 Mocne Strony

✅ **Flyway + Hibernate validate** - wzorcowa konfiguracja DB migrations
✅ **MQTT auto-reconnect** - odporność na chwilowe problemy sieciowe
✅ **SockJS fallback** - compatibility dla starszych przeglądarek
✅ **Jackson snake_case** - spójność z frontend TypeScript
✅ **Spring Integration MQTT** - czysta integracja z ecosystem

### 11.2 Słabe Strony

❌ **Security gaps** - CORS allow all, brak autentykacji
❌ **Dead code** - 40% plików to puste placeholdery
❌ **QoS mismatch** - Backend QoS 1 nie działa gdy ESP32 = QoS 0
❌ **Clean session** - Utrata wiadomości podczas restart
❌ **Hardcoded secrets** - DB password w application.properties

### 11.3 Priorytetowe Akcje

| Priorytet | Akcja | Effort | Impact |
|-----------|-------|--------|--------|
| 🔴 Krytyczny | Fix CORS allowed origins | 10 min | Wysoki |
| 🔴 Krytyczny | DB password → env var | 5 min | Wysoki |
| 🟠 Wysoki | MQTT cleanSession=false | 5 min | Średni |
| 🟠 Wysoki | ESP32 QoS 0→1 | 15 min | Średni |
| 🟡 Średni | Usunąć AsyncConfig, JpaConfig | 2 min | Niski |
| 🟢 Niski | Dodać profile-specific logging | 20 min | Niski |

### 11.4 Wnioski Architektoniczne

1. **Konfiguracja jest minimalistyczna** - dobrze dla małego systemu
2. **Brak Spring Security** - akceptowalne dla wewnętrznego SCADA, ale ryzyko dla publicznego
3. **Simple broker wystarczający** - dla max 10 użytkowników OK
4. **QoS 0 na ESP32** - należy zmienić na QoS 1 dla gwarancji dostawy pomiarów

---

**Następny moduł:** Java Controllers (#3)
