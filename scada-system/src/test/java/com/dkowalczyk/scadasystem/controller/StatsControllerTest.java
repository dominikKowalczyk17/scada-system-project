package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.BaseControllerTest;
import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for StatsController.
 * Uses MockMvc to test HTTP layer with mocked service layer.
 */
@WebMvcTest(StatsController.class)
@DisplayName("StatsController Integration Tests")
class StatsControllerTest extends BaseControllerTest {

    // ========================================
    // GET /api/stats/daily Tests
    // ========================================

    @Test
    @DisplayName("GET /api/stats/daily should return today's statistics")
    void getDailyStats_shouldReturnTodayStats() throws Exception {
        // Given: Today's stats exist
        LocalDate today = LocalDate.now();
        StatsDTO mockStats = createMockStatsDTO(today);
        when(statsService.getTodayStats()).thenReturn(Optional.of(mockStats));

        // When & Then: GET request should return 200 OK with stats
        mockMvc.perform(get("/api/stats/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date", is(today.toString())))
                .andExpect(jsonPath("$.avg_voltage", is(230.0)))
                .andExpect(jsonPath("$.min_voltage", is(225.0)))
                .andExpect(jsonPath("$.max_voltage", is(235.0)))
                .andExpect(jsonPath("$.measurement_count", is(28800)));
    }

    @Test
    @DisplayName("GET /api/stats/daily should return 404 when no data available")
    void getDailyStats_shouldReturn404_whenNoDataAvailable() throws Exception {
        // Given: No stats for today
        when(statsService.getTodayStats()).thenReturn(Optional.empty());

        // When & Then: GET request should return 404 Not Found
        mockMvc.perform(get("/api/stats/daily"))
                .andExpect(status().isNotFound());
    }

    // ========================================
    // GET /api/stats/last-7-days Tests
    // ========================================

    @Test
    @DisplayName("GET /api/stats/last-7-days should return statistics for last 7 days")
    void getLast7DayStats_shouldReturnStats() throws Exception {
        // Given: Stats for last 7 days exist
        List<StatsDTO> mockStats = List.of(
                createMockStatsDTO(LocalDate.now().minusDays(6)),
                createMockStatsDTO(LocalDate.now().minusDays(5)),
                createMockStatsDTO(LocalDate.now().minusDays(4)),
                createMockStatsDTO(LocalDate.now().minusDays(3)),
                createMockStatsDTO(LocalDate.now().minusDays(2)),
                createMockStatsDTO(LocalDate.now().minusDays(1)),
                createMockStatsDTO(LocalDate.now())
        );
        when(statsService.getLastDaysStats(7)).thenReturn(mockStats);

        // When & Then: GET request should return 200 OK with array of 7 stats
        mockMvc.perform(get("/api/stats/last-7-days"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(7)))
                .andExpect(jsonPath("$[0].avg_voltage", is(230.0)))
                .andExpect(jsonPath("$[6].avg_voltage", is(230.0)));
    }

    @Test
    @DisplayName("GET /api/stats/last-7-days should return empty array when no data available")
    void getLast7DayStats_shouldReturnEmptyArray_whenNoDataAvailable() throws Exception {
        // Given: No stats available
        when(statsService.getLastDaysStats(7)).thenReturn(List.of());

        // When & Then: GET request should return 200 OK with empty array
        mockMvc.perform(get("/api/stats/last-7-days"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ========================================
    // GET /api/stats/last-30-days Tests
    // ========================================

    @Test
    @DisplayName("GET /api/stats/last-30-days should return statistics for last 30 days")
    void getLast30DayStats_shouldReturnStats() throws Exception {
        // Given: Stats for last 30 days exist (returning 5 for simplicity)
        List<StatsDTO> mockStats = List.of(
                createMockStatsDTO(LocalDate.now().minusDays(29)),
                createMockStatsDTO(LocalDate.now().minusDays(20)),
                createMockStatsDTO(LocalDate.now().minusDays(10)),
                createMockStatsDTO(LocalDate.now().minusDays(5)),
                createMockStatsDTO(LocalDate.now())
        );
        when(statsService.getLastDaysStats(30)).thenReturn(mockStats);

        // When & Then: GET request should return 200 OK with array of stats
        mockMvc.perform(get("/api/stats/last-30-days"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(5)))
                .andExpect(jsonPath("$[0].avg_voltage", is(230.0)));
    }

    // ========================================
    // GET /api/stats/range Tests
    // ========================================

    @Test
    @DisplayName("GET /api/stats/range should return statistics for valid date range")
    void getRangeStats_shouldReturnStats_forValidRange() throws Exception {
        // Given: Stats for date range exist
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2025, 11, 7);
        List<StatsDTO> mockEntities = List.of(
                createMockStatsDTO(from),
                createMockStatsDTO(from.plusDays(3)),
                createMockStatsDTO(to)
        );
        when(statsService.getStatsInDateRange(from, to))
                .thenReturn(mockEntities);

        // When & Then: GET request with date range should return 200 OK
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].date", is(from.toString())))
                .andExpect(jsonPath("$[2].date", is(to.toString())));
    }

    @Test
    @DisplayName("GET /api/stats/range should return 400 when from > to")
    void getRangeStats_shouldReturn400_whenInvalidRange() throws Exception {
        // Given: Invalid date range (from after to)
        LocalDate from = LocalDate.of(2025, 11, 10);
        LocalDate to = LocalDate.of(2025, 11, 1);

        // When & Then: GET request should return 400 Bad Request
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/stats/range should return 400 when from is in future")
    void getRangeStats_shouldReturn400_whenFromIsInFuture() throws Exception {
        // Given: Future date range
        LocalDate from = LocalDate.now().plusDays(1);
        LocalDate to = LocalDate.now().plusDays(7);

        // When & Then: GET request should return 400 Bad Request
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/stats/range should return 400 when range exceeds 365 days")
    void getRangeStats_shouldReturn400_whenRangeExceeds365Days() throws Exception {
        // Given: Date range > 365 days
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to = LocalDate.of(2025, 11, 1);

        // When & Then: GET request should return 400 Bad Request
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/stats/range should return empty array when no data in range")
    void getRangeStats_shouldReturnEmptyArray_whenNoDataInRange() throws Exception {
        // Given: No stats for date range
        LocalDate from = LocalDate.of(2025, 11, 1);
        LocalDate to = LocalDate.of(2025, 11, 7);
        when(statsService.getStatsInDateRange(from, to))
                .thenReturn(List.of());

        // When & Then: GET request should return 200 OK with empty array
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    // ========================================
    // GET /api/stats/date Tests
    // ========================================

    @Test
    @DisplayName("GET /api/stats/date should return statistics for specific date")
    void getStatsForDate_shouldReturnStats_forSpecificDate() throws Exception {
        // Given: Stats for specific date exist
        LocalDate testDate = LocalDate.of(2025, 11, 10);
        StatsDTO mockStats = createMockStatsDTO(testDate);
        when(statsService.getStatsForDate(testDate)).thenReturn(Optional.of(mockStats));

        // When & Then: GET request should return 200 OK with stats
        mockMvc.perform(get("/api/stats/date")
                        .param("date", testDate.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date", is(testDate.toString())))
                .andExpect(jsonPath("$.avg_voltage", is(230.0)));
    }

    @Test
    @DisplayName("GET /api/stats/date should return 404 when no data for date")
    void getStatsForDate_shouldReturn404_whenNoDataForDate() throws Exception {
        // Given: No stats for date
        LocalDate testDate = LocalDate.of(2025, 11, 10);
        when(statsService.getStatsForDate(testDate)).thenReturn(Optional.empty());

        // When & Then: GET request should return 404 Not Found
        mockMvc.perform(get("/api/stats/date")
                        .param("date", testDate.toString()))
                .andExpect(status().isNotFound());
    }

    // ========================================
    // Edge Cases - Date Parsing
    // ========================================

    @Test
    @DisplayName("GET /api/stats/range should handle DST transition dates correctly")
    void getRangeStats_shouldHandleDST_correctly() throws Exception {
        // Given: Date range spanning DST transition (Europe: last Sunday of March)
        // In 2025: March 30 is DST transition day
        LocalDate from = LocalDate.of(2025, 3, 28);
        LocalDate to = LocalDate.of(2025, 3, 31);
        List<StatsDTO> mockDtos = List.of(
                createMockStatsDTO(from),
                createMockStatsDTO(LocalDate.of(2025, 3, 30)), // DST transition
                createMockStatsDTO(to)
        );
        when(statsService.getStatsInDateRange(from, to))
                .thenReturn(mockDtos);

        // When & Then: Should handle DST correctly (no errors)
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    @DisplayName("GET /api/stats/range should handle leap year dates correctly")
    void getRangeStats_shouldHandleLeapYear_correctly() throws Exception {
        // Given: Date range including Feb 29 in leap year 2024
        LocalDate from = LocalDate.of(2024, 2, 28);
        LocalDate to = LocalDate.of(2024, 3, 1);
        List<StatsDTO> mockDtos = List.of(
                createMockStatsDTO(from),
                createMockStatsDTO(LocalDate.of(2024, 2, 29)),
                createMockStatsDTO(to)
        );
        when(statsService.getStatsInDateRange(from, to))
                .thenReturn(mockDtos);

        // When & Then: Should handle leap year correctly
        mockMvc.perform(get("/api/stats/range")
                        .param("from", from.toString())
                        .param("to", to.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[1].date", is("2024-02-29")));
    }

    @Test
    @DisplayName("GET /api/stats/date should reject invalid date format")
    void getStatsForDate_shouldReturn400_whenInvalidDateFormat() throws Exception {
        // When & Then: Invalid date format should return 400 Bad Request
        mockMvc.perform(get("/api/stats/date")
                        .param("date", "2025-13-45")) // Invalid: month 13, day 45
                .andExpect(status().isBadRequest());
    }

    // ========================================
    // Helper Methods
    // ========================================

    private StatsDTO createMockStatsDTO(LocalDate date) {
        return StatsDTO.builder()
                .date(date)
                .avgVoltage(230.0)
                .minVoltage(225.0)
                .maxVoltage(235.0)
                .stdDevVoltage(2.5)
                .avgPowerActive(1500.0)
                .minPower(1200.0)
                .peakPower(1800.0)
                .totalEnergyKwh(36.0)
                .avgPowerFactor(0.95)
                .minPowerFactor(0.90)
                .avgFrequency(50.0)
                .minFrequency(49.9)
                .maxFrequency(50.1)
                .voltageSagCount(0)
                .voltageSwellCount(0)
                .interruptionCount(0)
                .thdViolationsCount(0)
                .frequencyDevCount(0)
                .powerFactorPenaltyCount(0)
                .measurementCount(28800)
                .dataCompleteness(1.0)
                .build();
    }
}