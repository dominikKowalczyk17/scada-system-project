# Specyfikacja możliwości pomiarowych ESP32

## 1. Parametry sprzętowe

### Przetwornik analogowo-cyfrowy (ADC)
- Rozdzielczość nominalna: 12-bit (4096 poziomów)
- Rozdzielczość efektywna: około 10-bit (z uwzględnieniem szumów i nieliniowości)
- Kanały: 18 kanałów analogowych
- Nieliniowość różniczkowa (DNL): około ±7 LSB
- Nieliniowość całkowa (INL): kilkanaście LSB
- Zakres pomiarowy: 0-3.3V (z martwa strefą około 0.2V przy największym wzmocnieniu)

### Częstotliwość próbkowania
- Z włączonym Wi-Fi: około 1000 próbek/s (1 kS/s)
- Z wyłączonym Wi-Fi: do 100 000 próbek/s (teoretycznie, praktycznie niższe wartości zalecane)
- Docelowa częstotliwość dla projektu: 800-1000 Hz

### Układ pomiarowy
- Czujnik prądu: SCT013 (transformator prądowy)
- Transformator napięciowy: TV16
- Offset napięcia: 1.65V (przesunięcie sygnału AC do zakresu ADC)
- Konfiguracja: jednofazowy układ pomiarowy

## 2. Ograniczenia wynikające z teorematu Nyquista

Zgodnie z twierdzeniem Nyquista, maksymalna częstotliwość sygnału mierzonego nie może przekraczać połowy częstotliwości próbkowania (fs/2). W przeciwnym razie występuje zjawisko aliasingu.

### Tabela ograniczeń harmonicznych

| Częstotliwość próbkowania | Częstotliwość Nyquista | Maksymalna harmoniczna (przy 50 Hz) | Liczba harmonicznych |
|---------------------------|------------------------|-------------------------------------|---------------------|
| 800 Hz                    | 400 Hz                 | 8. harmoniczna (400 Hz)             | H1-H8               |
| 1000 Hz                   | 500 Hz                 | 10. harmoniczna (500 Hz)            | H1-H10              |
| 5000 Hz                   | 2500 Hz                | 50. harmoniczna (2500 Hz)           | H1-H50              |

Dla projektu przyjmujemy konserwatywnie próbkowanie 800-1000 Hz, co pozwala na pomiar harmonicznych do 8. rzędu.

### Implikacje dla analizy jakości energii

IEC 61000-4-7 wymaga pomiaru harmonicznych do 40. rzędu (2000 Hz przy sieci 50 Hz) dla pełnej zgodności. Nasz system mierzy tylko do 8. rzędu, co oznacza:

- THD (Total Harmonic Distortion) jest obliczane tylko z harmonicznych 2-8
- Rzeczywiste THD może być wyższe (nasze pomiary stanowią dolne ograniczenie)
- Harmoniczne wyższego rzędu (9-40) nie są rejestrowane

## 3. Możliwości pomiarowe według PN-EN 50160

### Grupa 1: Napięcie zasilające (Supply voltage magnitude)

Wskaźnik: Odchylenie napięcia od wartości deklarowanej

Status: MOŻLIWE

Źródło danych: Pomiar U_rms (wartość skuteczna napięcia)

Metoda pomiaru:
- Okno pomiarowe: 10-20 cykli (200-400 ms przy 50 Hz)
- Obliczenie RMS: sqrt(mean(próbki²))
- Uśrednianie: agregacja 10-minutowa

Dokładność: ±1-3% po kalibracji ADC

Wzór wskaźnika: ΔU/Un = (U_zmierzone - 230V) / 230V × 100%

Limit normy: ±10% przez 95% tygodnia

### Grupa 2: Częstotliwość (Supply frequency)

Wskaźnik: Odchylenie częstotliwości (Frequency deviation)

Status: MOŻLIWE

Źródło danych: Detekcja przejścia przez zero (zero-crossing)

Metoda pomiaru:
- Pomiar okresu między kolejnymi przejściami przez zero
- Uśrednianie wielu cykli (10-20)
- Rozdzielczość czasowa: 1.25 ms przy 800 Hz → rozdzielczość częstotliwości około 0.01-0.02 Hz

Dokładność: ±0.01-0.02 Hz

Wzór wskaźnika: Δf = f_zmierzone - 50 Hz

Limit normy: ±1% (49.5-50.5 Hz) przez 99.5% roku

### Grupa 3: Wahania napięcia i migotanie światła (Voltage fluctuations & flicker)

Wskaźniki: P_st (short-term flicker severity), P_lt (long-term flicker severity), RVC (Rapid Voltage Changes)

Status: NIEMOŻLIWE

Przyczyna: Wymaga zgodności z IEC 61000-4-15, co oznacza:
- Specjalny filtr symulujący percepcję oka ludzkiego
- Częstotliwość próbkowania około 20 kHz
- Dedykowany algorytm przetwarzania zgodny z normą

Nasze ograniczenia:
- Próbkowanie tylko 800-1000 Hz (niewystarczające)
- Brak implementacji filtra IEC 61000-4-15
- Brak sprzętowego wsparcia dla tego typu pomiarów

### Grupa 4: Odkształcenia napięcia (Voltage waveform distortions)

Wskaźniki: THD_U (Total Harmonic Distortion), poszczególne harmoniczne U_h, interharmoniczne

Status: CZĘŚCIOWO MOŻLIWE

Co możemy zmierzyć:
- THD napięcia (niekompletne - tylko harmoniczne 2-8)
- Poszczególne harmoniczne H1-H8 (50 Hz do 400 Hz)

Czego nie możemy zmierzyć:
- Harmoniczne 9-40 (powyżej częstotliwości Nyquista przy 800 Hz)
- Interharmoniczne (wymagają wysokiej rozdzielczości FFT)
- Pełne THD zgodne z IEC 61000-4-7

Metoda pomiaru:
- Okno pomiarowe: 10-20 cykli (160-320 próbek przy 800 Hz)
- Synchronizacja z przejściem przez zero
- Okno wagowe: Hanna (redukcja przecieków spektralnych)
- Algorytm: DFT/Goertzel dla harmonicznych 1-8
- FFT wykonywane docelowo na ESP32

Wzór THD: THD = sqrt(sum(U_h² dla h=2..8)) / U_1 × 100%

Limit normy: THD < 8% (dla pełnego spektrum 2-40)

Uwaga: Nasz pomiar THD stanowi dolne ograniczenie rzeczywistego zniekształcenia. Rzeczywiste THD może być wyższe ze względu na pominięcie harmonicznych 9-40.

### Grupa 5: Nieciągłości zasilania (Supply interruptions)

Wskaźniki: Zapady napięcia (voltage dips), przepięcia tymczasowe (temporary overvoltages), przerwy krótkie i długie (interruptions)

Status: WYKRYWALNE (implementacja w osobnym issue)

Co możemy wykryć:
- Zapady napięcia: U_rms spada do 10-90% Un przez 10 ms do 1 min
- Przepięcia tymczasowe: U_rms > 110% Un
- Przerwy krótkie: U_rms < 10% Un przez ≤3 min
- Przerwy długie: U_rms < 10% Un przez >3 min

Metoda wykrywania:
- Ciągłe monitorowanie U_rms w oknach 10-cyklowych (200 ms)
- Porównanie z progami normy
- Rejestracja zdarzenia: timestamp, typ, czas trwania, amplituda

Ograniczenie czasowe:
- Minimalny czas trwania wykrywalny: około 10 ms (zależny od okna pomiarowego)
- Zdarzenia krótsze niż 10 ms mogą zostać pominięte

Dokładność: Detekcja zdarzeń ≥10 ms jest wiarygodna

Uwaga: Implementacja wykrywania zdarzeń i ich rejestracji zostanie wykonana w ramach osobnego issue (system events).

## 4. Pozostałe pomiary (nieobjęte PN-EN 50160)

Poniższe parametry nie są wskaźnikami jakości energii według PN-EN 50160, ale są użyteczne do diagnostyki i analizy obciążenia:

### Współczynnik mocy (Power factor)
- Źródło: cos φ
- Obliczany z przesunięcia fazowego między napięciem a prądem
- Metoda: DFT składowej podstawowej (50 Hz) dla U i I, różnica faz
- Dokładność: kilka stopni fazowych (zależna od okna pomiarowego i szumów)
- Zastosowanie: Diagnostyka obciążenia, rozliczenia energii

### Moc czynna, bierna, pozorna
- Źródło: P (moc czynna), Q (moc bierna), S (moc pozorna)
- Obliczane z U_rms, I_rms i cos φ
- Zastosowanie: Analiza obciążenia, bilansowanie energii

### THD prądu (Current THD)
- Źródło: THD_I
- Norma: IEC 61000-3-2 (limity emisji harmonicznych przez urządzenia)
- Uwaga: To nie jest wskaźnik jakości energii, ale parametr diagnostyczny odbiorników
- Nasz pomiar: Harmoniczne 2-8 (analogicznie do THD napięcia)

### Harmoniczne prądu
- Źródło: I_h dla h=1..8
- Zastosowanie: Diagnostyka nieliniowych odbiorników (np. zasilacze impulsowe, silniki)

## 5. Dokładność pomiarów

### Wartość skuteczna (RMS)
- Przed kalibracją: ±5-10%
- Po kalibracji ADC: ±1-3%
- Źródła błędów: nieliniowość ADC, szumy, niedokładność czujników

### Częstotliwość
- Dokładność: ±0.01-0.02 Hz
- Metoda: Uśrednianie wielu przejść przez zero
- Źródła błędów: szumy, jitter próbkowania

### THD i harmoniczne
- Dokładność amplitudy: ±3-5% wartości harmonicznej
- Ograniczenie: Tylko harmoniczne 2-8
- Źródła błędów: przecieki spektralne, okno pomiarowe, szumy ADC

### Współczynnik mocy (cos φ)
- Dokładność fazowa: kilka stopni
- Przekłada się na dokładność cos φ: ±0.05-0.1
- Źródła błędów: multipleksowanie ADC (V i I nie mierzone jednocześnie), krótkie okno pomiarowe

## 6. Zalecane algorytmy i parametry pomiarowe

### Okna pomiarowe
- Dla analizy harmonicznej: 10-20 cykli (160-320 próbek przy 800 Hz)
- Dla RMS: minimum 10 cykli (200 ms)
- Synchronizacja: Start okna na przejściu przez zero

### Okno wagowe
- Dla analizy harmonicznej: Okno Hanna (redukcja przecieków spektralnych)
- Dla RMS: Prostokątne (brak wygładzania)

### Algorytm analizy harmonicznej
- Goertzel: Wydajny dla wybranych częstotliwości (1-8 harmonicznej)
- DFT/FFT: Pełna analiza spektrum (docelowo wykonywane na ESP32)

### Detekcja przejścia przez zero
- Metoda: Interpolacja liniowa między próbkami
- Zastosowanie: Pomiar częstotliwości, synchronizacja okien

### Bufory i przesyłanie danych
- Bufor cykliczny: 2400-3200 próbek (3-4 sekundy przy 800 Hz)
- Agregacja danych: Co 3 sekundy przesyłane wartości uśrednione (U_rms, I_rms, P, S, Q, THD, cos φ, harmoniczne)
- Snapshot surowych próbek: Tylko przy wykryciu zdarzenia (zapad, przepięcie, przekroczenie THD)

### Kalibracja
- Kalibracja offsetu ADC: Pomiar przy zerowym wejściu
- Kalibracja skali: Porównanie z multimetrem referencyjnym
- Kalibracja czujników prądu: Obciążenie znane, porównanie z multimetrem
- Częstotliwość kalibracji: Przy pierwszym uruchomieniu i okresowo (np. co miesiąc)

## 7. Architektura przetwarzania danych

### Wariant obecny (testowy - mock data)
```
ESP32 Mock → Dane testowe (wszystkie parametry) → MQTT → Backend → PostgreSQL
```

### Wariant docelowy (z fizycznym układem)
```
ESP32 (ADC + TV16 + SCT013) → Próbkowanie 800-1000 Hz →
→ FFT/DFT lokalnie na ESP32 (harmoniczne, THD) →
→ Obliczanie RMS, P, Q, S, cos φ na ESP32 →
→ Agregacja co 3s → MQTT → Backend → PostgreSQL
                  ↓
           Detekcja zdarzeń (sag/swell) → Snapshot surowych próbek → MQTT
```

### Podział obowiązków: ESP32 vs Backend

ESP32 (mikrokontroler):
- Próbkowanie ADC z timerem sprzętowym (800-1000 Hz)
- Buforowanie próbek (circular buffer)
- FFT/DFT - wyznaczanie harmonicznych H1-H8
- Obliczanie RMS (okna 10-20 cykli)
- Obliczanie mocy (P, Q, S) i cos φ
- Obliczanie THD z harmonicznych
- Detekcja zdarzeń (przekroczenia progów)
- Agregacja i wysyłka co 3s via MQTT

Backend (Spring Boot):
- Odbieranie danych MQTT
- Obliczanie wskaźników PN-EN 50160:
  - Odchylenie napięcia (ΔU/Un)
  - Odchylenie częstotliwości (Δf)
- Zapis do bazy danych PostgreSQL
- Agregacja długookresowa (10-minutowa, godzinowa, dzienna)
- API REST dla frontendu
- WebSocket - transmisja danych real-time
- Analiza statystyczna i raportowanie

## 8. Kontekst akademicki

Niniejszy system jest projektem inżynierskim (praca licencjacka) mającym na celu zademonstrowanie możliwości monitorowania jakości energii elektrycznej w instalacji domowej przy użyciu tanich komponentów (budżet 1000 PLN).

### Ograniczenia i zastrzeżenia

System ten:
- Jest systemem demonstracyjnym i edukacyjnym
- Nie jest certyfikowany dla zgodności regulacyjnej
- Nie spełnia wymagań klasy A według IEC 61000-4-30 (wymaga sprzętu 24-bitowego i synchronizacji)
- Służy do monitorowania i analizy, nie do rozliczeń handlowych
- Ma ograniczoną dokładność ze względu na 12-bitowy ADC i próbkowanie 800-1000 Hz

### Cele edukacyjne

Projekt pokazuje:
- Praktyczne zastosowanie teorematu Nyquista
- Analizę harmoniczną sygnałów AC (FFT/DFT)
- Implementację wskaźników jakości energii PN-EN 50160
- Architekturę systemu SCADA (ESP32 → MQTT → Backend → Frontend)
- Komunikację real-time (WebSocket)
- Agregację i analizę danych pomiarowych

### Przydatność praktyczna

Pomimo ograniczeń, system jest użyteczny do:
- Monitorowania podstawowych parametrów jakości energii w domu
- Wykrywania problemów z siecią (zapady, przepięcia, wysokie THD)
- Diagnostyki odbiorników nieliniowych
- Demonstracji zasad działania analizatorów jakości energii
- Nauki standardów IEC i PN-EN 50160

## 9. Planowany rozwój

### Faza 1: Testowanie z mock data (obecnie)
- Backend odbiera dane testowe z ESP32 mock generator
- Frontend wyświetla dane w czasie rzeczywistym
- Testy algorytmów agregacji i obliczeń wskaźników

### Faza 2: Integracja z fizycznym układem (po otrzymaniu komponentów)
- Implementacja próbkowania ADC z timerem sprzętowym
- Kalibracja czujników (TV16, SCT013)
- Implementacja FFT/DFT na ESP32
- Testy dokładności pomiarów (porównanie z multimetrem)

### Faza 3: Rozszerzenia funkcjonalne
- System wykrywania i rejestracji zdarzeń (events)
- Dashboard analizy długookresowej (trendy 10-minutowe, godzinowe, dzienne)
- Raportowanie zgodności z normami PN-EN 50160
- Alerty i notyfikacje (przekroczenia limitów)

### Faza 4: Optymalizacje (opcjonalnie)
- Próbkowanie 5 kHz (harmoniczne do 40. rzędu) - wymaga wyłączenia Wi-Fi
- Zewnętrzny ADC 16-bit lub 24-bit dla lepszej dokładności
- Pomiar trójfazowy (3 kanały napięcia + 3 kanały prądu)
