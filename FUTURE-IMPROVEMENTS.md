# Future Improvements and TODOs

## Real Waveform Data Support (TODO)

**Problem:** Obecnie backend zawsze wykonuje syntezę Fouriera z harmonicznych, co nadpisuje prawdziwe próbki z ESP32.

**Current Flow:**
```
ESP32 ADC → surowe próbki → FFT (na ESP32) → harmoniczne → MQTT → Backend
                                                                      ↓
                                                            Synteza Fouriera (MathUtils)
                                                                      ↓
                                                            Waveform (200 sampli)
```

**Desired Flow dla prawdziwych pomiarów:**
```
ESP32 ADC → surowe próbki → MQTT → Backend → Database → Frontend
            (200 sampli)              ↓
                                 FFT (opcjonalnie)
                                      ↓
                                  Harmoniczne + THD
```

### Implementation Plan

#### 1. Backend Changes

**MeasurementRequest.java** - dodać opcjonalne pola:
```java
@Data
@Builder
public class MeasurementRequest {
    // Existing fields...
    private Double[] harmonicsV;
    private Double[] harmonicsI;

    // NEW: Optional raw waveform samples from ESP32 ADC
    private Double[] voltageSamples;  // 200 samples of voltage waveform
    private Double[] currentSamples;  // 200 samples of current waveform
}
```

**MeasurementService.java** - zmodyfikować `reconstructWaveforms()`:
```java
private WaveformDTO reconstructWaveforms(Measurement measurement) {
    // Check if measurement contains raw samples from ESP32
    if (measurement.getVoltageSamples() != null &&
        measurement.getCurrentSamples() != null) {
        // Use real samples directly (no synthesis)
        return WaveformDTO.builder()
                .voltage(toPrimitiveArray(measurement.getVoltageSamples()))
                .current(toPrimitiveArray(measurement.getCurrentSamples()))
                .build();
    }

    // Fallback: reconstruct from harmonics (for mock data or legacy ESP32)
    double frequency = measurement.getFrequency() != null ? measurement.getFrequency() : 50.0;
    double[] voltageWaveform = waveformService.reconstructWaveform(
            measurement.getHarmonicsV(), frequency, 200);
    double[] currentWaveform = waveformService.reconstructWaveform(
            measurement.getHarmonicsI(), frequency, 200);

    return WaveformDTO.builder()
            .voltage(voltageWaveform)
            .current(currentWaveform)
            .build();
}
```

**Measurement.java** - dodać pola do entity:
```java
@Entity
@Table(name = "measurements")
public class Measurement {
    // Existing fields...

    // NEW: Optional raw waveform samples
    @Column(name = "voltage_samples", columnDefinition = "double precision[]")
    private Double[] voltageSamples;

    @Column(name = "current_samples", columnDefinition = "double precision[]")
    private Double[] currentSamples;
}
```

**Flyway Migration** - `V3__Add_waveform_samples.sql`:
```sql
ALTER TABLE measurements
ADD COLUMN voltage_samples double precision[],
ADD COLUMN current_samples double precision[];

COMMENT ON COLUMN measurements.voltage_samples IS 'Raw voltage waveform samples from ESP32 ADC (200 samples per cycle)';
COMMENT ON COLUMN measurements.current_samples IS 'Raw current waveform samples from ESP32 ADC (200 samples per cycle)';
```

#### 2. ESP32 Firmware Changes

Opcje implementacji:

**Opcja A: Tylko surowe próbki** (oszczędność CPU na ESP32)
- ESP32 wysyła 200 próbek voltage + 200 próbek current
- Backend liczy FFT i harmoniczne
- Wadą: większy transfer danych (1.6 KB vs 64 bajty)

**Opcja B: Oba** (recommended)
- ESP32 robi FFT lokalnie → harmoniczne (do THD)
- ESP32 wysyła harmoniczne + surowe próbki
- Backend używa surowych próbek do wykresu
- Zalety: prawdziwe dane + analiza harmonicznych

**Opcja C: Tryb konfigurowalny**
- Settings w backend: `waveform_mode: "raw" | "harmonics" | "both"`
- ESP32 dostosowuje co wysyła

#### 3. MQTT Mock Publisher

Zaktualizować `mqtt-mock-publisher.js`:
```javascript
function generateMeasurement() {
  // ... existing harmonics generation ...

  // NEW: Generate raw waveform samples with realistic noise
  const voltageSamples = generateRealisticWaveform(
    harmonicsV, frequency, 200, 'voltage'
  );
  const currentSamples = generateRealisticWaveform(
    harmonicsI, frequency, 200, 'current'
  );

  return {
    // ... existing fields ...
    harmonics_v: harmonicsV,
    harmonics_i: harmonicsI,

    // NEW: raw samples
    voltage_samples: voltageSamples,
    current_samples: currentSamples
  };
}

function generateRealisticWaveform(harmonics, frequency, samples, type) {
  // Fourier synthesis + realistic noise (ADC quantization, grid fluctuations, EMI)
  const waveform = [];
  const period = 1.0 / frequency;
  const deltaT = period / samples;

  for (let i = 0; i < samples; i++) {
    const t = i * deltaT;
    let value = 0;

    // Synthesize from harmonics
    for (let n = 0; n < harmonics.length; n++) {
      const omega = 2 * Math.PI * frequency * (n + 1);
      value += harmonics[n] * Math.sin(omega * t);
    }

    // Add realistic noise
    value += addRealisticNoise(value, i, type);

    waveform.push(parseFloat(value.toFixed(3)));
  }

  return waveform;
}
```

### Benefits

1. **Prawdziwe dane**: Wykres pokazuje rzeczywiste pomiary z ADC, nie syntezę matematyczną
2. **Szum i zakłócenia**: Widoczne realistyczne niedoskonałości sieci elektrycznej
3. **Kompatybilność wsteczna**: Stary kod nadal działa (fallback do syntezy)
4. **Elastyczność**: Można przełączać między trybami

### Migration Path

1. Dodać pola do backendu (bez breaking changes)
2. Zaktualizować mock publisher (dla testów)
3. Przetestować z danymi mock
4. Zaktualizować firmware ESP32
5. Wdrożyć na produkcji

### Notes

- Rozmiar danych: 400 wartości × 8 bajtów = 3.2 KB (vs 16 harmonicznych × 8 bajtów = 128 bajtów)
- Można użyć kompresji MQTT (GZIP) żeby zmniejszyć transfer
- PostgreSQL dobrze radzi sobie z tablicami (ARRAY type)
- Dla długoterminowego storage można agregować dane (np. co minutę przechowywać średnią)

## Other Future Improvements

### Performance
- [ ] Dodać Redis cache dla ostatnich pomiarów
- [ ] Rozważyć TimescaleDB dla time-series data
- [ ] Batch inserts dla bulk data import

### Features
- [ ] Email/SMS alerts dla przekroczeń norm IEC 61000
- [ ] Export danych do CSV/Excel
- [ ] Generowanie raportów PDF
- [ ] Multi-phase support (3-fazowe pomiary)

### DevOps
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Automated backups
- [ ] Blue/green deployment
