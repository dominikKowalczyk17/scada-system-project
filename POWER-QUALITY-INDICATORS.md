# Wskaźniki jakości energii elektrycznej według PN-EN 50160

## 1. Wprowadzenie

Niniejszy dokument przedstawia mapowanie wskaźników jakości energii elektrycznej określonych w normie PN-EN 50160 na możliwości pomiarowe systemu opartego na mikrokontrolerze ESP32.

Norma PN-EN 50160 definiuje charakterystyki napięcia zasilającego w publicznych sieciach elektroenergetycznych i stanowi podstawę oceny jakości dostaw energii elektrycznej w Unii Europejskiej.

## 2. Pięć grup wskaźników według PN-EN 50160

Norma dzieli parametry jakości energii na pięć głównych grup:

1. Napięcie zasilające (Supply voltage magnitude)
2. Częstotliwość (Supply frequency)
3. Wahania napięcia i migotanie światła (Voltage fluctuations & flicker)
4. Odkształcenia napięcia (Voltage waveform distortions)
5. Nieciągłości zasilania (Supply interruptions)

## 3. Szczegółowe mapowanie wskaźników

### Grupa 1: Napięcie zasilające (Supply voltage magnitude)

#### Wskaźnik: Odchylenie napięcia od wartości deklarowanej

**Definicja normy:**
Różnica między zmierzoną wartością skuteczną napięcia zasilającego a wartością znamionową, wyrażona w procentach wartości znamionowej.

**Wzór:**
```
ΔU/Un = (U_zmierzone - U_nominalne) / U_nominalne × 100%
```

gdzie:
- U_nominalne = 230 V (jednofazowa sieć EU)
- U_zmierzone = wartość skuteczna napięcia (RMS) mierzona w oknie 10-minutowym

**Limit normy PN-EN 50160:**
- ±10% wartości znamionowej przez 95% tygodnia
- Zakres dopuszczalny: 207-253 V dla sieci 230 V

**Źródło danych w systemie:**

| Pole w bazie danych         | Typ              | Opis                                                     |
|-----------------------------|------------------|----------------------------------------------------------|
| `voltage_rms`               | DOUBLE PRECISION | Wartość skuteczna napięcia zmierzona w oknie 10-20 cykli |
| `voltage_deviation_percent` | DOUBLE PRECISION | Wskaźnik obliczany przez backend                         |

**Metoda pomiaru:**
1. ESP32 próbkuje napięcie z częstotliwością 800-1000 Hz
2. Oblicza RMS w oknie 10-20 cykli (200-400 ms): RMS = sqrt(mean(próbki²))
3. Wysyła U_rms co 3 sekundy via MQTT
4. Backend agreguje pomiary 10-minutowe (średnia, min, max)
5. Backend oblicza wskaźnik: ΔU/Un = (U_rms - 230) / 230 × 100%

**Dokładność:**
- Dokładność pomiaru U_rms: ±1-3% po kalibracji ADC
- Źródła błędów: nieliniowość ADC, szumy, dokładność transformatora TV16

**Status:** MOŻLIWE

**Implementacja:**
- Backend: `MeasurementService.calculatePowerQualityIndicators()`
- Frontend: Osobna sekcja "Wskaźniki jakości energii PN-EN 50160"

---

### Grupa 2: Częstotliwość (Supply frequency)

#### Wskaźnik: Odchylenie częstotliwości (Frequency deviation)

**Definicja normy:**
Różnica między zmierzoną częstotliwością sieci a wartością znamionową (50 Hz dla EU).

**Wzór:**
```
Δf = f_zmierzone - f_nominalne
```

gdzie:
- f_nominalne = 50 Hz (sieć EU)
- f_zmierzone = częstotliwość mierzona w okresie 10 sekund

**Limit normy PN-EN 50160:**
- 50 Hz ±1% (tj. 49.5-50.5 Hz) przez 99.5% roku
- W systemach synchronicznych: 50 Hz +4%/-6% przez 100% czasu

**Źródło danych w systemie:**

| Pole w bazie danych      | Typ              | Opis                                         |
|--------------------------|------------------|----------------------------------------------|
| `frequency`              | DOUBLE PRECISION | Częstotliwość zmierzona metodą zero-crossing |
| `frequency_deviation_hz` | DOUBLE PRECISION | Wskaźnik obliczany przez backend             |

**Metoda pomiaru:**
1. ESP32 wykrywa przejścia przez zero napięcia (zero-crossing detection)
2. Mierzy czas między kolejnymi przejściami (okres T)
3. Oblicza częstotliwość: f = 1/T
4. Uśrednia pomiar z 10-20 cykli dla redukcji szumów
5. Backend oblicza wskaźnik: Δf = f - 50

**Dokładność:**
- Rozdzielczość czasowa: 1.25 ms przy 800 Hz próbkowania
- Dokładność częstotliwości: ±0.01-0.02 Hz
- Metoda uśredniania poprawia dokładność

**Status:** MOŻLIWE

**Implementacja:**
- Backend: `MeasurementService.calculatePowerQualityIndicators()`
- Frontend: Osobna sekcja "Wskaźniki jakości energii PN-EN 50160"

---

### Grupa 3: Wahania napięcia i migotanie światła (Voltage fluctuations & flicker)

#### Wskaźnik: P_st (Short-term flicker severity)

**Definicja normy:**
Krótkoterminowa dotkliwość migotania światła mierzona zgodnie z IEC 61000-4-15. P_st symuluje reakcję oka ludzkiego na wahania napięcia.

**Wzór:**
Zgodnie z normą IEC 61000-4-15 (złożony algorytm z filtrem percepcji wzrokowej).

**Limit normy PN-EN 50160:**
- P_st ≤ 1.0 przez 95% tygodnia w sieciach LV
- Pomiar w oknach 10-minutowych

**Źródło danych w systemie:**
BRAK

**Status:** NIEMOŻLIWE

**Powód:**
Pomiar flickera wymaga:
- Filtra zgodnego z IEC 61000-4-15 symulującego percepcję oka ludzkiego
- Częstotliwości próbkowania około 20 kHz
- Specjalnego algorytmu przetwarzania danych (filtr lampy-oka-mózgu)
- Dedykowanego sprzętu pomiarowego

Nasze ograniczenia:
- Próbkowanie tylko 800-1000 Hz (niewystarczające)
- Brak implementacji filtra IEC 61000-4-15
- ESP32 nie ma zasobów obliczeniowych dla tego algorytmu

---

#### Wskaźnik: P_lt (Long-term flicker severity)

**Definicja normy:**
Długoterminowa dotkliwość migotania obliczana z 12 wartości P_st w okresie 2 godzin.

**Wzór:**
```
P_lt = ∛(mean(P_st_i³) dla i=1..12)
```

**Limit normy PN-EN 50160:**
- P_lt ≤ 1.0 przez 95% tygodnia

**Źródło danych w systemie:**
BRAK

**Status:** NIEMOŻLIWE

**Powód:**
Wymaga pomiaru P_st (patrz wyżej).

---

#### Wskaźnik: RVC (Rapid Voltage Changes)

**Definicja normy:**
Szybkie zmiany napięcia - nagłe przejście wartości skutecznej napięcia między dwoma ustalonymi poziomami. Związane z migotaniem światła.

**Limit normy:**
Zazwyczaj < kilka procent U_n, zależny od konfiguracji sieci.

**Źródło danych w systemie:**
Częściowo wykrywalne (jako zdarzenia - osobny issue)

**Status:** NIEMOŻLIWE do pełnego pomiaru zgodnego z normą

**Powód:**
RVC jest ściśle związane z oceną flickera i wymaga ciągłego monitorowania zgodnego z IEC 61000-4-15.

---

### Grupa 4: Odkształcenia napięcia (Voltage waveform distortions)

#### Wskaźnik: THD_U (Total Harmonic Distortion napięcia)

**Definicja normy:**
Całkowite zniekształcenie harmoniczne napięcia - stosunek skutecznej wartości wszystkich harmonicznych do wartości składowej podstawowej.

**Wzór (pełny - IEC 61000-4-7):**
```
THD_U = sqrt(sum(U_h² dla h=2..40)) / U_1 × 100%
```

gdzie:
- U_1 = amplituda składowej podstawowej (50 Hz)
- U_h = amplituda h-tej harmonicznej

**Wzór (nasz system - ograniczony):**
```
THD_U = sqrt(sum(U_h² dla h=2..8)) / U_1 × 100%
```

**Limit normy PN-EN 50160:**
- THD < 8% w sieci LV (dla wszystkich harmonicznych 2-40)

**Źródło danych w systemie:**

| Pole w bazie danych | Typ                | Opis                                                 |
|---------------------|--------------------|------------------------------------------------------|
| `thd_voltage`       | DOUBLE PRECISION   | THD napięcia obliczone z harmonicznych 2-8           |
| `harmonics_v`       | DOUBLE PRECISION[] | Tablica 8 wartości: [H1, H2, H3, H4, H5, H6, H7, H8] |

**Metoda pomiaru:**
1. ESP32 próbkuje napięcie z częstotliwością 800-1000 Hz
2. Bufory danych: okno 10-20 cykli (160-320 próbek)
3. Synchronizacja okna z przejściem przez zero
4. Zastosowanie okna wagowego Hanna (redukcja przecieków spektralnych)
5. FFT/DFT wykonywane lokalnie na ESP32 (docelowo)
6. Wyznaczenie amplitud harmonicznych H1-H8 (50-400 Hz)
7. Obliczenie THD: sqrt(sum(H2²..H8²)) / H1 × 100%

**Dokładność:**
- Dokładność amplitudy harmonicznych: ±3-5%
- Źródła błędów: okno pomiarowe, przecieki spektralne, szumy ADC

**Ograniczenie Nyquista:**
Przy częstotliwości próbkowania 800-1000 Hz, częstotliwość Nyquista wynosi 400-500 Hz. Oznacza to, że możemy zmierzyć tylko harmoniczne do 8-10 rzędu (400-500 Hz).

**Status:** CZĘŚCIOWO MOŻLIWE

**Ograniczenie:**
- Nasz pomiar obejmuje tylko harmoniczne 2-8 (zamiast 2-40)
- Rzeczywiste THD może być wyższe
- Nasz pomiar stanowi dolne ograniczenie rzeczywistego zniekształcenia

**Implementacja:**
- ESP32: Oblicza THD z FFT/DFT
- Backend: Przechowuje wartość w `thd_voltage`
- Frontend: Wyświetla z ostrzeżeniem o ograniczeniu do 8. harmonicznej

---

#### Wskaźnik: Poszczególne harmoniczne napięcia (Individual voltage harmonics)

**Definicja normy:**
Amplitudy poszczególnych harmonicznych napięcia wyrażone jako procent składowej podstawowej.

**Wzór:**
```
U_h_percent = (U_h / U_1) × 100%
```

**Limity normy PN-EN 50160 (sieci LV, wybrane harmoniczne):**

| Harmoniczna | Częstotliwość | Limit (% U_1) | Nasz status  |
|-------------|---------------|---------------|--------------|
| H2          | 100 Hz        | 2%            | MIERZYMY     |
| H3          | 150 Hz        | 5%            | MIERZYMY     |
| H4          | 200 Hz        | 1%            | MIERZYMY     |
| H5          | 250 Hz        | 6%            | MIERZYMY     |
| H6          | 300 Hz        | 0.5%          | MIERZYMY     |
| H7          | 350 Hz        | 5%            | MIERZYMY     |
| H8          | 400 Hz        | 0.5%          | MIERZYMY     |
| H9          | 450 Hz        | 1.5%          | NIE MIERZYMY |
| H10         | 500 Hz        | 0.5%          | NIE MIERZYMY (tylko przy 1 kHz) |
| H11         | 550 Hz        | 3.5%          | NIE MIERZYMY |
| H13         | 650 Hz        | 3%            | NIE MIERZYMY |
| ...         | ...           | ...           | NIE MIERZYMY |
| H40         | 2000 Hz       | <0.5%         | NIE MIERZYMY |

**Źródło danych w systemie:**

| Pole w bazie danych | Typ                | Opis                                  |
|---------------------|--------------------|---------------------------------------|
| `harmonics_v`       | DOUBLE PRECISION[] | Tablica 8 wartości: [H1, H2, ..., H8] |

**Struktura tablicy:**
```
harmonics_v[0] = H1 (50 Hz) - składowa podstawowa
harmonics_v[1] = H2 (100 Hz)
harmonics_v[2] = H3 (150 Hz)
harmonics_v[3] = H4 (200 Hz)
harmonics_v[4] = H5 (250 Hz)
harmonics_v[5] = H6 (300 Hz)
harmonics_v[6] = H7 (350 Hz)
harmonics_v[7] = H8 (400 Hz)
```

**Metoda pomiaru:**
Identyczna jak dla THD (patrz wyżej).

**Status:** CZĘŚCIOWO MOŻLIWE (harmoniczne 1-8)

**Ograniczenie:**
Norma wymaga pomiaru do 40. harmonicznej (2000 Hz), co przy częstotliwości próbkowania 800-1000 Hz jest niemożliwe ze względu na ograniczenie Nyquista.

---

#### Wskaźnik: Interharmoniczne napięcia (Voltage interharmonics)

**Definicja normy:**
Składowe częstotliwościowe niebędące całkowitą wielokrotnością częstotliwości podstawowej (np. 75 Hz, 125 Hz).

**Źródło danych w systemie:**
BRAK

**Status:** NIEMOŻLIWE

**Powód:**
Pomiar interharmonicznych wymaga:
- Wysokiej rozdzielczości FFT (np. 2048 punktów)
- Długich okien pomiarowych (kilka sekund)
- Specjalnych algorytmów grupowania składowych

Nasze ograniczenia:
- Krótkie okna pomiarowe (10-20 cykli = 0.2-0.4 s)
- Ograniczone zasoby obliczeniowe ESP32
- Nie jest priorytetem dla systemu demonstracyjnego

---

### Grupa 5: Nieciągłości zasilania (Supply interruptions)

**Uwaga:** Implementacja wykrywania i rejestracji zdarzeń zostanie wykonana w ramach osobnego issue (system events). Poniżej przedstawiono specyfikację wskaźników, które będą wykrywalne.

#### Wskaźnik: Zapady napięcia (Voltage dips / sags)

**Definicja normy:**
Nagłe zmniejszenie wartości skutecznej napięcia do poziomu między 10% a 90% napięcia znamionowego, po którym następuje powrót do wartości początkowej. Czas trwania: od 10 ms do 1 minuty.

**Charakterystyka zdarzenia:**
- Głębokość zapadu: U_residual / U_n (np. 70% = zapad do 70% U_n)
- Czas trwania: od 10 ms do 1 min

**Źródło danych w systemie:**
Wykrywane w czasie rzeczywistym przez ciągłe monitorowanie `voltage_rms`.

**Metoda wykrywania:**
1. Backend monitoruje ciąg pomiarów U_rms co 200 ms (okno 10-cyklowe)
2. Wykrywa spadek poniżej 90% U_n
3. Rejestruje zdarzenie: timestamp_start, U_residual_min, duration
4. Wykrywa powrót powyżej 90% U_n (koniec zdarzenia)

**Minimalna wykrywalna długość:**
Około 10 ms (zależne od okna pomiarowego 10 cykli = 200 ms, ale może wykryć zdarzenia krótsze jeśli znacząco wpływają na RMS).

**Status:** WYKRYWALNE (implementacja w osobnym issue)

---

#### Wskaźnik: Krótkie przerwy w zasilaniu (Short interruptions)

**Definicja normy:**
Spadek napięcia poniżej 10% napięcia znamionowego (praktycznie: brak napięcia) trwający od 10 ms do 3 minut.

**Charakterystyka zdarzenia:**
- U < 10% U_n (tj. U < 23 V)
- Czas trwania: 10 ms do 3 min

**Źródło danych w systemie:**
Wykrywane analogicznie do zapadów napięcia.

**Status:** WYKRYWALNE (implementacja w osobnym issue)

---

#### Wskaźnik: Długie przerwy w zasilaniu (Long interruptions)

**Definicja normy:**
Spadek napięcia poniżej 10% napięcia znamionowego trwający dłużej niż 3 minuty.

**Charakterystyka zdarzenia:**
- U < 10% U_n
- Czas trwania: > 3 min

**Źródło danych w systemie:**
Wykrywane analogicznie, z zastrzeżeniem że ESP32 może stracić zasilanie i nie zarejestrować pełnej długości przerwy.

**Status:** WYKRYWALNE częściowo (jeśli ESP32 ma zasilanie awaryjne)

---

#### Wskaźnik: Przepięcia tymczasowe (Temporary overvoltages)

**Definicja normy:**
Wzrost napięcia powyżej 110% napięcia znamionowego na czas dłuższy niż 10 ms.

**Charakterystyka zdarzenia:**
- U > 110% U_n (tj. U > 253 V)
- Czas trwania: typowo od 10 ms do kilku sekund

**Źródło danych w systemie:**
Wykrywane analogicznie do zapadów napięcia (monitorowanie U_rms).

**Status:** WYKRYWALNE (implementacja w osobnym issue)

---

## 4. Pozostałe pomiary (nieobjęte PN-EN 50160)

Poniższe parametry NIE są wskaźnikami jakości energii według PN-EN 50160, ale są użyteczne do diagnostyki sieci, analizy obciążenia i rozliczeń energii.

### Współczynnik mocy (Power factor)

**Definicja:**
Stosunek mocy czynnej do mocy pozornej, równy cosinusowi kąta przesunięcia fazowego między napięciem a prądem.

**Wzór:**
```
cos φ = P / S = P / (U_rms × I_rms)
```

**Źródło danych w systemie:**

| Pole w bazie danych | Typ              | Opis              |
|---------------------|------------------|-------------------|
| `cos_phi`           | DOUBLE PRECISION | Współczynnik mocy |

**Metoda pomiaru:**
1. ESP32 próbkuje napięcie i prąd
2. Wykonuje DFT dla składowej podstawowej (50 Hz) obu sygnałów
3. Wyznacza przesunięcie fazowe φ = arg(U_1) - arg(I_1)
4. Oblicza cos φ

**Zastosowanie:**
- Diagnostyka obciążenia (obciążenia indukcyjne vs pojemnościowe)
- Rozliczenia energii (kary za niski współczynnik mocy w przemyśle)
- Optymalizacja kompensacji mocy biernej

**Norma:**
IEC nie definiuje limitów cos φ w kontekście jakości energii. Limity określają umowy z dostawcami energii (typowo cos φ > 0.9 w przemyśle).

---

### Moc czynna, bierna, pozorna (Active, Reactive, Apparent Power)

**Definicje:**
- Moc czynna (P): Moc rzeczywiście wykonująca pracę, wyrażona w watach [W]
- Moc bierna (Q): Moc wymieniana z elementami reaktancyjnymi, wyrażona w warach [var]
- Moc pozorna (S): Iloczyn wartości skutecznych napięcia i prądu, wyrażona w woltamperach [VA]

**Wzory:**
```
P = U_rms × I_rms × cos φ
Q = U_rms × I_rms × sin φ
S = U_rms × I_rms
S² = P² + Q²
```

**Źródło danych w systemie:**

| Pole w bazie danych | Typ              | Opis             |
|---------------------|------------------|------------------|
| `power_active`      | DOUBLE PRECISION | Moc czynna [W]   |
| `power_reactive`    | DOUBLE PRECISION | Moc bierna [var] |
| `power_apparent`    | DOUBLE PRECISION | Moc pozorna [VA] |

**Zastosowanie:**
- Bilansowanie energii w instalacji
- Diagnostyka obciążenia
- Rozliczenia energii
- Wykrywanie nieefektywnych odbiorników

**Norma:**
Nie są wskaźnikami jakości energii wg PN-EN 50160.

---

### THD prądu (Current THD)

**Definicja:**
Całkowite zniekształcenie harmoniczne prądu - analogiczne do THD napięcia, ale dla prądu.

**Wzór (nasz system):**
```
THD_I = sqrt(sum(I_h² dla h=2..8)) / I_1 × 100%
```

**Źródło danych w systemie:**

| Pole w bazie danych | Typ                | Opis                                    |
|---------------------|--------------------|-----------------------------------------|
| `thd_current`       | DOUBLE PRECISION   | THD prądu obliczone z harmonicznych 2-8 |
| `harmonics_i`       | DOUBLE PRECISION[] | Tablica 8 wartości: [H1, H2, ..., H8]   |

**Zastosowanie:**
- Diagnostyka odbiorników nieliniowych (zasilacze impulsowe, falowniki, LED)
- Ocena wpływu odbiorników na sieć
- Detekcja problematycznych urządzeń

**Norma:**
IEC 61000-3-2 definiuje limity emisji harmonicznych prądu przez urządzenia (nie jakości sieci). Limity zależą od klasy urządzenia.

**Uwaga:**
PN-EN 50160 dotyczy jakości NAPIĘCIA, nie prądu. THD prądu jest parametrem diagnostycznym odbiorników, nie wskaźnikiem jakości energii dostarczanej przez operatora sieci.

---

### Harmoniczne prądu (Current harmonics)

**Definicja:**
Amplitudy poszczególnych harmonicznych prądu.

**Źródło danych w systemie:**

| Pole w bazie danych | Typ                | Opis                                   |
|---------------------|--------------------|----------------------------------------|
| `harmonics_i`       | DOUBLE PRECISION[] | Tablica 8 wartości harmonicznych prądu |

**Zastosowanie:**
Analogiczne do THD prądu - diagnostyka odbiorników.

---

## 5. Podsumowanie: Mapowanie pełne

### Tabela wskaźników PN-EN 50160

| Grupa                  | Wskaźnik                  | Pole w DB                   | Obliczane przez | Status            | Limit normy             |
|------------------------|---------------------------|-----------------------------|-----------------|-------------------|-------------------------|
| 1. Napięcie zasilające | Odchylenie napięcia       | `voltage_deviation_percent` | Backend         | MOŻLIWE           | ±10% przez 95% tygodnia |
| 2. Częstotliwość       | Odchylenie częstotliwości | `frequency_deviation_hz`    | Backend         | MOŻLIWE           | ±1% przez 99.5% roku    |
| 3. Wahania i flicker   | P_st                      | -                           | -               | NIEMOŻLIWE        | ≤1.0 przez 95% tygodnia |
| 3. Wahania i flicker   | P_lt                      | -                           | -               | NIEMOŻLIWE        | ≤1.0                    |
| 3. Wahania i flicker   | RVC                       | -                           | -               | NIEMOŻLIWE        | -                       |
| 4. Odkształcenia       | THD napięcia              | `thd_voltage`               | ESP32           | CZĘŚCIOWO (h=2-8) | <8%                     |
| 4. Odkształcenia       | Harmoniczne U_h           | `harmonics_v[]`             | ESP32           | CZĘŚCIOWO (h=1-8) | Różne limity            |
| 4. Odkształcenia       | Interharmoniczne          | -                           | -               | NIEMOŻLIWE        | -                       |
| 5. Nieciągłości        | Zapady napięcia           | Events (todo)               | Backend         | WYKRYWALNE        | -                       |
| 5. Nieciągłości        | Przerwy krótkie           | Events (todo)               | Backend         | WYKRYWALNE        | -                       |
| 5. Nieciągłości        | Przerwy długie            | Events (todo)               | Backend         | CZĘŚCIOWO         | -                       |
| 5. Nieciągłości        | Przepięcia                | Events (todo)               | Backend         | WYKRYWALNE        | -                       |

### Tabela pozostałych pomiarów (poza PN-EN 50160)

| Parametr          | Pole w DB         | Obliczane przez | Zastosowanie              | Norma         |
|-------------------|-------------------|-----------------|---------------------------|---------------|
| Współczynnik mocy | `cos_phi`         | ESP32           | Diagnostyka, rozliczenia  | -             |
| Moc czynna        | `power_active`    | ESP32           | Bilansowanie, rozliczenia | -             |
| Moc bierna        | `power_reactive`  | ESP32           | Kompensacja, diagnostyka  | -             |
| Moc pozorna       | `power_apparent`  | ESP32           | Analiza obciążenia        | -             |
| THD prądu         | `thd_current`     | ESP32           | Diagnostyka odbiorników   | IEC 61000-3-2 |
| Harmoniczne prądu | `harmonics_i[]`   | ESP32           | Diagnostyka odbiorników   | IEC 61000-3-2 |

---

## 6. Architektura frontendu

### Podział na sekcje

**Sekcja 1: Wskaźniki jakości energii PN-EN 50160**

Endpoint: `/api/dashboard/power-quality-indicators`

Wyświetlane dane:
- Odchylenie napięcia (ΔU/Un) z limitem ±10%
- Odchylenie częstotliwości (Δf) z limitem ±0.5 Hz
- THD napięcia z limitem 8% i ostrzeżeniem "częściowe (h=2-8)"
- Harmoniczne U_2 do U_8 z limitami normy
- Flagi zgodności: voltage_within_limits, frequency_within_limits, thd_within_limits

**Sekcja 2: Pozostałe pomiary**

Endpoint: `/api/dashboard` (istniejący)

Wyświetlane dane:
- Napięcie RMS, Prąd RMS
- Moc czynna, bierna, pozorna
- Współczynnik mocy (cos φ)
- THD prądu
- Harmoniczne prądu

**Sekcja 3: Zdarzenia (events)**

Endpoint: `/api/events` (todo - osobny issue)

Wyświetlane dane:
- Historia zapadów napięcia, przepięć, przerw
- Timeline zdarzeń
- Statystyki (liczba zdarzeń, czas trwania)

---

## 7. Wnioski

System oparty na ESP32 pozwala na pomiar:
- 2 z 5 grup wskaźników PN-EN 50160 w pełni (napięcie, częstotliwość)
- 1 grupy częściowo (odkształcenia - tylko harmoniczne 2-8)
- 1 grupy jako wykrywanie zdarzeń (nieciągłości - implementacja w przyszłości)
- 1 grupy nie jest możliwa (wahania i flicker - wymaga specjalistycznego sprzętu)

Dodatkowo system mierzy parametry użyteczne diagnostycznie (moc, cos φ, THD prądu), które nie są częścią normy PN-EN 50160.

System ten jest odpowiedni do:
- Demonstracji zasad działania analizatorów jakości energii
- Monitorowania podstawowych parametrów jakości w instalacji domowej
- Celów edukacyjnych (projekt inżynierski)
- Wykrywania problemów z siecią (zapady, przepięcia, wysokie THD)

System NIE jest odpowiedni do:
- Certyfikowanych pomiarów zgodności z normami
- Rozliczeń handlowych z operatorem sieci
- Profesjonalnych audytów jakości energii klasy A według IEC 61000-4-30

---

## 8. Referencje

- PN-EN 50160:2010 - Parametry napięcia zasilającego w publicznych sieciach elektroenergetycznych
- IEC 61000-4-7:2002 - Electromagnetic compatibility (EMC) - Testing and measurement techniques - General guide on harmonics and interharmonics measurements
- IEC 61000-4-15:2010 - Electromagnetic compatibility (EMC) - Testing and measurement techniques - Flickermeter
- IEC 61000-4-30:2015 - Electromagnetic compatibility (EMC) - Testing and measurement techniques - Power quality measurement methods
- IEC 61000-3-2:2018 - Electromagnetic compatibility (EMC) - Limits for harmonic current emissions (equipment input current ≤16 A per phase)
