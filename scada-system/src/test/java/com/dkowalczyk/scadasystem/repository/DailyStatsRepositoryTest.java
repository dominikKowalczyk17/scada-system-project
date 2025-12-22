package com.dkowalczyk.scadasystem.repository;

import com.dkowalczyk.scadasystem.BaseRepositoryTest;
import com.dkowalczyk.scadasystem.model.entity.DailyStats;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Modern integration tests for DailyStatsRepository.
 *
 * Testing strategy:
 * - Test date-based query methods
 * - Verify date range queries (including boundaries)
 * - Test edge cases: leap years, year boundaries, DST transitions
 */
@DisplayName("DailyStatsRepository Integration Tests")
class DailyStatsRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private DailyStatsRepository repository;

    // ========================================
    // Test Data Builders
    // ========================================

    private DailyStats createStats(LocalDate date) {
        return DailyStats.builder()
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

    private DailyStats persistStats(LocalDate date) {
        DailyStats stats = createStats(date);
        entityManager.persist(stats);
        return stats;
    }


    // ========================================
    // findByDate Tests
    // ========================================

    @Nested
    @DisplayName("findByDate()")
    class FindByDate {

        @Test
        @DisplayName("should return stats for existing date")
        void shouldReturnStats_whenDateExists() {
            // Given
            LocalDate testDate = LocalDate.of(2025, 12, 19);
            DailyStats expected = persistStats(testDate);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(testDate);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(expected.getId());
            assertThat(result.get().getDate()).isEqualTo(testDate);
        }

        @Test
        @DisplayName("should return empty for non-existing date")
        void shouldReturnEmpty_whenDateDoesNotExist() {
            // Given
            persistStats(LocalDate.of(2025, 12, 19));
            entityManager.flush();

            // When
            LocalDate missingDate = LocalDate.of(2025, 12, 20);
            Optional<DailyStats> result = repository.findByDate(missingDate);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should return empty when database is empty")
        void shouldReturnEmpty_whenDatabaseEmpty() {
            // When
            Optional<DailyStats> result = repository.findByDate(LocalDate.of(2025, 12, 19));

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should handle year boundary dates")
        void shouldHandleYearBoundary() {
            // Given
            LocalDate dec31 = LocalDate.of(2024, 12, 31);
            LocalDate jan1 = LocalDate.of(2025, 1, 1);

            DailyStats dec31Stats = persistStats(dec31);
            DailyStats jan1Stats = persistStats(jan1);
            entityManager.flush();

            // When
            Optional<DailyStats> dec31Result = repository.findByDate(dec31);
            Optional<DailyStats> jan1Result = repository.findByDate(jan1);

            // Then
            assertThat(dec31Result).isPresent();
            assertThat(dec31Result.get().getId()).isEqualTo(dec31Stats.getId());
            assertThat(jan1Result).isPresent();
            assertThat(jan1Result.get().getId()).isEqualTo(jan1Stats.getId());
        }

        @Test
        @DisplayName("should handle leap year date (Feb 29)")
        void shouldHandleLeapYearDate() {
            // Given: 2024 is a leap year
            LocalDate leapDay = LocalDate.of(2024, 2, 29);
            DailyStats leapDayStats = persistStats(leapDay);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(leapDay);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(leapDayStats.getId());
            assertThat(result.get().getDate()).isEqualTo(leapDay);
        }
    }

    // ========================================
    // findByDateBetweenOrderByDateAsc Tests
    // ========================================

    @Nested
    @DisplayName("findByDateBetweenOrderByDateAsc()")
    class FindByDateBetween {

        @Test
        @DisplayName("should return stats in date range ordered by date ascending")
        void shouldReturnInRangeOrderedAsc() {
            // Given
            LocalDate from = LocalDate.of(2025, 12, 15);
            LocalDate to = LocalDate.of(2025, 12, 20);

            persistStats(from.minusDays(1)); // Before range
            persistStats(from); // At start
            persistStats(from.plusDays(2)); // In range
            persistStats(from.plusDays(4)); // In range
            persistStats(to); // At end
            persistStats(to.plusDays(1)); // After range
            entityManager.flush();

            // When
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(from, to);

            // Then: Should include boundaries and be ordered
            assertThat(result).hasSize(4);

            // Verify ascending order
            for (int i = 0; i < result.size() - 1; i++) {
                assertThat(result.get(i).getDate())
                        .isBefore(result.get(i + 1).getDate());
            }
        }

        @Test
        @DisplayName("should return empty list when no stats in range")
        void shouldReturnEmpty_whenNoStatsInRange() {
            // Given: Stats outside range
            persistStats(LocalDate.of(2025, 12, 1));
            persistStats(LocalDate.of(2025, 12, 5));
            entityManager.flush();

            // When
            LocalDate from = LocalDate.of(2025, 12, 10);
            LocalDate to = LocalDate.of(2025, 12, 20);
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(from, to);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should include both boundary dates")
        void shouldIncludeBoundaries() {
            // Given
            LocalDate from = LocalDate.of(2025, 12, 15);
            LocalDate to = LocalDate.of(2025, 12, 20);

            DailyStats atFrom = persistStats(from);
            DailyStats atTo = persistStats(to);
            entityManager.flush();

            // When
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(from, to);

            // Then: Both boundaries included
            assertThat(result).hasSize(2);
            assertThat(result).extracting(DailyStats::getId)
                    .containsExactly(atFrom.getId(), atTo.getId());
        }

        @Test
        @DisplayName("should handle single-day range")
        void shouldHandleSingleDayRange() {
            // Given
            LocalDate singleDay = LocalDate.of(2025, 12, 19);
            DailyStats stats = persistStats(singleDay);
            entityManager.flush();

            // When: from = to
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(singleDay, singleDay);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(stats.getId());
        }

        @Test
        @DisplayName("should handle range spanning year boundary")
        void shouldHandleYearBoundaryRange() {
            // Given: Dec 2024 to Jan 2025
            LocalDate dec28 = LocalDate.of(2024, 12, 28);
            LocalDate dec31 = LocalDate.of(2024, 12, 31);
            LocalDate jan1 = LocalDate.of(2025, 1, 1);
            LocalDate jan5 = LocalDate.of(2025, 1, 5);

            persistStats(dec28);
            persistStats(dec31);
            persistStats(jan1);
            persistStats(jan5);
            entityManager.flush();

            // When
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(dec28, jan5);

            // Then: All 4 days included, properly ordered
            assertThat(result).hasSize(4);
            assertThat(result).extracting(DailyStats::getDate)
                    .containsExactly(dec28, dec31, jan1, jan5);
        }

        @Test
        @DisplayName("should handle range spanning leap year Feb 29")
        void shouldHandleLeapYearRange() {
            // Given: Feb 28, 29 (leap), Mar 1 in 2024
            LocalDate feb28 = LocalDate.of(2024, 2, 28);
            LocalDate feb29 = LocalDate.of(2024, 2, 29); // Leap day
            LocalDate mar1 = LocalDate.of(2024, 3, 1);

            persistStats(feb28);
            persistStats(feb29);
            persistStats(mar1);
            entityManager.flush();

            // When
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(feb28, mar1);

            // Then: All 3 days including leap day
            assertThat(result).hasSize(3);
            assertThat(result).extracting(DailyStats::getDate)
                    .containsExactly(feb28, feb29, mar1);
        }

        @Test
        @DisplayName("should handle DST transition dates")
        void shouldHandleDSTTransitionDates() {
            // Given: DST transition in Europe (March 30, 2025)
            LocalDate beforeDST = LocalDate.of(2025, 3, 29);
            LocalDate dstDay = LocalDate.of(2025, 3, 30);
            LocalDate afterDST = LocalDate.of(2025, 3, 31);

            persistStats(beforeDST);
            persistStats(dstDay);
            persistStats(afterDST);
            entityManager.flush();

            // When
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(beforeDST, afterDST);

            // Then: All 3 days properly handled (LocalDate has no time component)
            assertThat(result).hasSize(3);
            assertThat(result).extracting(DailyStats::getDate)
                    .containsExactly(beforeDST, dstDay, afterDST);
        }

        @Test
        @DisplayName("should handle large date range")
        void shouldHandleLargeDateRange() {
            // Given: 365 days (full year)
            LocalDate start = LocalDate.of(2025, 1, 1);
            for (int i = 0; i < 365; i++) {
                persistStats(start.plusDays(i));
                if (i % 50 == 0) {
                    entityManager.flush();
                    entityManager.clear();
                }
            }
            entityManager.flush();

            // When
            LocalDate from = LocalDate.of(2025, 1, 1);
            LocalDate to = LocalDate.of(2025, 12, 31);
            List<DailyStats> result = repository.findByDateBetweenOrderByDateAsc(from, to);

            // Then
            assertThat(result).hasSize(365);

            // Verify proper ordering
            for (int i = 0; i < result.size() - 1; i++) {
                assertThat(result.get(i).getDate())
                        .isBefore(result.get(i + 1).getDate());
            }
        }
    }

    // ========================================
    // Edge Cases
    // ========================================

    @Nested
    @DisplayName("Edge Cases")
    class EdgeCases {

        @Test
        @DisplayName("should handle duplicate dates gracefully")
        void shouldHandleDuplicateDates() {
            // Given: Attempt to insert duplicate date (should fail or update)
            LocalDate date = LocalDate.of(2025, 12, 19);
            persistStats(date);
            entityManager.flush();

            // When: Try to insert another stat for same date
            DailyStats duplicate = createStats(date);

            // Then: Should throw exception due to unique constraint on date
           assertThatThrownBy(() -> {
                entityManager.persist(duplicate);
                entityManager.flush();
            }).isInstanceOf(Exception.class)
              .hasMessageContaining("Unique index or primary key violation");
        }

        @Test
        @DisplayName("should handle very old dates")
        void shouldHandleVeryOldDates() {
            // Given: Date from year 2000
            LocalDate oldDate = LocalDate.of(2000, 1, 1);
            DailyStats oldStats = persistStats(oldDate);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(oldDate);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(oldStats.getId());
        }

        @Test
        @DisplayName("should handle future dates")
        void shouldHandleFutureDates() {
            // Given: Date in year 2030
            LocalDate futureDate = LocalDate.of(2030, 12, 31);
            DailyStats futureStats = persistStats(futureDate);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(futureDate);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(futureStats.getId());
        }

        @Test
        @DisplayName("should handle stats with default values for optional fields")
        void shouldHandleDefaultValues() {
            // Given: Stats with zero values (primitives can't be null)
            DailyStats stats = DailyStats.builder()
                    .date(LocalDate.of(2025, 12, 19))
                    .avgVoltage(230.0)
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
                    .measurementCount(100)
                    .dataCompleteness(0.5)
                    .build();
            entityManager.persist(stats);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(LocalDate.of(2025, 12, 19));

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getMinVoltage()).isEqualTo(0.0);
            assertThat(result.get().getMaxVoltage()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("should handle stats with zero data completeness")
        void shouldHandleZeroDataCompleteness() {
            // Given: Day with no valid measurements
            DailyStats emptyDay = DailyStats.builder()
                    .date(LocalDate.of(2025, 12, 19))
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
            entityManager.persist(emptyDay);
            entityManager.flush();

            // When
            Optional<DailyStats> result = repository.findByDate(LocalDate.of(2025, 12, 19));

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getMeasurementCount()).isEqualTo(0);
            assertThat(result.get().getDataCompleteness()).isEqualTo(0.0);
        }
    }
}
