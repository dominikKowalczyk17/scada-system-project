package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.BaseControllerTest;
import com.dkowalczyk.scadasystem.model.dto.MeasurementDTO;
import com.dkowalczyk.scadasystem.model.dto.MeasurementRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Modern integration tests for MeasurementController using Spring Boot 3 best practices.
 *
 * Architecture:
 * - @WebMvcTest for lightweight controller testing (no full Spring context)
 * - @Nested for test organization by endpoint
 * - @ParameterizedTest for data-driven validation tests
 * - AssertJ-style matchers for fluent assertions
 */
@WebMvcTest(MeasurementController.class)
@DisplayName("MeasurementController Integration Tests")
class MeasurementControllerTest extends BaseControllerTest {

    // ========================================
    // Test Data Builders (DRY principle)
    // ========================================

    private MeasurementRequest createValidRequest() {
        MeasurementRequest request = new MeasurementRequest();
        request.setTimestamp(Instant.now().getEpochSecond());
        request.setVoltageRms(230.0);
        request.setCurrentRms(5.0);
        request.setPowerActive(1150.0);
        request.setPowerApparent(1200.0);
        request.setPowerReactive(200.0);
        request.setCosPhi(0.95);
        request.setFrequency(50.0);
        request.setThdVoltage(2.5);
        request.setThdCurrent(5.0);
        request.setHarmonicsV(new Double[]{230.0, 0.5, 1.2, 0.3, 0.8, 0.4, 0.2, 0.1});
        request.setHarmonicsI(new Double[]{5.0, 0.05, 0.12, 0.03, 0.08, 0.04, 0.02, 0.01});
        return request;
    }

    private MeasurementDTO createMockDTO() {
        return MeasurementDTO.builder()
                .id(1L)
                .time(Instant.now())
                .voltageRms(230.0)
                .currentRms(5.0)
                .powerActive(1150.0)
                .frequency(50.0)
                .thdVoltage(2.5)
                .voltageDeviationPercent(0.0)
                .frequencyDeviationHz(0.0)
                .build();
    }

    // ========================================
    // POST /api/measurements Tests
    // ========================================

    @Nested
    @DisplayName("POST /api/measurements")
    class CreateMeasurement {

        @Test
        @DisplayName("should return 201 Created when request is valid")
        void shouldReturn201_whenValidRequest() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            MeasurementDTO mockResponse = createMockDTO();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(mockResponse);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.voltage_rms").value(230.0))
                    .andExpect(jsonPath("$.current_rms").value(5.0))
                    .andExpect(jsonPath("$.frequency").value(50.0));
        }

        @Test
        @DisplayName("should return 400 Bad Request when voltageRms is missing")
        void shouldReturn400_whenVoltageRmsMissing() throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            request.setVoltageRms(null);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @ParameterizedTest
        @ValueSource(doubles = {-1.0, -100.0, 501.0, 1000.0})
        @DisplayName("should return 400 Bad Request when voltage is out of range")
        void shouldReturn400_whenVoltageOutOfRange(double invalidVoltage) throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            request.setVoltageRms(invalidVoltage);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @ParameterizedTest
        @ValueSource(doubles = {-1.0, 101.0, 500.0})
        @DisplayName("should return 400 Bad Request when current is out of range")
        void shouldReturn400_whenCurrentOutOfRange(double invalidCurrent) throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            request.setCurrentRms(invalidCurrent);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @ParameterizedTest
        @ValueSource(doubles = {44.0, 40.0, 66.0, 70.0})
        @DisplayName("should return 400 Bad Request when frequency is out of range")
        void shouldReturn400_whenFrequencyOutOfRange(double invalidFrequency) throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            request.setFrequency(invalidFrequency);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @ParameterizedTest
        @ValueSource(doubles = {-1.5, -2.0, 1.5, 2.0})
        @DisplayName("should return 400 Bad Request when cosPhi is out of range")
        void shouldReturn400_whenCosPhiOutOfRange(double invalidCosPhi) throws Exception {
            // Given
            MeasurementRequest request = createValidRequest();
            request.setCosPhi(invalidCosPhi);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should accept request with minimal required fields only")
        void shouldAccept_whenOnlyRequiredFieldsPresent() throws Exception {
            // Given: Only required fields (timestamp, voltage, current, frequency)
            MeasurementRequest request = new MeasurementRequest();
            request.setTimestamp(Instant.now().getEpochSecond());
            request.setVoltageRms(230.0);
            request.setCurrentRms(5.0);
            request.setFrequency(50.0);

            MeasurementDTO mockResponse = createMockDTO();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(mockResponse);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }

        @Test
        @DisplayName("should handle edge case voltage values at boundaries")
        void shouldAccept_edgeCaseVoltages() throws Exception {
            // Given: Boundary values (0.0, 500.0)
            MeasurementRequest request = createValidRequest();
            request.setVoltageRms(0.0);

            MeasurementDTO mockResponse = createMockDTO();
            when(measurementService.saveMeasurement(any(MeasurementRequest.class)))
                    .thenReturn(mockResponse);

            // When & Then
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            // Test upper boundary
            request.setVoltageRms(500.0);
            mockMvc.perform(post("/api/measurements")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }
    }

    // ========================================
    // GET /api/measurements/latest Tests
    // ========================================

    @Nested
    @DisplayName("GET /api/measurements/latest")
    class GetLatest {

        @Test
        @DisplayName("should return 200 OK with latest measurement when data exists")
        void shouldReturn200_whenMeasurementExists() throws Exception {
            // Given
            MeasurementDTO mockMeasurement = createMockDTO();
            when(measurementService.getLatestMeasurement()).thenReturn(Optional.of(mockMeasurement));

            // When & Then
            mockMvc.perform(get("/api/measurements/latest"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.voltage_rms").value(230.0))
                    .andExpect(jsonPath("$.frequency").value(50.0))
                    .andExpect(jsonPath("$.time").exists());
        }

        @Test
        @DisplayName("should return 404 Not Found when no measurements exist")
        void shouldReturn404_whenNoMeasurements() throws Exception {
            // Given
            when(measurementService.getLatestMeasurement()).thenReturn(Optional.empty());

            // When & Then
            mockMvc.perform(get("/api/measurements/latest"))
                    .andExpect(status().isNotFound());
        }
    }

    // ========================================
    // GET /api/measurements/history Tests
    // ========================================

    @Nested
    @DisplayName("GET /api/measurements/history")
    class GetHistory {

        @Test
        @DisplayName("should return 200 OK with measurement history")
        void shouldReturn200_withHistory() throws Exception {
            // Given
            List<MeasurementDTO> mockHistory = List.of(
                    createMockDTO(),
                    createMockDTO(),
                    createMockDTO()
            );
            when(measurementService.getHistory(any(Instant.class), any(Instant.class), any(Integer.class)))
                    .thenReturn(mockHistory);

            long now = Instant.now().getEpochSecond();
            long oneHourAgo = Instant.now().minusSeconds(3600).getEpochSecond();

            // When & Then
            mockMvc.perform(get("/api/measurements/history")
                            .param("from", String.valueOf(oneHourAgo))
                            .param("to", String.valueOf(now))
                            .param("limit", "100"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(3)))
                    .andExpect(jsonPath("$[0].voltage_rms").value(230.0));
        }

        @Test
        @DisplayName("should use default parameters when not provided")
        void shouldUseDefaults_whenParametersNotProvided() throws Exception {
            // Given
            List<MeasurementDTO> mockHistory = List.of(createMockDTO());
            when(measurementService.getHistory(any(Instant.class), any(Instant.class), any(Integer.class)))
                    .thenReturn(mockHistory);

            // When & Then: No parameters = defaults (last 1 hour, limit 100)
            mockMvc.perform(get("/api/measurements/history"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));
        }

        @Test
        @DisplayName("should return empty list when no data in range")
        void shouldReturnEmptyList_whenNoDataInRange() throws Exception {
            // Given
            when(measurementService.getHistory(any(Instant.class), any(Instant.class), any(Integer.class)))
                    .thenReturn(List.of());

            long now = Instant.now().getEpochSecond();
            long oneHourAgo = Instant.now().minusSeconds(3600).getEpochSecond();

            // When & Then
            mockMvc.perform(get("/api/measurements/history")
                            .param("from", String.valueOf(oneHourAgo))
                            .param("to", String.valueOf(now)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }

        @Test
        @DisplayName("should respect limit parameter")
        void shouldRespectLimit() throws Exception {
            // Given
            List<MeasurementDTO> mockHistory = List.of(
                    createMockDTO(),
                    createMockDTO()
            );
            when(measurementService.getHistory(any(Instant.class), any(Instant.class), any(Integer.class)))
                    .thenReturn(mockHistory);

            // When & Then
            mockMvc.perform(get("/api/measurements/history")
                            .param("limit", "2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));
        }

        @Test
        @DisplayName("should return 400 Bad Request when limit exceeds maximum")
        void shouldReturn400_whenLimitExceedsMax() throws Exception {
            // When & Then
            mockMvc.perform(get("/api/measurements/history")
                            .param("limit", "1001"))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 Bad Request when limit is negative")
        void shouldReturn400_whenLimitIsNegative() throws Exception {
            // When & Then
            mockMvc.perform(get("/api/measurements/history")
                            .param("limit", "-10"))
                    .andExpect(status().isBadRequest());
        }
    }
}
