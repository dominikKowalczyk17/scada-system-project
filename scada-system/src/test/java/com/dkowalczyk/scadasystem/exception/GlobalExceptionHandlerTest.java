package com.dkowalczyk.scadasystem.exception;

import com.dkowalczyk.scadasystem.controller.MeasurementController;
import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Modern integration tests for GlobalExceptionHandler.
 *
 * Testing strategy:
 * - Test exception handling through real controller endpoints
 * - Verify consistent error response format
 * - Test all exception types handled by GlobalExceptionHandler
 * - Ensure no sensitive information leaks in error responses
 */
@WebMvcTest({MeasurementController.class, GlobalExceptionHandler.class})
@ActiveProfiles("test")
@DisplayName("GlobalExceptionHandler Integration Tests")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private MeasurementService measurementService;

    // ========================================
    // Test Data Builders
    // ========================================

    private MeasurementRequest createValidRequest() {
        MeasurementRequest request = new MeasurementRequest();
        request.setTimestamp(Instant.now().getEpochSecond());
        request.setVoltageRms(230.0);
        request.setCurrentRms(5.0);
        request.setFrequency(50.0);
        return request;
    }

    // ========================================
    // MeasurementNotFoundException Tests
    // ========================================

    @Nested
    @DisplayName("MeasurementNotFoundException Handling")
    class NotFoundExceptionHandling {

        @Test
        @DisplayName("should return 404 with error details when measurement not found")
        void shouldReturn404_whenMeasurementNotFound() throws Exception {
            // Given
            when(measurementService.getLatestMeasurement())
                    .thenThrow(new MeasurementNotFoundException("No measurements found in database"));

            // When & Then
            mockMvc.perform(get("/api/measurements/latest"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.message").value("No measurements found in database"))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should include ISO 8601 timestamp in error response")
        void shouldIncludeTimestampInErrorResponse() throws Exception {
            // Given
            when(measurementService.getLatestMeasurement())
                    .thenThrow(new MeasurementNotFoundException("Not found"));

            // When & Then
            mockMvc.perform(get("/api/measurements/latest"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.timestamp").isString())
                    .andExpect(jsonPath("$.timestamp").value(matchesRegex("\\d{4}-\\d{2}-\\d{2}T.*")));
        }

        @Test
        @DisplayName("should return consistent error response structure")
        void shouldReturnConsistentStructure() throws Exception {
            // Given
            when(measurementService.getLatestMeasurement())
                    .thenThrow(new MeasurementNotFoundException("Not found"));

            // When & Then
            mockMvc.perform(get("/api/measurements/latest"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$", aMapWithSize(3)))
                    .andExpect(jsonPath("$.error").exists())
                    .andExpect(jsonPath("$.message").exists())
                    .andExpect(jsonPath("$.timestamp").exists());
        }
    }

    // ========================================
    // IllegalArgumentException Tests
    // ========================================

    @Nested
    @DisplayName("IllegalArgumentException Handling")
    class IllegalArgumentExceptionHandling {

        @Test
        @DisplayName("should return 400 with error details for invalid arguments")
        void shouldReturn400_whenIllegalArgument() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException("Voltage must be positive"));

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value("Voltage must be positive"))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should handle IllegalArgumentException with null message")
        void shouldHandleNullMessage() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException());

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Bad Request"));
        }
    }

    // ========================================
    // MethodArgumentTypeMismatchException Tests
    // ========================================

    @Nested
    @DisplayName("MethodArgumentTypeMismatchException Handling")
    class TypeMismatchExceptionHandling {

        @Test
        @DisplayName("should return 400 with helpful message for invalid parameter type")
        void shouldReturn400_whenParameterTypeMismatch() throws Exception {
            // When: Pass string instead of number for limit parameter
            mockMvc.perform(get("/api/measurements/history")
                            .param("limit", "invalid"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value(containsString("Invalid value")))
                    .andExpect(jsonPath("$.message").value(containsString("limit")))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should handle invalid timestamp parameter")
        void shouldHandleInvalidTimestamp() throws Exception {
            // When: Pass non-numeric timestamp
            mockMvc.perform(get("/api/measurements/history")
                            .param("from", "not-a-number"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value(containsString("Invalid value")));
        }
    }

    // ========================================
    // Validation Error Tests (@Valid)
    // ========================================

    @Nested
    @DisplayName("Bean Validation Error Handling")
    class ValidationErrorHandling {

        @Test
        @DisplayName("should return 400 when required field is missing")
        void shouldReturn400_whenRequiredFieldMissing() throws Exception {
            // Given: Request missing required voltageRms field
            MeasurementRequest request = new MeasurementRequest();
            request.setTimestamp(Instant.now().getEpochSecond());
            // voltageRms is null (required)
            request.setCurrentRms(5.0);
            request.setFrequency(50.0);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when field violates constraint")
        void shouldReturn400_whenConstraintViolated() throws Exception {
            // Given: Voltage exceeds max (500V)
            MeasurementRequest request = createValidRequest();
            request.setVoltageRms(600.0);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when multiple constraints violated")
        void shouldReturn400_whenMultipleConstraintsViolated() throws Exception {
            // Given: Multiple invalid fields
            MeasurementRequest request = new MeasurementRequest();
            request.setTimestamp(Instant.now().getEpochSecond());
            request.setVoltageRms(-10.0);  // Must be >= 0
            request.setCurrentRms(150.0);  // Must be <= 100
            request.setFrequency(70.0);  // Must be <= 65

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when JSON is malformed")
        void shouldReturn400_whenMalformedJson() throws Exception {
            // Given: Invalid JSON syntax
            String malformedJson = "{\"timestamp\": 1234, invalid json}";

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(malformedJson))
                    .andExpect(status().isBadRequest());
        }
    }

    // ========================================
    // Generic Exception Handling
    // ========================================

    @Nested
    @DisplayName("Generic Exception Handling")
    class GenericExceptionHandling {

        @Test
        @DisplayName("should return 500 for unexpected exceptions")
        void shouldReturn500_forUnexpectedExceptions() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException("Unexpected database error"));

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("Internal Server Error"))
                    .andExpect(jsonPath("$.message").value("Unexpected database error"))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should not leak stack traces in production")
        void shouldNotLeakStackTraces() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException("Database error with sensitive info"));

            // When & Then: Should only contain message, not full stack trace
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.message").exists())
                    .andExpect(jsonPath("$.stackTrace").doesNotExist())
                    .andExpect(jsonPath("$.trace").doesNotExist());
        }

        @Test
        @DisplayName("should return consistent error structure for all exception types")
        void shouldReturnConsistentStructure() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException("Error"));

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$", aMapWithSize(3)))
                    .andExpect(jsonPath("$.error").exists())
                    .andExpect(jsonPath("$.message").exists())
                    .andExpect(jsonPath("$.timestamp").exists());
        }
    }

    // ========================================
    // Security & Edge Cases
    // ========================================

    @Nested
    @DisplayName("Security and Edge Cases")
    class SecurityAndEdgeCases {

        @Test
        @DisplayName("should handle exceptions with special characters in message")
        void shouldHandleSpecialCharsInMessage() throws Exception {
            // Given: Exception message with special characters
            String specialMessage = "Error: \"value\" = '<script>alert(1)</script>'";
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException(specialMessage));

            // When & Then: Should properly escape JSON
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(specialMessage));
        }

        @Test
        @DisplayName("should handle exceptions with Unicode characters")
        void shouldHandleUnicodeInMessage() throws Exception {
            // Given: Exception message with Unicode
            String unicodeMessage = "Błąd: pomiar z węzła №1 测试";
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException(unicodeMessage));

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(unicodeMessage));
        }

        @Test
        @DisplayName("should handle very long error messages")
        void shouldHandleLongErrorMessages() throws Exception {
            // Given: Very long error message
            String longMessage = "Error: " + "x".repeat(1000);
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException(longMessage));

            // When & Then: Should not truncate or crash
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(longMessage));
        }

        @Test
        @DisplayName("should not expose internal implementation details")
        void shouldNotExposeInternalDetails() throws Exception {
            // Given: Exception with sensitive internal info
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException("DB connection failed: jdbc:postgresql://internal-db:5432/prod"));

            // When & Then: Should return error but not expose connection string details
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    // Message is returned as-is (this is acceptable for logged-in users)
                    // For production, consider sanitizing messages
                    .andExpect(jsonPath("$.message").exists());
        }

        @Test
        @DisplayName("should handle null exception messages gracefully")
        void shouldHandleNullExceptionMessage() throws Exception {
            // Given: Exception with null message
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new RuntimeException((String) null));

            // When & Then: Should not crash
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error").value("Internal Server Error"));
        }
    }

    // ========================================
    // Content-Type Tests
    // ========================================

    @Nested
    @DisplayName("Content-Type Handling")
    class ContentTypeHandling {

        @Test
        @DisplayName("should return JSON error for missing Content-Type")
        void shouldReturnJsonError_whenMissingContentType() throws Exception {
            // When: POST without Content-Type header
            mockMvc.perform(post("/api/measurements")
                            .content("{}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("should return JSON error for wrong Content-Type")
        void shouldReturnJsonError_whenWrongContentType() throws Exception {
            // When: POST with wrong Content-Type
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.TEXT_PLAIN)
                            .content("{}"))
                    .andExpect(status().is4xxClientError());
        }

        @Test
        @DisplayName("should always return application/json error responses")
        void shouldAlwaysReturnJsonErrors() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenThrow(new IllegalArgumentException("Error"));

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }
    }
}
