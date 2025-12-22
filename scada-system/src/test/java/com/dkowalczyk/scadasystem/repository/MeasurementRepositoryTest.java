package com.dkowalczyk.scadasystem.repository;

import com.dkowalczyk.scadasystem.model.entity.Measurement;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

/**
 * Modern integration tests for MeasurementRepository using @DataJpaTest.
 *
 * Testing strategy:
 * - Use H2 in-memory database (PostgreSQL compatibility mode)
 * - Test custom query methods thoroughly
 * - Verify edge cases with time boundaries
 * - Test performance with larger datasets
 */
@DataJpaTest
@ActiveProfiles("test")
@DisplayName("MeasurementRepository Integration Tests")
class MeasurementRepositoryTest {

    @Autowired
    private MeasurementRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    // ========================================
    // Test Data Builders
    // ========================================

    private Measurement createMeasurement(Instant time, boolean isValid) {
        return Measurement.builder()
                .time(time)
                .voltageRms(230.0 + Math.random() * 10)
                .currentRms(5.0)
                .powerActive(1150.0)
                .frequency(50.0)
                .thdVoltage(2.5)
                .voltageDeviationPercent(0.0)
                .frequencyDeviationHz(0.0)
                .isValid(isValid)
                .build();
    }

    private Measurement persistMeasurement(Instant time, boolean isValid) {
        Measurement measurement = createMeasurement(time, isValid);
        entityManager.persist(measurement);
        return measurement;
    }


    // ========================================
    // findTopByIsValidTrueOrderByTimeDesc Tests
    // ========================================

    @Nested
    @DisplayName("findTopByIsValidTrueOrderByTimeDesc()")
    class FindLatestValid {

        @Test
        @DisplayName("should return latest valid measurement")
        void shouldReturnLatestValid() {
            // Given: 3 valid measurements
            Instant now = Instant.now();
            persistMeasurement(now.minusSeconds(20), true);
            persistMeasurement(now.minusSeconds(10), true);
            Measurement latest = persistMeasurement(now, true);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(latest.getId());
            assertThat(result.get().getTime()).isEqualTo(now);
        }

        @Test
        @DisplayName("should ignore invalid measurements")
        void shouldIgnoreInvalidMeasurements() {
            // Given: 1 valid + 2 invalid (newer)
            Instant now = Instant.now();
            Measurement validOld = persistMeasurement(now.minusSeconds(20), true);
            persistMeasurement(now.minusSeconds(10), false);
            persistMeasurement(now, false);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then: Should return the old valid one, not the newer invalid ones
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(validOld.getId());
        }

        @Test
        @DisplayName("should return empty when no valid measurements exist")
        void shouldReturnEmpty_whenNoValidMeasurements() {
            // Given: Only invalid measurements
            persistMeasurement(Instant.now(), false);
            persistMeasurement(Instant.now().minusSeconds(10), false);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should return empty when database is empty")
        void shouldReturnEmpty_whenDatabaseEmpty() {
            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should handle measurements with identical timestamps")
        void shouldHandleIdenticalTimestamps() {
            // Given: Multiple measurements at same time
            Instant now = Instant.now();
            persistMeasurement(now, true);
            persistMeasurement(now, true);
            persistMeasurement(now, true);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then: Should return one of them (any is acceptable)
            assertThat(result).isPresent();
            assertThat(result.get().getTime()).isEqualTo(now);
        }
    }

    // ========================================
    // findTop100ByIsValidTrueOrderByTimeDesc Tests
    // ========================================

    @Nested
    @DisplayName("findTop100ByIsValidTrueOrderByTimeDesc()")
    class FindTop100 {

        @Test
        @DisplayName("should return latest 100 measurements when more exist")
        void shouldReturnTop100_whenMoreExist() {
            // Given: 150 valid measurements
            Instant now = Instant.now();
            for (int i = 149; i >= 0; i--) {
                persistMeasurement(now.minusSeconds(i * 10), true);
            }
            entityManager.flush();

            // When
            List<Measurement> result = repository.findTop100ByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).hasSize(100);
            // Verify ordering (descending by time)
            assertThat(result.get(0).getTime()).isAfterOrEqualTo(result.get(99).getTime());
        }

        @Test
        @DisplayName("should return all measurements when less than 100 exist")
        void shouldReturnAll_whenLessThan100() {
            // Given: Only 50 measurements
            Instant now = Instant.now();
            for (int i = 49; i >= 0; i--) {
                persistMeasurement(now.minusSeconds(i * 10), true);
            }
            entityManager.flush();

            // When
            List<Measurement> result = repository.findTop100ByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).hasSize(50);
        }

        @Test
        @DisplayName("should ignore invalid measurements")
        void shouldIgnoreInvalid() {
            // Given: 50 valid + 50 invalid
            Instant now = Instant.now();
            for (int i = 99; i >= 0; i--) {
                persistMeasurement(now.minusSeconds(i * 10), i % 2 == 0); // Even = valid
            }
            entityManager.flush();

            // When
            List<Measurement> result = repository.findTop100ByIsValidTrueOrderByTimeDesc();

            // Then: Should return only 50 valid ones
            assertThat(result).hasSize(50);
            assertThat(result).allMatch(Measurement::getIsValid);
        }

        @Test
        @DisplayName("should return empty list when no valid measurements")
        void shouldReturnEmptyList_whenNoValid() {
            // Given: Only invalid measurements
            for (int i = 0; i < 10; i++) {
                persistMeasurement(Instant.now().minusSeconds(i * 10), false);
            }
            entityManager.flush();

            // When
            List<Measurement> result = repository.findTop100ByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should order results by time descending")
        void shouldOrderByTimeDesc() {
            // Given: Measurements inserted in random order
            Instant now = Instant.now();
            persistMeasurement(now.minusSeconds(50), true);
            persistMeasurement(now, true);
            persistMeasurement(now.minusSeconds(100), true);
            persistMeasurement(now.minusSeconds(25), true);
            entityManager.flush();

            // When
            List<Measurement> result = repository.findTop100ByIsValidTrueOrderByTimeDesc();

            // Then: Should be ordered newest first
            assertThat(result).hasSize(4);
            for (int i = 0; i < result.size() - 1; i++) {
                assertThat(result.get(i).getTime())
                        .isAfterOrEqualTo(result.get(i + 1).getTime());
            }
        }
    }

    // ========================================
    // findByIsValidTrueAndTimeBetween Tests
    // ========================================

    @Nested
    @DisplayName("findByIsValidTrueAndTimeBetween()")
    class FindByTimeBetween {

        @Test
        @DisplayName("should return measurements in time range")
        void shouldReturnInRange() {
            // Given
            Instant now = Instant.now();
            Instant from = now.minusSeconds(100);
            Instant to = now.minusSeconds(20);

            Measurement m1 = persistMeasurement(from.minusSeconds(10), true); // Before range
            Measurement m2 = persistMeasurement(from.plusSeconds(1), true); // Just after start (should be included)
            Measurement m3 = persistMeasurement(from.plusSeconds(40), true); // Middle of range
            Measurement m4 = persistMeasurement(to.minusSeconds(5), true); // Before end (should be included)
            Measurement m5 = persistMeasurement(to.plusSeconds(10), true); // After range
            entityManager.flush();

            Pageable pageable = PageRequest.of(0, 100, Sort.by("time").descending());

            // When
            List<Measurement> result = repository.findByIsValidTrueAndTimeBetween(from, to, pageable);

            // Then: Should include m2, m3, m4 (3 measurements)
            assertThat(result).hasSize(3);
            assertThat(result).extracting(Measurement::getId)
                .containsExactlyInAnyOrder(m2.getId(), m3.getId(), m4.getId());
        }

        @Test
        @DisplayName("should respect limit parameter")
        void shouldRespectLimit() {
            // Given: 10 measurements in range
            Instant now = Instant.now();
            Instant from = now.minusSeconds(100);
            Instant to = now;

            for (int i = 0; i < 10; i++) {
                persistMeasurement(from.plusSeconds(i * 10), true);
            }
            entityManager.flush();

            Pageable pageable = PageRequest.of(0, 5, Sort.by("time").descending());

            // When: Request only 5
            List<Measurement> result = repository.findByIsValidTrueAndTimeBetween(from, to, pageable);

            // Then
            assertThat(result).hasSize(5);
        }

        @Test
        @DisplayName("should ignore invalid measurements in range")
        void shouldIgnoreInvalid() {
            // Given
            Instant now = Instant.now();
            Instant from = now.minusSeconds(100);
            Instant to = now;

            persistMeasurement(from.plusSeconds(10), true);
            persistMeasurement(from.plusSeconds(20), false); // Invalid
            persistMeasurement(from.plusSeconds(30), true);
            persistMeasurement(from.plusSeconds(40), false); // Invalid
            entityManager.flush();

            Pageable pageable = PageRequest.of(0, 100, Sort.by("time").descending());

            // When
            List<Measurement> result = repository.findByIsValidTrueAndTimeBetween(from, to, pageable);

            // Then: Should return only 2 valid ones
            assertThat(result).hasSize(2);
            assertThat(result).allMatch(Measurement::getIsValid);
        }

        @Test
        @DisplayName("should return empty list when no measurements in range")
        void shouldReturnEmpty_whenNoMeasurementsInRange() {
            // Given: Measurements outside range
            Instant now = Instant.now();
            persistMeasurement(now.minusSeconds(200), true);
            persistMeasurement(now.minusSeconds(150), true);
            entityManager.flush();

            Instant from = now.minusSeconds(100);
            Instant to = now;
            Pageable pageable = PageRequest.of(0, 100, Sort.by("time").descending());

            // When
            List<Measurement> result = repository.findByIsValidTrueAndTimeBetween(from, to, pageable);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should handle exact boundary timestamps")
        void shouldHandleExactBoundaries() {
            // Given: Measurements exactly at boundaries
            Instant from = Instant.parse("2025-01-01T00:00:00Z");
            Instant to = Instant.parse("2025-01-01T01:00:00Z");

            Measurement atFrom = persistMeasurement(from, true);
            Measurement atTo = persistMeasurement(to, true);
            entityManager.flush();

            Pageable pageable = PageRequest.of(0, 100, Sort.by("time").descending());

            // When
            List<Measurement> result = repository.findByIsValidTrueAndTimeBetween(from, to, pageable);

            // Then: Both boundaries should be included
            assertThat(result).hasSize(2);
            assertThat(result).extracting(Measurement::getId)
                    .containsExactlyInAnyOrder(atFrom.getId(), atTo.getId());
        }
    }

    // ========================================
    // Edge Cases & Performance
    // ========================================

    @Nested
    @DisplayName("Edge Cases and Performance")
    class EdgeCasesAndPerformance {

        @Test
        @DisplayName("should handle millisecond precision in timestamps")
        void shouldHandleMillisecondPrecision() {
            // Given: Measurements 1ms apart
            Instant base = Instant.parse("2025-01-01T00:00:00.000Z");
            persistMeasurement(base, true);
            persistMeasurement(base.plusMillis(1), true);
            Measurement latest = persistMeasurement(base.plusMillis(2), true);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then: Should return the most recent (2ms offset)
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(latest.getId());
        }

        @Test
        @DisplayName("should handle year boundary correctly")
        void shouldHandleYearBoundary() {
            // Given: Measurements spanning year boundary
            Instant dec31 = Instant.parse("2024-12-31T23:59:59Z");
            Instant jan1 = Instant.parse("2025-01-01T00:00:01Z");

            persistMeasurement(dec31, true);
            Measurement newest = persistMeasurement(jan1, true);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(newest.getId());
        }

        @Test
        @DisplayName("should handle DST transition correctly")
        void shouldHandleDSTTransition() {
            // Given: Measurements around DST transition (March 30, 2025 in Europe)
            Instant beforeDST = Instant.parse("2025-03-30T00:59:59Z");
            Instant afterDST = Instant.parse("2025-03-30T02:00:01Z");

            persistMeasurement(beforeDST, true);
            Measurement afterDstMeasurement = persistMeasurement(afterDST, true);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then: Should handle UTC correctly (no DST ambiguity)
            assertThat(result).isPresent();
            assertThat(result.get().getId()).isEqualTo(afterDstMeasurement.getId());
        }

        @Test
        @DisplayName("should perform efficiently with large dataset")
        void shouldPerformWithLargeDataset() {
            // Given: 1000 measurements
            Instant now = Instant.now();
            long startInsert = System.currentTimeMillis();

            for (int i = 999; i >= 0; i--) {
                persistMeasurement(now.minusSeconds(i * 6), true);
                if (i % 100 == 0) {
                    entityManager.flush();
                    entityManager.clear();
                }
            }
            entityManager.flush();

            long insertTime = System.currentTimeMillis() - startInsert;
            System.out.println("Insert 1000 measurements: " + insertTime + "ms");

            // When: Query latest
            long startQuery = System.currentTimeMillis();
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();
            long queryTime = System.currentTimeMillis() - startQuery;

            System.out.println("Query latest from 1000: " + queryTime + "ms");

            // Then
            assertThat(result).isPresent();
            assertThat(queryTime).isLessThan(100); // Should be fast with proper indexing
        }

        @Test
        @DisplayName("should handle null harmonics arrays gracefully")
        void shouldHandleNullHarmonics() {
            // Given: Measurement with null harmonics
            Measurement measurement = Measurement.builder()
                    .time(Instant.now())
                    .voltageRms(230.0)
                    .currentRms(5.0)
                    .frequency(50.0)
                    .harmonicsV(null)
                    .harmonicsI(null)
                    .isValid(true)
                    .build();
            entityManager.persist(measurement);
            entityManager.flush();

            // When
            Optional<Measurement> result = repository.findTopByIsValidTrueOrderByTimeDesc();

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getHarmonicsV()).isNull();
            assertThat(result.get().getHarmonicsI()).isNull();
        }
    }
}
