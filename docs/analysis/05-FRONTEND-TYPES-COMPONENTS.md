# Analiza Modułów: Frontend Types + Components

**Pliki Types:** 1 plik (api.ts)
**Pliki Components:** 9 komponentów
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## CZĘŚĆ I: Frontend Types (api.ts)

### 1.1 Przegląd Typów

| Interface | Pola | Backend Odpowiednik | Zgodność |
|-----------|------|---------------------|----------|
| MeasurementDTO | 16 | MeasurementDTO.java | ✅ 100% |
| PowerQualityIndicatorsDTO | 12 | PowerQualityIndicatorsDTO.java | ✅ 100% |
| WaveformDTO | 2 | WaveformDTO.java | ✅ 100% |
| RealtimeDashboardDTO | 2 | RealtimeDashboardDTO.java | ✅ 100% |
| DashboardDTO | 3 | DashboardDTO.java | ✅ 100% |
| **StatsDTO** | **11** | StatsDTO.java (21 pól) | ⚠️ **52%** |
| ErrorResponse | 5 | GlobalExceptionHandler | ✅ 100% |
| HealthResponse | 3 | HealthController | ✅ 100% |

### 1.2 Konwencja Nazewnicza

```typescript
// Frontend używa snake_case (zgodnie z Jackson SNAKE_CASE w backend)
export interface MeasurementDTO {
  voltage_rms?: number;      // ✅ snake_case
  power_reactive?: number;   // ✅ snake_case
  harmonics_v?: number[];    // ✅ snake_case
}
```

**Dobra praktyka:** Typy odzwierciedlają JSON z backendu (snake_case).

### 1.3 KRYTYCZNY PROBLEM: StatsDTO ⚠️

#### Backend StatsDTO.java (21 pól):
```java
private double avgVoltage, minVoltage, maxVoltage, stdDevVoltage;
private double avgPowerActive, peakPower, minPower, totalEnergyKwh;
private double avgPowerFactor, minPowerFactor;
private double avgFrequency, minFrequency, maxFrequency;
private int voltageSagCount, voltageSwellCount, interruptionCount;
private int thdViolationsCount, frequencyDevCount, powerFactorPenaltyCount;
private int measurementCount;
private double dataCompleteness;
```

#### Frontend api.ts (11 pól):
```typescript
export interface StatsDTO {
  date: string;
  avg_voltage: number;
  min_voltage: number;
  max_voltage: number;
  avg_current: number;       // ⚠️ NIE ISTNIEJE w backend!
  max_current: number;       // ⚠️ NIE ISTNIEJE w backend!
  total_energy_kwh: number;
  voltage_sag_count: number;
  voltage_swell_count: number;
  thd_violations_count: number;
  data_completeness: number;
  measurement_count: number;
}
```

#### Brakujące pola w Frontend:

| Backend pole | Snake_case | Obecne w TS? |
|--------------|------------|--------------|
| stdDevVoltage | std_dev_voltage | ❌ |
| avgPowerActive | avg_power_active | ❌ |
| peakPower | peak_power | ❌ |
| minPower | min_power | ❌ |
| avgPowerFactor | avg_power_factor | ❌ |
| minPowerFactor | min_power_factor | ❌ |
| avgFrequency | avg_frequency | ❌ |
| minFrequency | min_frequency | ❌ |
| maxFrequency | max_frequency | ❌ |
| interruptionCount | interruption_count | ❌ |
| frequencyDevCount | frequency_dev_count | ❌ |
| powerFactorPenaltyCount | power_factor_penalty_count | ❌ |

#### Fałszywe pola w Frontend:

| Frontend pole | Istnieje w Backend? |
|---------------|---------------------|
| avg_current | ❌ NIE |
| max_current | ❌ NIE |

**Konsekwencja:** Dashboard statystyk nie może wyświetlić pełnych danych.

### 1.4 Nullable Fields

```typescript
// Poprawne użycie optional (?)
export interface MeasurementDTO {
  id?: number;           // Może być undefined przy tworzeniu
  voltage_rms?: number;  // Może być null z backend
}

// Poprawne użycie union z null
export interface PowerQualityIndicatorsDTO {
  voltage_deviation_percent: number | null;  // Explicit null możliwe
  voltage_within_limits: boolean | null;     // Explicit null możliwe
}
```

---

## CZĘŚĆ II: Frontend Components

### 2.1 Przegląd Komponentów

| Komponent | Linie | Biblioteka wykresów | Cel |
|-----------|-------|---------------------|-----|
| WaveformChart | 186 | Recharts | Oscyloskop U/I |
| HarmonicsChart | 232 | Recharts | Spektrum harmonicznych |
| StreamingChart | 203 | Recharts | Real-time trending |
| PowerQualitySection | 273 | - | Wskaźniki PN-EN 50160 |
| ParameterCard | 71 | - | Karta parametru |
| StatusIndicator | 26 | - | Wskaźnik statusu |
| AlertPanel | 69 | - | Panel alertów |
| GridSection | 64 | - | Sekcja siatki |
| LiveChart | 75 | SVG (custom) | Demo wykres |

### 2.2 WaveformChart.tsx (186 linii)

**Cel:** Oscyloskop dwukanałowy (napięcie + prąd)

#### Kluczowe Funkcje

```typescript
// Auto-skalowanie osi prądu dla małych wartości (ładowarki telefonów)
const maxCurrent = Math.max(...waveforms.current.map(Math.abs));
const useMilliamps = maxCurrent < 0.5; // <0.5A → show in mA
const currentMultiplier = useMilliamps ? 1000 : 1;
const currentUnit = useMilliamps ? "mA" : "A";
```

**Zalety:**
- ✅ Dwie niezależne osie Y (napięcie/prąd)
- ✅ Auto-skalowanie jednostek (A/mA)
- ✅ Walidacja długości tablic
- ✅ Responsywność (różne wysokości dla breakpointów)
- ✅ `isAnimationActive={false}` - optymalizacja wydajności

**Problem:**
- ⚠️ Brak obsługi pustych danych (poza walidacją długości)

### 2.3 HarmonicsChart.tsx (232 linie)

**Cel:** Wykres słupkowy harmonicznych (skala logarytmiczna)

#### Kluczowe Funkcje

```typescript
// Komentarz o ograniczeniu Nyquista - POPRAWNY!
// Limited to H1-H25 (50Hz-1250Hz) due to Nyquist constraint at 3000Hz sampling rate
const chartData = useMemo(() => {
  return harmonicsVoltage.map((vHarmonic, index) => {
    // CRITICAL FIX: Replace 0 with minimum displayable value for log scale
    if (scaledCurrent === 0) {
      scaledCurrent = useMilliamps ? 0.001 : 0.000001; // 0.001mA or 1µA
    }
    return {
      harmonic: `H${index + 1}`,
      frequency: (index + 1) * 50,
      voltage: vHarmonic,
      current: scaledCurrent,
    };
  });
}, [harmonicsVoltage, harmonicsCurrent, useMilliamps]);
```

**Zalety:**
- ✅ Skala logarytmiczna dla szerokiego zakresu
- ✅ Obsługa wartości 0 na skali log (zamiana na minimum)
- ✅ Przełącznik napięcie/prąd
- ✅ Informacja o ograniczeniu Nyquista dla użytkownika
- ✅ useMemo dla optymalizacji

**Informacja dla użytkownika:**
```tsx
<div className="flex items-start gap-2 bg-yellow-500/10 ...">
  <Info className="w-4 h-4 text-yellow-600" />
  <p className="text-xs text-yellow-700">
    <strong>Ograniczenie Nyquista:</strong> System próbkuje przy 3000Hz...
    THD jest obliczane z H2-H25 zamiast pełnego zakresu H2-H40...
  </p>
</div>
```

### 2.4 StreamingChart.tsx (203 linie)

**Cel:** Real-time streaming wykres (oscyloskop-style)

#### Architektura Bufora Kołowego

```typescript
const [buffer, set_buffer] = useState<ChartDataPoint[]>([]);
const last_timestamp_ref = useRef<number>(0);

const add_measurement = useCallback(
  (measurement: MeasurementDTO) => {
    // Deduplikacja po timestamp
    if (timestamp === last_timestamp_ref.current) return;
    last_timestamp_ref.current = timestamp;

    // Circular buffer: keep last N points
    set_buffer((prev_buffer) => [
      ...prev_buffer.slice(-(max_buffer_size - 1)),
      new_point,
    ]);
  },
  [parameter_key, max_buffer_size]
);
```

**Zalety:**
- ✅ Konfigurowalny rozmiar bufora (default: 60 = 3 min @ 3s)
- ✅ Deduplikacja po timestamp (ref-based)
- ✅ useCallback dla stabilności referencji
- ✅ Mini-statystyki (min/avg/max ostatnich 10)

**Problem:**
- ⚠️ Side effect w render (linie 101-104):
```typescript
// To powinno być w useEffect!
if (latest_measurement && measurement_timestamp !== previous_measurement_timestamp_ref.current) {
  previous_measurement_timestamp_ref.current = measurement_timestamp;
  add_measurement(latest_measurement);
}
```

### 2.5 PowerQualitySection.tsx (273 linie)

**Cel:** Wyświetlanie wskaźników PN-EN 50160

#### Struktura

```
┌─────────────────────────────────────────────────────────────────┐
│ Wskaźniki jakości energii PN-EN 50160        [Status: OK/⚠️]   │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ Ostrzeżenie (jeśli overall_compliant === false)              │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️ Ograniczenia pomiarowe (THD H2-H8)                           │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│ │ Napięcie    │ │ Częstotl.   │ │ THD         │               │
│ │ 231.5 V     │ │ 50.02 Hz    │ │ 2.3%        │               │
│ │ +0.65%      │ │ +0.02 Hz    │ │ H2-H8       │               │
│ │ ✅ W normie │ │ ✅ W normie │ │ ✅ W normie │               │
│ └─────────────┘ └─────────────┘ └─────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│ Podsumowanie zgodności: [status_message]                        │
└─────────────────────────────────────────────────────────────────┘
```

**Zalety:**
- ✅ Pełna implementacja PN-EN 50160 Groups 1, 2, 4
- ✅ Trójstanowy status (null/true/false)
- ✅ Informacja o ograniczeniach pomiarowych
- ✅ Polskie etykiety

**PROBLEM: Nieaktualna informacja o harmonicznych ⚠️**

```tsx
// Linia 110-111:
<p className="text-sm text-yellow-700">
  THD obliczane tylko z harmonicznych H2-H8 (ograniczenie Nyquista przy 800Hz).
</p>
```

**Błąd:** System próbkuje przy 3000 Hz i mierzy H2-H25, nie H2-H8 przy 800 Hz!

### 2.6 ParameterCard.tsx (71 linii)

**Cel:** Uniwersalna karta parametru z progress bar

```typescript
interface ParameterCardProps {
  title: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical";
  min: string;
  max: string;
  trend?: "rising" | "falling" | "stable";
}
```

**Zalety:**
- ✅ Progress bar na podstawie min/max
- ✅ Ikony trendu (TrendingUp/Down/Minus)
- ✅ Status colors (success/warning/destructive)

### 2.7 StatusIndicator.tsx (26 linii)

```typescript
export const StatusIndicator = ({ status, label }: StatusIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn("w-3 h-3 rounded-full", statusColors[status])} />
        <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-75" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};
```

**Zalety:**
- ✅ Animacja ping dla żywego wskaźnika
- ✅ Prosty, reużywalny

### 2.8 AlertPanel.tsx (69 linii) - PROBLEM

```typescript
// HARDCODED dane! Nie pobiera z backendu
const alerts: Alert[] = [
  { id: "1", type: "warning", message: "High load detected in Sector B", ... },
  { id: "2", type: "info", message: "Maintenance scheduled for 22:00", ... },
  { id: "3", type: "critical", message: "Voltage spike detected", ... },
];
```

**Problemy:**
- ❌ Dane hardcoded (nie z API)
- ❌ Angielskie komunikaty (reszta UI po polsku)
- ❌ Brak integracji z rzeczywistymi alertami

### 2.9 GridSection.tsx (64 linie) - NIEUŻYWANY?

Komponent wyświetla "sektory sieci" z load/capacity w MW - wygląda na pozostałość z demo/prototypu.

### 2.10 LiveChart.tsx (75 linii) - DEMO

```typescript
// Random data generator - NIE używa rzeczywistych danych
useEffect(() => {
  const interval = setInterval(() => {
    setDataPoints((prev) => {
      const newData = [...prev.slice(1), Math.random() * 30 + 220];
      return newData;
    });
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

**Status:** Demo/placeholder - nie używa rzeczywistych danych MQTT.

---

## 3. Analiza Wydajności

### 3.1 Optymalizacje ✅

| Komponent | Technika | Status |
|-----------|----------|--------|
| HarmonicsChart | useMemo | ✅ |
| StreamingChart | useCallback, useRef | ✅ |
| WaveformChart | isAnimationActive={false} | ✅ |
| StreamingChart | ResponsiveContainer debounce={100} | ✅ |

### 3.2 Problemy Wydajności

| Komponent | Problem | Wpływ |
|-----------|---------|-------|
| StreamingChart | Side effect w render body | Potencjalne re-renders |
| WaveformChart | Brak memo dla chartData | Minor |

---

## 4. Zidentyfikowane Problemy

### 4.1 Krytyczne

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 1 | StatsDTO tylko 52% zgodny z backend | api.ts:75-88 | Dashboard statystyk niepełny |
| 2 | Fałszywe pola avg_current, max_current | api.ts:80-81 | Runtime error przy użyciu |

### 4.2 Średnie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 3 | "H2-H8 przy 800Hz" zamiast "H2-H25 przy 3000Hz" | PowerQualitySection:110 | Dezinformacja użytkownika |
| 4 | Side effect w render body | StreamingChart:101-104 | Potencjalne re-renders |
| 5 | AlertPanel hardcoded data | AlertPanel:13-17 | Brak rzeczywistych alertów |

### 4.3 Niskie

| # | Problem | Lokalizacja | Wpływ |
|---|---------|-------------|-------|
| 6 | LiveChart/GridSection nieużywane | LiveChart.tsx, GridSection.tsx | Dead code |
| 7 | Mieszane języki (EN alerts, PL UI) | AlertPanel.tsx | Niespójność UX |

---

## 5. Zgodność z Backend

### 5.1 Macierz Zgodności Typów

| Frontend Type | Backend DTO | Zgodność | Uwagi |
|---------------|-------------|----------|-------|
| MeasurementDTO | MeasurementDTO.java | ✅ 100% | - |
| PowerQualityIndicatorsDTO | PowerQualityIndicatorsDTO.java | ✅ 100% | - |
| WaveformDTO | WaveformDTO.java | ✅ 100% | - |
| RealtimeDashboardDTO | RealtimeDashboardDTO.java | ✅ 100% | - |
| DashboardDTO | DashboardDTO.java | ✅ 100% | - |
| StatsDTO | StatsDTO.java | ⚠️ 52% | 10 pól brakuje, 2 fałszywe |
| ErrorResponse | GlobalExceptionHandler | ✅ 100% | - |
| HealthResponse | HealthController | ✅ 100% | - |

### 5.2 Rekomendowana Poprawka StatsDTO

```typescript
export interface StatsDTO {
  date: string;

  // Voltage
  avg_voltage: number;
  min_voltage: number;
  max_voltage: number;
  std_dev_voltage: number;  // DODAĆ

  // Power
  avg_power_active: number; // DODAĆ
  peak_power: number;       // DODAĆ
  min_power: number;        // DODAĆ
  total_energy_kwh: number;

  // Power Factor
  avg_power_factor: number; // DODAĆ
  min_power_factor: number; // DODAĆ

  // Frequency
  avg_frequency: number;    // DODAĆ
  min_frequency: number;    // DODAĆ
  max_frequency: number;    // DODAĆ

  // Events
  voltage_sag_count: number;
  voltage_swell_count: number;
  interruption_count: number;      // DODAĆ
  thd_violations_count: number;
  frequency_dev_count: number;     // DODAĆ
  power_factor_penalty_count: number; // DODAĆ

  // Meta
  measurement_count: number;
  data_completeness: number;

  // USUNĄĆ: avg_current, max_current (nie istnieją w backend)
}
```

---

## 6. Podsumowanie

### 6.1 Ocena

| Moduł | Ocena | Uzasadnienie |
|-------|-------|--------------|
| Frontend Types | 6/10 | StatsDTO 52% zgodny, reszta OK |
| Frontend Components | 7.5/10 | Dobre wykresy, nieaktualne info o harmonicznych |
| **Łącznie** | **7/10** | |

### 6.2 Mocne Strony

- Poprawna konwencja snake_case zgodna z Jackson
- Dobre optymalizacje wydajności (useMemo, useCallback, no animations)
- Informacje o ograniczeniach Nyquista dla użytkownika
- Auto-skalowanie jednostek (A/mA) dla małych prądów
- Obsługa wartości 0 na skali logarytmicznej

### 6.3 Słabe Strony

- StatsDTO krytycznie niezgodny z backend (52%)
- Nieaktualna informacja "H2-H8 przy 800Hz" (powinno być H2-H25 przy 3000Hz)
- AlertPanel/LiveChart/GridSection to dead code lub hardcoded demo
- Side effect w render body (StreamingChart)

### 6.4 Rekomendacje

1. **PILNE:** Poprawić StatsDTO - dodać brakujące 10 pól, usunąć 2 fałszywe
2. **PILNE:** Poprawić PowerQualitySection - "H2-H25 przy 3000Hz"
3. Przenieść side effect do useEffect (StreamingChart)
4. Usunąć lub zintegrować AlertPanel z rzeczywistym API
5. Rozważyć usunięcie LiveChart i GridSection (dead code)
