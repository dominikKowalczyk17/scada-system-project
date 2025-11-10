# 📦 Struktura Projektu Spring Boot - Energy Monitor

**Główny pakiet:** `com.dkowalczyk.scadasystem`
**Framework:** Spring Boot 3.2.1
**Java:** 17
**Build:** Maven

---

## 🗂️ Pełna Struktura Pakietów

```
scada-energy-monitor/
├── pom.xml
├── README.md
├── .gitignore
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── dkowalczyk/
│   │   │           └── scadasystem/
│   │   │               │
│   │   │               ├── ScadaSystemApplication.java         # Main class
│   │   │               │
│   │   │               ├── config/                             # Konfiguracje
│   │   │               │   ├── MqttConfig.java                # MQTT Client
│   │   │               │   ├── WebSocketConfig.java           # WebSocket
│   │   │               │   ├── CorsConfig.java                # CORS
│   │   │               │   ├── JpaConfig.java                 # JPA/Hibernate
│   │   │               │   └── AsyncConfig.java               # Async tasks
│   │   │               │
│   │   │               ├── controller/                         # REST Controllers
│   │   │               │   ├── MeasurementController.java     # CRUD pomiarów
│   │   │               │   ├── StatsController.java           # Statystyki
│   │   │               │   ├── HealthController.java          # Health checks
│   │   │               │   └── WebSocketController.java       # WebSocket handler
│   │   │               │
│   │   │               ├── model/                              # Encje JPA
│   │   │               │   ├── entity/
│   │   │               │   │   ├── Measurement.java           # Główna encja
│   │   │               │   │   └── DailyStats.java            # Agregacje dzienne
│   │   │               │   └── dto/                           # Data Transfer Objects
│   │   │               │       ├── MeasurementDTO.java        # Request/Response
│   │   │               │       ├── MeasurementRequest.java    # Od ESP32
│   │   │               │       ├── StatsDTO.java              # Statystyki
│   │   │               │       └── HistoryRequest.java        # Parametry zapytań
│   │   │               │
│   │   │               ├── repository/                         # Spring Data JPA
│   │   │               │   ├── MeasurementRepository.java     # CRUD
│   │   │               │   └── DailyStatsRepository.java      # Statystyki
│   │   │               │
│   │   │               ├── service/                            # Logika biznesowa
│   │   │               │   ├── MeasurementService.java        # Główny serwis
│   │   │               │   ├── MqttMessageHandler.java        # Handler MQTT
│   │   │               │   ├── StatsService.java              # Wyliczenia statystyk
│   │   │               │   ├── WebSocketService.java          # Broadcasting WS
│   │   │               │   └── DataAggregationService.java    # Agregacje czasowe
│   │   │               │
│   │   │               ├── exception/                          # Obsługa błędów
│   │   │               │   ├── GlobalExceptionHandler.java    # @ControllerAdvice
│   │   │               │   ├── MeasurementNotFoundException.java
│   │   │               │   └── ValidationException.java
│   │   │               │
│   │   │               └── util/                               # Utility classes
│   │   │                   ├── DateTimeUtils.java             # Parsowanie dat
│   │   │                   ├── MathUtils.java                 # Obliczenia
│   │   │                   └── Constants.java                 # Stałe
│   │   │
│   │   └── resources/
│   │       ├── application.properties                          # Główna konfiguracja
│   │       ├── application-dev.properties                      # Profil DEV
│   │       ├── application-prod.properties                     # Profil PRODUCTION
│   │       ├── db/
│   │       │   └── migration/                                  # Flyway migrations
│   │       │       ├── V1__create_measurements_table.sql
│   │       │       ├── V2__create_daily_stats_table.sql
│   │       │       └── V3__add_indexes.sql
│   │       └── static/                                         # Pliki statyczne (dashboard)
│   │           ├── index.html                                  # Frontend
│   │           ├── css/
│   │           │   └── style.css
│   │           └── js/
│   │               ├── app.js
│   │               └── charts.js
│   │
│   └── test/
│       └── java/
│           └── com/
│               └── dkowalczyk/
│                   └── scadasystem/
│                       ├── ScadaSystemApplicationTests.java
│                       ├── controller/
│                       │   └── MeasurementControllerTest.java
│                       ├── service/
│                       │   └── MeasurementServiceTest.java
│                       └── repository/
│                           └── MeasurementRepositoryTest.java
│
└── target/                                                      # Build output (git ignore)
```

---

## 📄 Szczegółowy Opis Pakietów

### 1. **config/** - Konfiguracje Spring Boot

**Przeznaczenie:** Centralizacja konfiguracji aplikacji

**Pliki:**

#### `MqttConfig.java`
```java
package com.dkowalczyk.scadasystem.config;

import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.core.*;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
public class MqttConfig {

    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    @Value("${mqtt.client.id}")
    private String clientId;

    @Value("${mqtt.topics}")
    private String topics;

    @Value("${mqtt.username:}")
    private String username;

    @Value("${mqtt.password:}")
    private String password;

    /**
     * MQTT Connection Options
     */
    @Bean
    public MqttConnectOptions mqttConnectOptions() {
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setCleanSession(true);
        options.setAutomaticReconnect(true);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(60);

        // Opcjonalne uwierzytelnianie
        if (!username.isEmpty()) {
            options.setUserName(username);
            options.setPassword(password.toCharArray());
        }

        return options;
    }

    /**
     * MQTT Client Factory
     */
    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory() {
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        factory.setConnectionOptions(mqttConnectOptions());
        return factory;
    }

    /**
     * Message Channel dla przychodzących wiadomości MQTT
     */
    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    /**
     * MQTT Inbound Adapter - subskrybuje topic i odbiera wiadomości
     */
    @Bean
    public MessageProducer mqttInbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
            new MqttPahoMessageDrivenChannelAdapter(
                brokerUrl,
                clientId + "-inbound",
                mqttClientFactory(),
                topics.split(",")
            );

        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1); // QoS 1 - at least once delivery
        adapter.setOutputChannel(mqttInputChannel());

        return adapter;
    }
}
```

#### `WebSocketConfig.java`
```java
package com.dkowalczyk.scadasystem.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");      // Префікс для subskrypcji
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/measurements")
                .setAllowedOrigins("*")
                .withSockJS();
    }
}
```

#### `CorsConfig.java`
```java
package com.dkowalczyk.scadasystem.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("*");
    }
}
```

---

### 2. **controller/** - REST API Endpoints

**Przeznaczenie:** Obsługa żądań HTTP

#### `MeasurementController.java`
```java
package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/measurements")
@RequiredArgsConstructor
public class MeasurementController {

    private final MeasurementService measurementService;

    /**
     * Przyjmuje pomiar (REST API - opcjonalne, głównie dla testów)
     * ESP32 wysyła dane przez MQTT, nie przez HTTP POST
     * POST /api/measurements
     */
    @PostMapping
    public ResponseEntity<MeasurementDTO> createMeasurement(
            @RequestBody MeasurementRequest request) {
        MeasurementDTO saved = measurementService.saveMeasurement(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Pobiera ostatni pomiar
     * GET /api/measurements/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<MeasurementDTO> getLatest() {
        return measurementService.getLatestMeasurement()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Pobiera historię pomiarów
     * GET /api/measurements/history?from=timestamp&to=timestamp&limit=100
     */
    @GetMapping("/history")
    public ResponseEntity<List<MeasurementDTO>> getHistory(
            @RequestParam(required = false) Long from,
            @RequestParam(required = false) Long to,
            @RequestParam(defaultValue = "100") int limit) {

        Instant fromTime = from != null ? Instant.ofEpochSecond(from) : Instant.now().minusSeconds(3600);
        Instant toTime = to != null ? Instant.ofEpochSecond(to) : Instant.now();

        List<MeasurementDTO> history = measurementService.getHistory(fromTime, toTime, limit);
        return ResponseEntity.ok(history);
    }
}
```

#### `StatsController.java`
```java
package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import com.dkowalczyk.scadasystem.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    /**
     * Statystyki dzienne
     * GET /api/stats/daily
     */
    @GetMapping("/daily")
    public ResponseEntity<StatsDTO> getDailyStats() {
        StatsDTO stats = statsService.calculateDailyStats();
        return ResponseEntity.ok(stats);
    }
}
```

#### `HealthController.java`
```java
package com.dkowalczyk.scadasystem.controller;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/health")
public class HealthController {

    @GetMapping
    public Map<String, Object> health() {
        return Map.of(
            "status", "UP",
            "timestamp", Instant.now(),
            "service", "Energy Monitor Backend"
        );
    }
}
```

---

### 3. **model/** - Modele danych

#### **entity/** - Encje JPA (tabele PostgreSQL)

**`Measurement.java`**
```java
package com.dkowalczyk.scadasystem.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "measurements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Measurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant time;

    private Float voltageRms;
    private Float currentRms;
    private Float powerActive;
    private Float powerApparent;
    private Float powerReactive;
    private Float cosPhi;
    private Float frequency;
    private Float thdVoltage;
    private Float thdCurrent;
    private Float pstFlicker;
    private Float capacitorUf;

    @Column(columnDefinition = "real[]")
    private Float[] harmonicsV;

    @Column(columnDefinition = "real[]")
    private Float[] harmonicsI;

    @Column(updatable = false)
    private Instant createdAt = Instant.now();
}
```

#### **dto/** - Data Transfer Objects

**`MeasurementRequest.java`** (z ESP32)
```java
package com.dkowalczyk.scadasystem.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class MeasurementRequest {

    private Long timestamp;

    @JsonProperty("voltage_rms")
    private Float voltageRms;

    @JsonProperty("current_rms")
    private Float currentRms;

    @JsonProperty("power_active")
    private Float powerActive;

    @JsonProperty("power_apparent")
    private Float powerApparent;

    @JsonProperty("power_reactive")
    private Float powerReactive;

    @JsonProperty("cos_phi")
    private Float cosPhi;

    private Float frequency;

    @JsonProperty("thd_voltage")
    private Float thdVoltage;

    @JsonProperty("thd_current")
    private Float thdCurrent;

    @JsonProperty("pst_flicker")
    private Float pstFlicker;

    @JsonProperty("capacitor_uf")
    private Float capacitorUf;

    @JsonProperty("harmonics_v")
    private Float[] harmonicsV;

    @JsonProperty("harmonics_i")
    private Float[] harmonicsI;
}
```

**`MeasurementDTO.java`** (odpowiedź do frontendu)
```java
package com.dkowalczyk.scadasystem.model.dto;

import lombok.*;
import java.time.Instant;

@Data
@Builder
public class MeasurementDTO {
    private Long id;
    private Instant time;
    private Float voltageRms;
    private Float currentRms;
    private Float powerActive;
    private Float powerApparent;
    private Float powerReactive;
    private Float cosPhi;
    private Float frequency;
    private Float thdVoltage;
    private Float thdCurrent;
    private Float pstFlicker;
    private Float capacitorUf;
    private Float[] harmonicsV;
    private Float[] harmonicsI;
}
```

---

### 4. **repository/** - Spring Data JPA

**`MeasurementRepository.java`**
```java
package com.dkowalczyk.scadasystem.repository;

import com.dkowalczyk.scadasystem.model.entity.Measurement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface MeasurementRepository extends JpaRepository<Measurement, Long> {

    /**
     * Znajdź ostatni pomiar
     */
    Optional<Measurement> findTopByOrderByTimeDesc();

    /**
     * Historia pomiarów w zakresie czasowym
     */
    List<Measurement> findByTimeBetweenOrderByTimeDesc(
            Instant from,
            Instant to
    );

    /**
     * Statystyki dzienne (agregacje)
     */
    @Query("""
        SELECT
            MIN(m.voltageRms) as minVoltage,
            MAX(m.voltageRms) as maxVoltage,
            AVG(m.voltageRms) as avgVoltage,
            AVG(m.powerActive) as avgPower
        FROM Measurement m
        WHERE m.time > :since
    """)
    Object getDailyStats(Instant since);
}
```

---

### 5. **service/** - Logika biznesowa

**`MeasurementService.java`**
```java
package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.model.entity.Measurement;
import com.dkowalczyk.scadasystem.repository.MeasurementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeasurementService {

    private final MeasurementRepository repository;
    private final WebSocketService webSocketService;

    @Transactional
    public MeasurementDTO saveMeasurement(MeasurementRequest request) {
        // Konwersja DTO → Entity
        Measurement measurement = Measurement.builder()
                .time(Instant.ofEpochSecond(request.getTimestamp()))
                .voltageRms(request.getVoltageRms())
                .currentRms(request.getCurrentRms())
                .powerActive(request.getPowerActive())
                .powerApparent(request.getPowerApparent())
                .powerReactive(request.getPowerReactive())
                .cosPhi(request.getCosPhi())
                .frequency(request.getFrequency())
                .thdVoltage(request.getThdVoltage())
                .thdCurrent(request.getThdCurrent())
                .pstFlicker(request.getPstFlicker())
                .capacitorUf(request.getCapacitorUf())
                .harmonicsV(request.getHarmonicsV())
                .harmonicsI(request.getHarmonicsI())
                .build();

        // Zapis do bazy
        Measurement saved = repository.save(measurement);
        log.info("Saved measurement: id={}, voltage={}, current={}",
                saved.getId(), saved.getVoltageRms(), saved.getCurrentRms());

        // Konwersja Entity → DTO
        MeasurementDTO dto = toDTO(saved);

        // Broadcast przez WebSocket
        webSocketService.broadcastMeasurement(dto);

        return dto;
    }

    public Optional<MeasurementDTO> getLatestMeasurement() {
        return repository.findTopByOrderByTimeDesc()
                .map(this::toDTO);
    }

    public List<MeasurementDTO> getHistory(Instant from, Instant to, int limit) {
        return repository.findByTimeBetweenOrderByTimeDesc(from, to)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private MeasurementDTO toDTO(Measurement entity) {
        return MeasurementDTO.builder()
                .id(entity.getId())
                .time(entity.getTime())
                .voltageRms(entity.getVoltageRms())
                .currentRms(entity.getCurrentRms())
                .powerActive(entity.getPowerActive())
                .powerApparent(entity.getPowerApparent())
                .powerReactive(entity.getPowerReactive())
                .cosPhi(entity.getCosPhi())
                .frequency(entity.getFrequency())
                .thdVoltage(entity.getThdVoltage())
                .thdCurrent(entity.getThdCurrent())
                .pstFlicker(entity.getPstFlicker())
                .capacitorUf(entity.getCapacitorUf())
                .harmonicsV(entity.getHarmonicsV())
                .harmonicsI(entity.getHarmonicsI())
                .build();
    }
}
```

**`WebSocketService.java`**
```java
package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastMeasurement(MeasurementDTO measurement) {
        messagingTemplate.convertAndSend("/topic/measurements", measurement);
    }
}
```

**`MqttMessageHandler.java`**
```java
package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.messaging.Message;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MqttMessageHandler {

    private final MeasurementService measurementService;
    private final ObjectMapper objectMapper;

    /**
     * Obsługuje wiadomości MQTT z ESP32
     * @param message Wiadomość MQTT z kanału mqttInputChannel
     */
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public void handleMqttMessage(Message<?> message) {
        try {
            String payload = (String) message.getPayload();
            String topic = (String) message.getHeaders().get("mqtt_receivedTopic");

            log.info("Received MQTT message from topic: {}", topic);
            log.debug("Payload: {}", payload);

            // Parsowanie JSON z ESP32
            MeasurementRequest request = objectMapper.readValue(payload, MeasurementRequest.class);

            // Zapis pomiaru
            measurementService.saveMeasurement(request);

            log.info("Measurement processed successfully");

        } catch (Exception e) {
            log.error("Error processing MQTT message: {}", e.getMessage(), e);
        }
    }
}
```

---

### 6. **exception/** - Obsługa błędów

**`GlobalExceptionHandler.java`**
```java
package com.dkowalczyk.scadasystem.exception;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MeasurementNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            MeasurementNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of(
                    "error", "Not Found",
                    "message", ex.getMessage(),
                    "timestamp", Instant.now()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "Internal Server Error",
                    "message", ex.getMessage(),
                    "timestamp", Instant.now()
                ));
    }
}
```

---

## 📦 pom.xml - Zależności Maven

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.1</version>
    </parent>

    <groupId>com.dkowalczyk</groupId>
    <artifactId>scada-energy-monitor</artifactId>
    <version>1.0.0</version>
    <name>SCADA Energy Monitor</name>
    <description>Energy monitoring system with ESP32 and Spring Boot</description>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <!-- Spring Boot Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Spring Data JPA -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- PostgreSQL Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- WebSocket -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-websocket</artifactId>
        </dependency>

        <!-- MQTT Client (Eclipse Paho) -->
        <dependency>
            <groupId>org.springframework.integration</groupId>
            <artifactId>spring-integration-mqtt</artifactId>
        </dependency>
        <dependency>
            <groupId>org.eclipse.paho</groupId>
            <artifactId>org.eclipse.paho.client.mqttv3</artifactId>
            <version>1.2.5</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

---

## ⚙️ application.properties

```properties
# Application
spring.application.name=scada-energy-monitor
server.port=8080

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/energy_monitor
spring.datasource.username=energyuser
spring.datasource.password=StrongPassword123!
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# MQTT Configuration
mqtt.broker.url=tcp://192.168.1.100:1883
mqtt.client.id=scada-backend
mqtt.topics=scada/measurements/#
mqtt.username=
mqtt.password=

# JSON
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.property-naming-strategy=SNAKE_CASE

# Logging
logging.level.com.dkowalczyk.scadasystem=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.springframework.integration.mqtt=DEBUG
```

---

## 🎯 Podsumowanie

**Pakiety i ich odpowiedzialności:**

| Pakiet | Odpowiedzialność |
|--------|------------------|
| `config/` | Konfiguracja Spring (MQTT, WebSocket, CORS, JPA) |
| `controller/` | REST API endpoints |
| `model.entity/` | Encje JPA (tabele DB) |
| `model.dto/` | Data Transfer Objects |
| `repository/` | Dostęp do bazy danych |
| `service/` | Logika biznesowa + handler MQTT |
| `exception/` | Obsługa błędów |
| `util/` | Klasy pomocnicze |

---

## 📡 Architektura komunikacji MQTT

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ARCHITEKTURA MQTT                         │
└─────────────────────────────────────────────────────────────────────┘

   ESP32                  Mosquitto Broker          Spring Boot
   (WiFi)                 (RaspberryPi)             (Backend)
     │                          │                        │
     │   WiFi Connect           │                        │
     │─────────────────────────>│                        │
     │                          │                        │
     │   Publish:               │                        │
     │   Topic: scada/measurements/node1                 │
     │   QoS: 1                 │                        │
     │   Payload: JSON          │                        │
     │─────────────────────────>│                        │
     │                          │                        │
     │                          │   Subscribe:           │
     │                          │   scada/measurements/# │
     │                          │<───────────────────────│
     │                          │                        │
     │                          │   Forward Message      │
     │                          │───────────────────────>│
     │                          │                        │
     │                          │                    [MqttMessageHandler]
     │                          │                        │
     │                          │                    [Parse JSON]
     │                          │                        │
     │                          │                    [Save to PostgreSQL]
     │                          │                        │
     │                          │                    [Broadcast WebSocket]
     │                          │                        │
     │                          │                        ▼
     │                          │                   Frontend (React/Web)

Przykładowa wiadomość JSON z ESP32:
{
  "timestamp": 1704067200,
  "voltage_rms": 230.5,
  "current_rms": 2.15,
  "power_active": 495.0,
  "power_apparent": 495.5,
  "power_reactive": 25.3,
  "cos_phi": 0.998,
  "frequency": 50.02,
  "thd_voltage": 2.1,
  "thd_current": 5.3,
  "pst_flicker": 0.45,
  "capacitor_uf": 0.0,
  "harmonics_v": [230.5, 4.8, 2.3, 1.1, 0.8],
  "harmonics_i": [2.15, 0.11, 0.06, 0.03, 0.02]
}
```

**Kluczowe cechy MQTT:**
- ✅ **QoS 1**: Gwarancja dostarczenia (at least once)
- ✅ **Automatic Reconnect**: ESP32 automatycznie łączy się ponownie
- ✅ **Persistent Sessions**: Wiadomości czekają, jeśli backend offline
- ✅ **Low Power**: Mniejsze zużycie baterii niż HTTP
- ✅ **Topic Filtering**: Możliwość wielu ESP32 (node1, node2, etc.)

---

**Gotowe do implementacji!** 🚀

**Następne kroki:**
1. Zainstaluj Mosquitto na RaspberryPi: `sudo apt install mosquitto mosquitto-clients`
2. Utwórz projekt Maven z powyższą strukturą
3. Skonfiguruj PostgreSQL + TimescaleDB
4. Wgraj kod ESP32 z logika MQTT publish
5. Uruchom Spring Boot i testuj połączenie
