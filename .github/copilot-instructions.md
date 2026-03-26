# Copilot Instructions

## Project Overview

Web-based SCADA system for monitoring electrical power quality (bachelor's thesis project). Collects data from ESP32 measurement nodes (SCT013 current sensor + TV16 voltage transformer) via MQTT, stores it in PostgreSQL, and streams it to a React dashboard via WebSocket.

**Modules:**
- `scada-system/` — Spring Boot 3.5.6 backend (Java 17)
- `webapp/` — React 19 + TypeScript frontend (Vite)
- `esp32-firmware/` / `esp32-simulator/` — ESP32 firmware (PlatformIO)
- `docker-compose.yml` — Local dev infrastructure (PostgreSQL + Mosquitto MQTT)

## Build, Test & Run Commands

### Backend (`cd scada-system`)
```bash
./mvnw spring-boot:run          # Run dev server (requires Docker infra running)
./mvnw test                     # Run all tests (H2 in-memory, no infra needed)
./mvnw clean package            # Build JAR

# Run a single test class
./mvnw test -Dtest=MeasurementServiceTest

# Run a single test method
./mvnw test -Dtest=MeasurementServiceTest#shouldSaveMeasurement
```

### Frontend (`cd webapp`)
```bash
npm run dev             # Dev server with hot reload
npm run build           # Production build
npm run lint            # ESLint
npm run type-check      # TypeScript check
npm run test            # Vitest
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Infrastructure
```bash
docker-compose up -d    # Start PostgreSQL (port 5432) + Mosquitto (ports 1883, 9001)
docker-compose down -v  # Stop and remove volumes
```

## Architecture

### Data Flow
```
ESP32 (WiFi) → Mosquitto MQTT (tcp://localhost:1883)
                     ↓
        Spring Integration (MqttConfig)
                     ↓
        MqttMessageHandler → MeasurementService
                     ↓
               PostgreSQL
                     ↓
        WebSocketService → /topic/dashboard
                     ↓
           React Dashboard (native WebSocket)
```

### Backend Package Structure (`com.dkowalczyk.scadasystem`)
| Package | Responsibility |
|---------|---------------|
| `config/` | MQTT, WebSocket, CORS, JPA, Async configuration |
| `controller/` | REST endpoints (`/api/measurements`, `/api/stats`, `/api/dashboard`, `/api/health`) |
| `model/entity/` | JPA entities: `Measurement`, `DailyStats` |
| `model/dto/` | Request/response DTOs (separate from entities) |
| `model/event/` | Spring application events (`MeasurementSavedEvent`) |
| `repository/` | Spring Data JPA repositories |
| `service/` | Business logic, MQTT handler, WebSocket broadcaster, stats aggregation |
| `exception/` | `GlobalExceptionHandler` + custom exceptions |
| `util/` | `Constants` (PN-EN 50160 thresholds), `MathUtils`, `DateTimeUtils` |

### Key Configuration
- **MQTT topics:** `scada/measurements/#` (QoS 1)
- **WebSocket endpoint:** `/ws` → STOMP destination `/topic/dashboard`
- **Database:** `energy_monitor` DB, user `energyuser`, Flyway migrations auto-run on startup
- **Jackson:** `SNAKE_CASE` property naming strategy, ISO 8601 dates (not timestamps)
- **Active profile:** `dev` by default; `test` in CI/tests (disables MQTT, uses H2)

## Key Conventions

### No Emojis in Code
Never use emojis (✅, ⚠️, 🔥, etc.) in any source file (`.java`, `.ts`, `.tsx`, `.cpp`). Use plain text: `[OK]`, `[WARN]`, `[ERROR]`.

### Test Structure — Four Base Classes
All tests extend one of four base classes:

| Base class | Use for | Context loaded |
|------------|---------|---------------|
| `BaseServiceTest` | Service unit tests | None — plain Mockito (`@Mock`, `@InjectMocks`) |
| `BaseControllerTest` | Controller tests | Web layer only (`@WebMvcTest`) with all services auto-mocked |
| `BaseRepositoryTest` | Repository tests | JPA slice (`@DataJpaTest`) with H2 |
| `BaseIntegrationTest` | End-to-end tests | Full Spring context with H2 |

All test classes use `@ActiveProfiles("test")`. The `test` profile disables MQTT autoconfiguration and switches to H2.

### Entity Conventions
- Entities use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
- Arrays (harmonics, waveforms) stored with `@JdbcTypeCode(SqlTypes.ARRAY)`
- Timestamps use `Instant` (not `LocalDateTime`)
- `@CreationTimestamp` for audit fields; no `@UpdateTimestamp` needed

### DTO Conventions
- Request DTOs end in `Request` (e.g., `MeasurementRequest`, `HistoryRequest`)
- Response DTOs end in `DTO` (e.g., `MeasurementDTO`, `StatsDTO`)
- DTOs are plain records or Lombok `@Data` classes — no JPA annotations

### Exception Handling
- `GlobalExceptionHandler` (`@RestControllerAdvice`) handles all exceptions
- Error responses always include: `error`, `message`, `timestamp`; optionally `errorId` (UUID for 500s)
- Business exceptions extend domain-specific classes (`MeasurementNotFoundException`)
- Throw `IllegalArgumentException` for bad input validation at the service layer

### Database Migrations (Flyway)
- Migrations live in `src/main/resources/db/migration/`
- Naming: `V{n}__{Description}.sql` (double underscore)
- **Never modify existing migrations** — always add a new version
- Current schema: V1–V5, V7 (note: V6 was skipped)
- `spring.jpa.hibernate.ddl-auto=validate` — Hibernate only validates, never modifies schema

### Electrical Domain Constants
All PN-EN 50160 / IEC thresholds are in `util/Constants.java` — never hardcode values like `230.0` (nominal voltage), `50.0` (nominal frequency), or `8.0` (THD limit). The system monitors harmonics H1–H25 (partial, hardware-limited by Nyquist at ~1500 Hz).

### Frontend Conventions
- HTTP client: Axios (not fetch)
- Server state: TanStack Query (React Query)
- Real-time: native WebSocket API — no STOMP/SockJS
- Component library: shadcn/ui (Radix UI + TailwindCSS) — base components in `src/ui/`
- Page components in `src/views/`, reusable components in `src/components/`, hooks in `src/hooks/`
- UI language: Polish

### IDE
- Backend: IntelliJ IDEA Ultimate (not Eclipse)
- Frontend: Visual Studio Code
