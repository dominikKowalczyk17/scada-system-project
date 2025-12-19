package com.dkowalczyk.scadasystem.controller;

import com.dkowalczyk.scadasystem.service.DataAggregationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Modern integration tests for HealthController.
 *
 * Testing strategy:
 * - Test basic health check endpoint
 * - Test scheduled jobs health check with various states
 * - Verify proper JSON structure for monitoring systems
 */
@WebMvcTest(HealthController.class)
@ActiveProfiles("test")
@DisplayName("HealthController Integration Tests")
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DataAggregationService dataAggregationService;

    // ========================================
    // GET /health Tests
    // ========================================

    @Nested
    @DisplayName("GET /health")
    class BasicHealthCheck {

        @Test
        @DisplayName("should always return 200 OK with UP status")
        void shouldReturn200_withUpStatus() throws Exception {
            // When & Then
            mockMvc.perform(get("/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.service").value("Energy Monitor Backend"))
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should include valid ISO 8601 timestamp")
        void shouldIncludeValidTimestamp() throws Exception {
            // When & Then
            mockMvc.perform(get("/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.timestamp").isString())
                    .andExpect(jsonPath("$.timestamp").value(matchesRegex("\\d{4}-\\d{2}-\\d{2}T.*")));
        }

        @Test
        @DisplayName("should return consistent response structure")
        void shouldReturnConsistentStructure() throws Exception {
            // When & Then: Verify exact keys present
            mockMvc.perform(get("/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", aMapWithSize(3)))
                    .andExpect(jsonPath("$.status").exists())
                    .andExpect(jsonPath("$.timestamp").exists())
                    .andExpect(jsonPath("$.service").exists());
        }
    }

    // ========================================
    // GET /health/scheduled-jobs Tests
    // ========================================

    @Nested
    @DisplayName("GET /health/scheduled-jobs")
    class ScheduledJobsHealth {

        @Test
        @DisplayName("should return UP status when aggregation job is healthy")
        void shouldReturnUp_whenJobHealthy() throws Exception {
            // Given
            LocalDateTime lastRun = LocalDateTime.now().minusHours(1);
            LocalDate yesterday = LocalDate.now().minusDays(1);

            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(lastRun);
            when(dataAggregationService.getLastProcessedDate()).thenReturn(yesterday);
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.aggregation_job.name").value("DailyStatsAggregation"))
                    .andExpect(jsonPath("$.aggregation_job.schedule").value("0 5 0 * * * (every day at 00:05)"))
                    .andExpect(jsonPath("$.aggregation_job.last_run_success").value(true))
                    .andExpect(jsonPath("$.aggregation_job.last_error").isEmpty())
                    .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("should return DOWN status when aggregation job failed")
        void shouldReturnDown_whenJobFailed() throws Exception {
            // Given
            LocalDateTime lastRun = LocalDateTime.now().minusHours(1);
            LocalDate yesterday = LocalDate.now().minusDays(1);
            String errorMessage = "Database connection timeout";

            when(dataAggregationService.isHealthy()).thenReturn(false);
            when(dataAggregationService.getLastRunTime()).thenReturn(lastRun);
            when(dataAggregationService.getLastProcessedDate()).thenReturn(yesterday);
            when(dataAggregationService.isLastRunSuccess()).thenReturn(false);
            when(dataAggregationService.getLastError()).thenReturn(errorMessage);

            // When & Then
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())  // HTTP 200 but status=DOWN in body
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.aggregation_job.last_run_success").value(false))
                    .andExpect(jsonPath("$.aggregation_job.last_error").value(errorMessage));
        }

        @Test
        @DisplayName("should handle job that has never run")
        void shouldHandle_whenJobNeverRan() throws Exception {
            // Given: Job never executed yet (all nulls)
            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(null);
            when(dataAggregationService.getLastProcessedDate()).thenReturn(null);
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UP"))
                    .andExpect(jsonPath("$.aggregation_job.last_run_time").isEmpty())
                    .andExpect(jsonPath("$.aggregation_job.last_processed_date").isEmpty())
                    .andExpect(jsonPath("$.aggregation_job.last_error").isEmpty());
        }

        @Test
        @DisplayName("should include all aggregation job details")
        void shouldIncludeAllJobDetails() throws Exception {
            // Given
            LocalDateTime lastRun = LocalDateTime.of(2025, 12, 19, 0, 5);
            LocalDate processedDate = LocalDate.of(2025, 12, 18);

            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(lastRun);
            when(dataAggregationService.getLastProcessedDate()).thenReturn(processedDate);
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.aggregation_job.name").value("DailyStatsAggregation"))
                    .andExpect(jsonPath("$.aggregation_job.schedule").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_run_time").value("2025-12-19T00:05:00"))
                    .andExpect(jsonPath("$.aggregation_job.last_processed_date").value("2025-12-18"))
                    .andExpect(jsonPath("$.aggregation_job.last_run_success").value(true))
                    .andExpect(jsonPath("$.aggregation_job.last_error").isEmpty());
        }

        @Test
        @DisplayName("should return consistent response structure")
        void shouldReturnConsistentStructure() throws Exception {
            // Given
            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then: Verify exact keys present
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", aMapWithSize(3)))
                    .andExpect(jsonPath("$.status").exists())
                    .andExpect(jsonPath("$.aggregation_job").exists())
                    .andExpect(jsonPath("$.timestamp").exists())
                    .andExpect(jsonPath("$.aggregation_job", aMapWithSize(6)))
                    .andExpect(jsonPath("$.aggregation_job.name").exists())
                    .andExpect(jsonPath("$.aggregation_job.schedule").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_run_time").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_processed_date").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_run_success").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_error").exists());
        }
    }

    // ========================================
    // Monitoring Integration Tests
    // ========================================

    @Nested
    @DisplayName("Monitoring System Integration")
    class MonitoringIntegration {

        @Test
        @DisplayName("should be parseable by Prometheus/monitoring tools")
        void shouldBeMonitoringToolCompatible() throws Exception {
            // Given
            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then: Verify monitoring-friendly structure
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("application/json"))
                    .andExpect(jsonPath("$.status").value(either(is("UP")).or(is("DOWN"))))
                    .andExpect(jsonPath("$.timestamp").isString());
        }

        @Test
        @DisplayName("should provide actionable error information")
        void shouldProvideActionableErrors() throws Exception {
            // Given: Specific error that DevOps can act on
            String actionableError = "Failed to connect to PostgreSQL: Connection refused (host: localhost, port: 5432)";
            when(dataAggregationService.isHealthy()).thenReturn(false);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(false);
            when(dataAggregationService.getLastError()).thenReturn(actionableError);

            // When & Then
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.aggregation_job.last_error").value(actionableError));
        }

        @Test
        @DisplayName("should indicate staleness if job hasn't run recently")
        void shouldIndicateStaleness() throws Exception {
            // Given: Job last ran 48 hours ago (stale)
            LocalDateTime staletime = LocalDateTime.now().minusHours(48);
            LocalDate oldDate = LocalDate.now().minusDays(2);

            when(dataAggregationService.isHealthy()).thenReturn(true);
            when(dataAggregationService.getLastRunTime()).thenReturn(staletime);
            when(dataAggregationService.getLastProcessedDate()).thenReturn(oldDate);
            when(dataAggregationService.isLastRunSuccess()).thenReturn(true);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then: Monitoring system can detect staleness by comparing timestamps
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.aggregation_job.last_run_time").exists())
                    .andExpect(jsonPath("$.aggregation_job.last_processed_date").value(not(LocalDate.now().minusDays(1).toString())));
        }
    }

    // ========================================
    // Edge Cases
    // ========================================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle very long error messages")
        void shouldHandleLongErrorMessage() throws Exception {
            // Given: Error with full stack trace
            String longError = "Database query failed: " + "x".repeat(1000);

            when(dataAggregationService.isHealthy()).thenReturn(false);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(false);
            when(dataAggregationService.getLastError()).thenReturn(longError);

            // When & Then: Should not truncate or fail
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.aggregation_job.last_error").value(longError));
        }

        @Test
        @DisplayName("should handle special characters in error messages")
        void shouldHandleSpecialCharsInError() throws Exception {
            // Given: Error with special characters
            String specialError = "Query failed: \"SELECT * FROM table WHERE id = 'test'\"";

            when(dataAggregationService.isHealthy()).thenReturn(false);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(false);
            when(dataAggregationService.getLastError()).thenReturn(specialError);

            // When & Then: Should properly escape JSON
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.aggregation_job.last_error").value(specialError));
        }

        @Test
        @DisplayName("should handle null error when job failed")
        void shouldHandleNullErrorOnFailure() throws Exception {
            // Given: Job failed but error is null (shouldn't happen, but defensive)
            when(dataAggregationService.isHealthy()).thenReturn(false);
            when(dataAggregationService.getLastRunTime()).thenReturn(LocalDateTime.now());
            when(dataAggregationService.getLastProcessedDate()).thenReturn(LocalDate.now());
            when(dataAggregationService.isLastRunSuccess()).thenReturn(false);
            when(dataAggregationService.getLastError()).thenReturn(null);

            // When & Then: Should not crash
            mockMvc.perform(get("/health/scheduled-jobs"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DOWN"))
                    .andExpect(jsonPath("$.aggregation_job.last_error").isEmpty());
        }
    }
}
