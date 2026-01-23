# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Instructions for AI Assistants

**ALWAYS ASK WHEN UNCERTAIN**: If you don't know something specific about the project setup, tools, preferences, or implementation details - ASK the user instead of making assumptions. This includes but is not limited to:
- IDE preferences
- Tool choices
- Implementation approaches
- Technology stack decisions
- Development workflows
- Testing frameworks
- Deployment preferences

**Examples of what to ask about:**
- "Which IDE do you prefer for backend development?"
- "What testing framework would you like to use?"
- "How do you prefer to handle database migrations?"
- "Which deployment approach do you want to use?"

**Code Style Preferences:**
- **NO EMOJIS IN CODE**: Do not use emojis (✅, ⚠️, 🔥, etc.) in source code files (.java, .ts, .cpp, etc.)
- Emojis are not acceptable in documentation (.md files) and user-facing messages
- Use plain text symbols for code comments and serial output (e.g., "[OK]", "[WARN]", "[ERROR]" instead of ✓, ⚠️, ✗)

## Project Overview

This is a web-based SCADA system for monitoring electrical power quality in home installations, developed as a **bachelor's thesis for an engineer's degree**. The system consists of a Spring Boot backend and React frontend, designed to collect and analyze electrical parameters from ESP32 based circuit (https://www.elektroda.pl/rtvforum/topic3929533.html) measurement nodes via MQTT.

**Academic Context:**
- Bachelor's thesis project for engineering degree
- Educational/demonstration SCADA system with 1000 PLN budget constraint
- Focus on learning objectives and practical implementation of SCADA concepts
- Hardware implementation includes ESP32 measurement node with custom circuit (SCT013 current sensor + TV16 voltage transformer) integrated in single enclosure
- Load simulation capabilities for educational power quality demonstrations

## Development Commands

### Backend (Spring Boot)
```bash
cd scada-system
./mvnw spring-boot:run    # Run development server
./mvnw test               # Run tests (uses H2 in-memory DB)
./mvnw clean package      # Build JAR
```

### Frontend (React + Vite)
```bash
cd webapp
npm install               # Install dependencies
npm run dev               # Development server with hot reload
npm run build             # Production build
npm run lint              # ESLint linting
npm run test              # Run Vitest tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
npm run type-check        # TypeScript type checking
```

### Infrastructure (Docker)
```bash
# Start local development environment
docker-compose up -d                    # PostgreSQL + Mosquitto MQTT broker

# Stop services
docker-compose stop

# Remove containers and volumes
docker-compose down -v
```

## Architecture

### Project Structure
```
scada-system-project/
├── scada-system/                 # Spring Boot backend (Java 17)
│   ├── src/main/java/com/dkowalczyk/scadasystem/
│   │   ├── config/              # MQTT, WebSocket, CORS, JPA config
│   │   ├── controller/          # REST API endpoints
│   │   ├── model/
│   │   │   ├── entity/          # JPA entities (Measurement, DailyStats)
│   │   │   └── dto/             # Data Transfer Objects
│   │   ├── repository/          # Spring Data JPA repositories
│   │   ├── service/             # Business logic + MQTT handler
│   │   ├── exception/           # Global exception handling
│   │   └── util/                # Constants, utilities
│   ├── src/main/resources/
│   │   ├── db/migration/        # Flyway database migrations
│   │   └── application.properties
│   ├── src/test/                # Tests (JUnit 5, uses H2 database)
│   └── pom.xml
├── webapp/                       # React frontend (TypeScript + Vite)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── views/              # Page components (Dashboard, History)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities
│   │   ├── types/              # TypeScript types
│   │   ├── ui/                 # shadcn/ui base components
│   │   └── test/               # Vitest tests
│   ├── package.json
│   └── README.md
├── .github/workflows/
│   ├── ci.yml                   # Continuous Integration
│   └── cd.yml                   # Continuous Deployment (manual)
├── docker-compose.yml           # Local development (PostgreSQL + Mosquitto)
├── PROJECT-DOCUMENTATION.md    # Comprehensive project documentation (for thesis)
└── CLAUDE.md                    # This file
```

### Technology Stack

**Backend:**
- Spring Boot 3.5.6 with Java 17
- Spring Integration for MQTT/WebSocket communication
- Spring Data JPA with PostgreSQL
- Flyway for database migrations
- WebSocket support for real-time data streaming
- H2 in-memory database for testing

**Frontend:**
- React 19.1 with TypeScript
- Vite build tool
- React Router for navigation
- shadcn/ui component library with Radix UI primitives
- TailwindCSS for styling
- TanStack Query for data fetching
- Recharts for data visualization
- Vitest for testing
- React Testing Library for component testing
- Node.js 20.19.0+ or 22.12.0+ required

**Infrastructure:**
- Docker + Docker Compose for local development
- PostgreSQL 15 for production database
- Mosquitto MQTT broker (Eclipse Paho)
- Raspberry Pi 4B for deployment target

**CI/CD:**
- GitHub Actions for automation
- Vitest for frontend testing
- JUnit 5 for backend testing
- ESLint for code quality

### Key Components

**Data Flow:**
1. ESP32 node (with SCT013 + TV16 sensors) → MQTT (Mosquitto) → Spring Integration → PostgreSQL
2. Real-time data via WebSocket to React dashboard
3. Historical data analysis and IEC 61000 compliance reporting

**MQTT Architecture:**
```
ESP32 (WiFi) → Mosquitto Broker (RPI:1883) → Spring Boot Backend
                                            ↓
                                       PostgreSQL
                                            ↓
                                       WebSocket → React Frontend
```

**Electrical Parameters Monitored:**
- Voltage, Current, Active/Reactive Power, Power Factor, Frequency
- Harmonic analysis (8 harmonics) and THD (Total Harmonic Distortion)
- Power quality indicators (voltage deviation, frequency deviation, THD)
- IEC 61000 compliance monitoring (partial - harmonics H1-H8 only)

## Key Dependencies

**Backend (pom.xml):**
- spring-boot-starter-integration (MQTT communication)
- spring-boot-starter-websocket (real-time updates)
- spring-boot-starter-data-jpa (database access)
- postgresql driver (production)
- h2 database (testing only)
- flyway-core (database migrations)
- lombok (reduce boilerplate)

**Frontend (package.json):**
- React 19.1+ with React Router
- TypeScript support
- Vite for development and building
- shadcn/ui component library (Radix UI primitives)
- **TanStack Query (React Query)** for server state management
- **Axios** for HTTP client
- **Recharts** for data visualization
- **Native WebSocket API** for real-time updates (no STOMP/SockJS needed)
- TailwindCSS for styling
- ESLint for code quality
- Vitest + React Testing Library (testing)

## Development Environment

**IDE Preferences:**
- **Backend Development**: IntelliJ IDEA Ultimate (NOT Eclipse) with Spring Boot plugin
- **Frontend Development**: Visual Studio Code with React/TypeScript plugins

**Required Software:**
- Java 17 (OpenJDK)
- Node.js 20.19.0+ or 22.12.0+
- Docker Desktop (for local PostgreSQL + Mosquitto)
- Maven 3.9+ (included via Maven wrapper)

### Local Development Setup

1. **Start infrastructure:**
   ```bash
   docker-compose up -d    # Starts PostgreSQL + Mosquitto
   ```

2. **Run backend:**
   ```bash
   cd scada-system
   ./mvnw spring-boot:run
   ```

3. **Run frontend:**
   ```bash
   cd webapp
   npm install
   npm run dev
   ```

**Database:**
- Local PostgreSQL via Docker on port 5432
- Database: `energy_monitor`
- User: `energyuser`
- Flyway migrations run automatically on startup
- See `scada-system/src/main/resources/db/migration/` for schema

**MQTT Broker:**
- Mosquitto running on port 1883 (MQTT) and 9001 (WebSocket)
- Topics: `scada/measurements/#`
- QoS: 1 (at least once delivery)

### Testing

**Backend Tests:**
- Use H2 in-memory database (PostgreSQL compatibility mode)
- MQTT autoconfiguration disabled during tests
- Run with: `./mvnw test`
- Profile: `@ActiveProfiles("test")`

**Frontend Tests:**
- Vitest with jsdom environment
- React Testing Library for component testing
- Run with: `npm test` or `npm run test:watch`
- Coverage: `npm run test:coverage`

**Hardware Setup:**
- Raspberry Pi 4B WiFi 4GB RAM + 32GB microSD (existing equipment)
- 1x ESP32-WROOM-32 development board with custom measurement circuit from elektroda.pl (SCT013 current sensor + TV16 voltage transformer)
- Single project enclosure for integrated demonstration system
- Load simulation components: LED bulb, small motor, phone charger, electronic voltage regulator
- Educational laboratory safety standards (not industrial installation)

Target deployment is educational laboratory environment with budget constraint of 1000 PLN for additional hardware components.

## Database Migrations (Flyway)

All database schema changes are managed via Flyway migrations in `scada-system/src/main/resources/db/migration/`:

- `V1__Create_measurements_table.sql` - Main measurements table
- `V2__Create_daily_stats_table.sql` - Daily statistics aggregation
- `V3__Remove_unmeasurable_fields_and_add_indicators.sql` - Removed unmeasurable fields, added PN-EN 50160 indicators
- `V4__Update_power_metrics_for_non_sinusoidal.py` - Migrated from cos_phi to correct non-sinusoidal parameters
- `V5__Replace_non_sinusoidal_power_metrics.sql` - Final migration with correct power metrics (power_reactive_fund, power_distortion, power_factor, phase_shift)

**Important:**
- Never modify existing migrations after they've been applied
- Create new migrations for schema changes
- Naming: `V{version}__{description}.sql` (double underscore)
- Migrations run automatically on application startup

## Implementation Status

**Backend - Completed (95%):**
- MQTT Integration (MqttConfig, MqttMessageHandler)
- Database layer (Measurement, DailyStats entities)
- Flyway migrations (V1-V5)
- REST API (MeasurementController, StatsController, HealthController, DashboardController)
- WebSocket real-time broadcasting (/ws/measurements → /topic/dashboard)
- Service layer (MeasurementService, WebSocketService, StatsService, WaveformService)
- DataAggregationService (scheduled daily job at 00:05)
- Exception handling & validation
- Utilities (Constants, DateTimeUtils, MathUtils)
- CI/CD pipeline (GitHub Actions)
- Testing framework (JUnit 5 + H2 in-memory tests, 17 test files)
- ESP32 Mock Data Generator (PlatformIO firmware)

**Frontend - Completed (75%):**
- ✅ Real-time Dashboard (Dashboard.tsx, 412 lines)
- ✅ Historical data view (History.tsx, 462 lines) with time range filters and CSV export
- ✅ 9 components for all visualizations (~2000 lines total)
  - StreamingChart (oscilloscope-like real-time charts, circular buffer 60 measurements)
  - WaveformChart (voltage/current sinusoid visualization)
  - HarmonicsChart (bar chart H1-H8)
  - PowerQualitySection (PN-EN 50160 compliance indicators)
  - ParameterCard, StatusIndicator, GridSection, AlertPanel, LiveChart
- ✅ 5 custom hooks (useDashboardData, useWebSocket, usePowerQualityIndicators, useHistoryData, useLatestMeasurement)
- ✅ React Router navigation
- ✅ TanStack Query (React Query) integration for server state
- ✅ Axios HTTP client with proper error handling
- ✅ Recharts data visualization library
- ✅ WebSocket real-time updates (native API, no STOMP)
- ✅ Responsive design with TailwindCSS
- ✅ Polish language UI
- ✅ Vitest testing framework (17 test files)
- ✅ Playwright E2E testing setup
- ❌ Statistics dashboard view (backend API exists at /api/stats/* but no UI)
- ❌ Settings/configuration page (no UI)

**Note:** Frontend is feature-complete for core monitoring functionality. Missing pages (Statistics, Settings) are not critical for thesis demonstration.

## CI/CD Pipeline

**Continuous Integration (ci.yml):**
- Triggers on Pull Requests to master
- Backend tests (JUnit with H2 database)
- Frontend tests (Vitest + type checking + linting)
- Build validation

**Continuous Deployment (cd.yml):**
- Manual trigger only (workflow_dispatch)
- Pre-deployment tests
- Automatic JAR versioning with `github.run_number` (e.g., `scada-system-0.0.152.jar`)
- Tailscale VPN for secure deployment without exposing SSH to internet
- Versioned deployments with rollback support (keeps last 5 JARs)
- Build artifacts (JAR + frontend dist)
- Deploy to Raspberry Pi via SSH over Tailscale
- Health checks and post-deployment verification

**See PROJECT-DOCUMENTATION.md for complete technical documentation for thesis.**

## Important Design Decisions

1. **MQTT over HTTP POST:** ESP32 publishes to Mosquitto broker instead of direct HTTP POST for better reliability, buffering, and scalability

2. **Layered Architecture:** Controllers → Services → Repositories for separation of concerns and testability

3. **Flyway Migrations:** Version-controlled database schema evolution

4. **H2 for Testing:** Backend tests use H2 in-memory database instead of PostgreSQL for speed and CI/CD simplicity

5. **Vitest over Jest:** Frontend uses Vitest (optimized for Vite) for faster test execution

6. **IEC 61000 Standards:** Power quality monitoring follows international standards for voltage limits, THD thresholds, and harmonic analysis (partial - harmonics H1-H8 only)

7. **Tailscale VPN for Deployment:** CD pipeline uses Tailscale for secure connectivity without port forwarding or exposing SSH to internet

8. **Automatic JAR Versioning:** Deployments use `github.run_number` for versioning (e.g., `0.0.152`) with symlink strategy for easy rollbacks

9. **Non-sinusoidal Power Calculations:** System correctly handles non-sinusoidal waveforms with proper metrics (power_reactive_fund, power_distortion, power_factor, phase_shift) instead of simplified cos φ

## Additional Documentation

- **PROJECT-DOCUMENTATION.md** - Complete technical documentation for thesis writing (all technical details in one place)
- **POWER-QUALITY-INDICATORS.md** - Detailed PN-EN 50160 power quality indicators mapping
- **ESP32-MEASUREMENT-SPECS.md** - ESP32 measurement capabilities and limitations
- **FUTURE-IMPROVEMENTS.md** - Planned enhancements (real waveform data support, etc.)
- **CI-CD-SETUP.md** - CI/CD pipeline configuration and troubleshooting
- **deployment/README.md** - Deployment-specific configurations

## Notes

- Always update documentation after completing tasks/issues
- Frontend uses React 19.1 (latest) with modern hooks and patterns
- Backend uses Spring Boot 3.5.6 (latest stable)
- All database migrations are version-controlled with Flyway
- System is designed for educational/demonstration purposes, not regulatory compliance
