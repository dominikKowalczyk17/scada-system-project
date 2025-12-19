package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.model.dto.*;
import com.dkowalczyk.scadasystem.service.MeasurementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Modern integration tests for DashboardController.
 *
 * Testing strategy:
 * - @WebMvcTest for lightweight controller testing
 * - Test unified dashboard endpoint response structure
 * - Test PN-EN 50160 compliance indicators
 * - Verify proper HTTP status codes
 */
@WebMvcTest(DashboardController.class)
@ActiveProfiles("test")
@DisplayName("DashboardController Integration Tests")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MeasurementService measurementService;

    // ========================================
    // Test Data Builders
    // ========================================

    private MeasurementDTO createMockMeasurement() {
        return MeasurementDTO.builder()
                .id(1L)
                .time(Instant.now())
                .voltageRms(230.0)
                .currentRms(5.0)
                .powerActive(1150.0)
                .powerApparent(1200.0)
                .powerReactive(200.0)
                .cosPhi(0.95)
                .frequency(50.0)
                .thdVoltage(2.5)
                .thdCurrent(5.0)
                .harmonicsV(new Double[]{230.0, 0.5, 1.2, 0.3, 0.8, 0.4, 0.2, 0.1})
                .harmonicsI(new Double[]{5.0, 0.05, 0.12, 0.03, 0.08, 0.04, 0.02, 0.01})
                .voltageDeviationPercent(0.0)
                .frequencyDeviationHz(0.0)
                .build();
    }

    private WaveformDTO createMockWaveforms() {
        double[] voltageWaveform = new double[200];
        double[] currentWaveform = new double[200];
        for (int i = 0; i < 200; i++) {
            voltageWaveform[i] = 230.0 * Math.sin(2 * Math.PI * i / 200.0);
            currentWaveform[i] = 5.0 * Math.sin(2 * Math.PI * i / 200.0);
        }
        return WaveformDTO.builder()
                .voltage(voltageWaveform)
                .current(currentWaveform)
                .build();
    }

    private DashboardDTO createMockDashboard() {
        return DashboardDTO.builder()
                .latestMeasurement(createMockMeasurement())
                .waveforms(createMockWaveforms())
                .recentHistory(List.of(
                        createMockMeasurement(),
                        createMockMeasurement(),
                        createMockMeasurement()
                ))
                .build();
    }

    private PowerQualityIndicatorsDTO createCompliantIndicators() {
        return PowerQualityIndicatorsDTO.builder()
                .timestamp(Instant.now())
                .voltageRms(230.0)
                .voltageDeviationPercent(0.0)
                .voltageWithinLimits(true)
                .frequency(50.0)
                .frequencyDeviationHz(0.0)
                .frequencyWithinLimits(true)
                .thdVoltage(2.5)
                .thdWithinLimits(true)
                .harmonicsVoltage(new Double[]{230.0, 0.5, 1.2, 0.3, 0.8, 0.4, 0.2, 0.1})
                .overallCompliant(true)
                .statusMessage("All indicators within PN-EN 50160 limits")
                .build();
    }

    private PowerQualityIndicatorsDTO createNonCompliantIndicators() {
        return PowerQualityIndicatorsDTO.builder()
                .timestamp(Instant.now())
                .voltageRms(205.0)  // -10.87% deviation
                .voltageDeviationPercent(-10.87)
                .voltageWithinLimits(false)
                .frequency(49.0)  // -1.0 Hz deviation
                .frequencyDeviationHz(-1.0)
                .frequencyWithinLimits(false)
                .thdVoltage(10.0)  // Exceeds 8% limit
                .thdWithinLimits(false)
                .harmonicsVoltage(new Double[]{205.0, 5.0, 3.0, 2.0, 1.0, 0.5, 0.3, 0.2})
                .overallCompliant(false)
                .statusMessage("Non-compliant: Voltage deviation (-10.87%), Frequency deviation (-1.0 Hz), THD exceeded (10.0%)")
                .build();
    }

    // ========================================
    // GET /api/dashboard Tests
    // ========================================

    @Nested
    @DisplayName("GET /api/dashboard")
    class GetDashboard {

        @Test
        @DisplayName("should return 200 OK with complete dashboard data")
        void shouldReturn200_withCompleteDashboard() throws Exception {
            // Given
            DashboardDTO mockDashboard = createMockDashboard();
            when(measurementService.getDashboardData()).thenReturn(Optional.of(mockDashboard));

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.latest_measurement").exists())
                    .andExpect(jsonPath("$.latest_measurement.voltage_rms").value(230.0))
                    .andExpect(jsonPath("$.latest_measurement.current_rms").value(5.0))
                    .andExpect(jsonPath("$.latest_measurement.frequency").value(50.0))
                    .andExpect(jsonPath("$.waveforms").exists())
                    .andExpect(jsonPath("$.waveforms.voltage").isArray())
                    .andExpect(jsonPath("$.waveforms.voltage", hasSize(200)))
                    .andExpect(jsonPath("$.waveforms.current").isArray())
                    .andExpect(jsonPath("$.waveforms.current", hasSize(200)))
                    .andExpect(jsonPath("$.recent_history").isArray())
                    .andExpect(jsonPath("$.recent_history", hasSize(3)));
        }

        @Test
        @DisplayName("should return 404 Not Found when no data available")
        void shouldReturn404_whenNoDashboardData() throws Exception {
            // Given
            when(measurementService.getDashboardData()).thenReturn(Optional.empty());

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("should include all electrical parameters in latest measurement")
        void shouldIncludeAllElectricalParameters() throws Exception {
            // Given
            DashboardDTO mockDashboard = createMockDashboard();
            when(measurementService.getDashboardData()).thenReturn(Optional.of(mockDashboard));

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.latest_measurement.power_active").value(1150.0))
                    .andExpect(jsonPath("$.latest_measurement.power_apparent").value(1200.0))
                    .andExpect(jsonPath("$.latest_measurement.power_reactive").value(200.0))
                    .andExpect(jsonPath("$.latest_measurement.cos_phi").value(0.95))
                    .andExpect(jsonPath("$.latest_measurement.thd_voltage").value(2.5))
                    .andExpect(jsonPath("$.latest_measurement.thd_current").value(5.0));
        }

        @Test
        @DisplayName("should include harmonics arrays in latest measurement")
        void shouldIncludeHarmonicsArrays() throws Exception {
            // Given
            DashboardDTO mockDashboard = createMockDashboard();
            when(measurementService.getDashboardData()).thenReturn(Optional.of(mockDashboard));

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.latest_measurement.harmonics_v").isArray())
                    .andExpect(jsonPath("$.latest_measurement.harmonics_v", hasSize(8)))
                    .andExpect(jsonPath("$.latest_measurement.harmonics_v[0]").value(230.0))
                    .andExpect(jsonPath("$.latest_measurement.harmonics_i").isArray())
                    .andExpect(jsonPath("$.latest_measurement.harmonics_i", hasSize(8)))
                    .andExpect(jsonPath("$.latest_measurement.harmonics_i[0]").value(5.0));
        }

        @Test
        @DisplayName("should include PN-EN 50160 deviation indicators")
        void shouldIncludePowerQualityDeviations() throws Exception {
            // Given
            DashboardDTO mockDashboard = createMockDashboard();
            when(measurementService.getDashboardData()).thenReturn(Optional.of(mockDashboard));

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.latest_measurement.voltage_deviation_percent").exists())
                    .andExpect(jsonPath("$.latest_measurement.frequency_deviation_hz").exists());
        }

        @Test
        @DisplayName("should handle empty recent history gracefully")
        void shouldHandleEmptyRecentHistory() throws Exception {
            // Given: Dashboard with no recent history
            DashboardDTO dashboardWithNoHistory = DashboardDTO.builder()
                    .latestMeasurement(createMockMeasurement())
                    .waveforms(createMockWaveforms())
                    .recentHistory(List.of())  // Empty history
                    .build();
            when(measurementService.getDashboardData()).thenReturn(Optional.of(dashboardWithNoHistory));

            // When & Then
            mockMvc.perform(get("/api/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.recent_history").isArray())
                    .andExpect(jsonPath("$.recent_history", hasSize(0)));
        }
    }

    // ========================================
    // GET /api/dashboard/power-quality-indicators Tests
    // ========================================

    @Nested
    @DisplayName("GET /api/dashboard/power-quality-indicators")
    class GetPowerQualityIndicators {

        @Test
        @DisplayName("should return 200 OK with compliant indicators")
        void shouldReturn200_withCompliantIndicators() throws Exception {
            // Given
            PowerQualityIndicatorsDTO compliant = createCompliantIndicators();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(compliant));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.voltage_rms").value(230.0))
                    .andExpect(jsonPath("$.voltage_deviation_percent").value(0.0))
                    .andExpect(jsonPath("$.voltage_within_limits").value(true))
                    .andExpect(jsonPath("$.frequency").value(50.0))
                    .andExpect(jsonPath("$.frequency_deviation_hz").value(0.0))
                    .andExpect(jsonPath("$.frequency_within_limits").value(true))
                    .andExpect(jsonPath("$.thd_voltage").value(2.5))
                    .andExpect(jsonPath("$.thd_within_limits").value(true))
                    .andExpect(jsonPath("$.overall_compliant").value(true))
                    .andExpect(jsonPath("$.status_message").value(containsString("within PN-EN 50160")));
        }

        @Test
        @DisplayName("should return 200 OK with non-compliant indicators")
        void shouldReturn200_withNonCompliantIndicators() throws Exception {
            // Given
            PowerQualityIndicatorsDTO nonCompliant = createNonCompliantIndicators();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(nonCompliant));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.voltage_rms").value(205.0))
                    .andExpect(jsonPath("$.voltage_deviation_percent").value(-10.87))
                    .andExpect(jsonPath("$.voltage_within_limits").value(false))
                    .andExpect(jsonPath("$.frequency").value(49.0))
                    .andExpect(jsonPath("$.frequency_deviation_hz").value(-1.0))
                    .andExpect(jsonPath("$.frequency_within_limits").value(false))
                    .andExpect(jsonPath("$.thd_voltage").value(10.0))
                    .andExpect(jsonPath("$.thd_within_limits").value(false))
                    .andExpect(jsonPath("$.overall_compliant").value(false))
                    .andExpect(jsonPath("$.status_message").value(containsString("Non-compliant")));
        }

        @Test
        @DisplayName("should return 404 Not Found when no indicators available")
        void shouldReturn404_whenNoIndicators() throws Exception {
            // Given
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.empty());

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("should include timestamp in response")
        void shouldIncludeTimestamp() throws Exception {
            // Given
            PowerQualityIndicatorsDTO indicators = createCompliantIndicators();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(indicators));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should include harmonics voltage array")
        void shouldIncludeHarmonicsVoltageArray() throws Exception {
            // Given
            PowerQualityIndicatorsDTO indicators = createCompliantIndicators();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(indicators));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.harmonics_voltage").isArray())
                    .andExpect(jsonPath("$.harmonics_voltage", hasSize(8)))
                    .andExpect(jsonPath("$.harmonics_voltage[0]").value(230.0));
        }

        @Test
        @DisplayName("should handle edge case: voltage at exact -10% limit")
        void shouldHandleVoltageAtExactNegativeLimit() throws Exception {
            // Given: Voltage exactly at -10% limit (207V)
            PowerQualityIndicatorsDTO atLimit = PowerQualityIndicatorsDTO.builder()
                    .timestamp(Instant.now())
                    .voltageRms(207.0)
                    .voltageDeviationPercent(-10.0)
                    .voltageWithinLimits(true)  // -10% is still within limits
                    .frequency(50.0)
                    .frequencyDeviationHz(0.0)
                    .frequencyWithinLimits(true)
                    .thdVoltage(2.5)
                    .thdWithinLimits(true)
                    .harmonicsVoltage(new Double[]{207.0, 0.5, 1.0, 0.3, 0.5, 0.2, 0.1, 0.05})
                    .overallCompliant(true)
                    .statusMessage("All indicators within PN-EN 50160 limits")
                    .build();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(atLimit));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.voltage_within_limits").value(true))
                    .andExpect(jsonPath("$.overall_compliant").value(true));
        }

        @Test
        @DisplayName("should handle edge case: frequency at exact +0.5Hz limit")
        void shouldHandleFrequencyAtExactPositiveLimit() throws Exception {
            // Given: Frequency exactly at +0.5Hz limit (50.5Hz)
            PowerQualityIndicatorsDTO atLimit = PowerQualityIndicatorsDTO.builder()
                    .timestamp(Instant.now())
                    .voltageRms(230.0)
                    .voltageDeviationPercent(0.0)
                    .voltageWithinLimits(true)
                    .frequency(50.5)
                    .frequencyDeviationHz(0.5)
                    .frequencyWithinLimits(true)  // +0.5Hz is still within limits
                    .thdVoltage(2.5)
                    .thdWithinLimits(true)
                    .harmonicsVoltage(new Double[]{230.0, 0.5, 1.0, 0.3, 0.5, 0.2, 0.1, 0.05})
                    .overallCompliant(true)
                    .statusMessage("All indicators within PN-EN 50160 limits")
                    .build();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(atLimit));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.frequency_within_limits").value(true))
                    .andExpect(jsonPath("$.overall_compliant").value(true));
        }

        @Test
        @DisplayName("should handle edge case: THD at exact 8% limit")
        void shouldHandleThdAtExactLimit() throws Exception {
            // Given: THD exactly at 8% limit
            PowerQualityIndicatorsDTO atLimit = PowerQualityIndicatorsDTO.builder()
                    .timestamp(Instant.now())
                    .voltageRms(230.0)
                    .voltageDeviationPercent(0.0)
                    .voltageWithinLimits(true)
                    .frequency(50.0)
                    .frequencyDeviationHz(0.0)
                    .frequencyWithinLimits(true)
                    .thdVoltage(8.0)
                    .thdWithinLimits(true)  // 8% is still within limits (< not <=)
                    .harmonicsVoltage(new Double[]{230.0, 5.0, 3.0, 2.0, 1.0, 0.5, 0.3, 0.2})
                    .overallCompliant(true)
                    .statusMessage("All indicators within PN-EN 50160 limits")
                    .build();
            when(measurementService.getLatestPowerQualityIndicators()).thenReturn(Optional.of(atLimit));

            // When & Then
            mockMvc.perform(get("/api/dashboard/power-quality-indicators"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.thd_within_limits").value(true))
                    .andExpect(jsonPath("$.overall_compliant").value(true));
        }
    }
}
