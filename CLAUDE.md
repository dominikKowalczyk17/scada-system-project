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

This is a web-based SCADA system for monitoring electrical power quality in home installations, developed as a **bachelor's thesis for an engineer's degree**. The system consists of a Spring Boot backend and React frontend, designed to collect and analyze electrical parameters from distributed ESP32+PZEM-004T measurement nodes via MQTT.

**Academic Context:**
- Bachelor's thesis project for engineering degree
- Educational/demonstration SCADA system with 1000 PLN budget constraint
- Focus on learning objectives and practical implementation of SCADA concepts
- Hardware implementation includes 3 ESP32+PZEM-004T measurement nodes integrated in single enclosure
- Load simulation capabilities for educational power quality demonstrations

## Development Commands

### Backend (Spring Boot)
```bash
cd scada-app/scada-system
./mvnw spring-boot:run    # Run development server
./mvnw test               # Run tests
./mvnw clean package      # Build JAR
```

### Frontend (React + Vite)
```bash
cd webapp
npm install               # Install dependencies
npm run dev               # Development server with hot reload
npm run build             # Production build
npm run lint              # ESLint linting
```

## Architecture

### Project Structure
```
scada-system-project/
├── scada-app/
│   └── scada-system/         # Spring Boot backend (Java 21)
│       ├── src/main/java/com/dkowalczyk/scadasystem/
│       ├── src/main/resources/
│       └── pom.xml
├── webapp/                   # React frontend (TypeScript + Vite + shadcn/ui)
│   ├── src/
│   ├── package.json
│   └── README.md
└── project-description.md    # Detailed project requirements
```

### Technology Stack

**Backend:**
- Spring Boot 3.5.6 with Java 21
- Spring Integration for MQTT/WebSocket communication
- Spring Data JPA with PostgreSQL
- WebSocket support for real-time data streaming

**Frontend:**
- React 18 with TypeScript
- Vite build tool
- React Router for navigation
- shadcn/ui component library with Radix UI primitives
- TailwindCSS for styling
- TanStack Query for data fetching
- Node.js 20.19.0+ or 22.12.0+ required

### Key Components

**Data Flow:**
1. ESP32+PZEM-004T nodes → MQTT → Spring Integration → PostgreSQL
2. Real-time data via WebSocket to React dashboard
3. Historical data analysis and IEC 61000 compliance reporting

**Electrical Parameters Monitored:**
- Voltage, Current, Active/Reactive Power, Power Factor, Frequency
- Harmonic analysis and THD (Total Harmonic Distortion)
- Power quality events (interruptions, voltage deviations, phase asymmetry)

## Key Dependencies

**Backend (pom.xml):**
- spring-boot-starter-integration (MQTT communication)
- spring-boot-starter-websocket (real-time updates)
- spring-boot-starter-data-jpa (database access)
- postgresql driver

**Frontend (package.json):**
- React 18.3+ with React Router
- TypeScript support
- Vite for development and building
- shadcn/ui component library
- TanStack Query for server state management
- TailwindCSS for styling
- ESLint for code quality

## Development Environment

**IDE Preferences:**
- **Backend Development**: IntelliJ IDEA Ultimate (NOT Eclipse) with Spring Boot plugin
- **Frontend Development**: Visual Studio Code with React/TypeScript plugins

The project is designed for local development with:
- Local MQTT broker (Eclipse Mosquitto via Docker)
- PostgreSQL/TimescaleDB database (Docker)
- Hot reload for both backend and frontend development

**Hardware Setup:**
- Raspberry Pi 4B WiFi 4GB RAM + 32GB microSD (existing equipment)
- 3x ESP32-WROOM-32 development boards with PZEM-004T modules
- Single project enclosure for integrated demonstration system
- Load simulation components: LED bulb, small motor, phone charger, electronic voltage regulator
- Educational laboratory safety standards (not industrial installation)

Target deployment is educational laboratory environment with budget constraint of 1000 PLN for additional hardware components.