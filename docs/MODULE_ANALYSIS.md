# Analiza Modułów Systemu SCADA

**Dokument do systematycznej analizy kodu**
**Status:** Analiza zakończona, dokumenty zaktualizowane 2026-01-26

---

## Spis Modułów

| # | Moduł | Pliki | Status Analizy |
|---|-------|-------|----------------|
| 1 | [ESP32 Firmware](#1-esp32-firmware) | 1 | ✅ Zakończono |
| 2 | [Java - Konfiguracja](#2-java---konfiguracja) | 5 | ✅ Zakończono |
| 3 | [Java - Kontrolery](#3-java---kontrolery) | 5 | ✅ Zakończono |
| 4 | [Java - Serwisy](#4-java---serwisy) | 7 | ✅ Zakończono |
| 5 | [Java - Repozytoria](#5-java---repozytoria) | 2 | ✅ Zakończono |
| 6 | [Java - Encje](#6-java---encje) | 2 | ✅ Zakończono |
| 7 | [Java - DTO](#7-java---dto) | 8 | ✅ Zakończono |
| 8 | [Java - Wyjątki i Eventy](#8-java---wyjątki-i-eventy) | 4 | ✅ Zakończono |
| 9 | [Java - Utilities](#9-java---utilities) | 3 | ✅ Zakończono |
| 10 | [Java - Migracje DB](#10-java---migracje-bazy-danych) | 6 | ✅ Zakończono |
| 11 | [Frontend - Widoki](#11-frontend---widoki) | 2 | ✅ Zakończono |
| 12 | [Frontend - Komponenty](#12-frontend---komponenty) | 8 | ✅ Zakończono |
| 13 | [Frontend - UI Kit](#13-frontend---ui-kit) | 3 | ✅ Zakończono |
| 14 | [Frontend - Hooks](#14-frontend---hooks) | 5 | ✅ Zakończono |
| 15 | [Frontend - Lib/Utils](#15-frontend---libutilities) | 5 | ✅ Zakończono |
| 16 | [Frontend - Types](#16-frontend---types) | 1 | ✅ Zakończono |
| 17 | [Infrastruktura](#17-infrastruktura) | 4 | ✅ Zakończono |
| 18 | [Testy - Backend](#18-testy---backend) | 16 | ⏭️ Pominięto |
| 19 | [Testy - Frontend](#19-testy---frontend) | 15 | ⏭️ Pominięto |

**Legenda:** ⬜ Do analizy | 🔄 W trakcie | ✅ Zakończono | ⚠️ Wymaga poprawek

---

## 1. ESP32 Firmware

**Cel:** Akwizycja danych, przetwarzanie sygnału (FFT), komunikacja MQTT

| Plik | Ścieżka | Linie | Opis |
|------|---------|-------|------|
| main.cpp | `esp32-firmware/src/main.cpp` | ~264 | Główny plik firmware |

### Kluczowe obszary do analizy:
- [x] Konfiguracja próbkowania ADC (3000 Hz, 512 próbek, 12-bit)
- [x] Implementacja FFT (ArduinoFFT, okno Hamminga, H1-H25)
- [x] Obliczenia RMS i mocy (teoria Budeanu: P, Q₁, D, S, λ)
- [x] Logika Noise Gate (ADC dead zone + RMS gate + THD gate)
- [x] Wykrywanie częstotliwości (zero-crossing primary + FFT fallback)
- [x] Struktura JSON i publikacja MQTT (3s interval, ~2-3KB)
- [x] Dual-core: ISR na Core 0, processing na Core 1

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/01-ESP32-FIRMWARE.md
📅 Ostatnia weryfikacja: 2026-01-26

Kluczowe ustalenia (aktualne):
- Próbkowanie 3000 Hz (timer 333 μs), 512 próbek per bufor
- THD: H2-H25 (norma wymaga H2-H40, ale H25 to znaczące pokrycie)
- Teoria Budeanu poprawnie zaimplementowana (Q₁ vs D)
- Noise gate: ADC dead zone (4 LSB) + RMS gate (50 mA) + THD gate (~10.6 mA)
- Interwał MQTT: 3s (zgodne z dokumentacją)
- Zero-crossing frequency detection z FFT fallback (nowa funkcjonalność)
- Wysyłane są surowe próbki waveform (1 cykl, ~60 próbek)
- JSON payload: ~2-3 KB z waveforms
```

---

## 2. Java - Konfiguracja

**Cel:** Konfiguracja Spring Boot, MQTT, WebSocket, CORS, JPA

| Plik | Ścieżka | Opis |
|------|---------|------|
| AsyncConfig.java | `config/AsyncConfig.java` | Konfiguracja puli wątków async |
| CorsConfig.java | `config/CorsConfig.java` | Polityka CORS dla API |
| JpaConfig.java | `config/JpaConfig.java` | Konfiguracja JPA/Hibernate |
| MqttConfig.java | `config/MqttConfig.java` | Klient MQTT (Paho) |
| WebSocketConfig.java | `config/WebSocketConfig.java` | STOMP/SockJS endpoint |

### Kluczowe obszary do analizy:
- [ ] Parametry połączenia MQTT (QoS, keepalive, reconnect)
- [ ] Endpoint WebSocket i konfiguracja STOMP
- [ ] Ustawienia CORS (dozwolone originy)
- [ ] Konfiguracja puli wątków dla async

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/07-JAVA-CONFIGURATION.md

Kluczowe ustalenia:
- MQTT: Eclipse Paho + Spring Integration, QoS 1, auto-reconnect ✅
- WebSocket: STOMP + SockJS fallback dla compatibility ✅
- CORS: allowedOrigins("*") - KRYTYCZNY problem bezpieczeństwa ❌
- ⚠️ PROBLEM: cleanSession=true powoduje utratę wiadomości podczas restart
- ⚠️ PROBLEM: ESP32 QoS 0 vs Backend QoS 1 (efektywne QoS 0)
- ⚠️ PROBLEM: DB password w plain text w application.properties
- Dead code: AsyncConfig.java i JpaConfig.java (puste pliki)
- Flyway + Hibernate validate = wzorcowa konfiguracja migrations ✅
- Security score: 4.5/10 (wymaga pilnych poprawek CORS/WebSocket)
```

---

## 3. Java - Kontrolery

**Cel:** REST API endpoints

| Plik | Ścieżka | Endpoints |
|------|---------|-----------|
| DashboardController.java | `controller/DashboardController.java` | `/api/dashboard`, `/api/dashboard/power-quality-indicators` |
| HealthController.java | `controller/HealthController.java` | `/api/health` |
| MeasurementController.java | `controller/MeasurementController.java` | `/api/measurements` |
| StatsController.java | `controller/StatsController.java` | `/api/stats/*` |
| WebSocketController.java | `controller/WebSocketController.java` | WebSocket message handling |

### Kluczowe obszary do analizy:
- [ ] Struktura odpowiedzi API
- [ ] Obsługa błędów i walidacja
- [ ] Paginacja i filtry
- [ ] Dokumentacja API (jeśli istnieje)

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 4. Java - Serwisy

**Cel:** Logika biznesowa systemu

| Plik | Ścieżka | Odpowiedzialność |
|------|---------|------------------|
| MeasurementService.java | `service/MeasurementService.java` | Zapis pomiarów, obliczanie wskaźników PN-EN 50160 |
| MeasurementValidator.java | `service/MeasurementValidator.java` | Walidacja danych pomiarowych |
| MqttMessageHandler.java | `service/MqttMessageHandler.java` | Przetwarzanie wiadomości MQTT |
| WaveformService.java | `service/WaveformService.java` | Rekonstrukcja przebiegów z harmonicznych |
| WebSocketService.java | `service/WebSocketService.java` | Broadcast do klientów WebSocket |
| DataAggregationService.java | `service/DataAggregationService.java` | Agregacja dziennych statystyk |
| StatsService.java | `service/StatsService.java` | Pobieranie statystyk |

### Kluczowe obszary do analizy:
- [ ] Algorytm walidacji pomiarów (MeasurementValidator)
- [ ] Obliczanie wskaźników jakości energii
- [ ] Rozdzielanie mocy (P, Q, D, S)
- [ ] Synteza przebiegów z harmonicznych
- [ ] Wzorzec Event-Driven (MeasurementSavedEvent)
- [ ] Transakcyjność i spójność danych

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/04-JAVA-SERVICES.md
📅 Ostatnia weryfikacja: 2026-01-26

Kluczowe ustalenia (aktualne):
- Wzorcowa architektura event-driven (@TransactionalEventListener AFTER_COMMIT)
- Poprawna teoria Budeanu: S² = P² + Q₁² + D² w walidatorze
- IEC 61000-4-30: countEventsWithDuration() z progami czasowymi
- Thread-safe DataAggregationService (ReadWriteLock)
- ✅ ZWERYFIKOWANE: Constants.SAMPLING_RATE_HZ = 3000
- ✅ ZWERYFIKOWANE: Constants.HARMONICS_COUNT = 25
- ⚠️ UWAGA: Komentarze w Constants.java wciąż mówią o "harmonics 2-8" (należy zaktualizować)
- Brak circuit breaker w MqttMessageHandler (do rozważenia)
```

---

## 5. Java - Repozytoria

**Cel:** Dostęp do bazy danych (Spring Data JPA)

| Plik | Ścieżka | Encja |
|------|---------|-------|
| MeasurementRepository.java | `repository/MeasurementRepository.java` | Measurement |
| DailyStatsRepository.java | `repository/DailyStatsRepository.java` | DailyStats |

### Kluczowe obszary do analizy:
- [ ] Custom queries (JPQL/Native)
- [ ] Indeksowanie i wydajność zapytań
- [ ] Projekcje i DTO

### Notatki z analizy:
```
[Do uzupełnienia po analizy]
```

---

## 6. Java - Encje

**Cel:** Model danych (JPA Entities)

| Plik | Ścieżka | Tabela |
|------|---------|--------|
| Measurement.java | `model/entity/Measurement.java` | measurements |
| DailyStats.java | `model/entity/DailyStats.java` | daily_stats |

### Kluczowe obszary do analizy:
- [x] Mapowanie kolumn (harmoniczne jako tablice)
- [x] Relacje między encjami
- [x] Auditing (created_at, updated_at)
- [x] Indeksy i constrainty

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/03-JAVA-ENTITIES-MIGRATIONS.md

Kluczowe ustalenia:
- Wyjątkowa dokumentacja Javadoc w Measurement.java (266 linii, ~60% komentarze)
- PostgreSQL ARRAY dla harmonicznych (@JdbcTypeCode) - nieprzenośne
- KONFLIKT MIGRACJI V5/V7: V7 próbuje rename cos_phi→power_factor, ale V5 już usunęła cos_phi
- Brak relacji FK między measurements i daily_stats
- ✅ NAPRAWIONE (2026-01-23): Komentarze zaktualizowane "H1-H8" → "H1-H25"
- DailyStats używa primitive double (brak null semantyki)
```

---

## 7. Java - DTO

**Cel:** Obiekty transferu danych (Data Transfer Objects)

| Plik | Ścieżka | Użycie |
|------|---------|--------|
| MeasurementDTO.java | `model/dto/MeasurementDTO.java` | Odpowiedź API z pomiarem |
| MeasurementRequest.java | `model/dto/MeasurementRequest.java` | Dane z MQTT/ESP32 |
| DashboardDTO.java | `model/dto/DashboardDTO.java` | Dane dla widoku Dashboard |
| RealtimeDashboardDTO.java | `model/dto/RealtimeDashboardDTO.java` | Dane WebSocket real-time |
| PowerQualityIndicatorsDTO.java | `model/dto/PowerQualityIndicatorsDTO.java` | Wskaźniki PN-EN 50160 |
| WaveformDTO.java | `model/dto/WaveformDTO.java` | Dane przebiegów |
| StatsDTO.java | `model/dto/StatsDTO.java` | Statystyki dzienne |
| HistoryRequest.java | `model/dto/HistoryRequest.java` | Parametry zapytania historii |
| ValidationResult.java | `model/dto/ValidationResult.java` | Wynik walidacji |

### Kluczowe obszary do analizy:
- [x] Mapowanie Entity ↔ DTO
- [x] Serializacja JSON (@JsonProperty)
- [x] Walidacja (Bean Validation)

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/02-JAVA-DTO.md

Kluczowe ustalenia:
- ESP32 → MeasurementRequest: 93% zgodność (brak pola freq_valid)
- MeasurementDTO → Frontend: 100% zgodność
- StatsDTO → Frontend: 52% zgodność ⚠️ (12 pól brakuje w TypeScript)
- Bean Validation poprawne dla krytycznych pól
- Brak @Size dla tablic harmonicznych (potencjalny DoS)
- Ręczne mapowanie Entity→DTO (brak MapStruct)
- Nieaktualne komentarze: "H8" zamiast "H25"
```

---

## 8. Java - Wyjątki i Eventy

**Cel:** Obsługa błędów i komunikacja między komponentami

| Plik | Ścieżka | Typ |
|------|---------|-----|
| GlobalExceptionHandler.java | `exception/GlobalExceptionHandler.java` | @ControllerAdvice |
| MeasurementNotFoundException.java | `exception/MeasurementNotFoundException.java` | Exception |
| ValidationException.java | `exception/ValidationException.java` | Exception |
| MeasurementSavedEvent.java | `model/event/MeasurementSavedEvent.java` | ApplicationEvent |

### Kluczowe obszary do analizy:
- [ ] Struktura odpowiedzi błędów
- [ ] Kody HTTP i mapowanie wyjątków
- [ ] Event-driven architecture

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 9. Java - Utilities

**Cel:** Funkcje pomocnicze

| Plik | Ścieżka | Funkcje |
|------|---------|---------|
| Constants.java | `util/Constants.java` | Stałe systemowe |
| DateTimeUtils.java | `util/DateTimeUtils.java` | Operacje na datach |
| MathUtils.java | `util/MathUtils.java` | Obliczenia matematyczne |

### Kluczowe obszary do analizy:
- [x] Stałe PN-EN 50160 (limity napięcia, częstotliwości, THD)
- [x] Funkcje matematyczne (RMS, zaokrąglanie)

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/06-JAVA-UTILITIES.md

Kluczowe ustalenia:
- ✅ NAPRAWIONE: Constants.SAMPLING_RATE_HZ = 3000 Hz (było 800)
- ✅ NAPRAWIONE: Constants.HARMONICS_COUNT = 25 (było 8)
- Doskonała dokumentacja stałych z referencjami do PN-EN 50160 i IEC
- MathUtils: pure functions, poprawna matematyka (Fourier, trapezoid integration)
- ⚠️ PROBLEM: standardDeviation() dzieli przez n (powinno n-1 dla próby)
- ⚠️ PROBLEM: calculateApparentPower() niekompatybilne z teorią Budeanu (nieużywane)
- Dead code: DateTimeUtils.java (pusty plik)
- Dobre wzorce: Utility class pattern, immutability, functional style
- Ocena: 8.5/10 (po naprawach krytycznych)
```

---

## 10. Java - Migracje Bazy Danych

**Cel:** Schema evolution (Flyway)

| Plik | Ścieżka | Opis |
|------|---------|------|
| V1__Create_measurements_table.sql | `db/migration/V1__*.sql` | Tabela measurements |
| V2__Create_daily_stats_table.sql | `db/migration/V2__*.sql` | Tabela daily_stats |
| V3__Remove_unmeasurable_fields_and_add_indicators.sql | `db/migration/V3__*.sql` | Refaktoring schematu |
| V4__Add_is_valid_column.sql | `db/migration/V4__*.sql` | Flaga walidacji |
| V5__Refactor_power_parameters_for_distorted_waveforms.sql | `db/migration/V5__*.sql` | Moc odkształcenia |
| V7__Add_power_distortion_and_power_factor.sql | `db/migration/V7__*.sql` | Dodatkowe kolumny mocy |

**Uwaga:** Brak migracji V6 (skok numeracji)

### Kluczowe obszary do analizy:
- [x] Struktura tabel
- [x] Indeksy (szczególnie dla time-series)
- [x] Typy danych (tablice PostgreSQL)

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/03-JAVA-ENTITIES-MIGRATIONS.md

Kluczowe ustalenia:
- Wzorcowa dokumentacja SQL (business justification, IEC/PN-EN references)
- V1: measurements + idx_measurement_time (DESC dla recent-first)
- V2: daily_stats z pre-agregacją (1000x szybsze dashboardy)
- V3: Usunięcie pst_flicker (niemierzalne), dodanie wskaźników PN-EN 50160
- V5: Teoria Budeanu (Q₁ + D zamiast Q + cos_phi)
- KONFLIKT: V7 zakłada stan sprzed V5 - potencjalny FAIL
- Brak V6 (skok numeracji)
```

---

## 11. Frontend - Widoki

**Cel:** Główne strony aplikacji

| Plik | Ścieżka | Route |
|------|---------|-------|
| Dashboard.tsx | `webapp/src/views/Dashboard.tsx` | `/` |
| History.tsx | `webapp/src/views/History.tsx` | `/history` |

### Kluczowe obszary do analizy:
- [ ] Struktura layoutu
- [ ] Integracja z WebSocket
- [ ] State management
- [ ] Responsywność

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 12. Frontend - Komponenty

**Cel:** Reużywalne komponenty UI

| Plik | Ścieżka | Funkcja |
|------|---------|---------|
| WaveformChart.tsx | `components/WaveformChart.tsx` | Wykres oscyloskopowy (U, I) |
| HarmonicsChart.tsx | `components/HarmonicsChart.tsx` | Wykres słupkowy harmonicznych |
| StreamingChart.tsx | `components/StreamingChart.tsx` | Wykres strumieniowy real-time |
| LiveChart.tsx | `components/LiveChart.tsx` | Wykres live (alternatywny?) |
| PowerQualitySection.tsx | `components/PowerQualitySection.tsx` | Sekcja wskaźników PN-EN 50160 |
| ParameterCard.tsx | `components/ParameterCard.tsx` | Karta z parametrem |
| AlertPanel.tsx | `components/AlertPanel.tsx` | Panel alertów |
| GridSection.tsx | `components/GridSection.tsx` | Sekcja grid layout |
| StatusIndicator.tsx | `components/StatusIndicator.tsx` | Wskaźnik statusu połączenia |

### Kluczowe obszary do analizy:
- [ ] Wydajność renderowania (memo, useMemo)
- [ ] Obsługa pustych/błędnych danych
- [ ] Responsywność wykresów
- [ ] Skala logarytmiczna (harmoniczne)

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/05-FRONTEND-TYPES-COMPONENTS.md

Kluczowe ustalenia:
- WaveformChart: Auto-skalowanie A/mA dla małych prądów (ładowarki)
- HarmonicsChart: Skala log + obsługa 0 + info Nyquist (H2-H25)
- StreamingChart: Bufor kołowy, ale side effect w render body
- ✅ NAPRAWIONE (2026-01-23): PowerQualitySection: "H2-H25 przy 3000Hz" (było H2-H8 przy 800Hz)
- ✅ USUNIĘTE (2026-01-23): AlertPanel/LiveChart/GridSection - dead code usunięty
- Dobre optymalizacje: useMemo, useCallback, isAnimationActive={false}
```

---

## 13. Frontend - UI Kit

**Cel:** Bazowe komponenty UI (design system)

| Plik | Ścieżka | Komponenty |
|------|---------|------------|
| Button.tsx | `webapp/src/ui/Button.tsx` | Button |
| Card.tsx | `webapp/src/ui/Card.tsx` | Card |
| Icon.tsx | `webapp/src/ui/Icon.tsx` | Icon |
| index.ts | `webapp/src/ui/index.ts` | Eksporty |

### Kluczowe obszary do analizy:
- [ ] Warianty i props
- [ ] Stylowanie (Tailwind)
- [ ] Accessibility

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 14. Frontend - Hooks

**Cel:** Custom React Hooks

| Plik | Ścieżka | Funkcja |
|------|---------|---------|
| useWebSocket.ts | `hooks/useWebSocket.ts` | Połączenie STOMP/SockJS |
| useDashboardData.ts | `hooks/useDashboardData.ts` | Fetch danych dashboard |
| useHistoryData.ts | `hooks/useHistoryData.ts` | Fetch historii pomiarów |
| useLatestMeasurement.ts | `hooks/useLatestMeasurement.ts` | Ostatni pomiar |
| usePowerQualityIndicators.ts | `hooks/usePowerQualityIndicators.ts` | Wskaźniki jakości |

### Kluczowe obszary do analizy:
- [ ] Reconnect logic (WebSocket)
- [ ] Cache invalidation (React Query)
- [ ] Error handling
- [ ] Loading states

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 15. Frontend - Lib/Utilities

**Cel:** Funkcje pomocnicze i konfiguracja

| Plik | Ścieżka | Zawartość |
|------|---------|-----------|
| api.ts | `lib/api.ts` | Klient HTTP (fetch/axios) |
| constants.ts | `lib/constants.ts` | Stałe aplikacji |
| dateUtils.ts | `lib/dateUtils.ts` | Formatowanie dat |
| queryClient.ts | `lib/queryClient.ts` | Konfiguracja React Query |
| utils.ts | `lib/utils.ts` | Ogólne utility |

### Kluczowe obszary do analizy:
- [ ] Base URL i konfiguracja API
- [ ] Interceptory (auth, error handling)
- [ ] Query defaults (staleTime, cacheTime)

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 16. Frontend - Types

**Cel:** Definicje TypeScript

| Plik | Ścieżka | Typy |
|------|---------|------|
| api.ts | `types/api.ts` | MeasurementDTO, PowerQualityIndicatorsDTO, WaveformDTO, etc. |

### Kluczowe obszary do analizy:
- [ ] Zgodność z backend DTO
- [ ] Optional vs required fields
- [ ] Union types i discriminated unions

### Notatki z analizy:
```
✅ Szczegółowa analiza: docs/analysis/05-FRONTEND-TYPES-COMPONENTS.md
📅 Ostatnia weryfikacja: 2026-01-26

Kluczowe ustalenia (aktualne):
- MeasurementDTO, WaveformDTO, DashboardDTO: 100% zgodność z backend
- ✅ ZWERYFIKOWANE: StatsDTO teraz 100% zgodny (wszystkie 21 pól obecne)
- ✅ ZWERYFIKOWANE: Usunięto fałszywe pola avg_current, max_current
- Poprawne użycie snake_case (zgodne z Jackson SNAKE_CASE)
- Nullable fields: poprawne użycie `| null` dla explicit null z API
- PowerQualitySection: informacja o H2-H25 przy 3000Hz (zaktualizowane)
```

---

## 17. Infrastruktura

**Cel:** Konfiguracja środowiska

| Plik | Ścieżka | Funkcja |
|------|---------|---------|
| mosquitto.conf | `mosquitto/config/mosquitto.conf` | Broker MQTT |
| docker-compose.yml | `docker-compose.yml` | Dev environment |
| docker-compose.prod.yml | `docker-compose.prod.yml` | Prod environment |
| simulator.js | `esp32-simulator/simulator.js` | Symulator ESP32 |

### Kluczowe obszary do analizy:
- [ ] Porty i networking
- [ ] Volumes i persistence
- [ ] Environment variables
- [ ] Logika symulatora

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 18. Testy - Backend

**Cel:** Testy jednostkowe i integracyjne Java

| Kategoria | Pliki |
|-----------|-------|
| Base classes | BaseControllerTest, BaseIntegrationTest, BaseRepositoryTest, BaseServiceTest |
| Controllers | DashboardControllerTest, HealthControllerTest, MeasurementControllerTest, StatsControllerTest |
| Services | DataAggregationServiceTest, MeasurementServiceTest, MeasurementValidatorTest, MqttMessageHandlerTest, StatsServiceTest, WaveformServiceTest |
| Repositories | DailyStatsRepositoryTest, MeasurementRepositoryTest |
| Utils | MathUtilsTests |
| Exceptions | GlobalExceptionHandlerTest |

### Kluczowe obszary do analizy:
- [ ] Pokrycie kodu
- [ ] Mockowanie zależności
- [ ] Testy integracyjne (Testcontainers?)

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## 19. Testy - Frontend

**Cel:** Testy jednostkowe React

| Kategoria | Pliki |
|-----------|-------|
| Components | HarmonicsChart.test, StreamingChart.test, WaveformChart.test |
| UI | Button.test, Card.test, Icon.test, ParameterCard.test, PowerQualitySection.test, StatusIndicator.test |
| Hooks | useDashboardData.test, useHistoryData.test, usePowerQualityIndicators.test, useWebSocket.test |
| Lib | api.test, constants.test, dateUtils.test, utils.test |
| Utils | TestWrapper, test-utils, api-mock, mocks |

### Kluczowe obszary do analizy:
- [ ] Testing Library best practices
- [ ] Mock WebSocket
- [ ] Snapshot tests (jeśli są)

### Notatki z analizy:
```
[Do uzupełnienia po analizie]
```

---

## Kolejność Analizy (Proponowana)

1. **ESP32 Firmware** - źródło danych, zrozumienie formatu
2. **Java DTO** - kontrakt danych między warstwami
3. **Java Encje + Migracje** - model persystencji
4. **Java Serwisy** - logika biznesowa (najważniejsze)
5. **Java Kontrolery** - API endpoints
6. **Frontend Types** - zgodność z backendem
7. **Frontend Hooks** - integracja z API
8. **Frontend Komponenty** - wizualizacja
9. **Frontend Widoki** - całość UI
10. **Infrastruktura** - deployment
11. **Testy** - jakość kodu

---

## Historia Analizy

| Data | Moduł | Autor | Uwagi |
|------|-------|-------|-------|
| 2026-01-23 | ESP32 Firmware | Claude | Pełna analiza, ocena 8/10. Zidentyfikowano 8 problemów (2 krytyczne) |
| 2026-01-23 | Java DTO | Claude | Pełna analiza, ocena 7/10. StatsDTO niezgodny z Frontend (52%) |
| 2026-01-23 | Java Encje + Migracje | Claude | Pełna analiza, ocena 7.5/10. Konflikt migracji V5/V7, świetna dokumentacja SQL |
| 2026-01-23 | Java Serwisy | Claude | Pełna analiza, ocena 8/10. Event-driven architecture, Constants.java ma błędne wartości (800→3000 Hz) |
| 2026-01-23 | Frontend Types + Components | Claude | Pełna analiza, ocena 7/10. StatsDTO 52% zgodny, nieaktualne info "H2-H8 przy 800Hz" |
| 2026-01-23 | Java Utilities | Claude | Pełna analiza, ocena 8.5/10. Constants naprawione (3000Hz, H25). Dead code: DateTimeUtils |
| 2026-01-23 | Java Configuration | Claude | Pełna analiza, ocena 6/10. Security score 4.5/10 - CORS allow all, cleanSession=true problems |
| 2026-01-23 | Java Controllers | Claude | Pełna analiza, ocena 8/10. RESTful, OpenAPI (StatsController), brak auth/rate limiting |
| 2026-01-23 | Java Repositories | Claude | Pełna analiza, ocena 8.5/10. Spring Data JPA, brak N+1, composite index recommended |
| 2026-01-23 | Java Exceptions & Events | Claude | Pełna analiza, ocena 8.5/10. @RestControllerAdvice wzorcowe, event-driven AFTER_COMMIT |
| 2026-01-23 | Frontend (Views,UI,Hooks,Lib) | Claude | Skrócona analiza, ocena 8.5/10. React Query + WebSocket, CSV export, type-safe |
| 2026-01-23 | Infrastructure | Claude | Skrócona analiza, ocena 7.5/10. Docker Compose OK, brak MQTT auth, simulator excellent |

