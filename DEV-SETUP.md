# Development Environment Setup Guide

This guide explains how to set up your local development environment for the SCADA system backend.

## Prerequisites

- **Java 17** (already installed)
- **Maven** (included via Maven wrapper `./mvnw`)
- **Docker Desktop** for Windows (download from [Docker Desktop] (https://www.docker.com/products/docker-desktop))
- **Git** (for version control)

## Quick Start (5 minutes)

### Step 1: Start Database and MQTT Broker

```bash
# Navigate to project root
cd c:/Users/Admin/Desktop/Pep/scada-system-project

# Start PostgreSQL and Mosquitto MQTT broker
docker-compose up -d

# Verify containers are running
docker-compose ps

# Should show:
# scada-postgres   running   0.0.0.0:5432->5432/tcp
# scada-mqtt       running   0.0.0.0:1883->1883/tcp, 0.0.0.0:9001->9001/tcp
```

**What just happened?**
- PostgreSQL database created with credentials:
  - Database: `energy_monitor`
  - Username: `energyuser`
  - Password: `StrongPassword123!`
- MQTT broker started on port 1883 (for ESP32 sensors)
- Data persisted in Docker volumes (survives container restarts)

### Step 2: Run Backend Application

```bash
# Navigate to backend directory
cd scada-system

# Run Spring Boot application
./mvnw spring-boot:run

# Wait for startup message:
# "Started ScadaSystemApplication in X.XXX seconds"
```

**What happens during startup?**
1. **Flyway runs migrations:** Creates `measurements` and `daily_stats` tables
2. **Spring Boot starts:** Loads all beans and configurations
3. **MQTT connects:** Subscribes to `scada/measurements/#` topic
4. **WebSocket enabled:** Listens on `/ws/measurements`
5. **REST API ready:** Available at [http://localhost:8080](http://localhost:8080)

### Step 3: Verify Setup

**Check database schema:**
```bash
# Connect to PostgreSQL
docker exec -it scada-postgres psql -U energyuser -d energy_monitor

# List tables
\dt

# Should show:
# measurements
# daily_stats
# flyway_schema_history

# View migration history
SELECT * FROM flyway_schema_history;

# Exit
\q
```

**Check REST API:**
```bash
# Health check
curl http://localhost:8080/health

# Should return:
# {"status":"UP","timestamp":"2025-11-07T...","serviceName":"scada-energy-monitor"}
```

## Development Workflow

### Running the Application

```bash
# Terminal 1: Watch logs
cd scada-system
./mvnw spring-boot:run

# Terminal 2: Watch database activity (optional)
docker logs -f scada-postgres

# Terminal 3: Watch MQTT messages (optional)
docker logs -f scada-mqtt
```

### Testing MQTT Integration

You can publish test messages to MQTT broker:

```bash
# Install mosquitto-clients (MQTT command-line tools)
# Windows: Download from https://mosquitto.org/download/
# Or use Docker:

docker run -it --rm --network scada-system-project_scada-network eclipse-mosquitto \
  mosquitto_pub -h scada-mqtt -t "scada/measurements/sensor01" -m '{
    "timestamp": "2025-11-07T14:30:00Z",
    "voltage_rms": 230.5,
    "current_rms": 5.2,
    "frequency": 50.1,
    "power_active": 1196.0,
    "power_reactive": 150.0,
    "power_apparent": 1205.0,
    "cos_phi": 0.99,
    "thd_voltage": 2.3,
    "thd_current": 5.1
  }'
```

**Check if message was received:**
```bash
# Query database
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT id, time, voltage_rms, current_rms FROM measurements ORDER BY time DESC LIMIT 5;"
```

### Stopping Services

```bash
# Stop application: Ctrl+C in terminal running ./mvnw spring-boot:run

# Stop Docker containers (data persists)
docker-compose stop

# Stop and remove containers (data still persists in volumes)
docker-compose down

# DANGER: Remove everything including data volumes
docker-compose down -v
```

## Database Management

### Viewing Data

```bash
# Connect to PostgreSQL
docker exec -it scada-postgres psql -U energyuser -d energy_monitor

# Useful queries:
SELECT COUNT(*) FROM measurements;
SELECT * FROM measurements ORDER BY time DESC LIMIT 10;
SELECT * FROM daily_stats ORDER BY date DESC;

# Exit
\q
```

### Resetting Database

```bash
# Stop application first (Ctrl+C)

# Remove database volume
docker-compose down -v

# Restart containers (fresh database)
docker-compose up -d

# Restart application (Flyway will recreate tables)
cd scada-system
./mvnw spring-boot:run
```

## Understanding Flyway Migrations

### How It Works

1. **Application starts** → Flyway checks `flyway_schema_history` table
2. **Finds migrations** in `src/main/resources/db/migration/`
3. **Compares versions:**
   - V1 already applied? ✅ Skip
   - V2 already applied? ✅ Skip
   - V3 new? ➡️ Execute V3__description.sql
4. **Records success** in `flyway_schema_history`

### Migration File Naming

```
V<version>__<description>.sql

Examples:
V1__Create_measurements_table.sql       ✅ Good
V2__Create_daily_stats_table.sql        ✅ Good
V10__Add_sensor_location.sql            ✅ Good (version 10)
V2.1__Add_index.sql                      ✅ Good (version 2.1)

v1__create_table.sql                     ❌ Bad (lowercase 'v')
V1_Create_table.sql                      ❌ Bad (single underscore)
Create_table.sql                         ❌ Bad (no version)
```

### Adding New Migrations

```bash
# 1. Create new migration file
touch src/main/resources/db/migration/V3__Add_sensor_location.sql

# 2. Write SQL
cat > src/main/resources/db/migration/V3__Add_sensor_location.sql << 'EOF'
-- V3: Add location tracking for sensors
ALTER TABLE measurements ADD COLUMN sensor_location VARCHAR(100);
CREATE INDEX idx_measurements_location ON measurements (sensor_location);
EOF

# 3. Restart application (migration runs automatically)
./mvnw spring-boot:run
```

## Troubleshooting

### Error: "Port 5432 already in use"

You have another PostgreSQL instance running.

**Solution:**
```bash
# Option 1: Stop other PostgreSQL
# Windows Services: Stop "PostgreSQL" service

# Option 2: Change port in docker-compose.yml
# Change "5432:5432" to "5433:5432"
# Update application.properties:
# spring.datasource.url=jdbc:postgresql://localhost:5433/energy_monitor
```

### Error: "Flyway migration checksum mismatch"

You manually edited an already-applied migration.

**Solution:**
```bash
# DANGER: This removes migration history
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "DELETE FROM flyway_schema_history WHERE version = '1';"

# Then restart application
```

**Better solution:** Create new migration instead of editing old ones!

### Error: "Connection refused to MQTT broker"

MQTT container not running or wrong host.

**Solution:**
```bash
# Check MQTT container status
docker-compose ps scada-mqtt

# If not running:
docker-compose up -d scada-mqtt

# Check logs
docker logs scada-mqtt
```

### Error: "Table 'measurements' doesn't exist"

Flyway didn't run or migrations failed.

**Solution:**
```bash
# Check Flyway migration status
docker exec -it scada-postgres psql -U energyuser -d energy_monitor -c \
  "SELECT * FROM flyway_schema_history ORDER BY installed_rank;"

# Check application logs for Flyway errors
./mvnw spring-boot:run | grep -i flyway
```

## IDE Setup

### IntelliJ IDEA Ultimate

1. **Open Project:** File → Open → Select `scada-system-project`
2. **Maven Sync:** Right-click `pom.xml` → Maven → Reload Project
3. **Run Configuration:**
   - Run → Edit Configurations → + → Spring Boot
   - Main class: `com.dkowalczyk.scadasystem.ScadaSystemApplication`
   - Active profiles: (leave empty for default)
4. **Database Tool:**
   - View → Tool Windows → Database
   - + → PostgreSQL
   - Host: localhost, Port: 5432
   - Database: energy_monitor
   - User: energyuser, Password: StrongPassword123!

### VS Code (if needed)

```bash
# Install extensions
# - Extension Pack for Java
# - Spring Boot Extension Pack

# Run application
# Terminal → Run Task → maven: spring-boot:run
```

## Next Steps

Once you verify the setup works:

1. ✅ Database running and accessible
2. ✅ Migrations applied successfully
3. ✅ Application starts without errors
4. ✅ REST API responds to health check

You're ready to:
- Implement the statistics service
- Add power quality event detection
- Create ESP32 mock data generator
- Build the React dashboard

## Useful Commands Reference

```bash
# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop services
docker-compose logs -f postgres   # View PostgreSQL logs
docker-compose logs -f mosquitto  # View MQTT logs

# PostgreSQL
docker exec -it scada-postgres psql -U energyuser -d energy_monitor
\dt                              # List tables
\d measurements                  # Describe measurements table
SELECT COUNT(*) FROM measurements;

# Maven
./mvnw clean                     # Clean build artifacts
./mvnw compile                   # Compile Java code
./mvnw test                      # Run tests
./mvnw spring-boot:run           # Run application
./mvnw package                   # Build JAR file

# MQTT (if mosquitto-clients installed)
mosquitto_pub -h localhost -t "scada/measurements/test" -m '{"voltage_rms": 230}'
mosquitto_sub -h localhost -t "scada/measurements/#"
```

## Production Considerations

**Do NOT use in production without:**
1. ❌ Changing default passwords
2. ❌ Enabling MQTT authentication
3. ❌ Configuring SSL/TLS for database and MQTT
4. ❌ Restricting CORS origins
5. ❌ Adding Spring Security
6. ❌ Setting up proper logging and monitoring
7. ❌ Implementing backup strategy

This setup is for **development only**!
