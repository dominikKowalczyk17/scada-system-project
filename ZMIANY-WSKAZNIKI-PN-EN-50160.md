# Podsumowanie zmian: Implementacja wskaźników PN-EN 50160

Data: 2025-11-20

## 1. Cel zmian

Aktualizacja backendu i dokumentacji w celu:
- Usunięcia pól niemierzalnych (pst_flicker, capacitor_uf)
- Dodania wskaźników jakości energii PN-EN 50160
- Wyjaśnienia ograniczeń pomiarowych ESP32
- Oddzielenia wskaźników PN-EN 50160 od pozostałych pomiarów

## 2. Zmiany w bazie danych

### Migration V3: `V3__Remove_unmeasurable_fields_and_add_indicators.sql`

**Usunięte pola:**
- `pst_flicker` - wymaga filtru IEC 61000-4-15 i próbkowania 20 kHz (poza możliwościami ESP32)
- `capacitor_uf` - nie zaimplementowane, pierwotnie planowane dla kompensacji mocy biernej

**Dodane pola:**
- `voltage_deviation_percent` - wskaźnik PN-EN 50160 Grupa 1 (odchylenie napięcia)
- `frequency_deviation_hz` - wskaźnik PN-EN 50160 Grupa 2 (odchylenie częstotliwości)

**Zaktualizowane komentarze:**
- Wszystkie kolumny mają szczegółowe komentarze SQL wyjaśniające ich przeznaczenie
- Komentarze zawierają wzory obliczeniowe i limity norm
- Zaznaczono ograniczenia (np. harmoniczne tylko 2-8, nie 2-40)

## 3. Zmiany w kodzie Java

### 3.1. Model danych

**Measurement.java**
- Dodano pola: `voltageDeviationPercent`, `frequencyDeviationHz`
- Dodano obszerne JavaDoc do każdego pola
- Wyjaśniono ograniczenia harmonicznych (H1-H8 zamiast H1-H40)
- Wyjaśniono że THD jest niekompletne (dolne ograniczenie)

**MeasurementDTO.java**
- Dodano pola: `voltageDeviationPercent`, `frequencyDeviationHz`
- JavaDoc wyjaśniający różnicę między surowymi pomiarami a wskaźnikami

**PowerQualityIndicatorsDTO.java** (NOWY PLIK)
- DTO dedykowane dla wskaźników PN-EN 50160
- Zawiera flagi zgodności (`voltageWithinLimits`, `frequencyWithinLimits`, `thdWithinLimits`)
- Flaga `overallCompliant` - ogólny status zgodności
- Pole `statusMessage` - czytelny komunikat o stanie jakości energii

### 3.2. Stałe

**Constants.java**
- Dodano stałe PN-EN 50160:
  - `NOMINAL_VOLTAGE` = 230V
  - `NOMINAL_FREQUENCY` = 50Hz
  - `VOLTAGE_DEVIATION_UPPER/LOWER_LIMIT_PERCENT` = ±10%
  - `FREQUENCY_DEVIATION_UPPER/LOWER_LIMIT_HZ` = ±0.5Hz
- Dodano stałe specyfikacji systemu:
  - `HARMONICS_COUNT` = 8
  - `SAMPLING_RATE_HZ` = 800
  - `NYQUIST_FREQUENCY_HZ` = 400
  - `MAX_HARMONIC_ORDER` = 8
- Wszystkie stałe mają JavaDoc z wyjaśnieniami

### 3.3. Logika biznesowa

**MeasurementService.java**
- Dodano metodę `calculatePowerQualityIndicators(Measurement measurement)`:
  - Oblicza odchylenie napięcia: (U - 230) / 230 × 100%
  - Oblicza odchylenie częstotliwości: f - 50 Hz
  - Wywołana automatycznie przy zapisie pomiaru
- Dodano metodę `getLatestMeasurementEntity()` dla kontrolerów
- Zaktualizowano `toDTO()` aby uwzględniał nowe pola wskaźników

**DashboardController.java**
- Dodano nowy endpoint: `GET /api/dashboard/power-quality-indicators`
- Endpoint zwraca `PowerQualityIndicatorsDTO` z:
  - Wskaźnikami PN-EN 50160 (odchylenia napięcia/częstotliwości, THD, harmoniczne)
  - Flagami zgodności z limitami normy
  - Ogólnym statusem zgodności
  - Czytelnym komunikatem statusu
- Metody pomocnicze sprawdzające zgodność z limitami:
  - `checkVoltageCompliance()` - czy napięcie w zakresie ±10%
  - `checkFrequencyCompliance()` - czy częstotliwość w zakresie ±0.5Hz
  - `checkThdCompliance()` - czy THD <8%
  - `buildStatusMessage()` - buduje komunikat o stanie zgodności

## 4. Nowa dokumentacja

### 4.1. ESP32-MEASUREMENT-SPECS.md (NOWY PLIK, po polsku)

Zawartość:
- Parametry sprzętowe ESP32 (ADC 12-bit, próbkowanie 800-1000 Hz)
- Tabela ograniczeń Nyquista (częstotliwość próbkowania → maksymalna harmoniczna)
- Możliwości pomiarowe według 5 grup PN-EN 50160:
  - Grupa 1 (Napięcie): MOŻLIWE
  - Grupa 2 (Częstotliwość): MOŻLIWE
  - Grupa 3 (Wahania i flicker): NIEMOŻLIWE (wymaga sprzętu IEC 61000-4-15)
  - Grupa 4 (Odkształcenia): CZĘŚCIOWO (THD i harmoniczne 2-8)
  - Grupa 5 (Nieciągłości): WYKRYWALNE (osobny issue)
- Dokładności pomiarów (±1-3% dla RMS, ±0.01-0.02 Hz dla częstotliwości)
- Zalecane algorytmy (okna pomiarowe, FFT/DFT, Goertzel)
- Kontekst akademicki (projekt inżynierski, system demonstracyjny)
- Planowany rozwój (fazy 1-4)

### 4.2. POWER-QUALITY-INDICATORS.md (NOWY PLIK, po polsku)

Zawartość:
- 5 grup wskaźników PN-EN 50160 z definicjami normy
- Szczegółowe mapowanie każdego wskaźnika na możliwości systemu
- Dla każdego wskaźnika:
  - Definicja normy
  - Wzór obliczeniowy
  - Źródło danych w bazie (pole DB)
  - Metoda pomiaru
  - Dokładność
  - Limit normy
  - Status (możliwe/częściowo/niemożliwe)
  - Powód ograniczenia (jeśli dotyczy)
- Tabela podsumowująca wszystkie wskaźniki
- Tabela pozostałych pomiarów (poza PN-EN 50160): cos φ, moc, THD prądu
- Architektura frontendu (podział na sekcje)
- Wnioski i zakres stosow alności systemu
- Referencje do norm (PN-EN 50160, IEC 61000-x-x)

## 5. Aktualizacje wymagane w istniejącej dokumentacji

### 5.1. BACKEND-IMPLEMENTATION.md - wymagane zmiany:

**Linia ~146** (sekcja Measurement entity):
- Zmienić "harmonics (2nd to 40th order)" → "harmonics (2nd to 8th order)"
- Usunąć wzmianki o `pst_flicker` i `capacitor_uf`
- Dodać `voltage_deviation_percent` i `frequency_deviation_hz`

**Dodać nową sekcję** (po "Database Schema"):
```
## Możliwości pomiarowe i ograniczenia

System mierzy podzbiór wskaźników PN-EN 50160 ze względu na ograniczenia sprzętowe ESP32:
- Harmoniczne: H1-H8 (50-400 Hz) - ograniczenie Nyquista przy 800-1000 Hz
- THD: niekompletne (harmoniczne 2-8 zamiast 2-40)
- Flicker (P_st/P_lt): niemożliwy (wymaga IEC 61000-4-15 i 20 kHz)
- Szczegóły: patrz ESP32-MEASUREMENT-SPECS.md i POWER-QUALITY-INDICATORS.md
```

**Sekcja Controllers** - dodać opis nowego endpointu:
```
### DashboardController
- GET /api/dashboard - dane ogólne (napięcie, prąd, moc, przebiegi)
- GET /api/dashboard/power-quality-indicators - wskaźniki PN-EN 50160
```

### 5.2. CLAUDE.md - wymagane zmiany:

**Sekcja "Electrical Parameters Monitored"** - zaktualizować listę:
```
- Napięcie, Prąd RMS
- Moc czynna/bierna/pozorna, współczynnik mocy
- Częstotliwość (detekcja zero-crossing)
- THD napięcia i prądu (harmoniczne 2-8)
- Harmoniczne: 8 wartości (H1-H8, od 50 Hz do 400 Hz)
- Wskaźniki PN-EN 50160:
  - Odchylenie napięcia od 230V (Grupa 1)
  - Odchylenie częstotliwości od 50Hz (Grupa 2)
  - THD i harmoniczne (Grupa 4, częściowo)
```

**Dodać sekcję "Ograniczenia systemu"**:
```
## Ograniczenia systemu

**Ograniczenia pomiarowe:**
- Harmoniczne: tylko H1-H8 (ograniczenie Nyquista przy 800-1000 Hz)
- THD niekompletne (reprezentuje dolne ograniczenie)
- Brak pomiaru flickera (P_st/P_lt) - wymaga IEC 61000-4-15
- Dokładność: ±1-3% dla RMS po kalibracji

**Kontekst akademicki:**
- Projekt inżynierski (praca licencjacka)
- System demonstracyjny, nie certyfikowany
- Budżet: 1000 PLN (ogranicza sprzęt)
- Cel: edukacyjna demonstracja zasad SCADA i PN-EN 50160
```

**Sekcja "Backend - Completed"** - zaktualizować:
- Dodać: "Wskaźniki PN-EN 50160 (Groups 1, 2, 4 partial)"
- Dodać: "PowerQualityIndicatorsDTO i endpoint"
- Dodać: "Migration V3 (usunięcie niemierzalnych pól)"

**Sekcja "Important Design Decisions"** - dodać punkt:
```
8. **Wskaźniki PN-EN 50160**: Backend oblicza wskaźniki jakości energii (odchylenia napięcia/częstotliwości) z surowych pomiarów ESP32. Oddzielny endpoint dla wskaźników PN-EN 50160 vs pomiary ogólne.
```

## 6. API Endpointy

### Nowy endpoint: /api/dashboard/power-quality-indicators

**Request:**
```
GET /api/dashboard/power-quality-indicators
```

**Response 200 OK:**
```json
{
  "timestamp": "2025-11-20T10:30:00Z",
  "voltageRms": 232.5,
  "voltageDeviationPercent": 1.09,
  "voltageWithinLimits": true,
  "frequency": 50.02,
  "frequencyDeviationHz": 0.02,
  "frequencyWithinLimits": true,
  "thdVoltage": 3.2,
  "thdWithinLimits": true,
  "harmonicsVoltage": [230.0, 7.5, 4.2, 2.1, 1.8, 1.2, 0.9, 0.7],
  "overallCompliant": true,
  "statusMessage": "All indicators within PN-EN 50160 limits"
}
```

**Response 404 Not Found:**
Brak pomiarów w bazie danych.

**Użycie:**
Frontend wyświetla osobną sekcję "Wskaźniki jakości energii PN-EN 50160" z:
- Odchyleniem napięcia z limitem ±10%
- Odchyleniem częstotliwości z limitem ±0.5 Hz
- THD z limitem 8% i ostrzeżeniem "częściowy pomiar (H2-H8)"
- Wykresem harmonicznych
- Ogólnym statusem zgodności

## 7. Architektura frontendu (zalecany podział)

**Sekcja 1: Wskaźniki jakości energii PN-EN 50160**
- Endpoint: `/api/dashboard/power-quality-indicators`
- Wyświetla:
  - Odchylenie napięcia z limitem ±10% (wskaźnik Grupy 1)
  - Odchylenie częstotliwości z limitem ±0.5 Hz (wskaźnik Grupy 2)
  - THD napięcia z limitem 8% + ostrzeżenie "częściowy pomiar" (wskaźnik Grupy 4)
  - Wykres harmonicznych H1-H8
  - Ogólny status zgodności (zielony/czerwony)
  - Komunikat statusu

**Sekcja 2: Pozostałe pomiary**
- Endpoint: `/api/dashboard` (istniejący)
- Wyświetla:
  - Napięcie RMS, Prąd RMS
  - Moc czynna, bierna, pozorna
  - Współczynnik mocy (cos φ)
  - THD prądu (diagnostyka)
  - Harmoniczne prądu (diagnostyka)
  - Przebiegi czasowe

**Sekcja 3: Zdarzenia (events)** - TODO (osobny issue)
- Endpoint: `/api/events` (do zaimplementowania)
- Wyświetla:
  - Historia zapadów napięcia
  - Historia przepięć
  - Historia przerw
  - Timeline zdarzeń

## 8. Testy i weryfikacja

### Co przetestować:

**Backend:**
1. Migration V3 - czy pola zostały poprawnie usunięte/dodane
2. `MeasurementService.calculatePowerQualityIndicators()` - czy poprawnie oblicza odchylenia
3. Endpoint `/api/dashboard/power-quality-indicators` - czy zwraca poprawne dane
4. Flagi zgodności - czy poprawnie sprawdzają limity PN-EN 50160

**ESP32 Mock:**
1. Czy wysyła 8 harmonicznych (H1-H8) - ZWERYFIKOWANE ✓
2. Czy NIE wysyła pst_flicker - ZWERYFIKOWANE ✓
3. Czy NIE wysyła capacitor_uf - ZWERYFIKOWANE ✓

**Frontend (po zaimplementowaniu):**
1. Czy wyświetla osobną sekcję wskaźników PN-EN 50160
2. Czy poprawnie pokazuje limity i flagi zgodności
3. Czy ostrzeżenie o częściowym THD jest widoczne

## 9. Kontekst akademicki

Ten system jest projektem inżynierskim (praca licencjacka) mającym na celu demonstrację:
- Zasad działania systemów SCADA
- Podstaw monitorowania jakości energii PN-EN 50160
- Ograniczeń sprzętowych (Nyquist, rozdzielczość ADC)
- Architektury IoT (ESP32 → MQTT → Backend → Frontend)

**System NIE jest:**
- Certyfikowanym analizatorem jakości energii
- Zgodnym z klasą A IEC 61000-4-30
- Przeznaczonym do rozliczeń handlowych
- Profesjonalnym narzędziem audytowym

**System JEST:**
- Narzędziem edukacyjnym i demonstracyjnym
- Użytecznym do monitorowania podstawowych parametrów w domu
- Przykładem implementacji standardów IEC/PN-EN
- Platformą do nauki analizy harmonicznej i FFT

## 10. Przypisy i referencje

**Normy:**
- PN-EN 50160:2010 - Parametry napięcia zasilającego w publicznych sieciach elektroenergetycznych
- IEC 61000-4-7:2002 - Metody pomiaru harmonicznych i interharmonicznych
- IEC 61000-4-15:2010 - Flickermeter (pomiar migotania)
- IEC 61000-4-30:2015 - Metody pomiaru jakości energii
- IEC 61000-3-2:2018 - Limity emisji harmonicznych prądu

**Dokumentacja projektu:**
- ESP32-MEASUREMENT-SPECS.md - szczegóły techniczne możliwości pomiarowych
- POWER-QUALITY-INDICATORS.md - mapowanie wskaźników PN-EN 50160
- BACKEND-IMPLEMENTATION.md - architektura backendu
- CLAUDE.md - główna dokumentacja projektu

**Pliki kodu (kluczowe):**
- `scada-system/src/main/resources/db/migration/V3__Remove_unmeasurable_fields_and_add_indicators.sql`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/model/entity/Measurement.java`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/model/dto/PowerQualityIndicatorsDTO.java`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/service/MeasurementService.java`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/controller/DashboardController.java`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/util/Constants.java`

## 11. Dalszy rozwój

**Faza następna (issue events):**
- Implementacja wykrywania zdarzeń (zapady, przepięcia, przerwy)
- Osobna tabela `power_quality_events` w bazie
- Endpoint `/api/events` dla frontendu
- Circular buffer na ESP32 dla snapshot surowych próbek przy zdarzeniu

**Fazy przyszłe:**
- Dashboard analizy długookresowej (trendy 10-minutowe, godzinowe)
- Raportowanie zgodności z PN-EN 50160
- Alerty i notyfikacje

**Opcjonalnie (poza scope pracy):**
- Próbkowanie 5 kHz (harmoniczne do H40) przy wyłączonym WiFi
- Zewnętrzny ADC 16/24-bit
- Pomiar trójfazowy
