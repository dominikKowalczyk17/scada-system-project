# Energy Monitor - DevOps & CI/CD Implementation Plan

**Dokument:** #3 - Środowisko deweloperskie, CI/CD i deployment
**Projekt:** SCADA Energy Monitor
**Autor:** Dominik Kowalczyk
**Data:** 2025-11-03
**Status:** Plan implementacji

---

## Spis treści

1. [Overview & Architektura CI/CD](#1-overview--architektura-cicd)
2. [Raspberry Pi - Setup od podstaw](#2-raspberry-pi---setup-od-podstaw)
3. [GitHub - Konfiguracja Secrets & Environments](#3-github---konfiguracja-secrets--environments)
4. [CI Pipeline - Continuous Integration](#4-ci-pipeline---continuous-integration)
5. [CD Pipeline - Continuous Deployment](#5-cd-pipeline---continuous-deployment)
6. [Deployment Scripts](#6-deployment-scripts)
7. [Developer Workflow](#7-developer-workflow)
8. [Troubleshooting & Maintenance](#8-troubleshooting--maintenance)

---

## 1. Overview & Architektura CI/CD

### 1.1 Cel dokumentu

Dokument opisuje kompletną implementację środowiska deweloperskiego z automatyzacją testowania (CI) i deploymentu (CD) na Raspberry Pi dla projektu SCADA Energy Monitor.

**Kluczowe założenia:**
- **Środowisko produkcyjne:** Raspberry Pi 4B (4GB RAM) z Docker
- **CI/CD:** GitHub Actions
- **Deployment:** Manual trigger (workflow_dispatch)
- **Testowanie:** Unit tests + Code quality (SonarCloud)
- **Strategia:** Blue-green deployment z automatycznym rollback

### 1.2 Architektura przepływu

```
┌──────────────────┐
│  Developer       │
│  Local Machine   │
└────────┬─────────┘
         │
         │ git push origin feature/xxx
         ▼
┌───────────────────────────────────────────────────┐
│              GitHub Repository                    │
│  ┌────────────────────────────────────────────┐   │
│  │  Pull Request utworzony                    │   │
│  └────────────┬───────────────────────────────┘   │
│               │                                   │
│               │ Trigger                           │
│               ▼                                   │
│  ┌────────────────────────────────────────────┐   │
│  │         CI Pipeline (ci.yml)               │   │
│  │  ✓ Backend unit tests (JUnit)              │   │
│  │  ✓ Frontend unit tests (Vitest)            │   │
│  │  ✓ SonarCloud analysis                     │   │
│  │  ✓ Type checking & linting                 │   │
│  │  ✓ Build validation                        │   │
│  └────────────┬───────────────────────────────┘   │
│               │                                   │
│               │ ✅ All checks passed              │
│               ▼                                   │
│  ┌────────────────────────────────────────────┐   │
│  │  PR merged to master                       │   │
│  └────────────┬───────────────────────────────┘   │
│               │                                   │
│               │ Manual trigger by developer       │
│               ▼                                   │
│  ┌────────────────────────────────────────────┐   │
│  │         CD Pipeline (cd.yml)               │   │
│  │  1. Pre-deployment tests                   │   │
│  │  2. Build artifacts (JAR + frontend dist)  │   │
│  │  3. Upload to Raspberry Pi via SSH         │   │
│  │  4. Deploy with Docker Compose             │   │
│  │  5. Health checks                          │   │
│  │  6. Post-deployment verification           │   │
│  └────────────┬───────────────────────────────┘   │
│               │                                   │
└───────────────┼───────────────────────────────────┘
                │ SSH deployment
                ▼
┌───────────────────────────────────────────────────┐
│        Raspberry Pi (Production Server)           │
│  ┌────────────────────────────────────────────┐   │
│  │  /opt/scada-system/                        │   │
│  │  ├── current/ → releases/20251103_143022/  │   │
│  │  ├── releases/                             │   │
│  │  │   ├── 20251103_143022/ (active)         │   │
│  │  │   ├── 20251103_120015/ (previous)       │   │
│  │  │   └── 20251102_183045/                  │   │
│  │  └── shared/                               │   │
│  │      ├── logs/                             │   │
│  │      └── data/                             │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  Docker Compose Services:                         │
│  ✓ PostgreSQL (TimescaleDB)                       │
│  ✓ MQTT Broker (Mosquitto)                        │
│  ✓ Backend (Spring Boot)                          │
│  ✓ Frontend (Nginx)                               │
│  ✓ Redis (cache)                                  │
│  ✓ Prometheus + Grafana (monitoring)              │
└───────────────────────────────────────────────────┘
```

### 1.3 Technologie

| Komponent | Technologia | Wersja |
|-----------|-------------|--------|
| **CI/CD Platform** | GitHub Actions | Latest |
| **Deployment Method** | SSH + rsync/scp | - |
| **Containerization** | Docker + Docker Compose | 24.x / 2.x |
| **Code Quality** | SonarCloud | Latest |
| **Backend Testing** | JUnit 5 + Mockito | - |
| **Frontend Testing** | Vitest | Latest |
| **Deployment Strategy** | Blue-Green + Rollback | - |
| **Production OS** | Raspberry Pi OS (64-bit) | Bookworm |

---

## 2. Raspberry Pi - Setup od podstaw

### 2.1 Wymagania sprzętowe

- **Model:** Raspberry Pi 4B (4GB RAM minimum)
- **Storage:** microSD 32GB Class 10 (minimum) lub 64GB (recommended)
- **Network:** WiFi lub Ethernet (preferowane Ethernet dla stabilności)
- **Power:** Official Raspberry Pi Power Supply (5V 3A)

### 2.2 Instalacja Raspberry Pi OS

#### Krok 1: Przygotowanie karty SD

```bash
# Na komputerze lokalnym (Linux/Mac)
# Pobierz Raspberry Pi Imager: https://www.raspberrypi.com/software/

# Wybierz:
# - OS: Raspberry Pi OS Lite (64-bit) - Bookworm
# - Storage: Twoja karta microSD
# - Settings (⚙️):
#   ✓ Enable SSH (use password authentication)
#   ✓ Set username: pi
#   ✓ Set password: [twoje hasło]
#   ✓ Configure WiFi (opcjonalnie)
#   ✓ Set locale settings (Europe/Warsaw, pl)

# Zapisz i poczekaj na zakończenie
```

#### Krok 2: Pierwsze uruchomienie

```bash
# Włóż kartę do RPI i uruchom
# Znajdź IP adres RPI w routerze lub użyj:
ping raspberrypi.local

# Połącz się przez SSH
ssh pi@192.168.0.122  # Zmień na swoje IP
# Hasło: [ustawione w Imager]
```

#### Krok 3: Aktualizacja systemu

```bash
# Na Raspberry Pi
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Zmień hostname (opcjonalnie)
sudo hostnamectl set-hostname scada-rpi

# Reboot
sudo reboot
```

### 2.3 Konfiguracja SSH z kluczami publicznymi

```bash
# NA KOMPUTERZE LOKALNYM
# Generuj parę kluczy SSH (jeśli nie masz)
ssh-keygen -t ed25519 -C "deployment@scada-system" -f ~/.ssh/scada_rpi_deploy

# Dodaj klucz publiczny do RPI
ssh-copy-id -i ~/.ssh/scada_rpi_deploy.pub pi@192.168.0.122

# Testuj połączenie bez hasła
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122

# NA RASPBERRY PI
# Wyłącz logowanie hasłem dla większego bezpieczeństwa
sudo nano /etc/ssh/sshd_config

# Zmień/dodaj:
# PasswordAuthentication no
# PubkeyAuthentication yes
# PermitRootLogin no

sudo systemctl restart ssh
```

### 2.4 Instalacja Docker & Docker Compose

```bash
# NA RASPBERRY PI
# Instalacja Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Dodaj użytkownika pi do grupy docker
sudo usermod -aG docker pi

# Logout i login ponownie aby zmiany zadziałały
exit
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122

# Weryfikuj instalację Docker
docker --version
docker ps

# Instalacja Docker Compose
sudo apt install -y docker-compose-plugin

# Weryfikuj instalację Docker Compose
docker compose version
```

### 2.5 Konfiguracja użytkownika deployment

```bash
# NA RASPBERRY PI
# Użytkownik 'pi' będzie używany do deployment
# Nadaj uprawnienia sudo bez hasła dla Docker

sudo visudo

# Dodaj na końcu pliku:
pi ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /bin/systemctl
```

### 2.6 Struktura katalogów deployment

```bash
# NA RASPBERRY PI
# Utwórz strukturę katalogów dla aplikacji
sudo mkdir -p /opt/scada-system/{releases,shared/{logs,data}}
sudo chown -R pi:pi /opt/scada-system

# Struktura:
# /opt/scada-system/
# ├── current → releases/YYYYMMDD_HHMMSS  (symlink do aktywnej wersji)
# ├── releases/                            (katalogi z wersjami)
# │   ├── 20251103_143022/
# │   ├── 20251103_120015/
# │   └── 20251102_183045/
# └── shared/                              (dane współdzielone między wersjami)
#     ├── logs/                            (logi aplikacji)
#     └── data/                            (dane PostgreSQL, MQTT)

# Utwórz katalogi dla danych Docker volumes
mkdir -p /opt/scada-system/shared/data/{postgres,mqtt,redis,prometheus,grafana}
```

### 2.7 Konfiguracja firewall (ufw)

```bash
# NA RASPBERRY PI
# Instalacja UFW
sudo apt install -y ufw

# Podstawowa konfiguracja
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Zezwól na SSH (WAŻNE - przed włączeniem!)
sudo ufw allow 22/tcp comment 'SSH'

# Zezwól na aplikację (dostosuj do swoich potrzeb)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 8080/tcp comment 'Spring Boot Backend'
sudo ufw allow 1883/tcp comment 'MQTT Broker'
sudo ufw allow 9001/tcp comment 'MQTT WebSocket'

# Włącz firewall
sudo ufw enable

# Sprawdź status
sudo ufw status verbose
```

### 2.8 Weryfikacja gotowości RPI

```bash
# NA RASPBERRY PI
# Sprawdź czy wszystko jest gotowe
docker --version          # Powinno pokazać Docker version
docker compose version    # Powinno pokazać Docker Compose version
ls -la /opt/scada-system  # Struktura katalogów
groups pi                 # Powinno zawierać 'docker'
sudo ufw status          # Firewall active

# Test Docker
docker run hello-world   # Powinno zadziałać bez sudo
```

### 2.9 Konfiguracja swap (opcjonalnie, dla RPI 4GB)

```bash
# NA RASPBERRY PI
# Zwiększ swap dla większej stabilności (opcjonalnie)
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile

# Zmień:
# CONF_SWAPSIZE=100
# na:
# CONF_SWAPSIZE=2048

sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

---

## 3. GitHub - Konfiguracja Secrets & Environments

### 3.1 GitHub Secrets

Przejdź do: **Repository Settings → Secrets and variables → Actions → New repository secret**

#### Wymagane secrets:

1. **DEPLOY_SSH_KEY**
   ```bash
   # Wartość: Zawartość klucza prywatnego SSH
   # NA KOMPUTERZE LOKALNYM:
   cat ~/.ssh/scada_rpi_deploy
   # Skopiuj CAŁĄ zawartość (od -----BEGIN do -----END-----)
   ```

   W GitHub dodaj jako secret:
   - Name: `DEPLOY_SSH_KEY`
   - Value: `[zawartość klucza prywatnego]`

2. **RPI_HOST**
   - Name: `RPI_HOST`
   - Value: `192.168.0.122` (Twój IP Raspberry Pi)

3. **RPI_USER**
   - Name: `RPI_USER`
   - Value: `pi`

4. **SONAR_TOKEN** (dla SonarCloud)
   - Przejdź do: https://sonarcloud.io
   - Zaloguj się przez GitHub
   - Create new organization (jeśli nie masz)
   - My Account → Security → Generate Token
   - Name: `SONAR_TOKEN`
   - Value: `[wygenerowany token z SonarCloud]`

5. **SONAR_ORGANIZATION** (dla SonarCloud)
   - Name: `SONAR_ORGANIZATION`
   - Value: `[nazwa twojej organizacji w SonarCloud]`

### 3.2 GitHub Environment (Production)

Przejdź do: **Repository Settings → Environments → New environment**

1. **Utwórz environment:** `production`

2. **Environment protection rules:**
   - ☐ Required reviewers: 1 (opcjonalnie, jeśli pracujesz w zespole)
   - ☑ Wait timer: 0 minutes
   - ☐ Deployment branches: tylko `master`

3. **Environment secrets** (opcjonalnie, jeśli chcesz oddzielić od repository secrets):
   - Możesz przenieść `DEPLOY_SSH_KEY`, `RPI_HOST`, `RPI_USER` tutaj

### 3.3 SonarCloud - Setup projektu

1. **Przejdź do:** https://sonarcloud.io

2. **Dodaj nowy projekt:**
   - Analyze new project → Import from GitHub
   - Wybierz: `scada-system-project`
   - Set Up → With GitHub Actions

3. **Konfiguracja projektu:**
   - Project Key: `scada-system-project`
   - Organization: `[twoja-organizacja]`

4. **Dodaj plik konfiguracyjny SonarCloud** (będzie utworzony automatycznie w następnych krokach):
   - `sonar-project.properties` w rootu projektu

### 3.4 Weryfikacja secrets

```bash
# Sprawdź czy secrets są dostępne w GitHub Actions
# Przejdź do: Actions → Workflow → Manual trigger
# Powinieneś widzieć że secrets są dostępne (nie zobaczysz wartości)
```

---

## 4. CI Pipeline - Continuous Integration

### 4.1 Plik: `.github/workflows/ci.yml`

**Trigger:** Pull Requests do branch `master`

**Cel:** Automatyczne testowanie każdej zmiany kodu przed merge do master.

### 4.2 Jobs w CI Pipeline

#### Job 1: `backend-tests`

```yaml
# Testowanie Spring Boot backend
- Set up JDK 21
- Cache Maven dependencies
- Run Maven tests: ./mvnw clean test
- Upload test results
```

**Co testuje:**
- Unit tests (JUnit 5)
- Integration tests z @SpringBootTest
- Test coverage

#### Job 2: `frontend-tests`

```yaml
# Testowanie React frontend
- Set up Node.js 22
- Cache npm dependencies
- Install dependencies: npm ci
- Type checking: npm run type-check
- Linting: npm run lint
- Unit tests: npm run test
- Build production: npm run build
```

**Co testuje:**
- TypeScript type checking
- ESLint code quality
- Unit tests (Vitest)
- Production build validation

#### Job 3: `sonarcloud-analysis`

```yaml
# Analiza jakości kodu w SonarCloud
- Set up JDK 21
- Cache SonarCloud packages
- Cache Maven dependencies
- Build and analyze backend
- Analyze frontend with SonarScanner
```

**Co analizuje:**
- Code coverage
- Code smells
- Bugs & vulnerabilities
- Technical debt
- Duplication
- Maintainability rating

**Quality Gates:**
- Coverage > 80%
- 0 Bugs (Blocker/Critical)
- 0 Vulnerabilities
- Maintainability rating A

#### Job 4: `build-validation`

```yaml
# Walidacja że projekt buduje się poprawnie
- Build backend JAR (production)
- Build frontend dist (production)
- Verify artifacts exist
```

#### Job 5: `quality-summary`

```yaml
# Podsumowanie jakości PR
- Zbiera wyniki wszystkich jobów
- Generuje komentarz na PR z podsumowaniem
- Link do SonarCloud dashboard
```

### 4.3 Przykładowy output CI Pipeline

```
✅ CI Pipeline - Pull Request #42

Backend Tests ............ ✅ Passed (2m 15s)
  - Unit tests: 127 passed, 0 failed
  - Integration tests: 23 passed, 0 failed
  - Coverage: 87.3%

Frontend Tests ........... ✅ Passed (1m 42s)
  - Type checking: ✅ No errors
  - Linting: ✅ No issues
  - Unit tests: 45 passed, 0 failed
  - Build: ✅ Success

SonarCloud Analysis ...... ✅ Quality Gate Passed
  - Bugs: 0
  - Vulnerabilities: 0
  - Code Smells: 7 (minor)
  - Coverage: 85.2%
  - Rating: A
  📊 View detailed report: https://sonarcloud.io/...

Build Validation ......... ✅ Passed (3m 05s)
  - Backend JAR: 45.2 MB
  - Frontend dist: 2.1 MB

✅ All checks passed - Ready to merge!
```

### 4.4 Workflow PR → Merge

```
1. Developer tworzy feature branch: git checkout -b feature/mqtt-integration
2. Pracuje nad kodem lokalnie
3. Push do GitHub: git push origin feature/mqtt-integration
4. Tworzy Pull Request do master
5. ⚡ GitHub Actions automatycznie uruchamia CI Pipeline
6. Czeka na wyniki (3-5 minut)
7. ✅ Jeśli wszystkie testy przeszły → Merge do master
8. ❌ Jeśli testy nie przeszły → Poprawki i push ponownie
```

---

## 5. CD Pipeline - Continuous Deployment

### 5.1 Plik: `.github/workflows/cd.yml`

**Trigger:** **Manual only** (workflow_dispatch)

**Cel:** Bezpieczny deployment aplikacji na Raspberry Pi z możliwością rollback.

### 5.2 Deployment Strategy: Blue-Green

```
┌─────────────────────────────────────────────────┐
│  /opt/scada-system/releases/                    │
│  ├── 20251103_143022/  ← NEW (green)            │
│  ├── 20251103_120015/  ← CURRENT (blue) ←┐      │
│  └── 20251102_183045/                     │      │
│                                           │      │
│  /opt/scada-system/current → ─────────────┘      │
│                                                  │
│  Deployment proces:                              │
│  1. Upload nowej wersji do releases/NEW/         │
│  2. Uruchom Docker Compose w NEW/                │
│  3. Health check NEW/                            │
│  4. ✅ Jeśli OK: symlink current → NEW           │
│  5. ❌ Jeśli FAIL: rollback do CURRENT           │
│  6. Stop poprzedniej wersji (blue)               │
└──────────────────────────────────────────────────┘
```

### 5.3 Jobs w CD Pipeline

#### Job 1: `pre-deployment-tests`

```yaml
# Safety check przed deploymentem
- Run backend tests (same as CI)
- Run frontend tests (same as CI)
- Verify build succeeds
- Output: should-deploy=true/false
```

**Dlaczego ponownie testy?**
- Upewnij się że master branch jest OK (ktoś mógł wyłączyć CI)
- Double-check przed deploymentem produkcyjnym

#### Job 2: `build-artifacts`

```yaml
# Build produkcyjnych artefaktów
- Build backend JAR: ./mvnw clean package -DskipTests
- Build frontend dist: npm run build
- Upload artifacts to GitHub Actions (retention: 30 days)
```

**Artefakty:**
- `backend-jar`: `scada-system-0.0.1-SNAPSHOT.jar` (~45 MB)
- `frontend-dist`: `webapp/dist/` (~2 MB compressed)

#### Job 3: `deploy`

```yaml
# Deployment na Raspberry Pi
1. Download artifacts from GitHub Actions
2. Setup SSH key from secrets
3. Test SSH connection to RPI
4. Create new release directory: /opt/scada-system/releases/YYYYMMDD_HHMMSS
5. Upload artifacts via SCP
6. Upload docker-compose.prod.yml
7. Upload deployment scripts
8. Run deployment script: ./deployment/scripts/deploy.sh
9. Health check: ./deployment/scripts/health-check.sh
10. On failure: Rollback ./deployment/scripts/rollback.sh
11. On success: Cleanup old releases
```

**Environment:** `production` (wymaga manual approval jeśli skonfigurowane)

#### Job 4: `post-deployment-verification`

```yaml
# Weryfikacja po deploymencie
- Verify all Docker services are running
- Run integration tests on RPI
- Check logs for errors
- Update deployment status
```

### 5.4 Manual Deployment - Krok po kroku

#### Sposób 1: GitHub UI

1. Przejdź do: **Actions → CD Pipeline**
2. Kliknij: **Run workflow**
3. Wybierz branch: `master`
4. Kliknij: **Run workflow** (zielony przycisk)
5. Czekaj na deployment (5-10 minut)
6. Sprawdź logi w czasie rzeczywistym

#### Sposób 2: GitHub CLI

```bash
# Zainstaluj GitHub CLI
# https://cli.github.com/

# Uruchom deployment
gh workflow run cd.yml --ref master

# Sprawdź status
gh run list --workflow=cd.yml

# Zobacz logi
gh run view --log
```

### 5.5 Deployment Timeline

```
0:00  ⚡ Deployment triggered manually
0:00  🧪 Pre-deployment tests started
2:30  ✅ Pre-deployment tests passed
2:30  🏗️  Build artifacts started
5:00  ✅ Artifacts built and uploaded
5:00  📦 Deploy job started
5:15  🔑 SSH connection established
5:20  📂 Release directory created: /opt/scada-system/releases/20251103_143022
6:00  ⬆️  Artifacts uploaded to RPI (45 MB)
6:30  🐳 Docker Compose starting services...
7:30  ✅ All services started
7:35  🏥 Health check: Backend /health → 200 OK
7:40  🏥 Health check: Frontend / → 200 OK
7:45  🔗 Symlink updated: /opt/scada-system/current → releases/20251103_143022
8:00  🧹 Cleanup: Removed old releases (kept last 5)
8:10  ✅ Deployment completed successfully!
8:10  📊 Post-deployment verification started
9:00  ✅ Integration tests passed
9:10  ✅ All verification checks passed
9:10  🎉 Deployment finished!
```

### 5.6 Deployment Notification

Po zakończeniu deploymentu (sukces lub porażka), GitHub Actions automatycznie:

1. **Commit comment:**
   ```markdown
   ## Deployment ✅ Success
   
   **Commit:** a3f7b2c
   **Author:** dominik
   **Environment:** Production (Raspberry Pi)
   **Time:** 2025-11-03T14:30:22Z
   
   View the deployment logs for details.
   ```

2. **Opcjonalnie:** Email notification (jeśli skonfigurowane)

---

## 6. Deployment Scripts

Wszystkie skrypty znajdują się w: `deployment/scripts/`

### 6.1 `deploy.sh`

**Cel:** Główny skrypt deploymentu - uruchamia nową wersję aplikacji.

```bash
#!/bin/bash
# deployment/scripts/deploy.sh

set -e  # Exit on error

RELEASE_DIR=$(pwd)
APP_ROOT="/opt/scada-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting deployment: ${TIMESTAMP}"

# 1. Stop poprzedniej wersji (jeśli istnieje)
if [ -L "${APP_ROOT}/current" ]; then
    echo "⏸️  Stopping current version..."
    CURRENT_DIR=$(readlink -f ${APP_ROOT}/current)
    cd ${CURRENT_DIR}
    docker compose -f docker-compose.prod.yml down || true
fi

# 2. Przejdź do nowej wersji
cd ${RELEASE_DIR}

# 3. Utwórz .env file z konfiguracją
cat > .env << EOF
POSTGRES_USER=scada_user
POSTGRES_PASSWORD=${DB_PASSWORD:-scada_password_change_me}
POSTGRES_DB=scada_system
MQTT_USERNAME=scada_mqtt
MQTT_PASSWORD=${MQTT_PASSWORD:-mqtt_password_change_me}
BACKEND_PORT=8080
FRONTEND_PORT=80
EOF

# 4. Uruchom nową wersję
echo "🐳 Starting new version with Docker Compose..."
docker compose -f docker-compose.prod.yml up -d

# 5. Czekaj na uruchomienie (max 60s)
echo "⏳ Waiting for services to start..."
sleep 30

# 6. Sprawdź czy serwisy są healthy
echo "🔍 Checking service health..."
HEALTHY=$(docker compose -f docker-compose.prod.yml ps --format json | jq -r '.[] | select(.Health=="healthy") | .Name' | wc -l)
TOTAL=$(docker compose -f docker-compose.prod.yml ps --format json | jq -r '.[].Name' | wc -l)

echo "📊 Healthy services: ${HEALTHY}/${TOTAL}"

if [ ${HEALTHY} -lt 3 ]; then
    echo "❌ Not enough healthy services. Deployment failed."
    exit 1
fi

# 7. Aktualizuj symlink 'current'
echo "🔗 Updating current symlink..."
ln -sfn ${RELEASE_DIR} ${APP_ROOT}/current

echo "✅ Deployment completed successfully!"
echo "📍 Active release: ${RELEASE_DIR}"
```

**Użycie:**
```bash
cd /opt/scada-system/releases/20251103_143022
./deployment/scripts/deploy.sh
```

### 6.2 `health-check.sh`

**Cel:** Sprawdzenie czy aplikacja działa poprawnie.

```bash
#!/bin/bash
# deployment/scripts/health-check.sh

set -e

APP_ROOT="/opt/scada-system/current"
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:80"
MAX_RETRIES=30
RETRY_DELAY=2

echo "🏥 Starting health checks..."

# Function to check URL
check_url() {
    local url=$1
    local name=$2
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -sf "${url}" > /dev/null; then
            echo "✅ ${name} is healthy"
            return 0
        fi
        retries=$((retries + 1))
        echo "⏳ ${name} not ready yet... (${retries}/${MAX_RETRIES})"
        sleep $RETRY_DELAY
    done

    echo "❌ ${name} health check failed after ${MAX_RETRIES} retries"
    return 1
}

# Check Backend
check_url "${BACKEND_URL}/health" "Backend"

# Check Frontend
check_url "${FRONTEND_URL}/" "Frontend"

# Check Docker services
echo "🐳 Checking Docker services..."
cd ${APP_ROOT}
docker compose -f docker-compose.prod.yml ps

# Check critical services
REQUIRED_SERVICES=("postgres" "mqtt-broker" "backend" "nginx")
for service in "${REQUIRED_SERVICES[@]}"; do
    if ! docker compose -f docker-compose.prod.yml ps ${service} | grep -q "Up"; then
        echo "❌ Service ${service} is not running"
        exit 1
    fi
    echo "✅ Service ${service} is running"
done

echo "✅ All health checks passed!"
```

**Użycie:**
```bash
/opt/scada-system/current/deployment/scripts/health-check.sh
```

### 6.3 `rollback.sh`

**Cel:** Przywrócenie poprzedniej działającej wersji w przypadku błędu.

```bash
#!/bin/bash
# deployment/scripts/rollback.sh

set -e

APP_ROOT="/opt/scada-system"
CURRENT_LINK="${APP_ROOT}/current"
RELEASES_DIR="${APP_ROOT}/releases"

echo "🔄 Starting rollback procedure..."

# 1. Znajdź aktualną wersję
if [ ! -L "${CURRENT_LINK}" ]; then
    echo "❌ No current deployment found"
    exit 1
fi

CURRENT_RELEASE=$(readlink -f ${CURRENT_LINK})
CURRENT_NAME=$(basename ${CURRENT_RELEASE})

echo "📍 Current release: ${CURRENT_NAME}"

# 2. Znajdź poprzednią wersję
PREVIOUS_RELEASE=$(ls -1dt ${RELEASES_DIR}/* | grep -v ${CURRENT_NAME} | head -n 1)

if [ -z "${PREVIOUS_RELEASE}" ]; then
    echo "❌ No previous release found for rollback"
    exit 1
fi

PREVIOUS_NAME=$(basename ${PREVIOUS_RELEASE})
echo "📍 Rolling back to: ${PREVIOUS_NAME}"

# 3. Stop aktualnej wersji
echo "⏸️  Stopping current release..."
cd ${CURRENT_RELEASE}
docker compose -f docker-compose.prod.yml down || true

# 4. Uruchom poprzednią wersję
echo "🚀 Starting previous release..."
cd ${PREVIOUS_RELEASE}
docker compose -f docker-compose.prod.yml up -d

# 5. Czekaj na uruchomienie
echo "⏳ Waiting for services to start..."
sleep 30

# 6. Sprawdź health
${PREVIOUS_RELEASE}/deployment/scripts/health-check.sh

# 7. Aktualizuj symlink
echo "🔗 Updating current symlink to previous release..."
ln -sfn ${PREVIOUS_RELEASE} ${CURRENT_LINK}

echo "✅ Rollback completed successfully!"
echo "📍 Active release: ${PREVIOUS_NAME}"
```

**Użycie:**
```bash
/opt/scada-system/current/deployment/scripts/rollback.sh
```

### 6.4 `cleanup.sh`

**Cel:** Usunięcie starych wersji (zachowaj ostatnie 5).

```bash
#!/bin/bash
# deployment/scripts/cleanup.sh

set -e

APP_ROOT="/opt/scada-system"
RELEASES_DIR="${APP_ROOT}/releases"
KEEP_RELEASES=5

echo "🧹 Starting cleanup of old releases..."

# 1. Znajdź wszystkie release directories
TOTAL_RELEASES=$(ls -1dt ${RELEASES_DIR}/* | wc -l)
echo "📊 Total releases: ${TOTAL_RELEASES}"

if [ ${TOTAL_RELEASES} -le ${KEEP_RELEASES} ]; then
    echo "✅ No cleanup needed (keeping ${KEEP_RELEASES} releases)"
    exit 0
fi

# 2. Usuń stare releases (zachowaj ostatnie KEEP_RELEASES)
OLD_RELEASES=$(ls -1dt ${RELEASES_DIR}/* | tail -n +$((KEEP_RELEASES + 1)))

echo "🗑️  Removing old releases..."
for release in ${OLD_RELEASES}; do
    release_name=$(basename ${release})
    echo "  - Removing ${release_name}..."

    # Stop services jeśli działają
    cd ${release}
    docker compose -f docker-compose.prod.yml down 2>/dev/null || true

    # Usuń katalog
    rm -rf ${release}
    echo "  ✅ ${release_name} removed"
done

# 3. Cleanup Docker images
echo "🐳 Cleaning up old Docker images..."
docker image prune -af --filter "until=72h"

# 4. Cleanup Docker volumes (unused)
echo "💾 Cleaning up unused Docker volumes..."
docker volume prune -f

echo "✅ Cleanup completed!"
echo "📊 Remaining releases: ${KEEP_RELEASES}"
ls -1dt ${RELEASES_DIR}/* | head -n ${KEEP_RELEASES}
```

**Użycie:**
```bash
/opt/scada-system/current/deployment/scripts/cleanup.sh
```

### 6.5 `verify-deployment.sh`

**Cel:** Szczegółowa weryfikacja deploymentu.

```bash
#!/bin/bash
# deployment/scripts/verify-deployment.sh

set -e

APP_ROOT="/opt/scada-system/current"
BACKEND_URL="http://localhost:8080"

echo "🔍 Verifying deployment..."

# 1. Check Docker services
echo "🐳 Checking Docker services..."
cd ${APP_ROOT}
docker compose -f docker-compose.prod.yml ps --format json > /tmp/docker_status.json

# 2. Verify all services are running
SERVICES=("postgres" "mqtt-broker" "backend" "nginx" "redis" "prometheus" "grafana")
for service in "${SERVICES[@]}"; do
    STATUS=$(cat /tmp/docker_status.json | jq -r ".[] | select(.Service==\"${service}\") | .State")
    if [ "${STATUS}" != "running" ]; then
        echo "❌ Service ${service} is not running (status: ${STATUS})"
        exit 1
    fi
    echo "✅ ${service}: running"
done

# 3. Check backend endpoints
echo "🔍 Checking backend endpoints..."

# Health endpoint
if ! curl -sf "${BACKEND_URL}/health" > /dev/null; then
    echo "❌ Backend /health endpoint failed"
    exit 1
fi
echo "✅ /health: OK"

# Actuator endpoints (if enabled)
if curl -sf "${BACKEND_URL}/actuator/info" > /dev/null; then
    echo "✅ /actuator/info: OK"
fi

# 4. Check MQTT broker
echo "🔍 Checking MQTT broker..."
if docker compose -f docker-compose.prod.yml exec -T mqtt-broker mosquitto_sub -t "\$SYS/#" -C 1 -W 5 > /dev/null 2>&1; then
    echo "✅ MQTT broker: OK"
else
    echo "❌ MQTT broker not responding"
    exit 1
fi

# 5. Check PostgreSQL
echo "🔍 Checking PostgreSQL..."
if docker compose -f docker-compose.prod.yml exec -T postgres pg_isready -U scada_user > /dev/null; then
    echo "✅ PostgreSQL: OK"
else
    echo "❌ PostgreSQL not ready"
    exit 1
fi

# 6. Check Redis
echo "🔍 Checking Redis..."
if docker compose -f docker-compose.prod.yml exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis: OK"
else
    echo "❌ Redis not responding"
    exit 1
fi

# 7. Check disk space
echo "💾 Checking disk space..."
DISK_USAGE=$(df -h /opt | tail -1 | awk '{print $5}' | sed 's/%//')
if [ ${DISK_USAGE} -gt 80 ]; then
    echo "⚠️  Disk usage high: ${DISK_USAGE}%"
else
    echo "✅ Disk usage: ${DISK_USAGE}%"
fi

# 8. Check logs for errors
echo "📋 Checking logs for recent errors..."
BACKEND_ERRORS=$(docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -i "error" | wc -l)
if [ ${BACKEND_ERRORS} -gt 0 ]; then
    echo "⚠️  Found ${BACKEND_ERRORS} error(s) in backend logs (review recommended)"
else
    echo "✅ No errors in backend logs"
fi

echo "✅ Deployment verification completed!"
```

**Użycie:**
```bash
/opt/scada-system/current/deployment/scripts/verify-deployment.sh
```

### 6.6 `integration-tests.sh`

**Cel:** Testy integracyjne na produkcji (smoke tests).

```bash
#!/bin/bash
# deployment/scripts/integration-tests.sh

set -e

BACKEND_URL="http://localhost:8080"

echo "🧪 Running integration tests..."

# Test 1: Health endpoint
echo "Test 1: Health endpoint"
HEALTH_RESPONSE=$(curl -s "${BACKEND_URL}/health")
if echo "${HEALTH_RESPONSE}" | grep -q "UP"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

# Test 2: API endpoint - latest measurement
echo "Test 2: Latest measurement endpoint"
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/measurements/latest")
if [ "${STATUS_CODE}" == "200" ] || [ "${STATUS_CODE}" == "404" ]; then
    echo "✅ Latest measurement endpoint accessible (${STATUS_CODE})"
else
    echo "❌ Latest measurement endpoint failed (${STATUS_CODE})"
    exit 1
fi

# Test 3: WebSocket endpoint (check availability)
echo "Test 3: WebSocket endpoint"
WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/ws")
if [ "${WS_STATUS}" == "426" ] || [ "${WS_STATUS}" == "200" ]; then
    echo "✅ WebSocket endpoint available"
else
    echo "❌ WebSocket endpoint not available (${WS_STATUS})"
    exit 1
fi

# Test 4: Frontend accessibility
echo "Test 4: Frontend accessibility"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/")
if [ "${FRONTEND_STATUS}" == "200" ]; then
    echo "✅ Frontend accessible"
else
    echo "❌ Frontend not accessible (${FRONTEND_STATUS})"
    exit 1
fi

# Test 5: MQTT broker connectivity (basic)
echo "Test 5: MQTT broker connectivity"
if docker exec $(docker ps -qf "name=mqtt-broker") mosquitto_pub -t "test/integration" -m "test" -q 1; then
    echo "✅ MQTT broker accepting messages"
else
    echo "❌ MQTT broker not accepting messages"
    exit 1
fi

# Test 6: Database connectivity
echo "Test 6: Database connectivity"
if docker exec $(docker ps -qf "name=postgres") psql -U scada_user -d scada_system -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database connectivity OK"
else
    echo "❌ Database connectivity failed"
    exit 1
fi

echo "✅ All integration tests passed!"
```

**Użycie:**
```bash
/opt/scada-system/current/deployment/scripts/integration-tests.sh
```

---

## 7. Developer Workflow

### 7.1 Codzienna praca - Typowy flow

```
1. Aktualizacja lokalnego repo
   git checkout master
   git pull origin master

2. Utworzenie feature branch
   git checkout -b feature/add-mqtt-client

3. Praca nad kodem lokalnie
   # Edycja plików...
   # Testy lokalne: ./mvnw test (backend)
   # Testy lokalne: npm test (frontend)

4. Commit zmian
   git add .
   git commit -m "feat: add MQTT client configuration"

5. Push do GitHub
   git push origin feature/add-mqtt-client

6. Utworzenie Pull Request
   # Przez GitHub UI lub:
   gh pr create --title "Add MQTT client" --body "Implements MQTT client..."

7. ⚡ CI Pipeline uruchamia się automatycznie
   # Czekaj 3-5 minut na wyniki

8. ✅ Jeśli CI przeszło - merge do master
   gh pr merge --squash

9. 🚀 Manual deployment na RPI (gdy gotowy)
   gh workflow run cd.yml --ref master

10. ✅ Weryfikacja na produkcji
    # Sprawdź logi, metryki, czy wszystko działa
```

### 7.2 Lokalne środowisko deweloperskie

#### Backend (Spring Boot)

```bash
# Wymagania:
# - JDK 21
# - Maven 3.9+
# - Docker (dla lokalnej bazy danych)

# 1. Uruchom lokalną bazę danych + MQTT broker
cd /path/to/scada-system-project
docker compose -f docker-compose.dev.yml up -d postgres mqtt-broker

# 2. Uruchom backend
cd scada-system
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Backend dostępny na: http://localhost:8080
# H2 Console (dev): http://localhost:8080/h2-console
```

#### Frontend (React + Vite)

```bash
# Wymagania:
# - Node.js 22+
# - npm 10+

# 1. Instalacja dependencies
cd webapp
npm install

# 2. Uruchom dev server
npm run dev

# Frontend dostępny na: http://localhost:5173
# Hot reload enabled
```

#### Pełny stack lokalnie (Docker Compose)

```bash
# Uruchom wszystkie serwisy lokalnie
docker compose -f docker-compose.dev.yml up

# Dostępne na:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8080
# - PostgreSQL: localhost:5432
# - MQTT: localhost:1883
# - Adminer (DB UI): http://localhost:8081
```

### 7.3 Debugowanie

#### Backend (IntelliJ IDEA)

```
1. Otwórz projekt scada-system/ w IntelliJ IDEA
2. Run → Edit Configurations
3. Add New Configuration → Spring Boot
4. Main class: com.dkowalczyk.scadasystem.ScadaSystemApplication
5. VM Options: -Dspring.profiles.active=dev
6. Environment variables: DB_HOST=localhost;MQTT_HOST=localhost
7. Run w trybie debug (Shift+F9)
```

#### Frontend (VS Code)

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/webapp/src"
    }
  ]
}
```

### 7.4 Testy lokalne przed push

```bash
# Backend
cd scada-system
./mvnw clean test                    # Unit tests
./mvnw verify                        # Integration tests
./mvnw clean package                 # Build JAR

# Frontend
cd webapp
npm run type-check                   # TypeScript
npm run lint                         # ESLint
npm run test                         # Unit tests (Vitest)
npm run build                        # Production build

# Jeśli wszystkie testy przeszły lokalnie → Push do GitHub
```

### 7.5 Hotfix workflow (pilne poprawki na produkcji)

```bash
# 1. Utwórz hotfix branch z master
git checkout master
git pull origin master
git checkout -b hotfix/critical-bug-fix

# 2. Popraw błąd
# ... edycja plików ...

# 3. Test lokalnie
./mvnw test
npm test

# 4. Commit i push
git add .
git commit -m "hotfix: fix critical MQTT connection bug"
git push origin hotfix/critical-bug-fix

# 5. Utwórz PR (oznacz jako urgent)
gh pr create --title "[HOTFIX] Fix MQTT connection" --label "hotfix"

# 6. Po review - merge
gh pr merge --squash

# 7. Deploy natychmiast na produkcję
gh workflow run cd.yml --ref master

# 8. Monitor logi
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml logs -f backend
```

### 7.6 Monitoring produkcji

#### Logi w czasie rzeczywistym

```bash
# SSH do RPI
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122

# Wszystkie logi
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml logs -f

# Tylko backend
docker compose -f docker-compose.prod.yml logs -f backend

# Tylko frontend (nginx)
docker compose -f docker-compose.prod.yml logs -f nginx

# Tylko MQTT
docker compose -f docker-compose.prod.yml logs -f mqtt-broker
```

#### Grafana Dashboards

```
# Dostęp do Grafana
http://192.168.0.122:3000

# Login: admin
# Password: (ustawione w docker-compose.prod.yml)

# Dashboards:
# - System Metrics (CPU, RAM, Disk)
# - Application Metrics (requests, errors, latency)
# - MQTT Metrics (messages/sec, topics, clients)
```

#### Prometheus Metrics

```
# Dostęp do Prometheus
http://192.168.0.122:9090

# Przykładowe query:
# - rate(http_server_requests_seconds_count[1m])  # Request rate
# - jvm_memory_used_bytes                         # JVM memory
# - mqtt_messages_received_total                  # MQTT messages
```

---

## 8. Troubleshooting & Maintenance

### 8.1 Częste problemy i rozwiązania

#### Problem 1: SSH Connection Failed w GitHub Actions

**Symptom:**
```
Error: ssh: connect to host 192.168.0.122 port 22: Connection timed out
```

**Rozwiązania:**

1. **Sprawdź czy RPI jest online:**
   ```bash
   ping 192.168.0.122
   ```

2. **Sprawdź czy SSH działa:**
   ```bash
   ssh pi@192.168.0.122 "echo 'SSH OK'"
   ```

3. **Sprawdź firewall na RPI:**
   ```bash
   ssh pi@192.168.0.122
   sudo ufw status
   sudo ufw allow 22/tcp
   ```

4. **Sprawdź secret DEPLOY_SSH_KEY w GitHub:**
   - Settings → Secrets → DEPLOY_SSH_KEY
   - Upewnij się że zawiera PEŁNY klucz prywatny (od BEGIN do END)

5. **Sprawdź czy klucz publiczny jest w authorized_keys:**
   ```bash
   ssh pi@192.168.0.122
   cat ~/.ssh/authorized_keys
   ```

#### Problem 2: Docker Out of Disk Space

**Symptom:**
```
Error: No space left on device
```

**Rozwiązania:**

1. **Sprawdź miejsce na dysku:**
   ```bash
   ssh pi@192.168.0.122
   df -h
   ```

2. **Wyczyść stare Docker images:**
   ```bash
   docker image prune -af
   docker volume prune -f
   ```

3. **Usuń stare logi:**
   ```bash
   sudo journalctl --vacuum-time=7d
   docker system prune -af --volumes
   ```

4. **Usuń stare releases manualnie:**
   ```bash
   cd /opt/scada-system/releases
   ls -lt
   # Usuń najstarsze (zachowaj last 3)
   rm -rf 20251101_*
   ```

#### Problem 3: Deployment Failed - Health Check Timeout

**Symptom:**
```
❌ Backend health check failed after 30 retries
```

**Rozwiązania:**

1. **Sprawdź logi backendu:**
   ```bash
   ssh pi@192.168.0.122
   cd /opt/scada-system/current
   docker compose -f docker-compose.prod.yml logs backend
   ```

2. **Sprawdź czy PostgreSQL działa:**
   ```bash
   docker compose -f docker-compose.prod.yml ps postgres
   docker compose -f docker-compose.prod.yml logs postgres
   ```

3. **Sprawdź konfigurację .env:**
   ```bash
   cd /opt/scada-system/current
   cat .env
   # Sprawdź hasła, porty, etc.
   ```

4. **Manual rollback:**
   ```bash
   /opt/scada-system/current/deployment/scripts/rollback.sh
   ```

#### Problem 4: SonarCloud Analysis Failed

**Symptom:**
```
Error: Quality gate failed - Coverage below 80%
```

**Rozwiązania:**

1. **Sprawdź coverage lokalnie:**
   ```bash
   cd scada-system
   ./mvnw clean test jacoco:report
   # Raport w: target/site/jacoco/index.html
   ```

2. **Dodaj brakujące testy:**
   ```java
   // Utwórz testy dla nowych klas
   @Test
   void testNewFeature() {
       // ...
   }
   ```

3. **Wykluczz klasy konfiguracyjne z coverage:**
   ```xml
   <!-- pom.xml -->
   <plugin>
       <groupId>org.jacoco</groupId>
       <artifactId>jacoco-maven-plugin</artifactId>
       <configuration>
           <excludes>
               <exclude>**/config/**</exclude>
               <exclude>**/dto/**</exclude>
           </excludes>
       </configuration>
   </plugin>
   ```

4. **Skip quality gate (temporary):**
   ```bash
   # Tylko w wyjątkowych sytuacjach!
   gh workflow run cd.yml --ref master -f skip_quality_gate=true
   ```

#### Problem 5: MQTT Broker Not Responding

**Symptom:**
```
❌ MQTT broker not responding
```

**Rozwiązania:**

1. **Sprawdź czy Mosquitto działa:**
   ```bash
   ssh pi@192.168.0.122
   cd /opt/scada-system/current
   docker compose -f docker-compose.prod.yml ps mqtt-broker
   ```

2. **Sprawdź logi Mosquitto:**
   ```bash
   docker compose -f docker-compose.prod.yml logs mqtt-broker
   ```

3. **Test połączenia MQTT:**
   ```bash
   # Subscribe
   docker compose -f docker-compose.prod.yml exec mqtt-broker \
     mosquitto_sub -t "test/#" -v
   
   # Publish (w drugim terminalu)
   docker compose -f docker-compose.prod.yml exec mqtt-broker \
     mosquitto_pub -t "test/message" -m "Hello MQTT"
   ```

4. **Restart MQTT broker:**
   ```bash
   docker compose -f docker-compose.prod.yml restart mqtt-broker
   ```

#### Problem 6: Frontend Shows Blank Page

**Symptom:**
```
Frontend accessible but shows blank white page
```

**Rozwiązania:**

1. **Sprawdź logi Nginx:**
   ```bash
   ssh pi@192.168.0.122
   cd /opt/scada-system/current
   docker compose -f docker-compose.prod.yml logs nginx
   ```

2. **Sprawdź czy dist/ został zbudowany:**
   ```bash
   cd /opt/scada-system/current/artifacts/frontend
   ls -la
   # Powinien być index.html i assets/
   ```

3. **Sprawdź console errors w przeglądarce:**
   ```
   F12 → Console
   # Szukaj błędów JavaScript lub 404 dla assets
   ```

4. **Sprawdź konfigurację Nginx:**
   ```bash
   docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf
   ```

### 8.2 Lokalizacja logów

#### Na Raspberry Pi:

```bash
# Application logs (Docker)
/opt/scada-system/current/
└── docker compose logs [service_name]

# System logs
/var/log/syslog              # System messages
/var/log/auth.log            # SSH authentication
journalctl -u docker         # Docker service logs

# Shared logs (jeśli skonfigurowane)
/opt/scada-system/shared/logs/
├── backend.log
├── nginx_access.log
└── nginx_error.log
```

#### W GitHub Actions:

```
# Logi z workflow runs
GitHub → Actions → Select workflow run → View logs

# Artifacts (jeśli zapisane)
GitHub → Actions → Workflow run → Artifacts
└── test-results/
    ├── backend-test-results.xml
    └── frontend-test-results.json
```

### 8.3 Maintenance Tasks

#### Cotygodniowe (Weekly)

```bash
# 1. Sprawdź disk space
ssh pi@192.168.0.122 "df -h"

# 2. Sprawdź logi pod kątem błędów
ssh pi@192.168.0.122 "cd /opt/scada-system/current && docker compose -f docker-compose.prod.yml logs --tail=500 | grep -i error"

# 3. Sprawdź uptime serwisów
ssh pi@192.168.0.122 "cd /opt/scada-system/current && docker compose -f docker-compose.prod.yml ps"
```

#### Comiesięczne (Monthly)

```bash
# 1. Update systemu na RPI
ssh pi@192.168.0.122
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# 2. Backup bazy danych
ssh pi@192.168.0.122
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U scada_user scada_system > /tmp/backup_$(date +%Y%m%d).sql

# 3. Cleanup starych Docker images
ssh pi@192.168.0.122
docker image prune -af --filter "until=720h"  # 30 dni
docker volume prune -f

# 4. Sprawdź bezpieczeństwo (CVEs)
cd /path/to/scada-system-project
./mvnw dependency-check:check  # Backend
cd webapp && npm audit          # Frontend
```

#### Kwartalnie (Quarterly)

```bash
# 1. Pełny backup systemu
# (utwórz obraz karty SD lub backup /opt/scada-system/)

# 2. Review logs retention policy
# 3. Update dependencies (major versions)
# 4. Security audit
```

### 8.4 Backup & Recovery

#### Backup strategia:

1. **Database backup (daily, automated):**
   ```bash
   # Dodaj do crontab na RPI
   0 2 * * * cd /opt/scada-system/current && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U scada_user scada_system | gzip > /opt/scada-system/shared/backups/db_$(date +\%Y\%m\%d).sql.gz
   ```

2. **Application backup (przed każdym deploymentem):**
   ```bash
   # Automatyczne - deployment scripts zachowują last 5 releases
   ```

3. **Full system backup (monthly):**
   ```bash
   # Backup całego /opt/scada-system/
   ssh pi@192.168.0.122
   sudo tar -czf /tmp/scada-backup-$(date +%Y%m%d).tar.gz /opt/scada-system/
   # Skopiuj do komputera lokalnego
   scp pi@192.168.0.122:/tmp/scada-backup-*.tar.gz ~/backups/
   ```

#### Recovery:

```bash
# 1. Restore z previous release (jeśli deployment failed)
/opt/scada-system/current/deployment/scripts/rollback.sh

# 2. Restore database z backup
ssh pi@192.168.0.122
cd /opt/scada-system/current
gunzip < /opt/scada-system/shared/backups/db_20251103.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U scada_user scada_system

# 3. Full system restore (disaster recovery)
ssh pi@192.168.0.122
cd /opt
sudo rm -rf scada-system/
sudo tar -xzf /tmp/scada-backup-20251103.tar.gz -C /
sudo chown -R pi:pi /opt/scada-system
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml up -d
```

### 8.5 Performance Optimization

#### Monitoring performance issues:

```bash
# 1. Check CPU/Memory usage
ssh pi@192.168.0.122
htop

# 2. Check Docker container stats
docker stats

# 3. Check database performance
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U scada_user -d scada_system -c "
    SELECT * FROM pg_stat_activity
    WHERE state = 'active';
  "

# 4. Check slow queries (if enabled)
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U scada_user -d scada_system -c "
    SELECT query, mean_exec_time, calls
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 10;
  "
```

#### Optimization tips:

1. **Database indexing:**
   ```sql
   -- Dodaj indeksy dla często queryowanych kolumn
   CREATE INDEX idx_measurements_timestamp ON measurements(timestamp);
   ```

2. **Docker limits:**
   ```yaml
   # docker-compose.prod.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 1G
   ```

3. **Nginx caching:**
   ```nginx
   # deployment/config/nginx/nginx.conf
   location /static {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

---

## 9. Następne kroki

Po skonfigurowaniu środowiska DevOps:

1. **Implementacja backendu** (zgodnie z `energy-monitor-structure.md`)
   - MQTT Client integration
   - REST API controllers
   - WebSocket support
   - Database repositories

2. **Implementacja frontendu**
   - WebSocket client
   - Real-time charts (Chart.js)
   - Dashboard completion
   - API integration

3. **ESP32 Mock Firmware** (zgodnie z `energy-monitor-plan.md` Opcja A)
   - MQTT publisher
   - Simulated measurements
   - Testing on real hardware

4. **Production readiness:**
   - SSL/TLS (Let's Encrypt)
   - Domain name setup
   - Advanced monitoring
   - Alerting (email/Slack)

---

## Appendix A: Komendy Quick Reference

```bash
# === LOKALNE ŚRODOWISKO ===

# Backend
cd scada-system && ./mvnw spring-boot:run

# Frontend
cd webapp && npm run dev

# Full stack (Docker)
docker compose -f docker-compose.dev.yml up

# === TESTY ===

# Backend tests
./mvnw clean test

# Frontend tests
npm test

# === DEPLOYMENT ===

# Manual deployment (GitHub CLI)
gh workflow run cd.yml --ref master

# === RPI MANAGEMENT ===

# SSH to RPI
ssh -i ~/.ssh/scada_rpi_deploy pi@192.168.0.122

# Check logs
cd /opt/scada-system/current
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart [service]

# Rollback
/opt/scada-system/current/deployment/scripts/rollback.sh

# === MONITORING ===

# Grafana: http://192.168.0.122:3000
# Prometheus: http://192.168.0.122:9090
# Backend: http://192.168.0.122:8080
# Frontend: http://192.168.0.122
```

---

**Koniec dokumentu**
**Wersja:** 1.0
**Data:** 2025-11-03
