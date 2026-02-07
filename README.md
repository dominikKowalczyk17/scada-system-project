# SCADA Energy Monitor System

Professional SCADA system for electrical energy monitoring with real-time data visualization and power quality analysis.

## 🏗️ Project Structure

```
├── scada-system/          # Spring Boot backend (Java 17)
├── webapp/                # React frontend (TypeScript)
├── esp32-firmware/        # ESP32 firmware (PlatformIO/Arduino)
├── esp32-simulator/       # ESP32 data simulator (Node.js)
├── deployment/            # Docker and deployment configs
├── docs/                  # Project documentation
└── README.md              # This file
```

## 📚 Documentation

- **[CLAUDE.md](docs/CLAUDE.md)** - Comprehensive project guide
- **[PROJECT-DOCUMENTATION.md](docs/PROJECT-DOCUMENTATION.md)** - Technical project documentation
- **[deployment/README.md](deployment/README.md)** - Deployment instructions

## 🚀 Quick Start

### Backend (Spring Boot)
```bash
cd scada-system
./mvnw clean install
./mvnw spring-boot:run
```

### Frontend (React)
```bash
cd webapp
npm install
npm run dev
```

## 🛠️ Technology Stack

**Backend:**
- Spring Boot 3.5.6
- Java 17
- Maven
- H2 Database (test), PostgreSQL (production)
- WebSocket for real-time communication

**Frontend:**
- React 19.1
- TypeScript
- Vite
- TailwindCSS
- Recharts for data visualization

**Infrastructure:**
- Docker & Docker Compose
- Mosquitto MQTT broker
- Nginx (reverse proxy)

## 📊 Features

- **Real-time Monitoring:** Live electrical measurements via WebSocket
- **Power Quality Analysis:** PN-EN 50160 compliance monitoring
- **Historical Data:** Trend analysis and reporting
- **MQTT Integration:** ESP32 sensor data collection
- **Responsive UI:** Modern React interface with mobile support

## 🔧 Development

### Prerequisites
- Java 17+
- Node.js 22+
- Maven 3.8+
- Docker (optional)

### Environment Setup
See [docs/CLAUDE.md](docs/CLAUDE.md) for detailed setup instructions.

## 🧪 Testing

### Backend Tests
```bash
cd scada-system
./mvnw test
```

### Frontend Tests
```bash
cd webapp
npm test
```

## 📦 Deployment

### Docker Development
```bash
docker-compose up -d
```

### Production Deployment
See [deployment/README.md](deployment/README.md) for production deployment instructions.

## 🤝 Contributing

1. Follow existing code patterns and conventions
2. Add tests for new features
3. Update documentation
4. Use conventional commit messages

## 📄 License

This project is developed as part of an engineering thesis.

---

**Status:** Active Development  
**Last Updated:** 2026-02-07