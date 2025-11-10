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

## Project Overview

This is a web-based SCADA system for monitoring electrical power quality in home installations, developed as a **bachelor's thesis for an engineer's degree**. The system consists of a Spring Boot backend and React frontend, designed to collect and analyze electrical parameters from ESP32 based circuit based on this circuit https://www.elektroda.pl/rtvforum/topic3929533.html, measurement nodes via MQTT.

**Academic Context:**
- Bachelor's thesis project for engineering degree
- Educational/demonstration SCADA system with 1000 PLN budget constraint
- Focus on learning objectives and practical implementation of SCADA concepts
- Hardware implementation includes 3 ESP32+PZEM-004T measurement nodes integrated in single enclosure
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
├── webapp/                       # React frontend (TypeScript + Vite + shadcn/ui)
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities
│   │   └── pages/               # Page components
│   ├── src/test/                # Vitest tests + setup
│   ├── package.json
│   ├── vitest.config.ts         # Vitest configuration
│   └── README.md
├── .github/workflows/
│   ├── ci.yml                   # Continuous Integration
│   └── cd.yml                   # Continuous Deployment (manual)
├── docker-compose.yml           # Local development (PostgreSQL + Mosquitto)
├── BACKEND-IMPLEMENTATION.md    # Detailed backend architecture guide
├── DEV-SETUP.md                 # Development environment setup
├── CI-CD-SETUP.md               # CI/CD pipeline documentation
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
- React 18 with TypeScript
- Vite build tool
- React Router for navigation
- shadcn/ui component library with Radix UI primitives
- TailwindCSS for styling
- TanStack Query for data fetching
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
1. ESP32+PZEM-004T nodes → MQTT (Mosquitto) → Spring Integration → PostgreSQL
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
- Power quality events (interruptions, voltage deviations, phase asymmetry)
- IEC 61000 compliance monitoring

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
- React 18.3+ with React Router
- TypeScript support
- Vite for development and building
- shadcn/ui component library
- TanStack Query for server state management
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

**See DEV-SETUP.md for complete setup instructions**

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

See CI-CD-SETUP.md for CI/CD pipeline details.

**Hardware Setup:**
- Raspberry Pi 4B WiFi 4GB RAM + 32GB microSD (existing equipment)
- 3x ESP32-WROOM-32 development boards with PZEM-004T modules
- Single project enclosure for integrated demonstration system
- Load simulation components: LED bulb, small motor, phone charger, electronic voltage regulator
- Educational laboratory safety standards (not industrial installation)

Target deployment is educational laboratory environment with budget constraint of 1000 PLN for additional hardware components.

## Database Migrations (Flyway)

All database schema changes are managed via Flyway migrations in `scada-system/src/main/resources/db/migration/`:

- `V1__Create_measurements_table.sql` - Main measurements table
- `V2__Create_daily_stats_table.sql` - Daily statistics aggregation

**Important:**
- Never modify existing migrations after they've been applied
- Create new migrations for schema changes
- Naming: `V{version}__{description}.sql` (double underscore)
- Migrations run automatically on application startup

## Implementation Status

**Completed (✅):**
- MQTT Integration (MqttConfig, MqttMessageHandler)
- Database layer (Measurement, DailyStats entities)
- Flyway migrations
- REST API (MeasurementController, StatsController, HealthController)
- WebSocket real-time broadcasting
- Basic service layer (MeasurementService, WebSocketService)
- Exception handling
- Utilities (Constants, DateTimeUtils, MathUtils)
- CI/CD pipeline (GitHub Actions)
- Testing framework (JUnit + Vitest)

**In Progress (⚠️):**
- StatsService calculations (stub implementation)
- DataAggregationService (scheduled job)
- Frontend dashboard components

**See BACKEND-IMPLEMENTATION.md for detailed implementation status and architecture explanations.**

## CI/CD Pipeline

**Continuous Integration (ci.yml):**
- Triggers on Pull Requests to master
- Backend tests (JUnit with H2 database)
- Frontend tests (Vitest + type checking + linting)
- Build validation

**Continuous Deployment (cd.yml):**
- Manual trigger only (workflow_dispatch)
- Pre-deployment tests
- Build artifacts (JAR + frontend dist)
- Deploy to Raspberry Pi via SSH
- Blue-green deployment with rollback capability
- Health checks and post-deployment verification

**See CI-CD-SETUP.md for complete pipeline documentation.**

## Important Design Decisions

1. **MQTT over HTTP POST:** ESP32 publishes to Mosquitto broker instead of direct HTTP POST for better reliability, buffering, and scalability

2. **Layered Architecture:** Controllers → Services → Repositories for separation of concerns and testability

3. **Flyway Migrations:** Version-controlled database schema evolution

4. **H2 for Testing:** Backend tests use H2 in-memory database instead of PostgreSQL for speed and CI/CD simplicity

5. **Vitest over Jest:** Frontend uses Vitest (optimized for Vite) for faster test execution

6. **IEC 61000 Standards:** Power quality monitoring follows international standards for voltage limits, THD thresholds, and harmonic analysis

## Presentation/Demo Setup

For presentations or demos without access to external WiFi:

**Architecture:** Laptop WiFi Hotspot → Raspberry Pi (backend) + ESP32 (sensors)

- Laptop creates WiFi hotspot ("SCADA-Demo")
- Raspberry Pi runs all backend services (PostgreSQL, Mosquitto, Spring Boot)
- ESP32 sends real measurements via MQTT over WiFi
- Laptop browser displays dashboard from RPI
- **No external WiFi/network needed!**

**See PRESENTATION-SETUP.md for complete step-by-step guide.**

Key features:
- Fully wireless setup
- Real measurements from PZEM-004T circuit
- Production-ready architecture (same as home deployment)
- Portable and demo-ready
- 15-minute setup time on-site

## Additional Documentation

- **BACKEND-IMPLEMENTATION.md** - Complete backend architecture guide with "WHY" explanations
- **DEV-SETUP.md** - Step-by-step local development environment setup
- **CI-CD-SETUP.md** - CI/CD pipeline configuration and troubleshooting
- **PRESENTATION-SETUP.md** - Wireless demo setup without external WiFi (laptop hotspot + RPI + ESP32)
- **Desktop/energy-monitor-plan.md** - Initial project planning (Polish)
- **Desktop/energy-monitor-structure.md** - Detailed Spring Boot structure (Polish)
- **Desktop/energy-monitor-devops.md** - DevOps implementation plan (Polish)