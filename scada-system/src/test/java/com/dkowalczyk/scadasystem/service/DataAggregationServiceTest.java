package com.dkowalczyk.scadasystem.service;

import com.dkowalczyk.scadasystem.model.dto.StatsDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Modern unit tests for DataAggregationService.
 *
 * Testing strategy:
 * - Mock StatsService to isolate scheduled job logic
 * - Test thread safety with concurrent execution
 * - Verify health check methods under various conditions
 * - Test manual trigger functionality
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DataAggregationService Unit Tests")
class DataAggregationServiceTest {

    @Mock
    private StatsService statsService;

    @InjectMocks
    private DataAggregationService aggregationService;

    private StatsDTO createMockStats(LocalDate date) {
        return StatsDTO.builder()
                .date(date)
                .avgVoltage(230.0)
                .measurementCount(28800)
                .dataCompleteness(1.0)
                .voltageSagCount(0)
                .voltageSwellCount(0)
                .thdViolationsCount(0)
                .build();
    }

    // ========================================
    // Scheduled Job Tests
    // ========================================

    @Nested
    @DisplayName("aggregateDailyStats() - Scheduled Job")
    class ScheduledAggregation {

        @Test
        @DisplayName("should calculate stats for yesterday on successful run")
        void shouldCalculateStatsForYesterday() {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = createMockStats(yesterday);
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            // When
            aggregationService.aggregateDailyStats();

            // Then
            verify(statsService, times(1)).calculateDailyStats(yesterday);
            assertThat(aggregationService.isLastRunSuccess()).isTrue();
            assertThat(aggregationService.getLastProcessedDate()).isEqualTo(yesterday);
            assertThat(aggregationService.getLastError()).isNull();
        }

        @Test
        @DisplayName("should update lastRunTime after execution")
        void shouldUpdateLastRunTime() {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = createMockStats(yesterday);
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            LocalDateTime beforeRun = LocalDateTime.now();

            // When
            aggregationService.aggregateDailyStats();

            // Then
            LocalDateTime afterRun = LocalDateTime.now();
            LocalDateTime lastRunTime = aggregationService.getLastRunTime();

            assertThat(lastRunTime)
                    .isNotNull()
                    .isAfterOrEqualTo(beforeRun)
                    .isBeforeOrEqualTo(afterRun);
        }

        @Test
        @DisplayName("should set lastRunSuccess to false when exception occurs")
        void shouldHandleException_andSetFailureStatus() {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            String errorMessage = "Database connection timeout";
            when(statsService.calculateDailyStats(yesterday))
                    .thenThrow(new RuntimeException(errorMessage));

            // When
            aggregationService.aggregateDailyStats();

            // Then
            assertThat(aggregationService.isLastRunSuccess()).isFalse();
            assertThat(aggregationService.getLastError()).isEqualTo(errorMessage);
            assertThat(aggregationService.getLastProcessedDate()).isEqualTo(yesterday);
        }

        @Test
        @DisplayName("should not throw exception when stats calculation fails")
        void shouldNotPropagateException() {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            when(statsService.calculateDailyStats(yesterday))
                    .thenThrow(new RuntimeException("Test exception"));

            // When & Then: No exception should escape
            assertThatCode(() -> aggregationService.aggregateDailyStats())
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("should clear error message on successful run after previous failure")
        void shouldClearErrorOnSuccess() {
            // Given: First run fails
            LocalDate yesterday = LocalDate.now().minusDays(1);
            when(statsService.calculateDailyStats(yesterday))
                    .thenThrow(new RuntimeException("First failure"));

            aggregationService.aggregateDailyStats();
            assertThat(aggregationService.getLastError()).isNotNull();

            // When: Second run succeeds
            StatsDTO mockStats = createMockStats(yesterday);
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            aggregationService.aggregateDailyStats();

            // Then
            assertThat(aggregationService.isLastRunSuccess()).isTrue();
            assertThat(aggregationService.getLastError()).isNull();
        }
    }

    // ========================================
    // Manual Trigger Tests
    // ========================================

    @Nested
    @DisplayName("calculateStatsForDate() - Manual Trigger")
    class ManualTrigger {

        @Test
        @DisplayName("should calculate stats for specified date")
        void shouldCalculateForSpecificDate() {
            // Given
            LocalDate targetDate = LocalDate.of(2024, 11, 15);
            StatsDTO mockStats = createMockStats(targetDate);
            when(statsService.calculateDailyStats(targetDate)).thenReturn(mockStats);

            // When
            StatsDTO result = aggregationService.calculateStatsForDate(targetDate);

            // Then
            verify(statsService, times(1)).calculateDailyStats(targetDate);
            assertThat(result)
                    .isNotNull()
                    .extracting(StatsDTO::getDate)
                    .isEqualTo(targetDate);
        }

        @Test
        @DisplayName("should allow recalculation of failed dates")
        void shouldAllowRecalculation() {
            // Given: Date that previously failed in scheduled job
            LocalDate yesterday = LocalDate.now().minusDays(1);
            when(statsService.calculateDailyStats(yesterday))
                    .thenThrow(new RuntimeException("Scheduled failure"))
                    .thenReturn(createMockStats(yesterday));

            aggregationService.aggregateDailyStats();
            assertThat(aggregationService.isLastRunSuccess()).isFalse();

            // When: Manual recalculation
            StatsDTO result = aggregationService.calculateStatsForDate(yesterday);

            // Then
            assertThat(result).isNotNull();
            verify(statsService, times(2)).calculateDailyStats(yesterday);
        }
    }

    // ========================================
    // Health Check Tests
    // ========================================

    @Nested
    @DisplayName("Health Check Methods")
    class HealthCheck {

        @Test
        @DisplayName("isHealthy() should return true initially")
        void shouldBeHealthyInitially() {
            // When & Then
            assertThat(aggregationService.isHealthy()).isTrue();
        }

        @Test
        @DisplayName("isHealthy() should return false after failed run")
        void shouldBeUnhealthyAfterFailure() {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            when(statsService.calculateDailyStats(yesterday))
                    .thenThrow(new RuntimeException("Failure"));

            // When
            aggregationService.aggregateDailyStats();

            // Then
            assertThat(aggregationService.isHealthy()).isFalse();
        }

        @Test
        @DisplayName("getLastRunTime() should return null initially")
        void shouldReturnNullLastRunTimeInitially() {
            // When & Then
            assertThat(aggregationService.getLastRunTime()).isNull();
        }

        @Test
        @DisplayName("getLastProcessedDate() should return null initially")
        void shouldReturnNullLastProcessedDateInitially() {
            // When & Then
            assertThat(aggregationService.getLastProcessedDate()).isNull();
        }

        @Test
        @DisplayName("getLastError() should return null initially")
        void shouldReturnNullLastErrorInitially() {
            // When & Then
            assertThat(aggregationService.getLastError()).isNull();
        }
    }

    // ========================================
    // Thread Safety Tests
    // ========================================

    @Nested
    @DisplayName("Thread Safety")
    class ThreadSafety {

        @Test
        @DisplayName("should handle concurrent getter calls safely")
        void shouldHandleConcurrentGetters() throws InterruptedException {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = createMockStats(yesterday);
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            aggregationService.aggregateDailyStats();

            // When: Multiple threads reading state concurrently
            int threadCount = 10;
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(threadCount);
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);

            for (int i = 0; i < threadCount; i++) {
                executor.submit(() -> {
                    try {
                        startLatch.await();
                        // Multiple concurrent reads
                        aggregationService.isHealthy();
                        aggregationService.getLastRunTime();
                        aggregationService.getLastProcessedDate();
                        aggregationService.isLastRunSuccess();
                        aggregationService.getLastError();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }

            startLatch.countDown();
            boolean completed = doneLatch.await(5, TimeUnit.SECONDS);

            // Then: No deadlocks or exceptions
            assertThat(completed).isTrue();
            executor.shutdown();
        }

        @Test
        @DisplayName("should handle concurrent aggregation and health check calls")
        void shouldHandleConcurrentAggregationAndHealthChecks() throws InterruptedException {
            // Given
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = createMockStats(yesterday);
            when(statsService.calculateDailyStats(any(LocalDate.class))).thenReturn(mockStats);

            // When: Aggregation and health checks happen concurrently
            CountDownLatch startLatch = new CountDownLatch(1);
            CountDownLatch doneLatch = new CountDownLatch(2);
            ExecutorService executor = Executors.newFixedThreadPool(2);

            // Thread 1: Write operation (aggregation)
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int i = 0; i < 5; i++) {
                        aggregationService.aggregateDailyStats();
                        Thread.sleep(10);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });

            // Thread 2: Read operations (health checks)
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int i = 0; i < 20; i++) {
                        aggregationService.isHealthy();
                        aggregationService.getLastRunTime();
                        Thread.sleep(2);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });

            startLatch.countDown();
            boolean completed = doneLatch.await(10, TimeUnit.SECONDS);

            // Then: No deadlocks or exceptions
            assertThat(completed).isTrue();
            assertThat(aggregationService.isHealthy()).isTrue();
            executor.shutdown();
        }
    }

    // ========================================
    // Edge Cases
    // ========================================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle low data completeness gracefully")
        void shouldHandleLowDataCompleteness() {
            // Given: Low data completeness (< 95%)
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = StatsDTO.builder()
                    .date(yesterday)
                    .measurementCount(20000)
                    .dataCompleteness(0.70)  // Only 70% complete
                    .build();
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            // When
            aggregationService.aggregateDailyStats();

            // Then: Should still succeed, just log warning
            assertThat(aggregationService.isLastRunSuccess()).isTrue();
            verify(statsService, times(1)).calculateDailyStats(yesterday);
        }

        @Test
        @DisplayName("should handle power quality events reporting")
        void shouldHandlePowerQualityEvents() {
            // Given: Day with multiple power quality events
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = StatsDTO.builder()
                    .date(yesterday)
                    .measurementCount(28800)
                    .dataCompleteness(1.0)
                    .voltageSagCount(5)
                    .voltageSwellCount(2)
                    .thdViolationsCount(12)
                    .build();
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            // When
            aggregationService.aggregateDailyStats();

            // Then: Should succeed and log events
            assertThat(aggregationService.isLastRunSuccess()).isTrue();
        }

        @Test
        @DisplayName("should handle zero measurement count gracefully")
        void shouldHandleZeroMeasurementCount() {
            // Given: Stats with zero measurement count (primitives can't be null)
            LocalDate yesterday = LocalDate.now().minusDays(1);
            StatsDTO mockStats = StatsDTO.builder()
                    .date(yesterday)
                    .avgVoltage(0.0)
                    .minVoltage(0.0)
                    .maxVoltage(0.0)
                    .stdDevVoltage(0.0)
                    .avgPowerActive(0.0)
                    .peakPower(0.0)
                    .minPower(0.0)
                    .totalEnergyKwh(0.0)
                    .avgPowerFactor(0.0)
                    .minPowerFactor(0.0)
                    .avgFrequency(0.0)
                    .minFrequency(0.0)
                    .maxFrequency(0.0)
                    .voltageSagCount(0)
                    .voltageSwellCount(0)
                    .interruptionCount(0)
                    .thdViolationsCount(0)
                    .frequencyDevCount(0)
                    .powerFactorPenaltyCount(0)
                    .measurementCount(0)
                    .dataCompleteness(0.0)
                    .build();
            when(statsService.calculateDailyStats(yesterday)).thenReturn(mockStats);

            // When & Then: Should handle zero values gracefully
            assertThatCode(() -> aggregationService.aggregateDailyStats())
                    .doesNotThrowAnyException();
            assertThat(aggregationService.isLastRunSuccess()).isTrue();
        }
    }
}
