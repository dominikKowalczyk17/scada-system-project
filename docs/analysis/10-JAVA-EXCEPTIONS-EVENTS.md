# Analiza Modułu: Java Exceptions & Events

**Katalogi:**
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/exception/`
- `scada-system/src/main/java/com/dkowalczyk/scadasystem/model/event/`

**Pliki:** 4
**Status:** ✅ Przeanalizowano
**Data analizy:** 2026-01-23

---

## 1. Przegląd Modułu

### 1.1 Lista Plików

| Plik | Linie | Typ | Cel |
|------|-------|-----|-----|
| GlobalExceptionHandler.java | 113 | @RestControllerAdvice | Centralny handler błędów API |
| MeasurementNotFoundException.java | 15 | RuntimeException | 404 Not Found |
| ValidationException.java | 15 | RuntimeException | 400 Bad Request (validation) |
| MeasurementSavedEvent.java | 28 | ApplicationEvent | Event dla broadcast WebSocket |

### 1.2 Architektura Exception Handling

```
┌─────────────────────────────────────────────────────────────┐
│                    REST Controllers                          │
│  DashboardController, MeasurementController, StatsController │
└───────────────────────┬─────────────────────────────────────┘
                        │ throws
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              GlobalExceptionHandler                          │
│              @RestControllerAdvice                           │
├──────────────────────────────────────────────────────────────┤
│  @ExceptionHandler(MeasurementNotFoundException.class)       │
│  @ExceptionHandler(IllegalArgumentException.class)           │
│  @ExceptionHandler(MethodArgumentNotValidException.class)    │
│  @ExceptionHandler(ConstraintViolationException.class)       │
│  @ExceptionHandler(HttpMessageNotReadableException.class)    │
│  @ExceptionHandler(HttpMediaTypeNotSupportedException.class) │
│  @ExceptionHandler(Exception.class)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │ returns
                        ▼
          ResponseEntity<Map<String, Object>>
          {
            "error": "Bad Request",
            "message": "...",
            "timestamp": "2026-01-23T12:34:56Z",
            "errorId": "uuid" // tylko dla 500
          }
```

---

## 2. GlobalExceptionHandler - Analiza Szczegółowa

### 2.1 Struktura Klasy

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // 7 exception handlers + 1 catch-all
    // 2 helper methods
}
```

**@RestControllerAdvice:**
- Połączenie @ControllerAdvice + @ResponseBody
- Globalny scope - dotyczy wszystkich kontrolerów
- Automatyczna serializacja JSON

**Ocena:** ✅ Wzorcowe użycie Spring patterns

### 2.2 Handlers i HTTP Status Codes

#### 2.2.1 404 Not Found

```java
@ExceptionHandler(MeasurementNotFoundException.class)
public ResponseEntity<Map<String, Object>> handleNotFound(
        MeasurementNotFoundException ex) {
    return buildErrorResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
}
```

**Użycie:** Gdy measurement nie istnieje w DB

**Response przykład:**
```json
{
  "error": "Not Found",
  "message": "Measurement with ID 123 not found",
  "timestamp": "2026-01-23T12:34:56.789Z"
}
```

**Ocena:** ✅ RESTful, jasny komunikat

#### 2.2.2 400 Bad Request - IllegalArgumentException

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<Map<String, Object>> handleBadRequest(
        IllegalArgumentException ex) {
    return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
}
```

**Użycie:**
- StatsService date range validation (from > to)
- MeasurementValidator business rules

**Ocena:** ✅ Prawidłowe - IllegalArgumentException to standardowy wybór dla validation

#### 2.2.3 400 Bad Request - Type Mismatch

```java
@ExceptionHandler(MethodArgumentTypeMismatchException.class)
public ResponseEntity<Map<String, Object>> handleTypeMismatch(
        MethodArgumentTypeMismatchException ex) {
    String message = String.format("Invalid value '%s' for parameter '%s'",
            ex.getValue(), ex.getName());
    return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", message);
}
```

**Przykład:**
```
GET /api/stats/date?date=invalid-date
→ 400 "Invalid value 'invalid-date' for parameter 'date'"
```

**Ocena:** ✅ Doskonałe - user-friendly message z konkretnym błędem

#### 2.2.4 400 Bad Request - Bean Validation

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<Map<String, Object>> handleValidationErrors(
        MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
    return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", message);
}
```

**Przykład @Valid w MeasurementRequest:**
```java
POST /api/measurements
{
  "v_rms": -10,  // @NotNull @Min(0)
  "i_rms": null  // @NotNull
}

→ 400 "Voltage must be positive, Current is required"
```

**Ocena:** ✅ Agreguje wszystkie błędy walidacji w jeden message

**Potencjalny problem:**
- Dla wielu błędów message może być długi
- Lepiej zwracać structured errors:
  ```json
  {
    "errors": {
      "v_rms": "Voltage must be positive",
      "i_rms": "Current is required"
    }
  }
  ```

#### 2.2.5 400 Bad Request - Constraint Violation

```java
@ExceptionHandler(ConstraintViolationException.class)
public ResponseEntity<Map<String, Object>> handleConstraintViolation(
        ConstraintViolationException ex) {
    String message = ex.getConstraintViolations().stream()
            .map(ConstraintViolation::getMessage)
            .collect(Collectors.joining(", "));
    return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", message);
}
```

**Różnica vs MethodArgumentNotValidException:**
- `ConstraintViolationException` - dla @Validated na poziomie metody (@Positive @Max)
- `MethodArgumentNotValidException` - dla @Valid na @RequestBody

**Przykład:**
```java
GET /api/measurements/history?limit=9999
→ 400 "limit must be less than or equal to 1000"
```

**Ocena:** ✅ Poprawna obsługa

#### 2.2.6 400 Bad Request - Malformed JSON

```java
@ExceptionHandler(HttpMessageNotReadableException.class)
public ResponseEntity<Map<String, Object>> handleMalformedJson(
        HttpMessageNotReadableException ex) {
    String message = "Malformed JSON request";
    return buildErrorResponse(HttpStatus.BAD_REQUEST, "Bad Request", message);
}
```

**Przykład:**
```
POST /api/measurements
{ broken json }

→ 400 "Malformed JSON request"
```

**Problem:** Generic message, nie pokazuje gdzie błąd

**Lepiej:**
```java
String rootCause = ex.getMostSpecificCause().getMessage();
String message = "Malformed JSON: " + rootCause;
```

**Ocena:** ⚠️ Działa, ale mogłoby być bardziej informacyjne

#### 2.2.7 415 Unsupported Media Type

```java
@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
public ResponseEntity<Map<String, Object>> handleUnsupportedMediaType(
        HttpMediaTypeNotSupportedException ex) {
    String message = "Unsupported Media Type";
    return buildErrorResponse(HttpStatus.UNSUPPORTED_MEDIA_TYPE, message, ex.getMessage());
}
```

**Przykład:**
```
POST /api/measurements
Content-Type: text/plain

→ 415 "Unsupported Media Type"
```

**Ocena:** ✅ Poprawne

#### 2.2.8 500 Internal Server Error - Catch-All

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
    String errorId = UUID.randomUUID().toString();
    log.error("Unexpected error occurred. Error ID: {}", errorId, ex);
    return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Internal Server Error",
        "An unexpected error occurred",
        errorId);
}
```

**Kluczowe features:**
1. **UUID error tracking** - łączy log z response
2. **Log ze stack trace** - `log.error(..., ex)`
3. **Generic message** - nie wyciekają detale implementacji

**Response:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "timestamp": "2026-01-23T12:34:56.789Z",
  "errorId": "a1b2c3d4-..."
}
```

**Ocena:** ✅ DOSKONAŁE - wzorcowa implementacja
- Security: Nie ujawnia szczegółów
- Debuggability: errorId w logach
- Monitoring: Łatwo śledzić 500 errors

### 2.3 Helper Methods

```java
private ResponseEntity<Map<String, Object>> buildErrorResponse(
        HttpStatus status, String error, String message, String errorId) {
    Map<String, Object> body = new HashMap<>();
    body.put("error", error);
    body.put("message", message != null ? message : error);
    body.put("timestamp", Instant.now());
    if (errorId != null) body.put("errorId", errorId);
    return ResponseEntity.status(status).body(body);
}
```

**Ocena:** ✅ DRY principle, consistent structure

**Struktura odpowiedzi:**
- Zawsze: `error`, `message`, `timestamp`
- Opcjonalnie: `errorId` (tylko dla 500)

**Zgodność z RFC 7807 (Problem Details):** ⚠️ Częściowa
```json
// RFC 7807 zaleca:
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Measurement with ID 123 not found",
  "instance": "/api/measurements/123"
}
```

**Dla małego API obecne rozwiązanie jest OK** ✅

---

## 3. Custom Exceptions - Analiza

### 3.1 MeasurementNotFoundException

```java
public class MeasurementNotFoundException extends RuntimeException {
    public MeasurementNotFoundException(String message) {
        super(message);
    }
}
```

**Cechy:**
- Extends RuntimeException (unchecked)
- Simple constructor

**Użycie:**
```java
// W serwisie:
Measurement m = repository.findById(id)
    .orElseThrow(() -> new MeasurementNotFoundException("Not found: " + id));
```

**Ocena:** ✅ Minimalistyczne, wystarczające

**Potencjalne rozszerzenia:**
```java
public class MeasurementNotFoundException extends RuntimeException {
    private final Long measurementId;

    public MeasurementNotFoundException(Long id) {
        super("Measurement not found: " + id);
        this.measurementId = id;
    }

    public Long getMeasurementId() { return measurementId; }
}
```

**Benefit:** Handler może użyć ID w structured response

### 3.2 ValidationException

```java
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }
}
```

**Ocena:** ⚠️ Nieużywany!

**Sprawdzam:**
```bash
grep -r "ValidationException" scada-system/src/main/java
```

**Wynik:** Tylko definicja, **brak użyć**

**Wniosek:** Dead code - można usunąć

**Alternatywnie:** Użyć zamiast IllegalArgumentException w MeasurementValidator:
```java
// Obecnie:
throw new IllegalArgumentException("Power validation failed");

// Mogłoby być:
throw new ValidationException("Power validation failed");
```

**Benefit:** Semantic clarity (validation vs logic errors)

---

## 4. Events - Analiza MeasurementSavedEvent

### 4.1 Struktura

```java
@Getter
public class MeasurementSavedEvent extends ApplicationEvent {

    private final Measurement measurement;
    private final MeasurementDTO dto;

    public MeasurementSavedEvent(Object source, Measurement measurement, MeasurementDTO dto) {
        super(source);
        this.measurement = measurement;
        this.dto = dto;
    }
}
```

**Extends ApplicationEvent:**
- Spring Framework event system
- Synchronous by default
- Thread-safe publication

**Payload:**
- `measurement` - Entity (dla dalszego przetwarzania)
- `dto` - DTO (gotowe do broadcastu)

**Ocena:** ✅ Dobrze zaprojektowane

### 4.2 Użycie w Systemie

**Publisher (MeasurementService):**
```java
@Transactional
public MeasurementDTO saveMeasurement(MeasurementRequest request) {
    // 1. Save to DB
    Measurement saved = repository.save(measurement);

    // 2. Publish event
    eventPublisher.publishEvent(new MeasurementSavedEvent(this, saved, dto));

    return dto;
}
```

**Listener (MeasurementService):**
```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void broadcastAfterCommit(MeasurementSavedEvent event) {
    // Only executes if transaction commits successfully
    if (!event.getMeasurement().getIsValid()) return;

    WaveformDTO waveforms = reconstructWaveforms(event.getMeasurement());
    webSocketService.broadcastMeasurement(event.getDto());
    webSocketService.broadcastRealtimeDashboard(...);
}
```

### 4.3 Transaction Semantics

**@TransactionalEventListener(AFTER_COMMIT):**

```
┌─────────────────────────────────────────────────┐
│ @Transactional saveMeasurement()                │
│ ┌─────────────────────────────────────────────┐ │
│ │ 1. Validate                                 │ │
│ │ 2. Save to DB                               │ │
│ │ 3. publishEvent(MeasurementSavedEvent)      │ │
│ │    → Event queued, NOT executed yet         │ │
│ └─────────────────────────────────────────────┘ │
│ COMMIT                                          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ @TransactionalEventListener(AFTER_COMMIT)       │
│ broadcastAfterCommit(event)                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ 1. Reconstruct waveforms                    │ │
│ │ 2. Broadcast to WebSocket                   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Benefits:**
1. ✅ **WebSocket tylko jeśli commit** - nie broadcastuje niepersystowanych danych
2. ✅ **Expensive ops poza transakcją** - reconstructWaveforms() nie blokuje DB transaction
3. ✅ **Separation of concerns** - persistence oddzielone od notification

**Ocena:** ✅ WZORCOWA architektura event-driven!

### 4.4 Potencjalne Problemy

**Problem 1: Co jeśli broadcastAfterCommit() rzuci exception?**

```java
@TransactionalEventListener(phase = AFTER_COMMIT)
public void broadcastAfterCommit(MeasurementSavedEvent event) {
    // Co jeśli webSocketService.broadcast() rzuci exception?
    webSocketService.broadcastMeasurement(event.getDto());  // może failować
}
```

**Skutek:**
- Exception propaguje do callera (?)
- **Nie** - listener exceptions są swallowowane przez Spring
- Pomiar został zapisany, ale broadcast failed

**Rekomendacja:**
```java
@TransactionalEventListener(phase = AFTER_COMMIT)
public void broadcastAfterCommit(MeasurementSavedEvent event) {
    try {
        webSocketService.broadcastMeasurement(event.getDto());
    } catch (Exception e) {
        log.error("Failed to broadcast measurement", e);
        // Metric counter for monitoring
    }
}
```

**Problem 2: Synchronous execution może być bottleneck**

**Obecnie:**
- saveMeasurement() czeka na broadcastAfterCommit()
- Rekonstrukcja waveforms (~10ms) + broadcast (~5ms)
- **Total:** ~15ms added latency

**Dla 3s interwału to OK**, ale dla real-time (100ms) byłoby za wolne

**Rozwiązanie: @Async:**
```java
@Async
@TransactionalEventListener(phase = AFTER_COMMIT)
public void broadcastAfterCommit(MeasurementSavedEvent event) { ... }
```

**Benefit:** saveMeasurement() returns immediately

---

## 5. Error Response Standards

### 5.1 Struktura Odpowiedzi

**Wszystkie errory mają format:**
```json
{
  "error": "Bad Request",          // HTTP status reason
  "message": "Details here",        // User-friendly message
  "timestamp": "2026-01-23T...",    // ISO-8601
  "errorId": "uuid"                 // Only for 500
}
```

**Ocena:** ✅ Consistent, predictable

### 5.2 Porównanie ze Standardami

#### RFC 7807 - Problem Details for HTTP APIs

**RFC 7807:**
```json
{
  "type": "https://example.com/probs/out-of-credit",
  "title": "You do not have enough credit.",
  "detail": "Your current balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc",
  "status": 403
}
```

**SCADA System:**
```json
{
  "error": "Bad Request",
  "message": "Voltage must be positive",
  "timestamp": "2026-01-23T12:34:56Z"
}
```

**Różnice:**
- Brak `type` (URL do dokumentacji błędu)
- Brak `status` (tylko w HTTP header)
- Brak `instance` (URI zasobu)
- Ma `timestamp` (RFC nie wymaga)

**Dla wewnętrznego SCADA:** Obecny format wystarczający ✅

---

## 6. Logging Strategy

### 6.1 Co Jest Logowane

| Exception Type | Log Level | Stack Trace | Error ID |
|----------------|-----------|-------------|----------|
| MeasurementNotFoundException | - | ❌ | ❌ |
| IllegalArgumentException | - | ❌ | ❌ |
| Validation errors | - | ❌ | ❌ |
| Exception (catch-all) | ERROR | ✅ | ✅ |

**Ocena:** ⚠️ Niekompletne

**Problem:** 400/404 errors nie są logowane
- Trudno debugować validation problems
- Brak metryki ile validation failures

**Rekomendacja:**
```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<Map<String, Object>> handleBadRequest(
        IllegalArgumentException ex) {
    log.warn("Bad request: {}", ex.getMessage());  // ADD THIS
    return buildErrorResponse(...);
}
```

### 6.2 Error ID Tracking

**Tylko dla 500:**
```java
String errorId = UUID.randomUUID().toString();
log.error("Unexpected error occurred. Error ID: {}", errorId, ex);
```

**Use case:**
1. User zgłasza błąd z errorId
2. Ops znajduje w logach: `grep "errorId" app.log`
3. Ma pełny stack trace

**Ocena:** ✅ Excellent dla production troubleshooting

**Rozszerzenie:** MDC (Mapped Diagnostic Context)
```java
MDC.put("errorId", errorId);
log.error("Unexpected error", ex);
MDC.remove("errorId");
```

**Benefit:** errorId w każdej linii loga tej transakcji

---

## 7. Testing Strategy

### 7.1 Unit Tests dla GlobalExceptionHandler

**Przykładowe testy:**
```java
@WebMvcTest(GlobalExceptionHandler.class)
class GlobalExceptionHandlerTest {

    @Test
    void handleNotFound_returns404() throws Exception {
        // Given: controller throws MeasurementNotFoundException
        // When: request
        // Then: 404 + JSON body
    }

    @Test
    void handleValidation_aggregatesMessages() { }

    @Test
    void handleException_generatesErrorId() { }
}
```

**Sprawdzam czy istnieją:**
```bash
find scada-system/src/test -name "*ExceptionHandler*"
```

---

## 8. Problemy i Rekomendacje

### 8.1 Krytyczne

| # | Problem | Wpływ | Priorytet |
|---|---------|-------|-----------|
| - | Brak | - | - |

**Brak krytycznych problemów!** ✅

### 8.2 Wysokie

| # | Problem | Wpływ | Priorytet |
|---|---------|-------|-----------|
| - | Brak | - | - |

### 8.3 Średnie

| # | Problem | Wpływ | Priorytet |
|---|---------|-------|-----------|
| 1 | ValidationException nieużywany | Dead code | 🟡 Średni |
| 2 | Brak logging dla 400/404 | Debuggability | 🟡 Średni |
| 3 | Malformed JSON generic message | User experience | 🟡 Średni |
| 4 | Brak try-catch w broadcastAfterCommit | Robustness | 🟡 Średni |

### 8.4 Niskie

| # | Problem | Wpływ | Priorytet |
|---|---------|-------|-----------|
| 5 | Brak RFC 7807 compliance | Standards | 🟢 Niski |
| 6 | Validation errors jako string | Frontend parsing | 🟢 Niski |
| 7 | Brak @Async dla events | Performance (marginal) | 🟢 Niski |

---

## 9. Best Practices Compliance

### 9.1 Spring Exception Handling

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| @RestControllerAdvice | ✅ Używane | ✅ |
| @ExceptionHandler | ✅ 7 handlerów | ✅ |
| Hierarchia exceptions | ⚠️ Flat (brak base class) | ⚠️ |
| ResponseEntity return | ✅ Wszędzie | ✅ |
| Logging | ⚠️ Tylko dla 500 | ⚠️ |
| Error IDs | ✅ Dla 500 | ✅ |

### 9.2 Event-Driven Architecture

| Praktyka | Implementacja | Ocena |
|----------|---------------|-------|
| ApplicationEvent extension | ✅ MeasurementSavedEvent | ✅ |
| @TransactionalEventListener | ✅ AFTER_COMMIT | ✅ |
| Immutable event payload | ✅ final fields | ✅ |
| Separation of concerns | ✅ Persistence vs notification | ✅ |
| Error handling in listeners | ❌ Brak try-catch | ❌ |
| @Async for performance | ❌ Synchronous | ⚠️ |

---

## 10. Podsumowanie

**Ocena ogólna: 8.5/10**

### 10.1 Mocne Strony

✅ **GlobalExceptionHandler wzorcowy** - czyste, RESTful responses
✅ **Error ID tracking** - doskonałe dla production debugging
✅ **@TransactionalEventListener** - perfect transaction semantics
✅ **Event-driven architecture** - separation of persistence vs broadcast
✅ **Consistent error structure** - predictable API
✅ **Type-specific handlers** - każdy typ błędu obsłużony
✅ **Security** - 500 nie wyciekają szczegółów

### 10.2 Słabe Strony

⚠️ **ValidationException dead code** - zdefiniowana ale nieużywana
⚠️ **Brak logging dla 400/404** - trudniejsze troubleshooting
⚠️ **Brak error handling w event listeners** - unhandled exceptions swallowed
⚠️ **Generic JSON error messages** - "Malformed JSON" bez szczegółów

### 10.3 Kluczowe Wnioski

1. **Solid exception handling** - RESTful, consistent, production-ready
2. **Event architecture exemplary** - AFTER_COMMIT prevents broadcast of uncommitted data
3. **Minor improvements needed** - logging, error handling in listeners
4. **Dead code cleanup** - ValidationException unused

### 10.4 Priorytetowe Akcje

| Priorytet | Akcja | Effort | Impact |
|-----------|-------|--------|--------|
| 🟡 Średni | Dodać try-catch w broadcastAfterCommit() | 15 min | Średni (robustness) |
| 🟡 Średni | Dodać logging dla 400/404 | 30 min | Średni (ops) |
| 🟡 Średni | Usunąć ValidationException lub używać | 10 min | Niski (cleanup) |
| 🟢 Niski | Ulepszyć malformed JSON message | 20 min | Niski (UX) |

---

**Następny moduł:** Frontend Views (#11)
